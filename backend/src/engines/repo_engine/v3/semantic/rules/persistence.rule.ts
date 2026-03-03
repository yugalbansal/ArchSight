import { SemanticRule } from "../rule_engine.js";
import { SignalBatch, SemanticNode } from "../../core/scan_context.js";
import crypto from "crypto";

/**
 * Persistence Rule
 * Medium Priority.
 * Resolves scopes containing persistence_op or sql_query signals into Database Operations.
 */
export const PersistenceRule: SemanticRule = {
    name: "DB_Operation",
    priority: 80,
    exclusive: false, // A scope can be an Endpoint AND contain DB Operations
    evaluate: (scopeId: string, signals: SignalBatch[]): SemanticNode | null => {

        const ops = signals.filter(s => s.kind === "persistence_op" || s.kind === "sql_query");

        if (ops.length === 0) return null;

        const file = ops[0].file;
        const metadata: Record<string, any> = {
            operations: [],
            targets: []
        };

        for (const op of ops) {
            if (op.metadata_summary.operation) metadata.operations.push(op.metadata_summary.operation);
            if (op.metadata_summary.target) {
                // target is fn.text.split(".")[0] from the pattern extractor, e.g.
                // "prisma.user.findMany" → target="prisma" (useless)
                // "this.userRepository.save" → target="this" (useless)
                // We also receive the full fn text via metadata_summary.text if available.
                // Filter out generic ORM roots and keep meaningful model names.
                const raw: string = op.metadata_summary.target;
                const fullText: string = op.metadata_summary.text || "";

                // Try to extract model name from full member expression: prisma.user.findMany → "user"
                const parts = fullText.split(".");
                const modelCandidate = parts.length >= 3
                    ? parts[parts.length - 2]  // second-to-last segment before the method
                    : raw;

                const genericRoots = /^(prisma|db|database|repo|repository|this|self|em|manager|session|conn|connection|client|knex|sequelize|mongoose|orm|pool)$/i;
                const cleaned = genericRoots.test(modelCandidate) ? null : modelCandidate;

                if (cleaned) {
                    // Capitalize first letter for display
                    metadata.targets.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
                }
            }
            if (op.metadata_summary.queryPreview) metadata.operations.push("RAW_SQL");
        }

        // Dedupe
        metadata.operations = [...new Set(metadata.operations)];
        metadata.targets = [...new Set(metadata.targets)];

        let confidence = ops.length >= 2 ? 0.90 : 0.75;
        let state: "resolved" | "partial" | "unknown" = ops.length >= 2 ? "resolved" : "partial";

        // Up-rank confidence if SQL was detected directly
        if (ops.some(s => s.kind === "sql_query")) {
            confidence = 0.95;
            state = "resolved";
        }

        return {
            id: crypto.randomBytes(8).toString("hex"),
            type: "db_operation",
            scopeId,
            file,
            confidence,
            state,
            metadata,
            evidence_signals: ops.map(s => s.kind)
        };
    }
};
