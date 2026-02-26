import { SemanticRule } from "../rule_engine.js";
import { SignalBatch, SemanticNode, ScanContext } from "../../core/scan_context.js";
import crypto from "crypto";

/**
 * Endpoint Rule
 * High Priority, Exclusive.
 * Resolves scopes containing handler_registration OR route_decorator signals into HTTP Endpoints.
 * Enforces strict structural requirements if no decorator is present.
 */
export const EndpointRule: SemanticRule = {
    name: "HTTP_Endpoint",
    priority: 100, // Very high
    exclusive: true, // If it's an endpoint, it's not a background worker
    evaluate: (scopeId: string, signals: SignalBatch[], context: ScanContext): SemanticNode | null => {

        // Find relevant signals
        const regSignal = signals.find(s => s.kind === "handler_registration");
        const decSignal = signals.find(s => s.kind === "route_decorator");

        if (!regSignal && !decSignal) return null; // Rule does not apply

        // STRUCTURAL CALIBRATION: Prevent False Positives for generic methods (app.use, Promise.all)
        if (regSignal && !decSignal) {
            // For non-decorated handlers (like Express), it MUST structurally receive an HTTP context parameter
            const args = regSignal.metadata_summary.argsPreview || "";
            const hasHttpContext = /(req|res|ctx|next|request|response)/i.test(args);

            if (!hasHttpContext) {
                // Reject false positive and log trace for calibration
                context.traces.push({
                    rule: "HTTP_Endpoint",
                    matched_signals: ["handler_registration"],
                    scopeId,
                    confidence_delta: 0,
                    reason: `Rejected: Registration found but lacks HTTP context parameters. args='${args}'`
                });
                return null;
            }
        }

        // Determine File
        const file = regSignal?.file || decSignal?.file || "unknown";

        // Aggregate Metadata
        const metadata: Record<string, any> = {};
        if (regSignal) Object.assign(metadata, regSignal.metadata_summary);
        if (decSignal) Object.assign(metadata, decSignal.metadata_summary);

        // Calculate Confidence and State
        let confidence = 0;
        let state: "resolved" | "partial" | "unknown" = "unknown";

        if (regSignal && decSignal) {
            confidence = 0.95;
            state = "resolved";
        } else if (regSignal) {
            confidence = 0.85;
            state = "resolved";
        } else if (decSignal) {
            confidence = 0.80; // Decorator alone might just be an interface
            state = "partial";
        }

        const node: SemanticNode = {
            id: crypto.randomBytes(8).toString("hex"),
            type: "http_endpoint",
            scopeId,
            file,
            confidence,
            state,
            metadata,
            evidence_signals: signals.map(s => s.kind)
        };

        context.traces.push({
            rule: "HTTP_Endpoint",
            matched_signals: signals.map(s => s.kind),
            scopeId,
            confidence_delta: confidence,
            reason: "Accepted: Structural HTTP context or Explicit Decorator found."
        });

        return node;
    }
};
