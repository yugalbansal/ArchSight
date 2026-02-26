import { ASTReference, SignalBatch } from "../core/scan_context.js";
import { resolveScope } from "../evidence/scope_resolver.js";

/**
 * Async Pattern Extractor
 * Detects:
 *  - queues, workers, events, publish/consume, timers (setInterval, setTimeout)
 * 
 * Outputs: SignalBatch
 */
export async function extractAsyncPattern(astRef: ASTReference): Promise<SignalBatch[]> {
    const signals: SignalBatch[] = [];

    let tree;
    try {
        tree = await astRef.load();
    } catch {
        return [];
    }

    try {
        walk(tree.rootNode, astRef.filepath, signals);
    } finally {
        astRef.release();
    }

    return signals;
}

function walk(node: any, filepath: string, signals: SignalBatch[]) {
    if (node.type === "call_expression") {
        const fnName = getCallName(node);

        if (fnName) {
            // Pub/Sub, Queues, Workers
            if (/(\.|^)(publish|subscribe|emit|on|send|schedule|enqueue|dispatch)$/i.test(fnName)) {

                // Increase signal purity by ignoring common false positives (like res.send or Array.map)
                const isExpressResSend = /res\.send$/.test(fnName);
                if (!isExpressResSend) {
                    const scope = resolveScope(node, filepath);

                    signals.push({
                        kind: "async_boundary",
                        scopeId: scope.id,
                        parentScopeId: scope.parentId,
                        scopeType: scope.type,
                        file: filepath,
                        occurrences: 1,
                        metadata_summary: {
                            operation: fnName
                        }
                    });
                }
            }

            // Timers/Intervals
            if (/^(setTimeout|setInterval|setImmediate)$/.test(fnName)) {
                const scope = resolveScope(node, filepath);

                signals.push({
                    kind: "timer_execution",
                    scopeId: scope.id,
                    parentScopeId: scope.parentId,
                    scopeType: scope.type,
                    file: filepath,
                    occurrences: 1,
                    metadata_summary: {
                        operation: fnName
                    }
                });
            }
        }
    }

    if (node.children) {
        for (const child of node.children) {
            walk(child, filepath, signals);
        }
    }
}

function getCallName(node: any): string | null {
    const fn = node.childForFieldName("function");
    if (!fn) return null;
    return fn.text;
}
