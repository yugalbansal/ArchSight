/**
 * Intelligence Engine — Schema Definitions
 * ─────────────────────────────────────────
 * Defines all strict input/output contracts consumed and produced
 * by Engine 3. Engine 3 NEVER reads raw code — it only reasons
 * over structured graph data produced by Engine 1.
 *
 * Decision Authority Order (overrides AI intuition):
 *   1. Explicit detected patterns
 *   2. Structural metrics
 *   3. Aggregate risk score
 *   4. Derived architectural interpretation
 */

import type { ArchitectureGraph, ArchitectureNode } from "../repo_engine/v3/graph/builder.js";

// ─── Re-export graph types for convenience ───────────────────────────
export type { ArchitectureGraph, ArchitectureNode };

// ─── Node Types emitted by Engine 1 ─────────────────────────────────
export type SemanticNodeType =
    | "http_endpoint"
    | "db_operation"
    | "business_logic_service"
    | "external_service"
    | "queue_worker"
    | "unknown";

// ─── Pattern Types ───────────────────────────────────────────────────

/**
 * Each detected pattern corresponds to a concrete architectural smell.
 * Severity is deterministic — not inferred. Computed from metrics.
 */
export type PatternType =
    | "circular_dependency"     // Cycle in import/call graph
    | "god_service"             // Node with excessively high fan-in
    | "deep_dependency_chain"   // Max depth exceeds safe threshold
    | "tight_coupling"          // Density too high for safe scaling
    | "bottleneck_node"         // High centrality = single point of failure
    | "async_bottleneck"        // Queue workers backed up by single dispatcher
    | "risk_concentration"      // Multiple high-severity signals on one node
    | "missing_service_boundary"; // DB ops accessed directly from endpoints (no service layer)

export type PatternSeverity = "low" | "medium" | "high" | "critical";

export interface DetectedPattern {
    type: PatternType;
    severity: PatternSeverity;
    /** IDs of ArchitectureGraph nodes involved */
    affected_node_ids: string[];
    /** Human-readable description of what was detected */
    description: string;
    /** Metric values that triggered this pattern */
    evidence: Record<string, number | string | boolean>;
}

// ─── Per-Node Metrics ────────────────────────────────────────────────

/**
 * Computed for each node in the ArchitectureGraph.
 * Used for pattern detection and priority ranking.
 *
 * Interpretation Thresholds:
 *   fan_in  > 8   → bottleneck risk
 *   fan_out > 10  → god service risk
 *   centrality > 0.6 → structural SPOF
 *   instability > 0.65 → volatility risk
 */
export interface NodeMetrics {
    node_id: string;
    node_type: string;
    file: string;
    fan_in: number;       // How many other nodes depend on this node
    fan_out: number;      // How many nodes this node depends on
    centrality: number;   // Betweenness centrality (0.0 - 1.0)
    instability: number;  // fan_out / (fan_in + fan_out) — Martin's metric
    in_cycle: boolean;    // Whether this node is part of a dependency cycle
    depth: number;        // Longest path from entry points to this node
}

// ─── Graph-Level Metrics ─────────────────────────────────────────────

/**
 * Aggregate metrics computed over the entire ArchitectureGraph.
 *
 * Metric Interpretation Guide:
 *   density > 0.20           → high system interconnectedness
 *   max_depth > 6            → cascading failure risk
 *   cycles_detected > 0      → structural integrity violation
 *   coupling_score > 15      → high structural entanglement
 *   avg_instability > 0.65   → architectural volatility
 *   largest_scc_size > 5     → boundary violation risk
 *
 * Risk Score Bands:
 *   > 70  → critical
 *   50-70 → high
 *   30-50 → medium
 *   < 30  → low
 */
export interface GraphMetrics {
    total_nodes: number;
    total_edges: number;
    density: number;
    max_depth: number;
    avg_depth: number;
    cycles_detected: number;
    risk_score: number;           // 0 - 100 composite score
    strongly_connected_components: number;
    largest_scc_size: number;
    avg_fan_in: number;
    avg_fan_out: number;
    coupling_score: number;       // (total_fan_in + total_fan_out) / total_nodes
    avg_instability: number;      // Average Martin instability across all nodes
    node_metrics: NodeMetrics[];  // Per-node breakdown
}

// ─── Intelligence Engine Input ────────────────────────────────────────

/**
 * The ONLY input Engine 3 receives.
 * Engine 3 is completely isolated from raw code, file content, or ASTs.
 */
export interface IntelligenceInput {
    scan_id: string;
    repo_id: string;
    framework: string;
    frameworks: string[];
    graph: ArchitectureGraph;
}

// ─── Insight Item ────────────────────────────────────────────────────

/**
 * A single actionable engineering insight.
 * Insights are strategic, not code-level.
 */
export interface InsightItem {
    id: string;
    category: "risk" | "performance" | "architecture" | "scalability";
    severity: PatternSeverity;
    title: string;
    description: string;
    /** Node IDs this insight is about */
    affected_nodes: string[];
    /** High-level strategic direction — no code-level advice */
    recommendation: string;
    /** Which metric / pattern triggered this insight */
    triggered_by: string;
}

// ─── Intelligence Engine Output ───────────────────────────────────────

/**
 * Strict, typed output contract for Engine 3.
 * Stored in DB, consumed by frontend for the Insights Panel.
 * No markdown. No commentary outside this schema.
 *
 * Risk Escalation Rules (applied before output):
 *   - cycles_detected > 0              → overall_risk_level cannot be "low"
 *   - multiple high-severity patterns  → escalate one level
 *   - risk_score > 70                  → must be "high" or "critical"
 *   - risk_score > 85                  → must be "critical"
 *   - max_depth > 6                    → scaling_outlook must mention cascading risk
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient_data";
export type AnalysisMode = "executive" | "engineering";

export interface IntelligenceOutput {
    scan_id: string;

    // ── Structural Summary ────────────────────────────────────────────
    architectural_theme: string;
    overall_risk_level: RiskLevel;
    confidence_level: ConfidenceLevel;

    // ── Risk & Priority ───────────────────────────────────────────────
    /** The top metric/pattern driving the risk score */
    primary_risk_drivers: string[];
    /** Node IDs ordered from highest intervention priority to lowest */
    priority_order: string[];

    // ── Strategic Guidance ────────────────────────────────────────────
    /** High-level strategic direction — modularization, domain separation, etc. */
    refactor_strategy: string;
    /** How current architecture will behave under load growth */
    scaling_outlook: string;
    /** Long-term evolution path for the architecture */
    long_term_recommendation: string;

    // ── Detailed Insights (list of actionable items) ──────────────────
    insights: InsightItem[];

    // ── Detected Patterns ─────────────────────────────────────────────
    detected_patterns: DetectedPattern[];

    // ── Raw Metrics (for frontend graph / future monitoring) ──────────
    metrics: GraphMetrics;

    // ── Meta ──────────────────────────────────────────────────────────
    analyzed_at: string;
    engine_version: string;
}
