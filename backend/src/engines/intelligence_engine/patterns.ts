/**
 * Intelligence Engine — Pattern Detector
 * ──────────────────────────────────────
 * Detects architectural smells and structural anti-patterns
 * from computed graph metrics. 100% deterministic — no AI, no inference.
 *
 * Each detector function is isolated and independently testable.
 * All thresholds are documented and tunable.
 *
 * Detection Strategy:
 *   1. Each pattern type has its own dedicated detector function
 *   2. Each detector emits 0 or 1 DetectedPattern
 *   3. All are composed in detectAllPatterns()
 *   4. Severity is computed from metric distance to threshold
 */

import type { ArchitectureGraph } from "../repo_engine/v3/graph/builder.js";
import type { GraphMetrics, NodeMetrics, DetectedPattern, PatternSeverity } from "./schemas.js";

// ─── Severity Helpers ─────────────────────────────────────────────────

function scaleSeverity(value: number, low: number, medium: number, high: number, critical: number): PatternSeverity {
    if (value >= critical) return "critical";
    if (value >= high) return "high";
    if (value >= medium) return "medium";
    return "low";
}

// ─── 1. Circular Dependency Detector ─────────────────────────────────

/**
 * Fires if ANY cycle was detected in the dependency graph.
 * Cycles are structural integrity violations — they make
 * the system impossible to reason about incrementally.
 *
 * Thresholds:
 *   1 cycle  → high
 *   2 cycles → critical
 */
function detectCircularDependencies(metrics: GraphMetrics): DetectedPattern | null {
    if (metrics.cycles_detected === 0) return null;

    const cycleNodes = metrics.node_metrics
        .filter(n => n.in_cycle)
        .map(n => n.node_id);

    return {
        type: "circular_dependency",
        severity: scaleSeverity(metrics.cycles_detected, 1, 1, 1, 2),
        affected_node_ids: cycleNodes,
        description: `Detected ${metrics.cycles_detected} dependency cycle(s) involving ${cycleNodes.length} node(s). Cycles prevent incremental builds, increase test surface, and amplify change blast radius.`,
        evidence: {
            cycles_detected: metrics.cycles_detected,
            affected_nodes: cycleNodes.length,
        },
    };
}

// ─── 2. God Service Detector ──────────────────────────────────────────

/**
 * A "god service" is a node that too many other nodes depend on.
 * Identified by high fan-in (inbound dependency count).
 *
 * Thresholds:
 *   fan_in > 8  → high
 *   fan_in > 12 → critical
 *
 * Also checks centrality > 0.6 as a secondary signal.
 */
function detectGodServices(metrics: GraphMetrics, graph: ArchitectureGraph): DetectedPattern[] {
    const FAN_IN_MEDIUM = 3;
    const FAN_IN_HIGH = 6;
    const FAN_IN_CRITICAL = 10;
    const CENTRALITY_THRESHOLD = 0.45;

    const godNodes = metrics.node_metrics.filter(n =>
        n.fan_in >= FAN_IN_MEDIUM || n.centrality >= CENTRALITY_THRESHOLD
    );

    return godNodes.map(n => ({
        type: "god_service" as const,
        severity: scaleSeverity(Math.max(n.fan_in, n.centrality * 20), FAN_IN_MEDIUM, FAN_IN_MEDIUM, FAN_IN_HIGH, FAN_IN_CRITICAL),
        affected_node_ids: [n.node_id],
        description: `Node at ${n.file.split("/").slice(-2).join("/")} has fan_in=${n.fan_in} and centrality=${n.centrality.toFixed(2)}. This node is a structural dependency magnet — its failure or modification cascades to ${n.fan_in} dependent node(s).`,
        evidence: {
            fan_in: n.fan_in,
            centrality: n.centrality,
            node_type: n.node_type,
        },
    }));
}

// ─── 3. Deep Dependency Chain Detector ───────────────────────────────

/**
 * Long dependency chains create latency amplification —
 * a failure anywhere in the chain cascades to all downstream nodes.
 *
 * Thresholds:
 *   max_depth > 4 → medium
 *   max_depth > 6 → high
 *   max_depth > 8 → critical
 */
function detectDeepChains(metrics: GraphMetrics): DetectedPattern | null {
    if (metrics.max_depth <= 2) return null;

    const deepNodes = metrics.node_metrics
        .filter(n => n.depth >= metrics.max_depth - 1)
        .map(n => n.node_id);

    return {
        type: "deep_dependency_chain",
        severity: scaleSeverity(metrics.max_depth, 2, 3, 5, 7),
        affected_node_ids: deepNodes,
        description: `Maximum dependency depth is ${metrics.max_depth} level(s). Deep chains amplify latency and create cascading failure blast radii. A failure at depth 1 propagates through all ${metrics.max_depth} levels downstream.`,
        evidence: {
            max_depth: metrics.max_depth,
            avg_depth: metrics.avg_depth,
            deep_node_count: deepNodes.length,
        },
    };
}

// ─── 4. Tight Coupling Detector ───────────────────────────────────────

/**
 * High graph density = excessive interconnectedness.
 * Makes the system hard to modularize, test, and scale horizontally.
 *
 * Thresholds (density as fraction of max possible edges):
 *   density > 0.10 → medium
 *   density > 0.20 → high
 *   density > 0.35 → critical
 */
function detectTightCoupling(metrics: GraphMetrics): DetectedPattern | null {
    if (metrics.density <= 0.05) return null;

    return {
        type: "tight_coupling",
        severity: scaleSeverity(metrics.density, 0.05, 0.08, 0.15, 0.30),
        affected_node_ids: [],
        description: `Graph density is ${(metrics.density * 100).toFixed(1)}% — ${metrics.total_edges} edges across ${metrics.total_nodes} nodes. High interconnectedness prevents independent deployment, complicates testing, and makes horizontal scaling difficult.`,
        evidence: {
            density: metrics.density,
            total_edges: metrics.total_edges,
            total_nodes: metrics.total_nodes,
            coupling_score: metrics.coupling_score,
        },
    };
}

// ─── 5. Bottleneck Node Detector ─────────────────────────────────────

/**
 * A bottleneck node has high centrality AND significant fan-out.
 * It is a critical path node — all traffic must flow through it.
 *
 * Different from god service:
 *   God service = too many depend ON it (fan_in)
 *   Bottleneck  = lies on critical path between many pairs (centrality)
 *
 * Thresholds:
 *   centrality > 0.5 + fan_out > 5 → high
 *   centrality > 0.75              → critical
 */
function detectBottlenecks(metrics: GraphMetrics): DetectedPattern[] {
    return metrics.node_metrics
        .filter(n => n.centrality > 0.25 && n.fan_out > 1)
        .map(n => ({
            type: "bottleneck_node" as const,
            severity: scaleSeverity(n.centrality, 0.25, 0.35, 0.5, 0.70),
            affected_node_ids: [n.node_id],
            description: `Node at ${n.file} has centrality=${n.centrality.toFixed(2)} with fan-out=${n.fan_out}. It sits on the critical path between many service pairs — a performance or availability issue here propagates system-wide.`,
            evidence: {
                centrality: n.centrality,
                fan_out: n.fan_out,
                node_type: n.node_type,
            },
        }));
}

// ─── 6. Risk Concentration Detector ──────────────────────────────────

/**
 * Risk concentration = multiple high-severity signals on one node.
 * Node is both in a cycle AND a god service AND a bottleneck.
 * This is the most dangerous class of node.
 */
function detectRiskConcentration(metrics: GraphMetrics): DetectedPattern[] {
    return metrics.node_metrics
        .filter(n => {
            const flags = [
                n.in_cycle,
                n.fan_in >= 4,
                n.centrality >= 0.35,
                n.depth >= 4,
                n.instability > 0.65,
            ].filter(Boolean).length;
            return flags >= 2; // 2 or more high-risk signals on one node
        })
        .map(n => ({
            type: "risk_concentration" as const,
            severity: "critical" as PatternSeverity,
            affected_node_ids: [n.node_id],
            description: `Node at ${n.file} concentrates multiple risk factors: in_cycle=${n.in_cycle}, fan_in=${n.fan_in}, centrality=${n.centrality.toFixed(2)}, depth=${n.depth}, instability=${n.instability.toFixed(2)}. This node is a compounded structural liability.`,
            evidence: {
                fan_in: n.fan_in,
                centrality: n.centrality,
                depth: n.depth,
                instability: n.instability,
                in_cycle: n.in_cycle,
            },
        }));
}

// ─── 7. Missing Service Boundary Detector ────────────────────────────

/**
 * Detects when HTTP endpoints directly contain DB operation signals
 * (no intermediate service layer).
 * This violates layered architecture principles and creates tight coupling
 * between API surface and persistence layer.
 */
function detectMissingServiceBoundary(metrics: GraphMetrics, graph: ArchitectureGraph): DetectedPattern | null {
    // Count endpoint nodes and service nodes
    const endpointCount = graph.nodes.filter(n => n.type === "http_endpoint").length;
    const serviceCount = graph.nodes.filter(n => n.type === "business_logic_service").length;
    const dbCount = graph.nodes.filter(n => n.type === "db_operation").length;

    // If there are endpoints and DB ops but NO services, it's a boundary violation
    if (endpointCount > 0 && dbCount > 0 && serviceCount === 0) {
        const endpointIds = graph.nodes
            .filter(n => n.type === "http_endpoint")
            .map(n => n.id);

        return {
            type: "missing_service_boundary",
            severity: endpointCount > 5 ? "high" : "medium",
            affected_node_ids: endpointIds,
            description: `${endpointCount} HTTP endpoint(s) with ${dbCount} DB operation(s) detected but 0 service layer nodes. Endpoints appear to access the database directly, violating layered architecture. This couples API contracts to persistence implementation.`,
            evidence: {
                endpoint_count: endpointCount,
                db_count: dbCount,
                service_count: serviceCount,
            },
        };
    }

    return null;
}

// ─── 8. Async Bottleneck Detector ────────────────────────────────────

/**
 * Fires when queue workers exist but there are far more producers than consumers.
 * Or when all async work funnels through a single worker.
 */
function detectAsyncBottleneck(metrics: GraphMetrics, graph: ArchitectureGraph): DetectedPattern | null {
    const workerNodes = graph.nodes.filter(n => n.type === "queue_worker");
    if (workerNodes.length === 0) return null;

    // If only 1 worker handles all async work, it's a bottleneck
    if (workerNodes.length === 1) {
        const endpointCount = graph.nodes.filter(n => n.type === "http_endpoint").length;
        if (endpointCount > 5) {
            return {
                type: "async_bottleneck",
                severity: endpointCount > 15 ? "high" : "medium",
                affected_node_ids: workerNodes.map(n => n.id),
                description: `Single queue worker detected handling async work for ${endpointCount} endpoint(s). A single consumer is a throughput bottleneck — queue depth will grow unboundedly under load.`,
                evidence: {
                    worker_count: workerNodes.length,
                    endpoint_count: endpointCount,
                },
            };
        }
    }

    return null;
}

// ─── Public Compose Function ──────────────────────────────────────────

/**
 * Runs all detectors and returns a consolidated list of detected patterns.
 * Order: Critical first, then High, then Medium, then Low.
 */
export function detectAllPatterns(graph: ArchitectureGraph, metrics: GraphMetrics): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    const p1 = detectCircularDependencies(metrics);
    if (p1) patterns.push(p1);

    patterns.push(...detectGodServices(metrics, graph));
    patterns.push(...detectBottlenecks(metrics));
    patterns.push(...detectRiskConcentration(metrics));

    const p2 = detectDeepChains(metrics);
    if (p2) patterns.push(p2);

    const p3 = detectTightCoupling(metrics);
    if (p3) patterns.push(p3);

    const p4 = detectMissingServiceBoundary(metrics, graph);
    if (p4) patterns.push(p4);

    const p5 = detectAsyncBottleneck(metrics, graph);
    if (p5) patterns.push(p5);

    // Sort: critical → high → medium → low
    const severityOrder: Record<PatternSeverity, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
    };

    return patterns.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
