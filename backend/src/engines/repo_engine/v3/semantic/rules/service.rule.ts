import { SemanticRule } from "../rule_engine.js";
import { SignalBatch, SemanticNode, ScanContext } from "../../core/scan_context.js";
import crypto from "crypto";

/**
 * Core Service Rule (Compositional)
 * High Priority, Non-Exclusive.
 * This rule demonstrates multi-signal composition.
 * A class/file containing 'service_class', 'persistence_op', AND 'dependency_instantiation'
 * is highly likely to be a Business Logic Service.
 */
export const CoreServiceRule: SemanticRule = {
    name: "Business_Logic_Service",
    priority: 95,
    exclusive: false, // A service class can contain methods that are endpoints or workers
    evaluate: (scopeId: string, signals: SignalBatch[], context: ScanContext): SemanticNode | null => {

        const hasServiceMarker = signals.some(s => s.kind === "service_class");
        const hasDependencies = signals.some(s => s.kind === "dependency_instantiation");

        // Check child scopes for DB operations to confirm it does real work
        let hasChildDbOps = false;
        const childScopes = context.evidence.hierarchy[scopeId] || [];
        for (const childId of childScopes) {
            const childSignals = context.evidence.scopes[childId] || [];
            if (childSignals.some(s => s.kind === "persistence_op" || s.kind === "sql_query")) {
                hasChildDbOps = true;
                break;
            }
        }

        if (!hasServiceMarker && !hasDependencies) return null;

        const file = signals[0]?.file || "unknown";

        // Extract the real class name from the service_class signal
        const serviceSignal = signals.find(s => s.kind === "service_class");
        const className: string | undefined = serviceSignal?.metadata_summary?.className;

        let confidence = 0.5;
        let state: "resolved" | "partial" | "unknown" = "partial";

        if (hasServiceMarker && hasDependencies && hasChildDbOps) {
            confidence = 0.95;
            state = "resolved";
        } else if (hasServiceMarker && (hasDependencies || hasChildDbOps)) {
            confidence = 0.85;
            state = "resolved";
        } else if (hasServiceMarker) {
            confidence = 0.70;
            state = "partial";
        } else if (hasDependencies && hasChildDbOps) {
            // Implicit service without the name
            confidence = 0.80;
            state = "resolved";
        }

        return {
            id: crypto.randomBytes(8).toString("hex"),
            type: "business_logic_service",
            scopeId,
            file,
            confidence,
            state,
            metadata: {
                className,                                    // ← real name from AST
                has_injected_dependencies: hasDependencies,
                executes_persistence: hasChildDbOps,
                explicitly_named_service: hasServiceMarker
            },
            evidence_signals: [...new Set(signals.map(s => s.kind))]
        };
    }
};
