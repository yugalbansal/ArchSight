import { ScanContext, EvidenceGraph } from "../core/scan_context.js";

/**
 * Normalizes signals into an EvidenceGraph, grouped by scope.
 */
export function buildEvidenceGraph(context: ScanContext): void {
    const graph: EvidenceGraph = { scopes: {}, hierarchy: {} };

    for (const signal of context.signals) {
        // 1. Group by scope
        if (!graph.scopes[signal.scopeId]) {
            graph.scopes[signal.scopeId] = [];
        }
        graph.scopes[signal.scopeId].push(signal);

        // 2. Build Hierarchy
        if (signal.parentScopeId) {
            if (!graph.hierarchy[signal.parentScopeId]) {
                graph.hierarchy[signal.parentScopeId] = [];
            }
            if (!graph.hierarchy[signal.parentScopeId].includes(signal.scopeId)) {
                graph.hierarchy[signal.parentScopeId].push(signal.scopeId);
            }
        }
    }

    // Mutation safety: Create new graph reference
    context.evidence = graph;
}
