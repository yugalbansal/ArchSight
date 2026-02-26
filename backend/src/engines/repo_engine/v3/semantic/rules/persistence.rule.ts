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
            if (op.metadata_summary.target) metadata.targets.push(op.metadata_summary.target);
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
