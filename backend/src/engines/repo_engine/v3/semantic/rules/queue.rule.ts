import { SemanticRule } from "../rule_engine.js";
import { SignalBatch, SemanticNode } from "../../core/scan_context.js";
import crypto from "crypto";

/**
 * Queue/Worker Rule
 * Medium Priority.
 * Resolves scopes containing async_boundary signals.
 */
export const QueueWorkerRule: SemanticRule = {
    name: "Message_Queue_Worker",
    priority: 85,
    exclusive: true, // Typically, a function is either an HTTP endpoint OR a Queue consumer, not both
    evaluate: (scopeId: string, signals: SignalBatch[]): SemanticNode | null => {

        const asyncSignals = signals.filter(s => s.kind === "async_boundary");

        if (asyncSignals.length === 0) return null;

        const file = asyncSignals[0].file;
        const metadata: Record<string, any> = {
            operations: []
        };

        let isConsumer = false;
        let isPublisher = false;

        for (const sig of asyncSignals) {
            const op = sig.metadata_summary.operation?.toLowerCase() || "";
            metadata.operations.push(op);

            if (op.includes("consume") || op.includes("subscribe") || op.includes("on")) isConsumer = true;
            if (op.includes("publish") || op.includes("emit") || op.includes("send") || op.includes("enqueue")) isPublisher = true;
        }

        metadata.operations = [...new Set(metadata.operations)];

        let type = "background_worker";
        if (isConsumer && !isPublisher) type = "message_consumer";
        if (isPublisher && !isConsumer) type = "message_publisher";
        if (isConsumer && isPublisher) type = "message_processor";

        return {
            id: crypto.randomBytes(8).toString("hex"),
            type,
            scopeId,
            file,
            confidence: asyncSignals.length >= 2 ? 0.95 : 0.85,
            state: "resolved",
            metadata,
            evidence_signals: asyncSignals.map(s => s.kind)
        };
    }
};
