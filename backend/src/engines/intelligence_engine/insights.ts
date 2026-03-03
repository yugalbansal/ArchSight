/**
 * Intelligence Engine — Insights Generator
 * ──────────────────────────────────────────
 * Transforms detected patterns + graph metrics into actionable InsightItems.
 *
 * Design Principles:
 *   - Strategic guidance only — no code-level advice
 *   - Every insight is traceable to a specific metric or pattern
 *   - Insights are non-redundant (deduplication by node + category)
 *   - Output is ordered: critical → high → medium → low
 */

import crypto from "crypto";
import type { ArchitectureGraph } from "../repo_engine/v3/graph/builder.js";
import type { DetectedPattern, GraphMetrics, InsightItem } from "./schemas.js";

// ─── Insight Builders ─────────────────────────────────────────────────

/**
 * One InsightItem per DetectedPattern.
 * Maps pattern type to strategic recommendation.
 */
function insightFromPattern(pattern: DetectedPattern): InsightItem {
    const base = {
        id: crypto.randomBytes(6).toString("hex"),
        severity: pattern.severity,
        affected_nodes: pattern.affected_node_ids,
        triggered_by: pattern.type,
    };

    switch (pattern.type) {
        case "circular_dependency":
            return {
                ...base,
                category: "architecture",
                title: "Circular Dependency Detected",
                description: pattern.description,
                recommendation: "Apply the Dependency Inversion Principle. Introduce an abstraction layer (interface or event bus) between the mutually dependent modules to break the cycle. Consider extracting shared logic into a dedicated, independently deployable shared library.",
            };

        case "god_service":
            return {
                ...base,
                category: "architecture",
                title: "God Service — Excessive Responsibility",
                description: pattern.description,
                recommendation: "Decompose this service along domain boundaries. Apply Single Responsibility Principle at service level. Consider extracting sub-domains into dedicated services with explicit contracts. Prioritize this refactor before scaling horizontally.",
            };

        case "deep_dependency_chain":
            return {
                ...base,
                category: "performance",
                title: "Deep Dependency Chain — Cascading Latency Risk",
                description: pattern.description,
                recommendation: "Flatten the dependency hierarchy by introducing an orchestration layer or event-driven communication for deep chains. Consider async patterns (message queues) to decouple depth-critical paths. Set circuit breakers on deep chain entry points.",
            };

        case "tight_coupling":
            return {
                ...base,
                category: "scalability",
                title: "Tight Coupling — Horizontal Scaling Blocked",
                description: pattern.description,
                recommendation: "Identify the highest-traffic inter-service edges and introduce event-driven communication. Establish clear service boundaries with explicit API contracts. Treat each service as a deployment unit — if two services always change together, they should be merged or their boundary re-drawn.",
            };

        case "bottleneck_node":
            return {
                ...base,
                category: "performance",
                title: "Bottleneck Node — Critical Path SPOF",
                description: pattern.description,
                recommendation: "Introduce redundancy and load distribution for this node. If it is a service, ensure it is stateless for horizontal scaling. If it is a DB operation node, evaluate read replicas or CQRS patterns. Add health monitoring and circuit breakers here first.",
            };

        case "async_bottleneck":
            return {
                ...base,
                category: "scalability",
                title: "Async Bottleneck — Single Worker Concentration",
                description: pattern.description,
                recommendation: "Partition queue consumers by work domain. Introduce competing consumers (multiple worker instances per queue). Evaluate priority queues for differentiated SLAs. Consider consumer group patterns to allow independent scaling of async pipelines.",
            };

        case "risk_concentration":
            return {
                ...base,
                category: "risk",
                title: "Risk Concentration — Compounded Structural Liability",
                description: pattern.description,
                recommendation: "This node requires immediate architectural intervention. It should be the top priority in any refactoring roadmap. Begin by extracting the most independent responsibilities. Introduce a facade to stabilize its external interface while the internal decomposition proceeds.",
            };

        case "missing_service_boundary":
            return {
                ...base,
                category: "architecture",
                title: "Missing Service Layer — Direct Persistence Access",
                description: pattern.description,
                recommendation: "Introduce a service layer between API endpoints and database operations. This establishes the Repository Pattern or Service Pattern. This boundary is essential for testability, business logic reuse, and long-term maintainability.",
            };
    }
}

// ─── Graph-Level Insights (non-pattern-based) ─────────────────────────

/**
 * Generates additional insights from raw metrics not captured by patterns.
 */
function graphLevelInsights(metrics: GraphMetrics, graph: ArchitectureGraph): InsightItem[] {
    const insights: InsightItem[] = [];

    // High instability insight
    if (metrics.avg_instability > 0.65) {
        insights.push({
            id: crypto.randomBytes(6).toString("hex"),
            category: "architecture",
            severity: "medium",
            title: "High Average Instability — Volatile Dependency Structure",
            description: `Average Martin instability is ${(metrics.avg_instability * 100).toFixed(0)}%. High instability means most components depend more on outgoing dependencies than they receive incoming — making the system volatile to upstream changes.`,
            affected_nodes: metrics.node_metrics
                .filter(n => n.instability > 0.7)
                .map(n => n.node_id),
            recommendation: "Identify the most unstable components and introduce stability-increasing patterns: depend on abstractions (interfaces/contracts), not concrete implementations. Stable components should be depended on by unstable ones — not the reverse.",
            triggered_by: "avg_instability",
        });
    }

    // Large SCC insight
    if (metrics.largest_scc_size > 3) {
        insights.push({
            id: crypto.randomBytes(6).toString("hex"),
            category: "architecture",
            severity: metrics.largest_scc_size > 6 ? "high" : "medium",
            title: "Large Strongly Connected Component — Boundary Violation",
            description: `The largest strongly connected component contains ${metrics.largest_scc_size} nodes. This means these nodes form a mutually interdependent cluster — they cannot be independently deployed, tested, or evolved.`,
            affected_nodes: [],
            recommendation: "Identify and break the tightest coupling within the SCC. Introduce domain boundaries that allow at least a partial ordering of the dependency graph. The goal is to reduce the largest SCC to a single node.",
            triggered_by: "largest_scc_size",
        });
    }

    // No services detected insight
    const serviceCount = graph.nodes.filter(n => n.type === "business_logic_service").length;
    const endpointCount = graph.nodes.filter(n => n.type === "http_endpoint").length;
    if (endpointCount > 3 && serviceCount === 0) {
        insights.push({
            id: crypto.randomBytes(6).toString("hex"),
            category: "architecture",
            severity: "medium",
            title: "No Service Layer Detected",
            description: `${endpointCount} API endpoints detected with no business logic service layer. All application logic likely lives in controllers or route handlers.`,
            affected_nodes: graph.nodes.filter(n => n.type === "http_endpoint").map(n => n.id),
            recommendation: "Extract business logic from route handlers into a dedicated service layer. This decouples HTTP transport from business rules, enables reuse, and dramatically improves testability.",
            triggered_by: "service_count=0",
        });
    }

    return insights;
}

// ─── Public Compose Function ───────────────────────────────────────────

export function generateInsights(
    graph: ArchitectureGraph,
    metrics: GraphMetrics,
    patterns: DetectedPattern[]
): InsightItem[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    const patternInsights = patterns.map(p => insightFromPattern(p));
    const metricInsights = graphLevelInsights(metrics, graph);

    return [...patternInsights, ...metricInsights]
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
