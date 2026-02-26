import { SemanticRule } from "../rule_engine.js";
import { SignalBatch, SemanticNode } from "../../core/scan_context.js";
import crypto from "crypto";

/**
 * External Service Rule
 * Medium Priority.
 * Resolves scopes containing network_request signals into External Service Calls.
 */
export const ExternalServiceRule: SemanticRule = {
    name: "External_Call",
    priority: 80,
    exclusive: false,
    evaluate: (scopeId: string, signals: SignalBatch[]): SemanticNode | null => {

        const reqs = signals.filter(s => s.kind === "network_request");

        if (reqs.length === 0) return null;

        const file = reqs[0].file;
        const metadata: Record<string, any> = {
            libraries: [],
            urls_or_args: []
        };

        for (const req of reqs) {
            if (req.metadata_summary.library) metadata.libraries.push(req.metadata_summary.library);
            if (req.metadata_summary.args) metadata.urls_or_args.push(req.metadata_summary.args);
        }

        metadata.libraries = [...new Set(metadata.libraries)];
        metadata.urls_or_args = [...new Set(metadata.urls_or_args)];

        const confidence = reqs.length >= 2 ? 0.95 : 0.85;

        return {
            id: crypto.randomBytes(8).toString("hex"),
            type: "external_service",
            scopeId,
            file,
            confidence,
            state: "resolved",
            metadata,
            evidence_signals: reqs.map(s => s.kind)
        };
    }
};
