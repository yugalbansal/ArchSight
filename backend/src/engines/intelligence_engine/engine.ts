/**
 * Intelligence Engine — Main Orchestrator
 * ─────────────────────────────────────────
 * Engine 3: Intelligence & Analysis Engine
 *
 * Role: Technical PM + Architecture Intelligence Layer
 * Identity: Senior distributed systems architect, risk analyst,
 *           platform engineer, architecture reviewer, scalability consultant.
 *
 * Reasoning mode:
 *   - System-level, NOT code-level
 *   - Deterministic metrics take priority over AI interpretation
 *   - Strategic output only — executive-level clarity
 *   - Long-term architectural sustainability lens
 *
 * Decision Authority Order (strictly enforced):
 *   1. Explicit detected patterns
 *   2. Structural metrics
 *   3. Aggregate risk score
 *   4. Derived architectural interpretation
 *
 * Anti-Hallucination Contract:
 *   - NEVER invent service names
 *   - NEVER assume runtime traffic, load, or infrastructure
 *   - NEVER infer behavior not evidenced by the graph
 *   - If data is insufficient → confidence_level = "insufficient_data"
 *   - All conclusions must reference a specific metric or pattern
 *
 * Consistency Rules (applied before output emission):
 *   - cycles_detected > 0              → risk cannot be "low"
 *   - risk_score > 85                  → risk must be "critical"
 *   - risk_score > 70                  → risk must be "high" or "critical"
 *   - multiple high-severity patterns  → escalate risk one level
 *   - max_depth > 6                    → scaling_outlook must mention cascading risk
 */

import type { IntelligenceInput, IntelligenceOutput, GraphMetrics, DetectedPattern, RiskLevel, ConfidenceLevel } from "./schemas.js";
import { computeGraphMetrics } from "./metrics.js";
import { detectAllPatterns } from "./patterns.js";
import { generateInsights } from "./insights.js";

const ENGINE_VERSION = "3.0.0";

// ─── Risk Level Calculator ────────────────────────────────────────────

/**
 * Computes risk level from metrics + detected patterns.
 * Applies all consistency guard rules.
 *
 * Base risk from score:
 *   > 85  → critical
 *   > 70  → high
 *   > 50  → high
 *   > 30  → medium
 *   else  → low
 *
 * Escalation Rules:
 *   - cycles_detected > 0           → minimum "medium"
 *   - 2+ critical patterns          → escalate to "critical"
 *   - 3+ high-severity patterns     → escalate one level
 *   - max_depth > 6                 → minimum "medium"
 */
function computeRiskLevel(metrics: GraphMetrics, patterns: DetectedPattern[]): RiskLevel {
    // Base risk from score
    let level: RiskLevel =
        metrics.risk_score > 85 ? "critical" :
        metrics.risk_score > 70 ? "high" :
        metrics.risk_score > 50 ? "high" :
        metrics.risk_score > 30 ? "medium" :
        "low";

    // Consistency guards

    // Rule 1: Any cycle → cannot be low
    if (metrics.cycles_detected > 0 && level === "low") {
        level = "medium";
    }

    // Rule 2: Deep chains → cannot be low
    if (metrics.max_depth > 6 && level === "low") {
        level = "medium";
    }

    // Rule 3: Multiple critical patterns → escalate to critical
    const criticalPatterns = patterns.filter(p => p.severity === "critical").length;
    if (criticalPatterns >= 2) {
        level = "critical";
    }

    // Rule 4: 3+ high patterns → escalate one level
    const highPatterns = patterns.filter(p => p.severity === "high" || p.severity === "critical").length;
    if (highPatterns >= 3) {
        const escalate: Record<RiskLevel, RiskLevel> = {
            low: "medium",
            medium: "high",
            high: "critical",
            critical: "critical",
        };
        level = escalate[level];
    }

    return level;
}

// ─── Confidence Level Calculator ─────────────────────────────────────

/**
 * Confidence is based on signal density in the graph.
 * More nodes + edges = more data = higher confidence.
 */
function computeConfidence(metrics: GraphMetrics): ConfidenceLevel {
    if (metrics.total_nodes === 0) return "insufficient_data";
    if (metrics.total_nodes >= 10 && metrics.total_edges >= 5) return "high";
    if (metrics.total_nodes >= 5) return "medium";
    return "low";
}

// ─── Architectural Theme Derivation ──────────────────────────────────

/**
 * Derives the dominant architectural theme from graph shape.
 * Precedence: detected patterns > metrics > node type distribution.
 */
function deriveArchitecturalTheme(
    metrics: GraphMetrics,
    patterns: DetectedPattern[],
    input: IntelligenceInput
): string {
    const graph = input.graph;

    if (metrics.total_nodes === 0) return "Unresolvable — insufficient graph data";

    const hasCircles = patterns.some(p => p.type === "circular_dependency");
    const hasGodServices = patterns.some(p => p.type === "god_service");
    const hasMissingBoundary = patterns.some(p => p.type === "missing_service_boundary");
    const hasTightCoupling = patterns.some(p => p.type === "tight_coupling");

    const endpointCount = graph.nodes.filter(n => n.type === "http_endpoint").length;
    const serviceCount = graph.nodes.filter(n => n.type === "business_logic_service").length;
    const workerCount = graph.nodes.filter(n => n.type === "queue_worker").length;
    const externalCount = graph.nodes.filter(n => n.type === "external_service").length;

    // Pattern-first theme determination
    if (hasCircles && hasGodServices) return "Entangled Monolith — Circular Coupling with Responsibility Overload";
    if (hasCircles) return "Structurally Coupled Architecture — Active Circular Dependencies";
    if (hasGodServices && hasMissingBoundary) return "Controller-Heavy Architecture — Missing Domain Layer";
    if (hasMissingBoundary) return "Layerless Architecture — No Service Boundary Detected";
    if (hasTightCoupling && metrics.density > 0.25) return "Tightly Coupled Distributed Architecture";

    // Metric-based theme
    if (serviceCount > endpointCount && workerCount > 0) return "Event-Driven Service Architecture";
    if (workerCount > 2) return "Worker-Heavy Async Architecture";
    if (externalCount > 3) return "API Integration-Heavy Architecture";
    if (serviceCount > 3 && metrics.density < 0.1) return "Loosely Coupled Service-Oriented Architecture";
    if (endpointCount > 0 && serviceCount === 0) return "Controller-Centric Architecture (No Service Layer)";
    if (metrics.total_nodes < 5) return "Minimal Service Structure";

    return "Modular Service-Oriented Architecture";
}

// ─── Primary Risk Drivers ─────────────────────────────────────────────

function derivePrimaryRiskDrivers(metrics: GraphMetrics, patterns: DetectedPattern[]): string[] {
    const drivers: string[] = [];

    if (metrics.cycles_detected > 0) {
        drivers.push(`${metrics.cycles_detected} circular dependency cycle(s) detected`);
    }
    if (metrics.risk_score > 70) {
        drivers.push(`Composite risk score: ${metrics.risk_score}/100`);
    }
    if (metrics.density > 0.2) {
        drivers.push(`High graph density: ${(metrics.density * 100).toFixed(1)}%`);
    }
    if (metrics.max_depth > 6) {
        drivers.push(`Deep dependency chain: max_depth=${metrics.max_depth}`);
    }
    if (metrics.avg_instability > 0.65) {
        drivers.push(`High avg instability: ${(metrics.avg_instability * 100).toFixed(0)}%`);
    }
    if (metrics.largest_scc_size > 3) {
        drivers.push(`Large strongly connected component: ${metrics.largest_scc_size} nodes`);
    }

    // Add critical pattern names
    patterns
        .filter(p => p.severity === "critical" || p.severity === "high")
        .slice(0, 3)
        .forEach(p => {
            const label = p.type.replace(/_/g, " ");
            if (!drivers.some(d => d.toLowerCase().includes(label))) {
                drivers.push(`Detected pattern: ${label}`);
            }
        });

    return drivers.slice(0, 6);
}

// ─── Priority Order ───────────────────────────────────────────────────

/**
 * Ranks nodes by intervention priority.
 * Priority Order:
 *   1. Nodes in cycles
 *   2. Nodes with highest severity patterns
 *   3. Nodes with highest coupling (fan_in + fan_out)
 *   4. Nodes with highest instability
 *   5. Nodes with highest centrality
 */
function derivePriorityOrder(metrics: GraphMetrics, patterns: DetectedPattern[]): string[] {
    const patternNodeIds = new Set(
        patterns
            .filter(p => p.severity === "critical" || p.severity === "high")
            .flatMap(p => p.affected_node_ids)
    );

    return metrics.node_metrics
        .map(n => ({
            id: n.node_id,
            score:
                (n.in_cycle ? 100 : 0) +
                (patternNodeIds.has(n.node_id) ? 80 : 0) +
                (n.fan_in * 3) +
                (n.fan_out * 2) +
                (n.instability * 20) +
                (n.centrality * 15),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(n => n.id);
}

// ─── Refactor Strategy ────────────────────────────────────────────────

function deriveRefactorStrategy(patterns: DetectedPattern[], metrics: GraphMetrics): string {
    if (patterns.length === 0) {
        return "Architecture is structurally healthy. Continue enforcing service boundaries and monitoring complexity growth as the system scales.";
    }

    const hasCircles = patterns.some(p => p.type === "circular_dependency");
    const hasGodService = patterns.some(p => p.type === "god_service");
    const hasMissingBoundary = patterns.some(p => p.type === "missing_service_boundary");
    const hasTightCoupling = patterns.some(p => p.type === "tight_coupling");
    const criticalCount = patterns.filter(p => p.severity === "critical").length;

    if (criticalCount >= 2) {
        return "Immediate structural intervention required. Initiate a time-boxed architectural remediation cycle. Priority: break all detected cycles first (eliminates cascading risk), then decompose any god services, then establish explicit service boundaries. Do not add new features until structural stability is restored.";
    }

    if (hasCircles && hasGodService) {
        return "Two-phase refactor required. Phase 1: Eliminate circular dependencies using Dependency Inversion (introduce interfaces/events between cyclic modules). Phase 2: Decompose god services along domain boundaries. Each phase should be independently merged and deployed.";
    }

    if (hasCircles) {
        return "Break dependency cycles using Dependency Inversion Principle. Introduce interface abstractions or an event bus between mutually dependent modules. Validate cycle elimination with static analysis tooling before proceeding to other improvements.";
    }

    if (hasGodService && hasMissingBoundary) {
        return "Introduce a service layer to separate API surface from business logic. Extract god service responsibilities into domain-specific, independently deployable services. Apply Domain-Driven Design principles to identify natural service boundaries.";
    }

    if (hasTightCoupling) {
        return "Introduce event-driven communication between the most tightly coupled service pairs. Establish explicit API contracts for each service. Treat each service as an independently deployable unit — if two services require simultaneous deployment, re-evaluate their boundary.";
    }

    if (hasMissingBoundary) {
        return "Establish a service layer between the API and persistence tiers. Adopt the Repository Pattern for all database interactions. This enables business logic reuse, simplifies testing, and prevents business rules from leaking into the transport layer.";
    }

    return "Incremental boundary hardening recommended. Strengthen service contracts, reduce inter-service coupling where fan-in or fan-out exceeds threshold, and introduce observability at critical path nodes.";
}

// ─── Scaling Outlook ──────────────────────────────────────────────────

function deriveScalingOutlook(metrics: GraphMetrics, patterns: DetectedPattern[]): string {
    const parts: string[] = [];

    if (metrics.cycles_detected > 0) {
        parts.push("Circular dependencies prevent stateless service replication — horizontal scaling is structurally blocked until cycles are resolved.");
    }

    if (metrics.max_depth > 6) {
        parts.push(`Cascading latency risk: the ${metrics.max_depth}-level dependency chain amplifies P99 latency under load. Each tier adds cumulative wait time — consider async decoupling for deep chains.`);
    }

    if (metrics.density > 0.2) {
        parts.push("High graph density creates inter-service coordination overhead. Under load, this manifests as distributed transaction complexity and fan-out latency spikes.");
    }

    const bottlenecks = patterns.filter(p => p.type === "bottleneck_node" || p.type === "god_service");
    if (bottlenecks.length > 0) {
        parts.push(`${bottlenecks.length} throughput bottleneck(s) detected. High-centrality nodes become saturation points under increased request volume.`);
    }

    if (patterns.some(p => p.type === "async_bottleneck")) {
        parts.push("Async pipeline has insufficient consumer capacity — queue depth will grow unboundedly under load spikes.");
    }

    if (parts.length === 0) {
        return metrics.total_nodes < 5
            ? "Architecture is too small to predict scaling behavior with confidence. Add more structural signals through continued development."
            : "Current architecture supports horizontal scaling. Monitor coupling score and centrality as node count grows. Scaling risk is low at current structural complexity.";
    }

    return parts.join(" ");
}

// ─── Long-Term Recommendation ─────────────────────────────────────────

function deriveLongTermRecommendation(
    metrics: GraphMetrics,
    patterns: DetectedPattern[],
    input: IntelligenceInput
): string {
    const hasWorkers = input.graph.nodes.some(n => n.type === "queue_worker");
    const frameworks = input.frameworks ?? [input.framework];
    const criticalCount = patterns.filter(p => p.severity === "critical").length;

    if (criticalCount >= 2) {
        return "Architectural health is critically compromised. Long-term evolution requires a stabilization milestone before any feature expansion. Adopt architecture fitness functions (automated structural tests) to prevent regression. Consider a formal architectural review process gated on risk score thresholds.";
    }

    if (metrics.risk_score > 50) {
        return "Evolve toward a domain-partitioned architecture. Establish clear bounded contexts and enforce service boundaries at the deployment unit level. Introduce architecture-as-code tooling to track structural metrics over time. The current risk trajectory will compound — proactive refactoring is cheaper than reactive rewrites.";
    }

    if (hasWorkers && metrics.density < 0.15) {
        return "Architecture shows healthy async pipeline separation. Long-term, invest in event sourcing or CQRS patterns to further decouple read and write paths. Monitor worker backlog as throughput grows.";
    }

    return "Architecture is in a healthy evolutionary state. Long-term: adopt continuous architecture monitoring to catch complexity accumulation early. Track coupling score, instability, and depth across scans. Establish team-level ownership of service boundaries to prevent gradual boundary erosion.";
}

// ─── Main Entry Point ─────────────────────────────────────────────────

/**
 * Analyzes the ArchitectureGraph produced by Engine 1 and returns
 * structured Intelligence Output for storage and frontend display.
 */
export async function analyzeArchitecture(input: IntelligenceInput): Promise<IntelligenceOutput> {
    console.log(`[IntelligenceEngine] Starting analysis for scan=${input.scan_id} repo=${input.repo_id}`);

    // ── Step 1: Compute Metrics ───────────────────────────────────────
    const metrics = computeGraphMetrics(input.graph);
    console.log(`[IntelligenceEngine] Metrics: nodes=${metrics.total_nodes} edges=${metrics.total_edges} risk=${metrics.risk_score}`);

    // ── Step 2: Detect Patterns ───────────────────────────────────────
    const detected_patterns = detectAllPatterns(input.graph, metrics);
    console.log(`[IntelligenceEngine] Detected ${detected_patterns.length} patterns (${detected_patterns.filter(p => p.severity === "critical").length} critical)`);

    // ── Step 3: Generate Insights ─────────────────────────────────────
    const insights = generateInsights(input.graph, metrics, detected_patterns);

    // ── Step 4: Compute Risk Level (with consistency guards) ──────────
    const overall_risk_level = computeRiskLevel(metrics, detected_patterns);

    // ── Step 5: Compute Confidence ────────────────────────────────────
    const confidence_level = computeConfidence(metrics);

    // ── Step 6: Derive Themes & Strategic Output ──────────────────────
    const architectural_theme = deriveArchitecturalTheme(metrics, detected_patterns, input);
    const primary_risk_drivers = derivePrimaryRiskDrivers(metrics, detected_patterns);
    const priority_order = derivePriorityOrder(metrics, detected_patterns);
    const refactor_strategy = deriveRefactorStrategy(detected_patterns, metrics);
    const scaling_outlook = deriveScalingOutlook(metrics, detected_patterns);
    const long_term_recommendation = deriveLongTermRecommendation(metrics, detected_patterns, input);

    const output: IntelligenceOutput = {
        scan_id: input.scan_id,
        architectural_theme,
        overall_risk_level,
        confidence_level,
        primary_risk_drivers,
        priority_order,
        refactor_strategy,
        scaling_outlook,
        long_term_recommendation,
        insights,
        detected_patterns,
        metrics,
        analyzed_at: new Date().toISOString(),
        engine_version: ENGINE_VERSION,
    };

    console.log(`[IntelligenceEngine] Analysis complete. Risk=${overall_risk_level} Confidence=${confidence_level} Theme="${architectural_theme}"`);

    return output;
}
