import type {
    DetectedPattern,
    InsightItem,
    IntelligenceOutput,
    NodeMetrics,
    PatternSeverity,
} from "./schemas.js";

export interface ReportPlanItem {
    priority: "P0" | "P1" | "P2";
    title: string;
    reason: string;
    effort: string;
    expected_impact: string;
    steps: string[];
}

export interface ReportPayload {
    summary: string;
    report_markdown: string;
    implementation_plan: ReportPlanItem[];
    llm_handoff_markdown: string;
}

interface AggregatedPattern {
    type: string;
    severity: PatternSeverity;
    count: number;
    affected_node_count: number;
    examples: string[];
    description: string;
}

interface AggregatedInsight {
    title: string;
    severity: PatternSeverity;
    category: InsightItem["category"];
    recommendation: string;
    count: number;
}

interface SemanticInterpretation {
    architectural_theme: string;
    system_summary: string;
    node_roles: Array<{
        node_id: string;
        role: string;
        concern: string | null;
    }>;
}

interface BlastRadiusAnalysis {
    pattern_consequences: Array<{
        pattern_type: string;
        consequence_chain: string;
        failure_modes: string[];
        blast_radius_score: number;
        runtime_vs_compile: "runtime" | "compile" | "both" | "unknown";
    }>;
    highest_risk_node_id: string | null;
    highest_risk_reason: string;
}

interface PriorityStrategy {
    quick_wins: Array<{
        title: string;
        description: string;
        effort: "low" | "medium" | "high";
    }>;
    time_bombs: Array<{
        title: string;
        description: string;
        node_ids: string[];
    }>;
    refined_refactor_strategy: string;
    refined_scaling_outlook: string;
}

import Groq from 'groq-sdk';

const REPORT_MODE = process.env.INTELLIGENCE_REPORT_MODE ?? "deterministic";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const groqClient = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

// ── Jargon / gibberish detection ──────────────────────────────────────
const JARGON_PATTERNS = [
    /^[^a-zA-Z]*$/, // no letters at all
    /\b(asdf|qwerty|zxcvbn|aaaaaa|blah|bleh|lorem|foo bar baz|test test test)\b/i,
];
const MIN_WORD_LENGTH = 2;
const MIN_MEANINGFUL_WORDS = 2;

function detectJargon(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < 2) return true;
    for (const p of JARGON_PATTERNS) {
        if (p.test(trimmed)) return true;
    }
    // Must have at least MIN_MEANINGFUL_WORDS real words
    const words = trimmed.split(/\s+/).filter(w => w.length >= MIN_WORD_LENGTH && /[a-zA-Z]/.test(w));
    if (words.length < MIN_MEANINGFUL_WORDS && trimmed.split(/\s+/).length > 1) return true;
    // High ratio of non-alphabetic chars (random key smashing)
    const alphaRatio = (trimmed.match(/[a-zA-Z ]/g) ?? []).length / trimmed.length;
    if (alphaRatio < 0.4 && trimmed.length > 6) return true;
    return false;
}


function formatPatternName(type: string): string {
    return type
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
}

function severityRank(severity: PatternSeverity): number {
    switch (severity) {
        case "critical":
            return 4;
        case "high":
            return 3;
        case "medium":
            return 2;
        default:
            return 1;
    }
}

function shortList(items: string[], maxItems = 3): string {
    if (items.length === 0) return "none";
    return items.slice(0, maxItems).join(", ");
}

function sanitizePath(value: string): string {
    const extractedIdx = value.indexOf("/extracted/");
    if (extractedIdx >= 0) {
        const tail = value.slice(extractedIdx + "/extracted/".length);
        const parts = tail.split("/");
        if (parts.length > 1) {
            return parts.slice(1).join("/");
        }
    }
    return value;
}

function safeParseJSON<T>(text: string, fallback: T): T {
    try {
        const clean = text.replace(/```json|```/g, "").trim();
        return JSON.parse(clean) as T;
    } catch {
        return fallback;
    }
}

function ensureString(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback;
}

function ensureNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSemanticInterpretation(
    value: SemanticInterpretation,
    fallback: SemanticInterpretation
): SemanticInterpretation {
    const candidate = (value && typeof value === "object") ? (value as Partial<SemanticInterpretation>) : {};
    const nodeRoles = Array.isArray(candidate.node_roles)
        ? candidate.node_roles
              .filter((r): r is { node_id: string; role: string; concern: string | null } => Boolean(r && typeof r === "object"))
              .map((r) => ({
                  node_id: ensureString((r as { node_id?: unknown }).node_id),
                  role: ensureString((r as { role?: unknown }).role),
                  concern: (() => {
                      const c = (r as { concern?: unknown }).concern;
                      return c === null ? null : ensureString(c, null as unknown as string);
                  })(),
              }))
              .filter((r) => r.node_id.length > 0 && r.role.length > 0)
        : fallback.node_roles;

    return {
        architectural_theme: ensureString(candidate.architectural_theme, fallback.architectural_theme),
        system_summary: ensureString(candidate.system_summary, fallback.system_summary),
        node_roles: nodeRoles,
    };
}

function normalizeBlastRadiusAnalysis(
    value: BlastRadiusAnalysis,
    fallback: BlastRadiusAnalysis
): BlastRadiusAnalysis {
    const candidate = (value && typeof value === "object") ? (value as Partial<BlastRadiusAnalysis>) : {};

    const patternConsequences: BlastRadiusAnalysis["pattern_consequences"] = Array.isArray(candidate.pattern_consequences)
        ? candidate.pattern_consequences
              .filter((c): c is NonNullable<BlastRadiusAnalysis["pattern_consequences"]>[number] => Boolean(c && typeof c === "object"))
              .map((c): BlastRadiusAnalysis["pattern_consequences"][number] => {
                  const mode = (c as { runtime_vs_compile?: unknown }).runtime_vs_compile;
                  const runtimeVsCompile: "runtime" | "compile" | "both" | "unknown" =
                      mode === "runtime" || mode === "compile" || mode === "both" || mode === "unknown"
                          ? mode
                          : "unknown";

                  return {
                      pattern_type: ensureString((c as { pattern_type?: unknown }).pattern_type, "unknown_pattern"),
                      consequence_chain: ensureString((c as { consequence_chain?: unknown }).consequence_chain, "No consequence chain provided."),
                      failure_modes: Array.isArray((c as { failure_modes?: unknown }).failure_modes)
                          ? ((c as { failure_modes?: unknown[] }).failure_modes ?? [])
                                .filter((m): m is string => typeof m === "string")
                          : [],
                      blast_radius_score: ensureNumber((c as { blast_radius_score?: unknown }).blast_radius_score, 0),
                      runtime_vs_compile: runtimeVsCompile,
                  };
              })
        : fallback.pattern_consequences;

    return {
        pattern_consequences: patternConsequences,
        highest_risk_node_id: ensureString(candidate.highest_risk_node_id, fallback.highest_risk_node_id ?? "") || null,
        highest_risk_reason: ensureString(candidate.highest_risk_reason, fallback.highest_risk_reason),
    };
}

function normalizePriorityStrategy(
    value: PriorityStrategy,
    fallback: PriorityStrategy
): PriorityStrategy {
    const candidate = (value && typeof value === "object") ? (value as Partial<PriorityStrategy>) : {};

    const quickWins: PriorityStrategy["quick_wins"] = Array.isArray(candidate.quick_wins)
        ? candidate.quick_wins
              .filter((w): w is NonNullable<PriorityStrategy["quick_wins"]>[number] => Boolean(w && typeof w === "object"))
              .map((w): PriorityStrategy["quick_wins"][number] => {
                  const effort = (w as { effort?: unknown }).effort;
                  const effortValue: "low" | "medium" | "high" =
                      effort === "low" || effort === "medium" || effort === "high" ? effort : "medium";

                  return {
                      title: ensureString((w as { title?: unknown }).title, "Untitled quick win"),
                      description: ensureString((w as { description?: unknown }).description, ""),
                      effort: effortValue,
                  };
              })
        : fallback.quick_wins;

    const timeBombs = Array.isArray(candidate.time_bombs)
        ? candidate.time_bombs
              .filter((t): t is NonNullable<PriorityStrategy["time_bombs"]>[number] => Boolean(t && typeof t === "object"))
              .map((t) => ({
                  title: ensureString((t as { title?: unknown }).title, "Untitled time bomb"),
                  description: ensureString((t as { description?: unknown }).description, ""),
                  node_ids: Array.isArray((t as { node_ids?: unknown }).node_ids)
                      ? ((t as { node_ids?: unknown[] }).node_ids ?? []).filter((n): n is string => typeof n === "string")
                      : [],
              }))
        : fallback.time_bombs;

    return {
        quick_wins: quickWins,
        time_bombs: timeBombs,
        refined_refactor_strategy: ensureString(candidate.refined_refactor_strategy, fallback.refined_refactor_strategy),
        refined_scaling_outlook: ensureString(candidate.refined_scaling_outlook, fallback.refined_scaling_outlook),
    };
}

function getTopNodes(nodes: NodeMetrics[], limit: number): NodeMetrics[] {
    return [...nodes]
        .sort((a, b) => (b.fan_in + b.centrality * 10) - (a.fan_in + a.centrality * 10))
        .slice(0, limit);
}

function aggregatePatterns(patterns: DetectedPattern[]): AggregatedPattern[] {
    const byKey = new Map<string, AggregatedPattern>();

    for (const p of patterns) {
        const key = `${p.type}|${p.severity}`;
        const existing = byKey.get(key);
        const desc = sanitizePath(p.description);
        const examples = p.affected_node_ids.slice(0, 3);

        if (!existing) {
            byKey.set(key, {
                type: p.type,
                severity: p.severity,
                count: 1,
                affected_node_count: p.affected_node_ids.length,
                examples,
                description: desc,
            });
            continue;
        }

        existing.count += 1;
        existing.affected_node_count += p.affected_node_ids.length;
        for (const e of examples) {
            if (!existing.examples.includes(e) && existing.examples.length < 5) {
                existing.examples.push(e);
            }
        }
    }

    return [...byKey.values()].sort((a, b) => {
        const bySeverity = severityRank(b.severity) - severityRank(a.severity);
        if (bySeverity !== 0) return bySeverity;
        return b.count - a.count;
    });
}

function aggregateInsights(insights: InsightItem[]): AggregatedInsight[] {
    const byKey = new Map<string, AggregatedInsight>();

    for (const i of insights) {
        const key = `${i.title}|${i.recommendation}`;
        const existing = byKey.get(key);

        if (!existing) {
            byKey.set(key, {
                title: i.title,
                severity: i.severity,
                category: i.category,
                recommendation: i.recommendation,
                count: 1,
            });
            continue;
        }

        existing.count += 1;
    }

    return [...byKey.values()].sort((a, b) => {
        const bySeverity = severityRank(b.severity) - severityRank(a.severity);
        if (bySeverity !== 0) return bySeverity;
        return b.count - a.count;
    });
}

function nodeMetricMap(nodes: NodeMetrics[]): Map<string, NodeMetrics> {
    return new Map(nodes.map((n) => [n.node_id, n]));
}

function formatHotspot(node: NodeMetrics): string {
    return `${sanitizePath(node.file)} (node=${node.node_id}, fan_in=${node.fan_in}, fan_out=${node.fan_out}, centrality=${node.centrality.toFixed(2)})`;
}

function pickHotspots(nodeIds: string[], nodes: NodeMetrics[], limit = 2): string[] {
    const ids = [...new Set(nodeIds)];
    if (ids.length === 0) return [];

    const byId = nodeMetricMap(nodes);
    return ids
        .map((id) => byId.get(id))
        .filter((n): n is NodeMetrics => Boolean(n))
        .sort((a, b) => (b.fan_in + b.centrality * 10) - (a.fan_in + a.centrality * 10))
        .slice(0, limit)
        .map(formatHotspot);
}

function verificationHintForPattern(type: string, metrics: IntelligenceOutput["metrics"]): string {
    if (type === "circular_dependency") {
        return "cycle count goes to 0 and remains stable after rescans.";
    }

    if (type === "god_service") {
        return `top-node fan-in drops below ${Math.max(4, Math.round(metrics.avg_fan_in + 2))} and ownership is split across focused modules.`;
    }

    if (type === "bottleneck_node" || type === "async_bottleneck") {
        return "p95 latency and queue lag drop under load test, with no single node dominating request paths.";
    }

    if (type === "missing_service_boundary") {
        return "endpoint handlers stop calling DB operations directly and all business rules execute through service layer APIs.";
    }

    return "risk score and repeated high/critical pattern count both improve after refactor.";
}

function planFromPatternType(type: string): ReportPlanItem {
    if (type === "circular_dependency") {
        return {
            priority: "P0",
            title: "Break circular dependencies first",
            reason: "Cycles create hidden coupling and make safe refactoring difficult.",
            effort: "0.5 to 2 days",
            expected_impact: "Immediate reduction in blast radius and build fragility",
            steps: [
                "Identify two-way imports between affected modules.",
                "Extract shared contracts/types into a neutral shared module.",
                "Replace direct two-way dependency with one-way interface/event boundary.",
                "Re-scan and confirm cycle count reaches zero.",
            ],
        };
    }

    if (type === "god_service") {
        return {
            priority: "P1",
            title: "Split overloaded services by responsibility",
            reason: "High fan-in service becomes a single point of failure and slows team velocity.",
            effort: "1 to 3 days",
            expected_impact: "Better ownership boundaries and easier parallel development",
            steps: [
                "List responsibilities inside the overloaded service.",
                "Create 2 to 3 focused domain services with clear APIs.",
                "Move one capability at a time and keep old adapter until migration completes.",
                "Update callers gradually and remove monolithic service entry points.",
            ],
        };
    }

    if (type === "missing_service_boundary") {
        return {
            priority: "P1",
            title: "Introduce explicit service boundary",
            reason: "Direct endpoint-to-DB coupling makes business logic hard to test and evolve.",
            effort: "1 to 2 days",
            expected_impact: "Cleaner layering and lower regression risk",
            steps: [
                "Create service layer for each endpoint group.",
                "Move business rules from handlers into services.",
                "Keep repositories/data access behind service methods only.",
                "Add contract tests around service behavior.",
            ],
        };
    }

    if (type === "bottleneck_node" || type === "async_bottleneck") {
        return {
            priority: "P1",
            title: "Remove throughput bottlenecks",
            reason: "Central bottlenecks cap scaling and increase incident probability.",
            effort: "1 to 2 days",
            expected_impact: "Better throughput headroom under load",
            steps: [
                "Identify high-centrality node responsibilities.",
                "Split synchronous chains where possible using async events/queues.",
                "Scale worker consumers and isolate hot paths.",
                "Measure queue lag and latency before and after rollout.",
            ],
        };
    }

    return {
        priority: "P2",
        title: `Reduce ${formatPatternName(type).toLowerCase()} risk`,
        reason: "Pattern appears repeatedly and needs structural hardening.",
        effort: "0.5 to 1.5 days",
        expected_impact: "Progressive architecture hardening",
        steps: [
            "Pick one high-risk module from affected nodes.",
            "Refactor behind stable API boundaries.",
            "Add validation tests for moved behavior.",
            "Re-scan and verify metric improvement.",
        ],
    };
}

function deriveImplementationPlan(output: IntelligenceOutput): ReportPlanItem[] {
    const grouped = aggregatePatterns(output.detected_patterns);
    const seenTitles = new Set<string>();
    const plan: ReportPlanItem[] = [];

    for (const g of grouped) {
        const item = planFromPatternType(g.type);
        if (seenTitles.has(item.title)) continue;
        seenTitles.add(item.title);

        const groupedNodeIds = output.detected_patterns
            .filter((p) => p.type === g.type && p.severity === g.severity)
            .flatMap((p) => p.affected_node_ids);
        const hotspots = pickHotspots(groupedNodeIds, output.metrics.node_metrics, 2);

        const scopeNote =
            g.count > 1
                ? ` This pattern appears in ${g.count} places (${g.affected_node_count} affected node references).`
                : "";

        const hotspotNote = hotspots.length > 0 ? ` Hotspots: ${hotspots.join("; ")}.` : "";
        const verifyHint = verificationHintForPattern(g.type, output.metrics);

        plan.push({
            ...item,
            reason: `${item.reason}${scopeNote}${hotspotNote}`,
            steps: [...item.steps, `Verify outcome: ${verifyHint}`],
        });

        if (plan.length >= 4) break;
    }

    if (plan.length === 0) {
        return [
            {
                priority: "P2",
                title: "Maintain healthy architecture baseline",
                reason: "No major anti-patterns detected in current scan.",
                effort: "0.5 day",
                expected_impact: "Prevent regressions while shipping features",
                steps: [
                    "Add architecture checks to CI via scheduled scans.",
                    "Track risk score trend for each release.",
                    "Define guardrails for max depth and cycle count.",
                ],
            },
        ];
    }

    return plan;
}

function buildSummary(output: IntelligenceOutput): string {
    const highPatterns = output.detected_patterns.filter(
        (p) => p.severity === "critical" || p.severity === "high"
    ).length;

    const severityPhrase =
        output.metrics.risk_score < 30 && output.overall_risk_level !== "low"
            ? `Structural severity is ${output.overall_risk_level.toUpperCase()} even though aggregate score is ${output.metrics.risk_score}/100, because repeated high/critical hotspots are present.`
            : `Overall risk is ${output.overall_risk_level.toUpperCase()} with score ${output.metrics.risk_score}/100.`;

    return [
        `Architecture theme: ${output.architectural_theme}.`,
        severityPhrase,
        `${output.detected_patterns.length} structural pattern(s) detected (${highPatterns} high or critical).`,
        `Main drivers: ${shortList(output.primary_risk_drivers, 3)}.`,
    ].join(" ");
}

function buildFirstActionLine(output: IntelligenceOutput, plan: ReportPlanItem[]): string {
    const top = plan[0];
    if (!top) {
        return "Next action: keep baseline healthy with scheduled scans and trend tracking.";
    }

    const topNodeId = output.priority_order[0];
    const topNode = output.metrics.node_metrics.find((n) => n.node_id === topNodeId);
    const hotspot = topNode ? sanitizePath(topNode.file) : "highest-priority hotspot";
    return `Do this first: ${top.title} on ${hotspot}. Success signal: ${top.steps[top.steps.length - 1].replace("Verify outcome: ", "")}`;
}

function buildActionCard(output: IntelligenceOutput, plan: ReportPlanItem[]): string {
    const top = plan[0];
    if (!top) {
        return [
            "- Focus: Maintain baseline architecture health",
            "- First 48h: Add scheduled architecture scan and fail PRs on new critical patterns",
            "- Success metric: No increase in critical/high patterns across two scans",
        ].join("\n");
    }

    const topNodeId = output.priority_order[0];
    const topNode = output.metrics.node_metrics.find((n) => n.node_id === topNodeId);
    const hotspotLabel = topNode
        ? `${sanitizePath(topNode.file)} (node=${topNode.node_id})`
        : "highest-priority hotspot";

    return [
        `- Focus: ${top.title}`,
        `- Target hotspot: ${hotspotLabel}`,
        `- First 48h steps: ${top.steps.slice(0, 2).join(" Then ")}`,
        `- Definition of done: ${top.steps[top.steps.length - 1].replace("Verify outcome: ", "")}`,
    ].join("\n");
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((resolve) => {
        timer = setTimeout(() => {
            console.warn(`[ArchSight Copilot] Groq API timed out after ${ms}ms`);
            resolve(fallback);
        }, ms);
    });

    return Promise.race([
        promise.then((res) => {
            clearTimeout(timer);
            return res;
        }).catch((err) => {
            clearTimeout(timer);
            throw err;
        }),
        timeoutPromise
    ]);
}

async function callGroqJSON<T>(systemPrompt: string, userPrompt: string, fallback: T): Promise<T> {
    if (!groqClient) return fallback;

    try {
        const completion = await withTimeout(
            groqClient.chat.completions.create({
                model: GROQ_MODEL,
                temperature: 0.2,
                max_tokens: 1024,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
            }),
            20000,
            null
        );

        if (!completion) return fallback;

        const content = completion.choices?.[0]?.message?.content ?? "";
        return safeParseJSON(content, fallback);
    } catch (err) {
        console.error("[ArchSight Copilot] Groq JSON call failed:", err);
        return fallback;
    }
}

async function callGroqText(systemPrompt: string, userPrompt: string, fallback: string): Promise<string> {
    if (!groqClient) return fallback;

    try {
        const completion = await withTimeout(
            groqClient.chat.completions.create({
                model: GROQ_MODEL,
                temperature: 0.6,
                max_tokens: 2048,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
            }),
            25000,
            null
        );

        if (!completion) return fallback;

        return completion.choices?.[0]?.message?.content ?? fallback;
    } catch (err) {
        console.error("[ArchSight Copilot] Groq text call failed:", err);
        return fallback;
    }
}

async function callSemanticInterpretation(output: IntelligenceOutput): Promise<SemanticInterpretation> {
    const topNodes = getTopNodes(output.metrics.node_metrics, 15).map((n) => ({
        node_id: n.node_id,
        file: sanitizePath(n.file),
        node_type: n.node_type,
        fan_in: n.fan_in,
        fan_out: n.fan_out,
        centrality: n.centrality,
        instability: n.instability,
        in_cycle: n.in_cycle,
        depth: n.depth,
    }));

    const fallback: SemanticInterpretation = {
        architectural_theme: output.architectural_theme,
        system_summary: buildSummary(output),
        node_roles: [],
    };

    const raw = await callGroqJSON<SemanticInterpretation>(
        "You are a principal software architect. Return strict JSON only.",
        `Analyze these high-risk architecture nodes and provide:\n1) architectural_theme\n2) system_summary in simple language\n3) node_roles with role and concern.\n\nNodes:\n${JSON.stringify(topNodes, null, 2)}`,
        fallback
    );

    return normalizeSemanticInterpretation(raw, fallback);
}

async function callBlastRadiusReasoning(output: IntelligenceOutput): Promise<BlastRadiusAnalysis> {
    const patterns = aggregatePatterns(output.detected_patterns).slice(0, 8);

    const fallback: BlastRadiusAnalysis = {
        pattern_consequences: patterns.map((p) => ({
            pattern_type: p.type,
            consequence_chain: `${formatPatternName(p.type)} can propagate failures across dependent components if unchanged.`,
            failure_modes: ["service degradation", "change amplification"],
            blast_radius_score: p.severity === "critical" ? 9 : p.severity === "high" ? 7 : 5,
            runtime_vs_compile: "both",
        })),
        highest_risk_node_id: null,
        highest_risk_reason: "Most severe repeated pattern currently drives highest intervention priority.",
    };

    const raw = await callGroqJSON<BlastRadiusAnalysis>(
        "You are a reliability engineer. Return strict JSON only.",
        `For each pattern, explain what breaks first and the blast radius.\nPatterns:\n${JSON.stringify(patterns, null, 2)}`,
        fallback
    );

    return normalizeBlastRadiusAnalysis(raw, fallback);
}

async function callPriorityStrategy(
    output: IntelligenceOutput,
    semantic: SemanticInterpretation,
    blast: BlastRadiusAnalysis
): Promise<PriorityStrategy> {
    const plan = deriveImplementationPlan(output);

    const fallback: PriorityStrategy = {
        quick_wins: [
            {
                title: "Fix top P0 or P1 pattern first",
                description: "Resolve highest-impact structural issue before feature work.",
                effort: "low",
            },
        ],
        time_bombs: [
            {
                title: "Repeated critical patterns",
                description: "Repeated critical patterns will increase incident probability as the codebase grows.",
                node_ids: output.priority_order.slice(0, 3),
            },
        ],
        refined_refactor_strategy: output.refactor_strategy,
        refined_scaling_outlook: output.scaling_outlook,
    };

    const raw = await callGroqJSON<PriorityStrategy>(
        "You are a tech lead writing concrete strategy. Return strict JSON only.",
        `Refine this architecture action strategy.\nSummary:\n${semantic.system_summary}\nBlast Radius:\n${JSON.stringify(blast, null, 2)}\nBase Plan:\n${JSON.stringify(plan, null, 2)}`,
        fallback
    );

    return normalizePriorityStrategy(raw, fallback);
}

function buildPatternLines(groups: AggregatedPattern[]): string {
    if (groups.length === 0) {
        return "No major structural anti-patterns detected.";
    }

    return groups.slice(0, 6).map((g, i) => {
        const examples = g.examples.length > 0 ? ` Examples: ${g.examples.join(", ")}.` : "";
        return `${i + 1}. ${formatPatternName(g.type)} [${g.severity.toUpperCase()}] x${g.count} - ${g.description}${examples}`;
    }).join("\n");
}

function buildInsightLines(insights: AggregatedInsight[]): string {
    if (insights.length === 0) {
        return "No additional insights available.";
    }

    return insights.slice(0, 6).map((s, i) => {
        const repeat = s.count > 1 ? ` (repeated ${s.count} times)` : "";
        return `${i + 1}. ${s.title} [${s.severity.toUpperCase()}] - ${s.recommendation}${repeat}`;
    }).join("\n");
}

function buildPlanLines(plan: ReportPlanItem[]): string {
    return plan
        .map((p, i) => {
            const steps = p.steps.map((step, idx) => `   ${idx + 1}) ${step}`).join("\n");
            return `${i + 1}. ${p.priority} - ${p.title}\n   Why: ${p.reason}\n   Effort: ${p.effort}\n   Impact: ${p.expected_impact}\n   Steps:\n${steps}`;
        })
        .join("\n\n");
}

function buildLlmHandoffMarkdown(
    output: IntelligenceOutput,
    repoFullName: string,
    branch: string,
    plan: ReportPlanItem[]
): string {
    const payload = {
        repository: repoFullName,
        branch,
        architecture_theme: output.architectural_theme,
        risk_level: output.overall_risk_level,
        risk_score: output.metrics.risk_score,
        primary_risk_drivers: output.primary_risk_drivers,
        implementation_plan: plan,
        constraints: [
            "Do not change public APIs unless necessary",
            "Prefer incremental PRs with tests",
            "Break circular dependencies before optimization changes",
            "Re-run architecture scan after each major step",
        ],
    };

    return [
        "# LLM Handoff Context",
        "Use the JSON below as grounded context for implementation planning.",
        "",
        "```json",
        JSON.stringify(payload, null, 2),
        "```",
    ].join("\n");
}

function shouldUseAI(): boolean {
    return (REPORT_MODE === "hybrid" || REPORT_MODE === "ai") && Boolean(GROQ_API_KEY);
}

export async function buildReportPayload(
    output: IntelligenceOutput,
    repoFullName: string,
    branch: string
): Promise<ReportPayload> {
    const groupedPatterns = aggregatePatterns(output.detected_patterns);
    const groupedInsights = aggregateInsights(output.insights);
    const implementationPlan = deriveImplementationPlan(output);

    let semantic: SemanticInterpretation | null = null;
    let blast: BlastRadiusAnalysis | null = null;
    let strategy: PriorityStrategy | null = null;

    if (shouldUseAI()) {
        semantic = await callSemanticInterpretation(output);
        blast = await callBlastRadiusReasoning(output);
        strategy = await callPriorityStrategy(output, semantic, blast);
    }

    const summaryBase = semantic?.system_summary || buildSummary(output);
    const effectiveSummary = `${summaryBase} ${buildFirstActionLine(output, implementationPlan)}`.trim();
    const effectiveTheme = semantic?.architectural_theme || output.architectural_theme;
    const effectiveRefactor = strategy?.refined_refactor_strategy || output.refactor_strategy;
    const effectiveScaling = strategy?.refined_scaling_outlook || output.scaling_outlook;

    const markdown = [
        "# ArchSight Easy Report",
        "",
        `Repository: ${repoFullName}`,
        `Branch: ${branch}`,
        `Generated At: ${new Date().toISOString()}`,
        `Engine Version: ${output.engine_version}`,
        `Report Mode: ${shouldUseAI() ? `hybrid (deterministic + Groq ${GROQ_MODEL})` : "deterministic"}`,
        "",
        "## 1) Executive Summary (Simple Language)",
        effectiveSummary,
        "",
        "## 2) Architecture Theme",
        effectiveTheme,
        "",
        "## 3) What Is Going Wrong (Top Risks)",
        buildPatternLines(groupedPatterns),
        "",
        "## 4) Recommended Fix Plan (Implementation Ready)",
        buildPlanLines(implementationPlan),
        "",
        "## 5) Supporting Insights (Deduplicated)",
        buildInsightLines(groupedInsights),
        "",
        "## 6) Blast Radius Reasoning",
        blast
            ? blast.pattern_consequences
                  .slice(0, 5)
                  .map(
                      (c, i) =>
                          `${i + 1}. ${formatPatternName(c.pattern_type)} [blast ${c.blast_radius_score}/10, ${c.runtime_vs_compile}] - ${c.consequence_chain}`
                  )
                  .join("\n")
            : "Deterministic mode active. Enable hybrid mode for AI blast-radius explanation.",
        "",
        "## 7) Strategic Guidance",
        `- Refactor Strategy: ${effectiveRefactor}`,
        `- Scaling Outlook: ${effectiveScaling}`,
        `- Long-term Recommendation: ${output.long_term_recommendation}`,
        "",
        "## 8) Action Card (Start Here)",
        buildActionCard(output, implementationPlan),
        "",
        "## 9) Key Metrics Snapshot",
        `- Risk Score: ${output.metrics.risk_score}/100`,
        `- Overall Risk Level: ${output.overall_risk_level.toUpperCase()}`,
        `- Cycles Detected: ${output.metrics.cycles_detected}`,
        `- Graph Density: ${(output.metrics.density * 100).toFixed(1)}%`,
        `- Max Dependency Depth: ${output.metrics.max_depth}`,
        `- Strongly Connected Components: ${output.metrics.strongly_connected_components}`,
        "",
        "## 10) Suggested Next Sprint Goal",
        "Resolve the first P0/P1 action item, then re-scan and target measurable delta in risk score and repeated critical patterns.",
        "",
        "## 11) Quick Wins and Time Bombs",
        strategy
            ? [
                  "Quick Wins:",
                  ...(strategy.quick_wins.length > 0
                      ? strategy.quick_wins.map((w, i) => `${i + 1}. ${w.title} (${w.effort}) - ${w.description}`)
                      : ["- None generated"]),
                  "",
                  "Time Bombs:",
                  ...(strategy.time_bombs.length > 0
                      ? strategy.time_bombs.map((t, i) => `${i + 1}. ${t.title} - ${t.description}`)
                      : ["- None generated"]),
              ].join("\n")
            : "Deterministic mode active. Enable hybrid mode for AI quick-wins and time-bomb reasoning.",
    ].join("\n");

    return {
        summary: effectiveSummary,
        report_markdown: markdown,
        implementation_plan: implementationPlan,
        llm_handoff_markdown: buildLlmHandoffMarkdown(output, repoFullName, branch, implementationPlan),
    };
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

// ── Project-aware context builder (slim, token-safe) ──────────────────
function buildSlimContext(structuredContext: NonNullable<Parameters<typeof answerQuestionFromReport>[3]>): string {
    // Trim patterns to top-5 most severe, insights to top-5
    const patterns = (structuredContext.detected_patterns ?? []).slice(0, 5);
    const insights = (structuredContext.insights ?? []).slice(0, 5);
    const metrics = structuredContext.metrics ?? {};

    return JSON.stringify({
        overall_risk_level: structuredContext.overall_risk_level,
        architectural_theme: structuredContext.architectural_theme,
        confidence_level: structuredContext.confidence_level,
        primary_risk_drivers: (structuredContext.primary_risk_drivers ?? []).slice(0, 5),
        refactor_strategy: structuredContext.refactor_strategy,
        scaling_outlook: structuredContext.scaling_outlook,
        long_term_recommendation: structuredContext.long_term_recommendation,
        metrics: {
            risk_score: metrics["risk_score"],
            cycles_detected: metrics["cycles_detected"],
            density: metrics["density"],
            max_depth: metrics["max_depth"],
            coupling_score: metrics["coupling_score"],
            avg_instability: metrics["avg_instability"],
            total_nodes: metrics["total_nodes"],
            total_edges: metrics["total_edges"],
            strongly_connected_components: metrics["strongly_connected_components"],
        },
        top_patterns: patterns,
        top_insights: insights,
    }, null, 2);
}

export async function answerQuestionFromReport(
    question: string,
    report: ReportPayload,
    history: ChatMessage[] = [],
    structuredContext?: {
        metrics?: Record<string, unknown>;
        detected_patterns?: unknown[];
        insights?: unknown[];
        overall_risk_level?: string;
        architectural_theme?: string;
        confidence_level?: string;
        primary_risk_drivers?: string[];
        refactor_strategy?: string;
        scaling_outlook?: string;
        long_term_recommendation?: string;
        // Project-aware fields injected from the scan graph
        project_files?: string[];
        project_services?: string[];
        project_endpoints?: string[];
        repo_name?: string;
        framework?: string;
    }
): Promise<string> {
    const q = question.trim();
    const isInitMode = q === "" || q === "__init__";

    // ── Jargon check (skip for init mode) ────────────────────────────────
    if (!isInitMode && detectJargon(q)) {
        return [
            "## ⚠️ I didn't quite catch that",
            "",
            "That input looks like random characters or gibberish. Could you rephrase your question?",
            "",
            "**Here are some things I can help with:**",
            "- `What should I fix first?`",
            "- `Explain my risk score`",
            "- `What are the circular dependencies?`",
            "- `Give me a refactor plan`",
            "- `Why is my coupling score high?`",
            "",
            "Ask me anything about your codebase's architecture, risks, or design! 🚀",
        ].join("\n");
    }

    // ── Groq LLM Path ─────────────────────────────────────────────────────
    if (groqClient) {
        // Build a compact context block to avoid token overflow
        const slimCtx = structuredContext ? buildSlimContext(structuredContext) : null;
        const contextBlock = slimCtx
            ? `\`\`\`json\n${slimCtx}\n\`\`\``
            : `\`\`\`markdown\n${report.report_markdown.slice(0, 3000)}\n\`\`\``;

        // Build project-awareness section
        const repoName = structuredContext?.repo_name ?? "this repository";
        const framework = structuredContext?.framework ?? "unknown framework";
        const topFiles = (structuredContext?.project_files ?? []).slice(0, 12);
        const topServices = (structuredContext?.project_services ?? []).slice(0, 10);
        const topEndpoints = (structuredContext?.project_endpoints ?? []).slice(0, 8);

        const projectSection = [
            `## Project Being Analyzed`,
            `- **Repository**: ${repoName}`,
            `- **Framework**: ${framework}`,
            topFiles.length > 0 ? `- **Key files scanned**: ${topFiles.join(", ")}` : null,
            topServices.length > 0 ? `- **Services detected**: ${topServices.join(", ")}` : null,
            topEndpoints.length > 0 ? `- **HTTP endpoints**: ${topEndpoints.join(", ")}` : null,
        ].filter(Boolean).join("\n");

        const systemPrompt = `You are ArchSight Copilot — a world-class software architect and system design expert embedded in the ArchSight code intelligence platform. You are analyzing a REAL codebase and giving answers grounded in actual scan data.

${projectSection}

## Your Mission
Answer developer questions about their architecture clearly, accurately, and with specific references to their actual files, services, and metrics. You are their personal tech lead.

## Architecture Analysis Data Available
- **risk_score**: 0–100 composite score (>70 = critical, 50–70 = high, 30–50 = medium, <30 = low)
- **detected_patterns**: Anti-patterns found (circular_dependency, god_service, bottleneck_node, tight_coupling, deep_dependency_chain, missing_service_boundary, async_bottleneck, risk_concentration)
- **insights**: Actionable engineering recommendations
- **implementation_plan**: Prioritized P0/P1/P2 fix plan with steps
- **metrics**: cycles_detected, density, max_depth, coupling_score, avg_instability, total_nodes, total_edges

## Metric Health Thresholds
| Metric | Healthy | Warning | Critical |
|---|---|---|---|
| risk_score | <30 | 30–70 | >70 |
| cycles_detected | 0 | 1–2 | >2 |
| density | <0.10 | 0.10–0.20 | >0.20 |
| max_depth | ≤4 | 5–6 | >6 |
| coupling_score | <8 | 8–15 | >15 |
| avg_instability | <0.45 | 0.45–0.65 | >0.65 |

## Pattern Plain-English Reference
- **circular_dependency** → Module A imports B which imports A. Breaks builds, blocks refactoring.
- **god_service** → One file everything depends on. Single point of failure.
- **bottleneck_node** → Single node all requests flow through. Cannot scale horizontally.
- **tight_coupling** → Too many cross-module connections. One change breaks many things.
- **deep_dependency_chain** → Bug at bottom cascades all the way up.
- **missing_service_boundary** → DB queries directly in HTTP handlers. Untestable and fragile.
- **async_bottleneck** → Single worker dispatcher backing up the queue.
- **risk_concentration** → Multiple severe issues on one node.

## Rules
1. **Cite actual data** — use real file names, real metric numbers, real pattern names from the scan.
2. **Plain language** — explain like a sharp 2nd-year eng student. Use analogies.
3. **Always actionable** — end every answer with a concrete next step.
4. **Markdown format** — use ## headers, bullet points, bold, code blocks.
5. **Self-aware** — you KNOW this specific project's files, services, and issues. Reference them.
6. **Jargon-free explanations** — whenever you use a technical term, explain it in one sentence.
7. For opening briefing: cover risk level + top 3 issues + 2 quick wins. Be encouraging but honest.`;

        const messages: Array<{ role: string; content: string }> = [
            { role: "system", content: systemPrompt },
        ];

        // Inject context once at the start of the conversation
        if (history.length === 0) {
            messages.push({
                role: "user",
                content: `Here is the complete architecture analysis for ${repoName}:\n\n${contextBlock}\n\nRemember these real files and services when answering: ${[...topFiles, ...topServices].join(", ") || "(none detected yet)"}.`,
            });
            messages.push({
                role: "assistant",
                content: `Got it! I've fully absorbed the architecture analysis for **${repoName}**. I can see the real files, services, detected patterns, and all metrics. Ask me anything about your codebase!`,
            });
        }

        // Append prior conversation history (cap to last 6 turns to avoid context bloat)
        const recentHistory = history.slice(-6);
        for (const msg of recentHistory) {
            messages.push({ role: msg.role, content: msg.content });
        }

        if (isInitMode) {
            messages.push({
                role: "user",
                content: `Give me an opening briefing on ${repoName}: overall health, top 3 architecture problems with specific file/service names, and 2 quick wins. Be encouraging but honest. Keep it focused — 300 words max.`,
            });
        } else {
            messages.push({ role: "user", content: q });
        }

        return callGroqChatMessages(messages, report.summary);
    }

    // ── Deterministic Fallback (no Groq key) ─────────────────────────────
    if (isInitMode) {
        return `## 📊 Architecture Briefing\n\n${report.summary}\n\n**Top Action:** ${report.implementation_plan[0]?.title ?? "No high-priority actions detected."}\n\nAsk me about specific risks, patterns, or what to fix first!`;
    }

    const ql = q.toLowerCase();

    if (ql.includes("runtime") || ql.includes("bottleneck") || ql.includes("break") || ql.includes("fail") || ql.includes("blast")) {
        const top = report.implementation_plan[0];
        if (!top) return "No high-priority bottleneck was identified in the current report.";
        return `Most likely first runtime break is around **"${top.title}"**. ${top.reason} Mitigation: ${top.steps.slice(0, 2).join(". ")}`;
    }

    if (ql.includes("what do i do") || ql.includes("next step") || ql.includes("action") || ql.includes("start")) {
        const top = report.implementation_plan[0];
        if (!top) return "Run weekly architecture scans and fail builds on new critical patterns.";
        return `**Start with:** ${top.title}. ${top.expected_impact}.\n\nFirst steps:\n${top.steps.slice(0, 2).map(s => `- ${s}`).join("\n")}`;
    }

    if (ql.includes("risk") || ql.includes("problem") || ql.includes("issue")) {
        return `**Top risk summary:** ${report.summary}`;
    }

    if (ql.includes("plan") || ql.includes("implement") || ql.includes("fix")) {
        return report.implementation_plan
            .slice(0, 3)
            .map((item, idx) => `${idx + 1}) **${item.priority}** ${item.title} — ${item.reason}`)
            .join("\n");
    }

    return `${report.summary}\n\nAsk about risks, patterns, or specific files for more detail.`;
}

async function callGroqChatMessages(
    messages: Array<{ role: string; content: string }>,
    fallback: string
): Promise<string> {
    if (!groqClient) return fallback;

    try {
        const completion = await withTimeout(
            groqClient.chat.completions.create({
                model: GROQ_MODEL,
                temperature: 0.5,
                max_tokens: 2048,
                messages: messages as Parameters<typeof groqClient.chat.completions.create>[0]["messages"],
            }),
            30000,
            null
        );

        if (!completion) {
            return `The AI engine timed out. Please try a shorter question or try again in a moment.`;
        }

        return completion.choices?.[0]?.message?.content ?? fallback;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[ArchSight Copilot] Groq chat call failed:", msg);
        // Surface a helpful error rather than silent fallback
        return `## ⚠️ Copilot Error\n\nThe Groq API returned an error: \`${msg}\`\n\nCheck that \`GROQ_API_KEY\` is valid and model \`${GROQ_MODEL}\` is available.`;
    }
}


export async function generateSimpleReport(report: ReportPayload): Promise<string> {
    const systemPrompt = "You are a senior software architect explaining a code analysis report simply and clearly.";
    // Trim the markdown to avoid token overflow — first 4000 chars covers all key sections
    const trimmedReport = report.report_markdown.slice(0, 4000);
    const userPrompt = `Architecture analysis report (trimmed):

${trimmedReport}

Your task — explain this in SIMPLE language:
1. What is the overall health of this codebase? (1-2 sentences)
2. What are the 3 biggest real problems? Use plain English and real-world analogies.
3. Translate terms like "risk concentration", "god service", "coupling" into what they mean practically.
4. Give 3 specific next steps the developer should do THIS WEEK.

Format in Markdown. Be engaging and concise — max 500 words.`;

    const simpleSection = GROQ_API_KEY
        ? await callGroqText(systemPrompt, userPrompt, "")
        : "";

    const separator = `\n\n---\n\n# 📊 Full Technical Report\n\n> The following is the complete deterministic analysis generated by the ArchSight Intelligence Engine.\n\n`;

    return simpleSection
        ? `${simpleSection}${separator}${report.report_markdown}`
        : report.report_markdown;
}
