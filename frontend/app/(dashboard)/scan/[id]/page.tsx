"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ArrowLeft, Loader2, CheckCircle2, XCircle, Clock,
    FolderTree, Route, FileCode, Box, Import, FileOutput,
    GitBranch, Timer, Cpu, ChevronDown, ChevronRight,
    TerminalSquare, Network, ShieldAlert, Activity, GitCommit,
    Database, Globe, Layers, Server, Zap, Shield,
    AlertTriangle, TrendingUp, TrendingDown, Target,
    BarChart3, ArrowUpRight, Lightbulb, RefreshCw, Eye,
    Flame, GitFork, Binary, Gauge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { fetchWithAuth, API_URL } from "@/lib/api";
import { FileTree } from "@/components/ui/file-tree";
import { FileExplorerPanel } from "@/components/ui/file-explorer-panel";
import { ScanLogsViewer, type ScanLog } from "@/components/ui/scan-logs-viewer";

// ─── V3 ArchitectureGraph Types ──────────────────────────────────────

interface ArchitectureNode {
    id: string;
    type: string;
    name: string;
    file: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: Record<string, any>;
    confidence: number;
}

interface FileStructureEntry {
    file: string;
    language: string;
    functions: string[];
    classes: string[];
    imports: string[];
    exports: string[];
}

interface ArchitectureGraph {
    nodes?: ArchitectureNode[];
    edges?: { source: string; target: string; type: string }[];
    file_structure?: FileStructureEntry[];
}

// ─── Intelligence Engine Types ────────────────────────────────────────

type RiskLevel = "low" | "medium" | "high" | "critical";
type PatternSeverity = "low" | "medium" | "high" | "critical";
type ConfidenceLevel = "high" | "medium" | "low" | "insufficient_data";

interface NodeMetrics {
    node_id: string;
    node_type: string;
    file: string;
    fan_in: number;
    fan_out: number;
    centrality: number;
    instability: number;
    in_cycle: boolean;
    depth: number;
}

interface GraphMetrics {
    total_nodes: number;
    total_edges: number;
    density: number;
    max_depth: number;
    avg_depth: number;
    cycles_detected: number;
    risk_score: number;
    strongly_connected_components: number;
    largest_scc_size: number;
    avg_fan_in: number;
    avg_fan_out: number;
    coupling_score: number;
    avg_instability: number;
    node_metrics: NodeMetrics[];
}

interface DetectedPattern {
    type: string;
    severity: PatternSeverity;
    affected_node_ids: string[];
    description: string;
    evidence: Record<string, number | string | boolean>;
}

interface InsightItem {
    id: string;
    category: "risk" | "performance" | "architecture" | "scalability";
    severity: PatternSeverity;
    title: string;
    description: string;
    affected_nodes: string[];
    recommendation: string;
    triggered_by: string;
}

interface IntelligenceOutput {
    scan_id: string;
    architectural_theme: string;
    overall_risk_level: RiskLevel;
    confidence_level: ConfidenceLevel;
    primary_risk_drivers: string[];
    priority_order: string[];
    refactor_strategy: string;
    scaling_outlook: string;
    long_term_recommendation: string;
    insights: InsightItem[];
    detected_patterns: DetectedPattern[];
    metrics: GraphMetrics;
    analyzed_at: string;
    engine_version: string;
}

interface IntelligenceAnalysisRecord {
    scanId: string;
    riskLevel: RiskLevel;
    confidence: ConfidenceLevel;
    theme: string;
    metrics: GraphMetrics;
    patterns: DetectedPattern[];
    insights: InsightItem[];
    strategy: {
        refactor_strategy: string;
        scaling_outlook: string;
        long_term_recommendation: string;
        primary_risk_drivers: string[];
        priority_order: string[];
    };
    updatedAt: string;
}

interface ReportPlanItem {
    priority: "P0" | "P1" | "P2";
    title: string;
    reason: string;
    effort: string;
    expected_impact: string;
    steps: string[];
}

interface IntelligenceChatResponse {
    reply: string;
    mode: "full_report" | "qa";
    report_markdown: string;
    implementation_plan: ReportPlanItem[];
    llm_handoff_markdown: string;
    source: {
        scan_id: string;
        repository: string;
        branch: string;
        risk_level: string;
        risk_score: number;
    };
}

interface ScanResult {
    _id: string;
    repo_owner: string;
    repo_name: string;
    branch: string;
    status: string;
    progress: number;
    message: string;
    created_at: string;
    completed_at?: string;
    error_details?: string;
    engine_result?: {
        scan_id: string;
        repo_id: string;
        framework: string;
        frameworks?: string[];
        status: string;
        architecture?: ArchitectureGraph;
        intelligence?: IntelligenceOutput;
        scanned_at: string;
        duration_ms: number;
        meta?: { parser: string; version: string };
    };
}

// ─── Visual Config ───────────────────────────────────────────────────

const methodColors: Record<string, string> = {
    GET: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30",
    POST: "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30",
    PUT: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
    DELETE: "bg-[#FF4C6A]/10 text-[#FF4C6A] border-[#FF4C6A]/30",
    PATCH: "bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30",
};

const nodeTypeConfig: Record<string, { label: string; color: string; icon: React.ElementType; badge: string }> = {
    http_endpoint: { label: "HTTP Endpoints", color: "#00D4FF", icon: Route, badge: "Endpoint" },
    db_operation: { label: "Database Operations", color: "#F59E0B", icon: Database, badge: "DB Op" },
    business_logic_service: { label: "Services", color: "#A855F7", icon: Server, badge: "Service" },
    external_service: { label: "External APIs", color: "#22C55E", icon: Globe, badge: "External" },
    queue_worker: { label: "Queue Workers", color: "#FF4C6A", icon: Zap, badge: "Worker" },
};

const langColors: Record<string, string> = {
    typescript: "text-[#00D4FF]",
    javascript: "text-[#F59E0B]",
    python: "text-[#22C55E]",
    java: "text-[#FF4C6A]",
};

const confidenceColor = (c: number) =>
    c >= 0.9 ? "text-[#22C55E]" : c >= 0.7 ? "text-[#F59E0B]" : "text-[#FF4C6A]";

// ─── Intelligence Visual Config ───────────────────────────────────────

const riskConfig: Record<RiskLevel, { color: string; bg: string; border: string; label: string; glow: string }> = {
    low:      { color: "#22C55E", bg: "bg-[#22C55E]/10",  border: "border-[#22C55E]/30",  label: "Low Risk",      glow: "shadow-[0_0_20px_rgba(34,197,94,0.15)]" },
    medium:   { color: "#F59E0B", bg: "bg-[#F59E0B]/10",  border: "border-[#F59E0B]/30",  label: "Medium Risk",   glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]" },
    high:     { color: "#FF6B35", bg: "bg-[#FF6B35]/10",  border: "border-[#FF6B35]/30",  label: "High Risk",     glow: "shadow-[0_0_20px_rgba(255,107,53,0.15)]" },
    critical: { color: "#FF4C6A", bg: "bg-[#FF4C6A]/10",  border: "border-[#FF4C6A]/30",  label: "Critical Risk", glow: "shadow-[0_0_20px_rgba(255,76,106,0.2)]" },
};

const severityConfig: Record<PatternSeverity, { color: string; bg: string; border: string; dot: string }> = {
    low:      { color: "#22C55E", bg: "bg-[#22C55E]/8",  border: "border-[#22C55E]/20",  dot: "bg-[#22C55E]" },
    medium:   { color: "#F59E0B", bg: "bg-[#F59E0B]/8",  border: "border-[#F59E0B]/20",  dot: "bg-[#F59E0B]" },
    high:     { color: "#FF6B35", bg: "bg-[#FF6B35]/8",  border: "border-[#FF6B35]/20",  dot: "bg-[#FF6B35]" },
    critical: { color: "#FF4C6A", bg: "bg-[#FF4C6A]/8",  border: "border-[#FF4C6A]/20",  dot: "bg-[#FF4C6A]" },
};

const categoryConfig: Record<string, { color: string; icon: React.ElementType }> = {
    risk:         { color: "#FF4C6A", icon: ShieldAlert },
    performance:  { color: "#F59E0B", icon: Gauge },
    architecture: { color: "#A855F7", icon: GitFork },
    scalability:  { color: "#00D4FF", icon: TrendingUp },
};

const patternTypeLabels: Record<string, string> = {
    circular_dependency:      "Circular Dependency",
    god_service:              "God Service",
    deep_dependency_chain:    "Deep Dependency Chain",
    tight_coupling:           "Tight Coupling",
    bottleneck_node:          "Bottleneck Node",
    async_bottleneck:         "Async Bottleneck",
    risk_concentration:       "Risk Concentration",
    missing_service_boundary: "Missing Service Boundary",
};

const patternTypeIcons: Record<string, React.ElementType> = {
    circular_dependency:      RefreshCw,
    god_service:              Eye,
    deep_dependency_chain:    Binary,
    tight_coupling:           GitFork,
    bottleneck_node:          Target,
    async_bottleneck:         Zap,
    risk_concentration:       Flame,
    missing_service_boundary: Layers,
};

// ─── Helpers ─────────────────────────────────────────────────────────

function shortenPath(fullPath: string): string {
    const parts = fullPath.split("/");
    const extractedIdx = parts.findIndex(p => p === "extracted");
    if (extractedIdx >= 0 && extractedIdx + 1 < parts.length) {
        return parts.slice(extractedIdx + 2).join("/");
    }
    return parts.slice(-3).join("/");
}

type FileNodeType = { name: string; type: "file" | "folder"; extension?: string; children?: FileNodeType[] };

function buildFileTree(files: FileStructureEntry[]): FileNodeType[] {
    const root: FileNodeType[] = [];
    const pathMap: Record<string, FileNodeType> = {};

    for (const entry of files) {
        const shortPath = shortenPath(entry.file);
        const parts = shortPath.split("/");
        let currentLevel = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1;
            const key = parts.slice(0, i + 1).join("/");

            if (!pathMap[key]) {
                const ext = isFile ? part.split(".").pop() : undefined;
                const node: FileNodeType = { name: part, type: isFile ? "file" : "folder", extension: ext, children: isFile ? undefined : [] };
                pathMap[key] = node;
                currentLevel.push(node);
            }

            if (!isFile) {
                currentLevel = pathMap[key].children!;
            }
        }
    }
    return root;
}

function groupNodesByType(nodes: ArchitectureNode[] | undefined | null): Record<string, ArchitectureNode[]> {
    const groups: Record<string, ArchitectureNode[]> = {};

    // Handle case where nodes is undefined, null, or not an array
    if (!nodes || !Array.isArray(nodes)) {
        return groups;
    }

    for (const node of nodes) {
        if (!groups[node.type]) groups[node.type] = [];
        groups[node.type].push(node);
    }
    return groups;
}

function MetricBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="w-full h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    );
}

function RiskGauge({ score }: { score: number }) {
    const clampedScore = Math.min(100, Math.max(0, score));
    const color = score >= 70 ? "#FF4C6A" : score >= 50 ? "#FF6B35" : score >= 30 ? "#F59E0B" : "#22C55E";
    const segments = [
        { threshold: 30, color: "#22C55E", label: "Low" },
        { threshold: 50, color: "#F59E0B", label: "Med" },
        { threshold: 70, color: "#FF6B35", label: "High" },
        { threshold: 100, color: "#FF4C6A", label: "Crit" },
    ];
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-28 h-14 overflow-hidden">
                {/* Half-circle background track */}
                <svg viewBox="0 0 120 60" className="w-full h-full">
                    {segments.map((seg, i) => {
                        const prev = i === 0 ? 0 : segments[i - 1].threshold;
                        const startDeg = (prev / 100) * 180 - 90;
                        const endDeg = (seg.threshold / 100) * 180 - 90;
                        const startRad = (startDeg * Math.PI) / 180;
                        const endRad = (endDeg * Math.PI) / 180;
                        const r = 50;
                        const cx = 60; const cy = 60;
                        const x1 = cx + r * Math.cos(startRad);
                        const y1 = cy + r * Math.sin(startRad);
                        const x2 = cx + r * Math.cos(endRad);
                        const y2 = cy + r * Math.sin(endRad);
                        const large = endDeg - startDeg > 180 ? 1 : 0;
                        return (
                            <path
                                key={seg.label}
                                d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
                                fill="none"
                                stroke={seg.color}
                                strokeWidth="8"
                                opacity="0.25"
                            />
                        );
                    })}
                    {/* Active arc */}
                    {(() => {
                        const endDeg = (clampedScore / 100) * 180 - 90;
                        const endRad = (endDeg * Math.PI) / 180;
                        const r = 50; const cx = 60; const cy = 60;
                        const startX = cx + r * Math.cos(-Math.PI / 2);
                        const startY = cy + r * Math.sin(-Math.PI / 2);
                        const endX = cx + r * Math.cos(endRad);
                        const endY = cy + r * Math.sin(endRad);
                        const large = clampedScore > 50 ? 1 : 0;
                        return (
                            <path
                                d={`M ${startX} ${startY} A ${r} ${r} 0 ${large} 1 ${endX} ${endY}`}
                                fill="none"
                                stroke={color}
                                strokeWidth="8"
                                strokeLinecap="round"
                            />
                        );
                    })()}
                    <text x="60" y="57" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold" fontFamily="monospace">{clampedScore}</text>
                </svg>
            </div>
            <span className="text-[10px] font-mono text-[#5A5A7A] uppercase tracking-wider">Risk Score / 100</span>
        </div>
    );
}

function mapAnalysisRecordToIntelligence(record: IntelligenceAnalysisRecord): IntelligenceOutput {
    return {
        scan_id: record.scanId,
        architectural_theme: record.theme,
        overall_risk_level: record.riskLevel,
        confidence_level: record.confidence,
        primary_risk_drivers: record.strategy?.primary_risk_drivers ?? [],
        priority_order: record.strategy?.priority_order ?? [],
        refactor_strategy: record.strategy?.refactor_strategy ?? "",
        scaling_outlook: record.strategy?.scaling_outlook ?? "",
        long_term_recommendation: record.strategy?.long_term_recommendation ?? "",
        insights: Array.isArray(record.insights) ? record.insights : [],
        detected_patterns: Array.isArray(record.patterns) ? record.patterns : [],
        metrics: record.metrics,
        analyzed_at: record.updatedAt,
        engine_version: "3.0.0",
    };
}

// ─── Component ───────────────────────────────────────────────────────

export default function ScanResultPage() {
    const { id } = useParams<{ id: string }>();
    const { data: session } = useSession();
    const router = useRouter();
    const [scan, setScan] = useState<ScanResult | null>(null);
    const [intelligence, setIntelligence] = useState<IntelligenceOutput | null>(null);
    const intelligenceFetchedRef = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["http_endpoint", "db_operation", "business_logic_service", "external_service", "queue_worker", "file_structure"]));
    const [activeTab, setActiveTab] = useState<'codescan' | 'explorer' | 'archmap' | 'risksight'>('codescan');
    const [chatInput, setChatInput] = useState("");
    const [chatReply, setChatReply] = useState<string | null>(null);
    const [chatReportMarkdown, setChatReportMarkdown] = useState<string>("");
    const [chatPlan, setChatPlan] = useState<ReportPlanItem[]>([]);
    const [llmHandoffMarkdown, setLlmHandoffMarkdown] = useState<string>("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);

    useEffect(() => {
        if (!session?.user || !id) return;

        intelligenceFetchedRef.current = false;
        let intervalId: ReturnType<typeof setInterval> | undefined;

        const fetchScan = async (): Promise<ScanResult | null> => {
            try {
                const res = await fetchWithAuth(`${API_URL}/api/scan/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setScan(data.scan);
                    return data.scan as ScanResult;
                }
            } catch (err) {
                console.error("Failed to load scan", err);
            }

            return null;
        };

        const fetchIntelligence = async () => {
            try {
                const res = await fetchWithAuth(`${API_URL}/api/intelligence/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setIntelligence(mapAnalysisRecordToIntelligence(data.analysis as IntelligenceAnalysisRecord));
                } else if (res.status === 404) {
                    setIntelligence(null);
                }
            } catch (err) {
                console.error("Failed to load intelligence", err);
            }
        };

        const fetchAll = async (): Promise<string | undefined> => {
            const current = await fetchScan();
            if (current?.status === "completed" && !intelligenceFetchedRef.current) {
                await fetchIntelligence();
                intelligenceFetchedRef.current = true;
            }

            if (current && ["completed", "failed"].includes(current.status) && intervalId) {
                clearInterval(intervalId);
                intervalId = undefined;
            }

            setIsLoading(false);
            return current?.status;
        };

        (async () => {
            const initialStatus = await fetchAll();

            // Start polling only while the scan is in-progress.
            if (initialStatus && ["completed", "failed"].includes(initialStatus)) {
                return;
            }

            intervalId = setInterval(fetchAll, 3000);
        })();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [id, session]);

    const handleReanalyze = async () => {
        if (!id || isReanalyzing) return;
        setIsReanalyzing(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/api/intelligence/${id}/reanalyze`, {
                method: "POST",
            });

            if (!res.ok) {
                const errorPayload = await res.json().catch(() => ({ error: "Failed to reanalyze" }));
                throw new Error(errorPayload.error || "Failed to reanalyze");
            }

            const payload = await res.json();
            setIntelligence(payload.analysis as IntelligenceOutput);
            intelligenceFetchedRef.current = true;
        } catch (err) {
            console.error("Intelligence reanalysis failed", err);
        } finally {
            setIsReanalyzing(false);
        }
    };

    const requestIntelligenceChat = async (mode: "full_report" | "qa") => {
        if (!id || isChatLoading) return;

        if (mode === "qa" && !chatInput.trim()) {
            setChatError("Enter a question first.");
            return;
        }

        setIsChatLoading(true);
        setChatError(null);

        try {
            const res = await fetchWithAuth(`${API_URL}/api/intelligence/${id}/chat`, {
                method: "POST",
                body: JSON.stringify({
                    mode,
                    message: mode === "qa" ? chatInput.trim() : "",
                }),
            });

            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload.error || "Failed to generate intelligence chat response.");
            }

            const data = payload as IntelligenceChatResponse;
            setChatReply(data.reply || null);
            setChatReportMarkdown(data.report_markdown || "");
            setChatPlan(Array.isArray(data.implementation_plan) ? data.implementation_plan : []);
            setLlmHandoffMarkdown(data.llm_handoff_markdown || "");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown chat/report error";
            setChatError(msg);
        } finally {
            setIsChatLoading(false);
        }
    };

    useEffect(() => {
        if (scan?.status === "completed" || scan?.status === "failed") {
            // polling cleanup handled by return above
        }
    }, [scan?.status]);

    const toggleFile = (file: string) => {
        setExpandedFiles((prev) => {
            const next = new Set(prev);
            if (next.has(file)) next.delete(file);
            else next.add(file);
            return next;
        });
    };

    const toggleSection = (section: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    };

    // ─── Loading State ───────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#0A0A0F]">
                <div className="w-16 h-16 mb-6 relative">
                    <div className="absolute inset-0 rounded-full border-t-2 border-[#6C63FF] animate-spin opacity-50" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-[#6C63FF] animate-pulse" />
                    </div>
                </div>
                <p className="text-[#A0A0C0] font-mono text-sm tracking-wide">Resolving scan context...</p>
            </div>
        );
    }

    if (!scan) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#0A0A0F]">
                <XCircle className="h-12 w-12 text-[#FF4C6A] mb-4 drop-shadow-[0_0_15px_rgba(255,76,106,0.5)]" />
                <p className="text-white text-xl font-bold mb-6">Scan Context Invalid</p>
                <Button className="bg-[#1E1E2E] hover:bg-[#2A2A3A] text-white border border-[#2A2A3A]" asChild>
                    <Link href="/repositories">Return to Workspaces</Link>
                </Button>
            </div>
        );
    }

    const result = scan.engine_result;
    const arch = result?.architecture;
    const intel = intelligence ?? result?.intelligence;
    const isProcessing = !["completed", "failed"].includes(scan.status);
    const groupedNodes = groupNodesByType(arch?.nodes);
    const nodeTypes = Object.keys(groupedNodes);

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-[#A0A0C0] font-sans selection:bg-[#6C63FF]/30 p-6 lg:p-12 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#6C63FF] blur-[150px] opacity-[0.03]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#00D4FF] blur-[150px] opacity-[0.02]" />
            </div>

            <div className="max-w-[1200px] mx-auto relative z-10 space-y-8">
                {/* ─── Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between pb-6 border-b border-[#1E1E2E]">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-xl bg-[#13131E] hover:bg-[#1E1E2E] border border-[#1E1E2E] flex items-center justify-center transition-colors text-[#A0A0C0] hover:text-white"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <FolderTree className="h-6 w-6 text-[#6C63FF]" />
                                    {scan.repo_owner} / <span className="text-[#00D4FF]">{scan.repo_name}</span>
                                </h1>
                                {scan.status === "completed" && (
                                    <Badge variant="outline" className="bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30 font-mono text-[10px] uppercase">
                                        Analysis Complete
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono text-[#5A5A7A]">
                                <span className="flex items-center gap-1.5 bg-[#13131E] px-2.5 py-1 rounded-md border border-[#1E1E2E]">
                                    <GitBranch className="h-3 w-3 text-[#A855F7]" /> {scan.branch}
                                </span>
                                <span>ID: <span className="text-[#A0A0C0]">{scan._id.slice(-8)}</span></span>
                                {result?.meta && (
                                    <span className="flex items-center gap-1.5 bg-[#13131E] px-2.5 py-1 rounded-md border border-[#1E1E2E]">
                                        <Cpu className="h-3 w-3 text-[#6C63FF]" /> {result.meta.parser} v{result.meta.version}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Processing Banner ──────────────────────────────── */}
                {isProcessing && (
                    <div className="bg-[#13131E] border border-[#6C63FF]/30 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden text-center shadow-[0_0_30px_rgba(108,99,255,0.1)]">
                        <div className="absolute inset-0 bg-[#6C63FF]/5 animate-pulse" />
                        <div className="w-12 h-12 mb-4 relative z-10">
                            <div className="absolute inset-0 rounded-full border-t-2 border-[#6C63FF] animate-spin opacity-80" style={{ animationDuration: '1.5s' }}></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-[#6C63FF]" />
                            </div>
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-2 relative z-10 flex items-center gap-2">
                            <span className="capitalize">{scan.status}</span>
                            <span className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6C63FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6C63FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6C63FF] animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                        </h3>
                        <p className="text-[#A0A0C0] text-sm relative z-10 font-mono mb-6">{scan.message}</p>
                        <div className="w-full max-w-md bg-[#0A0A0F] h-2 rounded-full overflow-hidden border border-[#1E1E2E] relative z-10">
                            <div className="h-full bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] rounded-full transition-all duration-500 ease-out relative" style={{ width: `${scan.progress}%` }}>
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Failed Banner ──────────────────────────────────── */}
                {scan.status === "failed" && (
                    <div className="bg-[#13131E] border border-[#FF4C6A]/30 rounded-xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(255,76,106,0.1)]">
                        <div className="absolute inset-0 bg-[#FF4C6A]/5" />
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#FF4C6A]/10 flex items-center justify-center shrink-0 border border-[#FF4C6A]/20">
                                <XCircle className="h-5 w-5 text-[#FF4C6A]" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-1">Analysis Interrupted</h3>
                                <p className="text-[#A0A0C0] text-sm mb-3">The V3 Semantic Engine encountered a fatal error during extraction.</p>
                                <div className="bg-[#0A0A0F] border border-[#1E1E2E] p-4 rounded-lg">
                                    <p className="text-[#FF4C6A] text-xs font-mono break-all">{scan.error_details || "Unknown exception occurred in parser worker."}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Summary Cards ──────────────────────────────────── */}
                {result && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]">
                        <div className="bg-[#13131E] p-5 rounded-2xl border border-[#1E1E2E] flex flex-col gap-3 group hover:border-[#6C63FF]/30 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/10 flex items-center justify-center border border-[#6C63FF]/20">
                                <Cpu className="h-5 w-5 text-[#6C63FF] group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5A5A7A] uppercase tracking-wider mb-1">Framework</p>
                                <p className="text-xl font-bold text-white capitalize">{result.framework || "Unknown"}</p>
                            </div>
                        </div>
                        <div className="bg-[#13131E] p-5 rounded-2xl border border-[#1E1E2E] flex flex-col gap-3 group hover:border-[#00D4FF]/30 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 flex items-center justify-center border border-[#00D4FF]/20">
                                <Network className="h-5 w-5 text-[#00D4FF] group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5A5A7A] uppercase tracking-wider mb-1">Semantic Nodes</p>
                                <p className="text-xl font-bold text-white">{arch?.nodes?.length || 0}</p>
                            </div>
                        </div>
                        <div className="bg-[#13131E] p-5 rounded-2xl border border-[#1E1E2E] flex flex-col gap-3 group hover:border-[#A855F7]/30 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 flex items-center justify-center border border-[#A855F7]/20">
                                <Layers className="h-5 w-5 text-[#A855F7] group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5A5A7A] uppercase tracking-wider mb-1">Node Types</p>
                                <p className="text-xl font-bold text-white">{nodeTypes.length}</p>
                            </div>
                        </div>
                        <div className="bg-[#13131E] p-5 rounded-2xl border border-[#1E1E2E] flex flex-col gap-3 group hover:border-[#F59E0B]/30 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center border border-[#F59E0B]/20">
                                <FolderTree className="h-5 w-5 text-[#F59E0B] group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5A5A7A] uppercase tracking-wider mb-1">Files Parsed</p>
                                <p className="text-xl font-bold text-white">{arch?.file_structure?.length || 0}</p>
                            </div>
                        </div>
                        <div className="bg-[#13131E] p-5 rounded-2xl border border-[#1E1E2E] flex flex-col gap-3 group hover:border-[#22C55E]/30 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center border border-[#22C55E]/20">
                                <Timer className="h-5 w-5 text-[#22C55E] group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5A5A7A] uppercase tracking-wider mb-1">Pipeline Time</p>
                                <p className="text-xl font-bold text-white">{(result.duration_ms / 1000).toFixed(2)}s</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Tabs ──────────────────────────────────────────── */}
                {result && (
                    <div className="border-b border-[#1E1E2E]">
                        <nav className="-mb-px flex space-x-8">
                            {/* Tab 1 ── CodeScan */}
                            <button
                                onClick={() => setActiveTab('codescan')}
                                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'codescan'
                                        ? 'border-[#6C63FF] text-[#6C63FF]'
                                        : 'border-transparent text-[#A0A0C0] hover:text-white hover:border-[#A0A0C0]'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Network className="h-4 w-4" />
                                    <span>CodeScan</span>
                                    <span className="text-[10px] font-mono opacity-50">Semantic Engine</span>
                                </span>
                            </button>

                            {/* Tab 1b ── Explorer */}
                            <button
                                onClick={() => setActiveTab('explorer')}
                                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'explorer'
                                        ? 'border-[#F59E0B] text-[#F59E0B]'
                                        : 'border-transparent text-[#A0A0C0] hover:text-white hover:border-[#A0A0C0]'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <FolderTree className="h-4 w-4" />
                                    <span>Explorer</span>
                                    <span className="text-[10px] font-mono opacity-50">File Inspector</span>
                                    {arch?.file_structure && arch.file_structure.length > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono border bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30">
                                            {arch.file_structure.length}
                                        </span>
                                    )}
                                </span>
                            </button>

                            {/* Tab 2 ── ArchMap */}
                            <button
                                onClick={() => setActiveTab('archmap')}
                                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'archmap'
                                        ? 'border-[#00D4FF] text-[#00D4FF]'
                                        : 'border-transparent text-[#A0A0C0] hover:text-white hover:border-[#A0A0C0]'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <GitFork className="h-4 w-4" />
                                    <span>ArchMap</span>
                                    <span className="text-[10px] font-mono opacity-50">Dependency Graph</span>
                                </span>
                            </button>

                            {/* Tab 3 ── RiskSight */}
                            <button
                                onClick={() => setActiveTab('risksight')}
                                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === 'risksight'
                                        ? 'border-[#A855F7] text-[#A855F7]'
                                        : 'border-transparent text-[#A0A0C0] hover:text-white hover:border-[#A0A0C0]'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4" />
                                    <span>RiskSight</span>
                                    <span className="text-[10px] font-mono opacity-50">Intelligence Engine</span>
                                    {intel && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono border ${
                                            intel.overall_risk_level === 'critical' ? 'bg-[#FF2D55]/10 text-[#FF2D55] border-[#FF2D55]/30' :
                                            intel.overall_risk_level === 'high' ? 'bg-[#FF4C6A]/10 text-[#FF4C6A] border-[#FF4C6A]/30' :
                                            intel.overall_risk_level === 'medium' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30' :
                                            'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
                                        }`}>
                                            {intel.overall_risk_level.toUpperCase()}
                                        </span>
                                    )}
                                </span>
                            </button>
                        </nav>
                    </div>
                )}

                {/* ─── Tab Content: ArchMap — Dependency Graph ──────────── */}
                {result && activeTab === 'archmap' && (
                    <div className="reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]">
                        <ArchitectureDiagram scanId={id} />
                    </div>
                )}

                {/* ─── Tab Content: Explorer — File Inspector ───────────── */}
                {result && activeTab === 'explorer' && arch && (
                    <div className="reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards] space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <FolderTree className="h-5 w-5 text-[#F59E0B]" />
                            <div>
                                <h3 className="text-white font-semibold">File Explorer</h3>
                                <p className="text-[#5A5A7A] text-xs font-mono">Click any file to inspect its purpose, issues, metrics and fix recommendations</p>
                            </div>
                        </div>
                        <FileExplorerPanel
                            fileStructure={arch.file_structure || []}
                            architectureNodes={arch.nodes || []}
                            nodeMetrics={intel?.metrics?.node_metrics || []}
                            insights={intel?.insights || []}
                        />
                    </div>
                )}
                {result && activeTab === 'explorer' && !arch && (
                    <div className="flex items-center justify-center h-40 text-[#5A5A7A]">
                        <p className="font-mono text-sm">No file structure data available for this scan.</p>
                    </div>
                )}

                {/* ─── Tab Content: RiskSight — Intelligence Engine ─────── */}
                {result && activeTab === 'risksight' && intel && (
                    <div className="space-y-6 reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]">

                        {/* Intelligence Copilot */}
                        <div className="rounded-2xl p-6 bg-[#13131E] border border-[#1E1E2E]">
                            <div className="flex items-center justify-between mb-4 gap-4">
                                <div>
                                    <h3 className="text-white font-semibold text-lg">Intelligence Copilot</h3>
                                    <p className="text-[#A0A0C0] text-sm">Ask in plain language or generate a full report with implementation plan.</p>
                                </div>
                                <button
                                    onClick={() => requestIntelligenceChat("full_report")}
                                    disabled={isChatLoading}
                                    className="bg-[#6C63FF] hover:bg-[#5a52e8] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                                >
                                    {isChatLoading ? "Generating..." : "Generate Full Report"}
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3">
                                <textarea
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Example: what should we fix first in simple language?"
                                    className="w-full h-24 bg-[#0A0A0F] border border-[#1E1E2E] text-[#E2E8F0] rounded-xl p-3 text-sm outline-none focus:border-[#6C63FF]"
                                />
                                <button
                                    onClick={() => requestIntelligenceChat("qa")}
                                    disabled={isChatLoading}
                                    className="md:w-44 bg-[#00D4FF]/10 hover:bg-[#00D4FF]/20 border border-[#00D4FF]/30 text-[#00D4FF] text-sm font-semibold px-4 py-2 rounded-lg h-fit"
                                >
                                    {isChatLoading ? "Thinking..." : "Ask Copilot"}
                                </button>
                            </div>

                            {chatError && (
                                <p className="mt-3 text-[#FF4C6A] text-sm">{chatError}</p>
                            )}

                            {chatReply && (
                                <div className="mt-4 p-4 rounded-xl bg-[#0A0A0F] border border-[#1E1E2E]">
                                    <p className="text-[#E2E8F0] text-sm leading-relaxed whitespace-pre-wrap">{chatReply}</p>
                                </div>
                            )}

                            {chatPlan.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <h4 className="text-white font-semibold">Implementation Plan</h4>
                                    {chatPlan.map((item, idx) => (
                                        <div key={`${item.title}-${idx}`} className="p-4 rounded-xl bg-[#0A0A0F] border border-[#1E1E2E]">
                                            <p className="text-[#E2E8F0] text-sm font-semibold">{idx + 1}. {item.priority} - {item.title}</p>
                                            <p className="text-[#A0A0C0] text-sm mt-1">{item.reason}</p>
                                            <p className="text-[#5A5A7A] text-xs mt-2">Effort: {item.effort} | Impact: {item.expected_impact}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {chatReportMarkdown && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-white font-semibold">Report Markdown</h4>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(chatReportMarkdown);
                                                } catch {
                                                    // ignore clipboard failures
                                                }
                                            }}
                                            className="text-xs font-mono bg-[#1E1E2E] hover:bg-[#2A2A3A] text-[#A0A0C0] px-2 py-1 rounded border border-[#2A2A3A]"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[#A0A0C0] bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl p-3">{chatReportMarkdown}</pre>
                                </div>
                            )}

                            {llmHandoffMarkdown && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-white font-semibold">LLM Handoff Block</h4>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(llmHandoffMarkdown);
                                                } catch {
                                                    // ignore clipboard failures
                                                }
                                            }}
                                            className="text-xs font-mono bg-[#1E1E2E] hover:bg-[#2A2A3A] text-[#A0A0C0] px-2 py-1 rounded border border-[#2A2A3A]"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-[#A0A0C0] bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl p-3">{llmHandoffMarkdown}</pre>
                                </div>
                            )}
                        </div>

                        {/* ─── Insights as Filterable Log Table ─────────── */}
                        {intel.insights && intel.insights.length > 0 && (
                            <ScanLogsViewer
                                title={`Risk Intelligence Feed — ${intel.insights.length} findings`}
                                logs={intel.insights.map((ins, i): ScanLog => ({
                                    id: ins.id || `insight-${i}`,
                                    level: (ins.severity === 'critical' ? 'critical' : ins.severity === 'high' ? 'error' : ins.severity === 'medium' ? 'warning' : 'info') as ScanLog['level'],
                                    category: ins.category,
                                    title: ins.title,
                                    message: ins.description,
                                    affectedNodes: ins.affected_nodes,
                                    recommendation: ins.recommendation,
                                    tags: [ins.severity, ins.category, ins.triggered_by].filter(Boolean),
                                }))}
                            />
                        )}

                        {/* Risk Banner */}
                        <div className={`rounded-2xl p-6 border ${
                            intel.overall_risk_level === 'critical' ? 'bg-[#FF2D55]/5 border-[#FF2D55]/20' :
                            intel.overall_risk_level === 'high' ? 'bg-[#FF4C6A]/5 border-[#FF4C6A]/20' :
                            intel.overall_risk_level === 'medium' ? 'bg-[#F59E0B]/5 border-[#F59E0B]/20' :
                            'bg-[#22C55E]/5 border-[#22C55E]/20'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        intel.overall_risk_level === 'critical' ? 'bg-[#FF2D55]/10' :
                                        intel.overall_risk_level === 'high' ? 'bg-[#FF4C6A]/10' :
                                        intel.overall_risk_level === 'medium' ? 'bg-[#F59E0B]/10' :
                                        'bg-[#22C55E]/10'
                                    }`}>
                                        <Flame className={`h-6 w-6 ${
                                            intel.overall_risk_level === 'critical' ? 'text-[#FF2D55]' :
                                            intel.overall_risk_level === 'high' ? 'text-[#FF4C6A]' :
                                            intel.overall_risk_level === 'medium' ? 'text-[#F59E0B]' :
                                            'text-[#22C55E]'
                                        }`} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-mono tracking-[3px] text-[#5A5A7A] mb-1">OVERALL RISK LEVEL</p>
                                        <p className={`text-2xl font-extrabold ${
                                            intel.overall_risk_level === 'critical' ? 'text-[#FF2D55]' :
                                            intel.overall_risk_level === 'high' ? 'text-[#FF4C6A]' :
                                            intel.overall_risk_level === 'medium' ? 'text-[#F59E0B]' :
                                            'text-[#22C55E]'
                                        }`}>{intel.overall_risk_level.toUpperCase()}</p>
                                        <p className="text-sm text-[#A0A0C0] mt-1">{intel.architectural_theme}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Button
                                        onClick={handleReanalyze}
                                        disabled={isReanalyzing || isProcessing}
                                        className="mb-3 bg-[#1E1E2E] hover:bg-[#2A2A3A] text-white border border-[#2A2A3A]"
                                        size="sm"
                                    >
                                        {isReanalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                        {isReanalyzing ? "Reanalyzing..." : "Reanalyze"}
                                    </Button>
                                    <p className={`text-3xl font-extrabold ${
                                        intel.overall_risk_level === 'critical' ? 'text-[#FF2D55]' :
                                        intel.overall_risk_level === 'high' ? 'text-[#FF4C6A]' :
                                        intel.overall_risk_level === 'medium' ? 'text-[#F59E0B]' :
                                        'text-[#22C55E]'
                                    }`}>{intel.metrics.risk_score}<span className="text-sm text-[#5A5A7A]">/100</span></p>
                                    <p className="text-[10px] font-mono text-[#5A5A7A]">risk score</p>
                                    <p className="text-[10px] text-[#5A5A7A] mt-1">confidence: <span className="text-[#A0A0C0]">{intel.confidence_level}</span></p>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Nodes', value: intel.metrics.total_nodes, icon: Activity, warn: false },
                                { label: 'Edges', value: intel.metrics.total_edges, icon: GitFork, warn: false },
                                { label: 'Cycles', value: intel.metrics.cycles_detected, icon: RefreshCw, warn: intel.metrics.cycles_detected > 0 },
                                { label: 'Max Depth', value: intel.metrics.max_depth, icon: BarChart3, warn: intel.metrics.max_depth > 6 },
                                { label: 'Density', value: intel.metrics.density.toFixed(2), icon: Gauge, warn: intel.metrics.density > 0.2 },
                                { label: 'Coupling', value: intel.metrics.coupling_score.toFixed(1), icon: Target, warn: intel.metrics.coupling_score > 15 },
                                { label: 'Avg Instability', value: intel.metrics.avg_instability.toFixed(2), icon: TrendingUp, warn: intel.metrics.avg_instability > 0.65 },
                                { label: 'SCCs', value: intel.metrics.strongly_connected_components, icon: Eye, warn: false },
                            ].map(({ label, value, icon: Icon, warn }) => (
                                <div key={label} className={`rounded-xl p-4 border ${warn ? 'bg-[#FF4C6A]/5 border-[#FF4C6A]/20' : 'bg-[#13131E] border-[#1E1E2E]'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className={`h-3 w-3 ${warn ? 'text-[#FF4C6A]' : 'text-[#5A5A7A]'}`} />
                                        <span className={`text-[10px] font-mono ${warn ? 'text-[#FF4C6A]' : 'text-[#5A5A7A]'}`}>{label}</span>
                                    </div>
                                    <p className={`text-xl font-bold ${warn ? 'text-[#FF4C6A]' : 'text-white'}`}>{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Detected Patterns */}
                        {intel.detected_patterns.length > 0 && (
                            <div className="bg-[#13131E] border border-[#1E1E2E] rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-[#1E1E2E] flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
                                    <span className="text-sm font-bold text-white">Detected Patterns</span>
                                    <span className="text-[10px] font-mono text-[#5A5A7A] ml-auto">{intel.detected_patterns.length} found</span>
                                </div>
                                {intel.detected_patterns.map((p, i) => (
                                    <div key={i} className={`p-4 flex items-start gap-3 ${i < intel.detected_patterns.length - 1 ? 'border-b border-[#1E1E2E]/50' : ''}`}>
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                            p.severity === 'critical' ? 'bg-[#FF2D55]' :
                                            p.severity === 'high' ? 'bg-[#FF4C6A]' :
                                            p.severity === 'medium' ? 'bg-[#F59E0B]' :
                                            'bg-[#22C55E]'
                                        }`} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-white font-mono">{p.type.replace(/_/g, ' ')}</span>
                                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                                                    p.severity === 'critical' ? 'text-[#FF2D55] bg-[#FF2D55]/10 border-[#FF2D55]/30' :
                                                    p.severity === 'high' ? 'text-[#FF4C6A] bg-[#FF4C6A]/10 border-[#FF4C6A]/30' :
                                                    p.severity === 'medium' ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30' :
                                                    'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/30'
                                                }`}>{p.severity}</span>
                                            </div>
                                            <p className="text-xs text-[#A0A0C0] leading-relaxed">{p.description}</p>
                                            {Object.keys(p.evidence).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {Object.entries(p.evidence).map(([k, v]) => (
                                                        <span key={k} className="text-[9px] font-mono text-[#5A5A7A] bg-[#0A0A0F] border border-[#1E1E2E] rounded px-1.5 py-0.5">{k}: {String(v)}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Insights */}
                        {intel.insights.length > 0 && (
                            <div className="bg-[#13131E] border border-[#1E1E2E] rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-[#1E1E2E] flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-[#6C63FF]" />
                                    <span className="text-sm font-bold text-white">Insights</span>
                                    <span className="text-[10px] font-mono text-[#5A5A7A] ml-auto">{intel.insights.length} items</span>
                                </div>
                                {intel.insights.map((ins, i) => (
                                    <div key={ins.id} className={`p-4 ${i < intel.insights.length - 1 ? 'border-b border-[#1E1E2E]/50' : ''}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                                                ins.severity === 'critical' ? 'text-[#FF2D55] bg-[#FF2D55]/10 border-[#FF2D55]/30' :
                                                ins.severity === 'high' ? 'text-[#FF4C6A] bg-[#FF4C6A]/10 border-[#FF4C6A]/30' :
                                                ins.severity === 'medium' ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30' :
                                                'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/30'
                                            }`}>{ins.severity}</span>
                                            <span className="text-[9px] font-mono text-[#5A5A7A] bg-[#0A0A0F] border border-[#1E1E2E] rounded px-1.5 py-0.5">{ins.category}</span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-white mb-1">{ins.title}</h4>
                                        <p className="text-xs text-[#A0A0C0] leading-relaxed mb-3">{ins.description}</p>
                                        <div className="bg-[#6C63FF]/5 border border-[#6C63FF]/15 rounded-lg p-3">
                                            <p className="text-[10px] font-mono text-[#6C63FF] mb-1">RECOMMENDATION</p>
                                            <p className="text-xs text-[#c4b5fd] leading-relaxed">{ins.recommendation}</p>
                                        </div>
                                        <p className="text-[10px] font-mono text-[#3A3A4A] mt-2">triggered by: {ins.triggered_by}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Strategic Guidance */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#13131E] border border-[#1E1E2E] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Target className="h-3.5 w-3.5 text-[#6C63FF]" />
                                    <span className="text-xs font-bold text-[#A0A0C0]">Refactor Strategy</span>
                                </div>
                                <p className="text-xs text-[#cbd5e1] leading-relaxed">{intel.refactor_strategy}</p>
                            </div>
                            <div className="bg-[#13131E] border border-[#1E1E2E] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="h-3.5 w-3.5 text-[#6C63FF]" />
                                    <span className="text-xs font-bold text-[#A0A0C0]">Scaling Outlook</span>
                                </div>
                                <p className="text-xs text-[#cbd5e1] leading-relaxed">{intel.scaling_outlook}</p>
                            </div>
                            <div className="col-span-2 bg-[#13131E] border border-[#1E1E2E] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <ArrowUpRight className="h-3.5 w-3.5 text-[#6C63FF]" />
                                    <span className="text-xs font-bold text-[#A0A0C0]">Long-term Recommendation</span>
                                </div>
                                <p className="text-xs text-[#cbd5e1] leading-relaxed">{intel.long_term_recommendation}</p>
                            </div>
                        </div>

                        {/* Primary Risk Drivers */}
                        {intel.primary_risk_drivers.length > 0 && (
                            <div className="bg-[#13131E] border border-[#1E1E2E] rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShieldAlert className="h-3.5 w-3.5 text-[#FF4C6A]" />
                                    <span className="text-xs font-bold text-[#A0A0C0]">Primary Risk Drivers</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {intel.primary_risk_drivers.map((d, i) => (
                                        <span key={i} className="text-xs font-mono text-[#FF4C6A] bg-[#FF4C6A]/8 border border-[#FF4C6A]/20 rounded-lg px-2.5 py-1">{d}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="text-[10px] font-mono text-[#2A2A3A] text-right">
                            Intelligence Engine v{intel.engine_version} · analyzed {new Date(intel.analyzed_at).toLocaleString()}
                        </p>
                    </div>
                )}

                {/* ─── Tab Content: CodeScan — Semantic Engine ─────────── */}
                {result && activeTab === 'codescan' && (
                <div className="space-y-8">

                {/* ─── Semantic Node Sections ─────────────────────────── */}
                {arch && arch.nodes && Array.isArray(arch.nodes) && arch.nodes.length > 0 && (
                    <div className="space-y-6 reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
                        {Object.entries(groupedNodes).map(([type, nodes]) => {
                            const config = nodeTypeConfig[type] || { label: type, color: "#A0A0C0", icon: Box, badge: type };
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const IconComponent = config.icon as any;
                            const isExpanded = expandedSections.has(type);

                            return (
                                <div key={type} className="bg-[#05050A] rounded-2xl border border-[#1E1E2E] overflow-hidden shadow-2xl">
                                    {/* Section Header */}
                                    <button
                                        onClick={() => toggleSection(type)}
                                        className="w-full p-4 border-b border-[#1E1E2E] flex items-center justify-between bg-[#0A0A0F] hover:bg-[#0D0D14] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}15`, border: `1px solid ${config.color}30` }}>
                                                <IconComponent className="h-4 w-4" style={{ color: config.color }} />
                                            </div>
                                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{config.label}</h2>
                                            <Badge variant="outline" className="font-mono text-[10px]" style={{ backgroundColor: `${config.color}15`, color: config.color, borderColor: `${config.color}30` }}>
                                                {nodes.length} {nodes.length === 1 ? "Node" : "Nodes"}
                                            </Badge>
                                        </div>
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-[#5A5A7A]" /> : <ChevronRight className="w-4 h-4 text-[#5A5A7A]" />}
                                    </button>

                                    {/* Section Body */}
                                    {isExpanded && (
                                        <div className="divide-y divide-[#1E1E2E]">
                                            {nodes.map((node) => (
                                                <div key={node.id} className="flex flex-col gap-2 px-5 py-4 hover:bg-[#13131E]/50 transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        {/* Method Badge for Endpoints */}
                                                        {node.type === "http_endpoint" && node.metadata.method && (
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${methodColors[node.metadata.method] || "bg-[#5A5A7A]/20 text-[#A0A0C0] border-[#5A5A7A]/30"}`}>
                                                                {node.metadata.method}
                                                            </span>
                                                        )}
                                                        {/* Decorator Badge for Python endpoints */}
                                                        {node.type === "http_endpoint" && node.metadata.decorator && !node.metadata.method && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30">
                                                                ROUTE
                                                            </span>
                                                        )}
                                                        {/* DB Op Badge */}
                                                        {node.type === "db_operation" && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30">
                                                                {(node.metadata.operations || []).join(", ").toUpperCase() || "DB"}
                                                            </span>
                                                        )}
                                                        {/* Service Badge */}
                                                        {(node.type === "business_logic_service" || node.type === "external_service" || node.type === "queue_worker") && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ backgroundColor: `${config.color}15`, color: config.color, borderColor: `${config.color}30` }}>
                                                                {config.badge}
                                                            </span>
                                                        )}

                                                        {/* Node Name / Decorator */}
                                                        <span className="text-sm font-mono text-white group-hover:text-[#00D4FF] transition-colors truncate max-w-[600px]">
                                                            {node.metadata.decorator || node.metadata.text?.slice(0, 80) || node.name}
                                                        </span>

                                                        {/* Confidence */}
                                                        <span className={`text-[10px] font-mono ml-auto shrink-0 ${confidenceColor(node.confidence)}`}>
                                                            {Math.round(node.confidence * 100)}%
                                                        </span>
                                                    </div>

                                                    {/* File Path */}
                                                    <div className="flex items-center gap-1.5 text-xs text-[#5A5A7A] font-mono ml-12">
                                                        <ChevronRight className="w-3 h-3" />
                                                        <span className="truncate">{shortenPath(node.file)}</span>
                                                    </div>

                                                    {/* DB Target Info */}
                                                    {node.type === "db_operation" && node.metadata.targets?.length > 0 && (
                                                        <div className="flex items-center gap-1.5 text-xs text-[#5A5A7A] font-mono ml-12">
                                                            <Database className="w-3 h-3 text-[#F59E0B]" />
                                                            <span>target: {node.metadata.targets.join(", ")}</span>
                                                        </div>
                                                    )}

                                                    {/* External Service Info */}
                                                    {node.type === "external_service" && node.metadata.libraries?.length > 0 && (
                                                        <div className="flex items-center gap-1.5 text-xs text-[#5A5A7A] font-mono ml-12">
                                                            <Globe className="w-3 h-3 text-[#22C55E]" />
                                                            <span>via: {node.metadata.libraries.join(", ")}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ─── AST File Structure ─────────────────────────────── */}
                {arch && arch.file_structure && arch.file_structure.length > 0 && (
                    <div className="space-y-4 reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]" style={{ animationDelay: '400ms' }}>
                        {/* Visual FileTree */}
                        <FileTree
                            data={buildFileTree(arch.file_structure)}
                            className="border-[#1E1E2E]"
                        />

                        {/* Expandable detail list */}
                        <div className="bg-[#040408] rounded-2xl border border-[#1E1E2E] overflow-hidden flex flex-col shadow-2xl">
                        <button
                            onClick={() => toggleSection("file_structure")}
                            className="w-full flex items-center gap-3 px-5 py-3 border-b border-[#1E1E2E] bg-[#0A0A0F] hover:bg-[#0D0D14] transition-colors"
                        >
                            <TerminalSquare className="w-4 h-4 text-[#A855F7]" />
                            <span className="font-mono text-xs text-[#A0A0C0] tracking-wide">ast_topology_viewer</span>
                            <Badge variant="outline" className="bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30 font-mono text-[10px]">
                                {arch.file_structure.length} Files
                            </Badge>
                            <div className="ml-auto flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F58]"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#28CA41]"></span>
                                </div>
                                {expandedSections.has("file_structure") ? <ChevronDown className="w-4 h-4 text-[#5A5A7A]" /> : <ChevronRight className="w-4 h-4 text-[#5A5A7A]" />}
                            </div>
                        </button>

                        {expandedSections.has("file_structure") && (
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar divide-y divide-[#1E1E2E]/50">
                                {arch.file_structure.map((file, i) => {
                                    const isExpanded = expandedFiles.has(file.file);
                                    const hasFunctions = file.functions.length > 0;
                                    const hasClasses = file.classes.length > 0;
                                    return (
                                        <div key={i} className="group">
                                            <button
                                                onClick={() => toggleFile(file.file)}
                                                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#13131E] transition-colors text-left"
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="h-3 w-3 text-[#5A5A7A] shrink-0" />
                                                ) : (
                                                    <ChevronRight className="h-3 w-3 text-[#5A5A7A] shrink-0" />
                                                )}
                                                <span className="text-[13px] font-mono text-white truncate group-hover:text-[#A855F7] transition-colors relative top-[1px]">{shortenPath(file.file)}</span>
                                                <div className="ml-auto flex items-center gap-2 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    {hasFunctions && (
                                                        <span className="text-[10px] text-[#00D4FF] font-mono">
                                                            +fn({file.functions.length})
                                                        </span>
                                                    )}
                                                    {hasClasses && (
                                                        <span className="text-[10px] text-[#A855F7] font-mono">
                                                            +class({file.classes.length})
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] font-mono ml-2 ${langColors[file.language] || "text-[#5A5A7A]"}`}>
                                                        [{file.language}]
                                                    </span>
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="bg-[#07070B] px-8 py-5 space-y-4 border-t border-[#1E1E2E]/30 shadow-inner">
                                                    {file.functions.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-[10px] font-bold text-[#00D4FF] uppercase tracking-wider font-mono">▸ Functions</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5 ml-4">
                                                                {file.functions.map((fn, j) => (
                                                                    <span key={j} className="text-xs font-mono text-[#A0A0C0] opacity-80 hover:opacity-100 transition-opacity">
                                                                        <span className="text-[#00D4FF] opacity-60">function</span> {fn}()
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {file.classes.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-[10px] font-bold text-[#A855F7] uppercase tracking-wider font-mono">▸ Classes</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5 ml-4">
                                                                {file.classes.map((cls, j) => (
                                                                    <span key={j} className="text-xs font-mono text-[#A0A0C0] opacity-80 hover:opacity-100 transition-opacity">
                                                                        <span className="text-[#A855F7] opacity-60">class</span> {cls}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(file.imports.length > 0 || file.exports.length > 0) && (
                                                        <div className="grid grid-cols-2 gap-4 border-t border-[#1E1E2E]/50 pt-3 mt-3">
                                                            {file.imports.length > 0 && (
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-[10px] font-bold text-[#5A5A7A] uppercase tracking-wider font-mono">⬇ Imports</span>
                                                                    </div>
                                                                    <div className="space-y-1 ml-4">
                                                                        {file.imports.slice(0, 5).map((imp, j) => (
                                                                            <p key={j} className="text-[11px] font-mono text-[#A0A0C0] truncate opacity-70" title={imp}>{imp}</p>
                                                                        ))}
                                                                        {file.imports.length > 5 && (
                                                                            <p className="text-[10px] text-[#5A5A7A] italic ml-2 mt-1">... +{file.imports.length - 5} hidden</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {file.exports.length > 0 && (
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-[10px] font-bold text-[#22C55E] uppercase tracking-wider font-mono">⬆ Exports</span>
                                                                    </div>
                                                                    <div className="space-y-1 ml-4">
                                                                        {file.exports.slice(0, 5).map((exp, j) => (
                                                                            <p key={j} className="text-[11px] font-mono text-[#A0A0C0] truncate opacity-70" title={exp}>{exp}</p>
                                                                        ))}
                                                                        {file.exports.length > 5 && (
                                                                            <p className="text-[10px] text-[#5A5A7A] italic ml-2 mt-1">... +{file.exports.length - 5} hidden</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        </div>
                    </div>
                )}



                {/* ─── Empty State ─────────────────────────────────────── */}
                {arch &&
                 (!arch.nodes || !Array.isArray(arch.nodes) || arch.nodes.length === 0) &&
                 (!arch.file_structure || !Array.isArray(arch.file_structure) || arch.file_structure.length === 0) && (
                    <div className="bg-[#13131E] border border-dashed border-[#1E1E2E] rounded-2xl p-16 text-center reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]">
                        <Network className="h-12 w-12 text-[#5A5A7A] mx-auto mb-6 opacity-50" />
                        <h3 className="text-xl font-bold text-white mb-3">No Architectural Components Detected</h3>
                        <p className="text-[#A0A0C0] max-w-lg mx-auto leading-relaxed text-sm">
                            The V3 Semantic Engine completed successfully, but could not detect any structural components (endpoints, services, DB operations) within the repository.
                        </p>
                    </div>
                )}

                </div>
                )} {/* Close codescan tab content */}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}} />
        </div>
    );
}
