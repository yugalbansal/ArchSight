/**
 * Intelligence Engine — Graph Metrics Calculator
 * ────────────────────────────────────────────────
 * Computes all deterministic, formula-based metrics from the ArchitectureGraph.
 * Pure functions only — no side effects, no I/O.
 *
 * Algorithms used:
 *   - Cycle Detection: Iterative DFS with color marking (WHITE/GRAY/BLACK)
 *   - SCC Detection: Kosaraju's 2-pass DFS algorithm
 *   - Max Depth: BFS from all source nodes (nodes with no incoming edges)
 *   - Centrality: Simplified betweenness via shortest-path counting (BFS)
 *   - Martin Instability: fan_out / (fan_in + fan_out)
 *
 * Why these algorithms?
 *   - Kosaraju is simple to implement correctly and runs in O(V+E)
 *   - DFS cycle detection is O(V+E) and gives exact cycle count
 *   - BFS depth is O(V+E) and finds the true longest chain
 *   - Betweenness centrality identifies structural bottlenecks precisely
 */

import type { ArchitectureGraph, ArchitectureNode } from "../repo_engine/v3/graph/builder.js";
import type { GraphMetrics, NodeMetrics } from "./schemas.js";

// ─── Internal Adjacency ───────────────────────────────────────────────

/**
 * Build adjacency maps from the flat edges array.
 * outMap[nodeId] = [nodeIds this node points TO]
 * inMap[nodeId]  = [nodeIds that point TO this node]
 */
function buildAdjacency(graph: ArchitectureGraph): {
    outMap: Map<string, string[]>;
    inMap: Map<string, string[]>;
} {
    const outMap = new Map<string, string[]>();
    const inMap = new Map<string, string[]>();

    for (const node of graph.nodes) {
        outMap.set(node.id, []);
        inMap.set(node.id, []);
    }

    for (const edge of graph.edges) {
        const src = (edge as any).source ?? (edge as any).from ?? (edge as any).fromNodeId;
        const tgt = (edge as any).target ?? (edge as any).to ?? (edge as any).toNodeId;
        if (!src || !tgt) continue;
        if (!outMap.has(src)) outMap.set(src, []);
        if (!inMap.has(tgt)) inMap.set(tgt, []);
        outMap.get(src)!.push(tgt);
        inMap.get(tgt)!.push(src);
    }

    return { outMap, inMap };
}

// ─── Cycle Detection (Iterative DFS) ─────────────────────────────────

/**
 * Detects cycles using iterative DFS with 3-color marking.
 * WHITE = unvisited, GRAY = in current path, BLACK = fully visited.
 * Returns the number of distinct back-edges found (proxy for cycle count).
 */
function detectCycles(outMap: Map<string, string[]>): { cycleCount: number; cycleNodeIds: Set<string> } {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    const cycleNodeIds = new Set<string>();
    let cycleCount = 0;

    for (const id of outMap.keys()) color.set(id, WHITE);

    for (const startId of outMap.keys()) {
        if (color.get(startId) !== WHITE) continue;

        // Iterative DFS stack: [nodeId, neighborIndex]
        const stack: [string, number][] = [[startId, 0]];
        color.set(startId, GRAY);

        while (stack.length > 0) {
            const [nodeId, idx] = stack[stack.length - 1];
            const neighbors = outMap.get(nodeId) ?? [];

            if (idx >= neighbors.length) {
                // Done with this node
                color.set(nodeId, BLACK);
                stack.pop();
            } else {
                stack[stack.length - 1][1]++;
                const neighbor = neighbors[idx];
                const neighborColor = color.get(neighbor) ?? WHITE;

                if (neighborColor === GRAY) {
                    // Back-edge found = cycle
                    cycleCount++;
                    cycleNodeIds.add(nodeId);
                    cycleNodeIds.add(neighbor);
                } else if (neighborColor === WHITE) {
                    color.set(neighbor, GRAY);
                    stack.push([neighbor, 0]);
                }
            }
        }
    }

    return { cycleCount, cycleNodeIds };
}

// ─── Strongly Connected Components (Kosaraju's Algorithm) ────────────

/**
 * Finds all SCCs in the directed graph.
 * Returns count of SCCs and the size of the largest SCC.
 *
 * Kosaraju Steps:
 *  1. Run DFS on original graph, push finish order to stack
 *  2. Transpose the graph (reverse all edges)
 *  3. Run DFS on transposed graph in reverse finish order
 *     Each DFS tree in step 3 = one SCC
 */
function detectSCCs(outMap: Map<string, string[]>): { sccCount: number; largestSCCSize: number } {
    const visited = new Set<string>();
    const finishOrder: string[] = [];
    const nodes = [...outMap.keys()];

    // Step 1: DFS on original graph to get finish order
    function dfs1(start: string) {
        const stack: [string, number][] = [[start, 0]];
        visited.add(start);
        while (stack.length > 0) {
            const [node, idx] = stack[stack.length - 1];
            const neighbors = outMap.get(node) ?? [];
            if (idx >= neighbors.length) {
                stack.pop();
                finishOrder.push(node);
            } else {
                stack[stack.length - 1][1]++;
                const n = neighbors[idx];
                if (!visited.has(n)) {
                    visited.add(n);
                    stack.push([n, 0]);
                }
            }
        }
    }

    for (const id of nodes) {
        if (!visited.has(id)) dfs1(id);
    }

    // Step 2: Build transposed graph
    const revMap = new Map<string, string[]>();
    for (const id of nodes) revMap.set(id, []);
    for (const [src, targets] of outMap.entries()) {
        for (const tgt of targets) {
            if (!revMap.has(tgt)) revMap.set(tgt, []);
            revMap.get(tgt)!.push(src);
        }
    }

    // Step 3: DFS on reversed graph in reverse finish order
    const visited2 = new Set<string>();
    const sccs: string[][] = [];

    function dfs2(start: string): string[] {
        const component: string[] = [];
        const stack: string[] = [start];
        visited2.add(start);
        while (stack.length > 0) {
            const node = stack.pop()!;
            component.push(node);
            for (const n of revMap.get(node) ?? []) {
                if (!visited2.has(n)) {
                    visited2.add(n);
                    stack.push(n);
                }
            }
        }
        return component;
    }

    for (let i = finishOrder.length - 1; i >= 0; i--) {
        const id = finishOrder[i];
        if (!visited2.has(id)) {
            sccs.push(dfs2(id));
        }
    }

    return {
        sccCount: sccs.length,
        largestSCCSize: sccs.reduce((max, c) => Math.max(max, c.length), 0),
    };
}

// ─── Max Depth (BFS from sources) ────────────────────────────────────

/**
 * Computes the longest path from any source node (no incoming edges).
 * Uses BFS level-by-level. Handles disconnected graphs.
 */
function computeDepths(outMap: Map<string, string[]>, inMap: Map<string, string[]>): Map<string, number> {
    const depth = new Map<string, number>();
    const nodes = [...outMap.keys()];

    // Source nodes = no incoming edges
    const sources = nodes.filter(id => (inMap.get(id) ?? []).length === 0);

    // Initialize
    for (const id of nodes) depth.set(id, 0);

    // BFS from each source
    const queue: string[] = [...sources];
    const inQueue = new Set(sources);

    while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDepth = depth.get(current)!;

        for (const neighbor of outMap.get(current) ?? []) {
            const newDepth = currentDepth + 1;
            if (newDepth > (depth.get(neighbor) ?? 0)) {
                depth.set(neighbor, newDepth);
            }
            if (!inQueue.has(neighbor)) {
                inQueue.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return depth;
}

// ─── Betweenness Centrality (BFS-based) ──────────────────────────────

/**
 * Computes betweenness centrality for all nodes.
 * Simplified version using BFS shortest paths.
 * Score normalized to [0, 1].
 *
 * A high centrality node is a structural single point of failure (SPOF).
 */
function computeCentrality(outMap: Map<string, string[]>): Map<string, number> {
    const nodes = [...outMap.keys()];
    const centrality = new Map<string, number>();
    for (const id of nodes) centrality.set(id, 0);

    if (nodes.length < 3) return centrality;

    for (const source of nodes) {
        // BFS to find shortest paths from source
        const dist = new Map<string, number>();
        const sigma = new Map<string, number>(); // num shortest paths through node
        const pred = new Map<string, string[]>(); // predecessors
        const queue: string[] = [source];

        for (const id of nodes) {
            dist.set(id, -1);
            sigma.set(id, 0);
            pred.set(id, []);
        }

        dist.set(source, 0);
        sigma.set(source, 1);

        const stack: string[] = [];

        while (queue.length > 0) {
            const v = queue.shift()!;
            stack.push(v);
            for (const w of outMap.get(v) ?? []) {
                // First visit
                if (dist.get(w) === -1) {
                    dist.set(w, dist.get(v)! + 1);
                    queue.push(w);
                }
                // Shortest path to w via v
                if (dist.get(w) === dist.get(v)! + 1) {
                    sigma.set(w, sigma.get(w)! + sigma.get(v)!);
                    pred.get(w)!.push(v);
                }
            }
        }

        // Back-propagate dependency
        const delta = new Map<string, number>();
        for (const id of nodes) delta.set(id, 0);

        while (stack.length > 0) {
            const w = stack.pop()!;
            for (const v of pred.get(w)!) {
                const frac = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
                delta.set(v, delta.get(v)! + frac);
            }
            if (w !== source) {
                centrality.set(w, centrality.get(w)! + delta.get(w)!);
            }
        }
    }

    // Normalize to [0, 1]
    const maxC = Math.max(...centrality.values(), 1);
    for (const [id, c] of centrality.entries()) {
        centrality.set(id, c / maxC);
    }

    return centrality;
}

// ─── Public Compute Function ──────────────────────────────────────────

/**
 * Main entry point for the Metrics Calculator.
 * Returns a fully populated GraphMetrics object.
 */
export function computeGraphMetrics(graph: ArchitectureGraph): GraphMetrics {
    const total_nodes = graph.nodes.length;
    const total_edges = graph.edges.length;

    if (total_nodes === 0) {
        return {
            total_nodes: 0,
            total_edges: 0,
            density: 0,
            max_depth: 0,
            avg_depth: 0,
            cycles_detected: 0,
            risk_score: 0,
            strongly_connected_components: 0,
            largest_scc_size: 0,
            avg_fan_in: 0,
            avg_fan_out: 0,
            coupling_score: 0,
            avg_instability: 0,
            node_metrics: [],
        };
    }

    const { outMap, inMap } = buildAdjacency(graph);

    // ── Core Algorithms ───────────────────────────────────────────────
    const { cycleCount, cycleNodeIds } = detectCycles(outMap);
    const { sccCount, largestSCCSize } = detectSCCs(outMap);
    const depths = computeDepths(outMap, inMap);
    const centrality = computeCentrality(outMap);

    // ── Density: edges / (n * (n-1)) ─────────────────────────────────
    const density = total_nodes > 1
        ? total_edges / (total_nodes * (total_nodes - 1))
        : 0;

    // ── Depth Stats ───────────────────────────────────────────────────
    const allDepths = [...depths.values()];
    const max_depth = Math.max(...allDepths, 0);
    const avg_depth = allDepths.length > 0
        ? allDepths.reduce((s, d) => s + d, 0) / allDepths.length
        : 0;

    // ── Fan Metrics ───────────────────────────────────────────────────
    let totalFanIn = 0, totalFanOut = 0;

    const node_metrics: NodeMetrics[] = graph.nodes.map(node => {
        const fan_in = (inMap.get(node.id) ?? []).length;
        const fan_out = (outMap.get(node.id) ?? []).length;
        const instability = (fan_in + fan_out) > 0
            ? fan_out / (fan_in + fan_out)
            : 0;

        totalFanIn += fan_in;
        totalFanOut += fan_out;

        return {
            node_id: node.id,
            node_type: node.type,
            file: node.file,
            fan_in,
            fan_out,
            centrality: +(centrality.get(node.id) ?? 0).toFixed(4),
            instability: +instability.toFixed(4),
            in_cycle: cycleNodeIds.has(node.id),
            depth: depths.get(node.id) ?? 0,
        };
    });

    const avg_fan_in = total_nodes > 0 ? totalFanIn / total_nodes : 0;
    const avg_fan_out = total_nodes > 0 ? totalFanOut / total_nodes : 0;
    const coupling_score = total_nodes > 0
        ? (totalFanIn + totalFanOut) / total_nodes
        : 0;
    const avg_instability = node_metrics.length > 0
        ? node_metrics.reduce((s, n) => s + n.instability, 0) / node_metrics.length
        : 0;

    // ── Risk Score (0-100, deterministic formula) ─────────────────────
    //   Cycle penalty:         up to 30 pts (10 pts per cycle, capped)
    //   Density penalty:       up to 20 pts
    //   Depth penalty:         up to 20 pts
    //   SCC penalty:           up to 15 pts
    //   Coupling penalty:      up to 15 pts
    let risk_score = 0;
    risk_score += Math.min(30, cycleCount * 10);
    risk_score += density > 0.3 ? 20 : density > 0.2 ? 10 : density > 0.1 ? 5 : 0;
    risk_score += max_depth > 8 ? 20 : max_depth > 6 ? 12 : max_depth > 4 ? 6 : 0;
    risk_score += largestSCCSize > 8 ? 15 : largestSCCSize > 5 ? 8 : largestSCCSize > 2 ? 3 : 0;
    risk_score += coupling_score > 15 ? 15 : coupling_score > 10 ? 8 : coupling_score > 5 ? 3 : 0;
    risk_score = Math.min(100, Math.round(risk_score));

    return {
        total_nodes,
        total_edges,
        density: +density.toFixed(4),
        max_depth,
        avg_depth: +avg_depth.toFixed(2),
        cycles_detected: cycleCount,
        risk_score,
        strongly_connected_components: sccCount,
        largest_scc_size: largestSCCSize,
        avg_fan_in: +avg_fan_in.toFixed(2),
        avg_fan_out: +avg_fan_out.toFixed(2),
        coupling_score: +coupling_score.toFixed(2),
        avg_instability: +avg_instability.toFixed(4),
        node_metrics,
    };
}
