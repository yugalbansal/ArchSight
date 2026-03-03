"use client";

import { useEffect, useState } from "react";
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
    nodes: ArchitectureNode[];
    edges: { source: string; target: string; type: string }[];
    file_structure: FileStructureEntry[];
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
        architecture: ArchitectureGraph;
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
    // Fallback: show last 3 segments
    return parts.slice(-3).join("/");
}

function groupNodesByType(nodes: ArchitectureNode[]): Record<string, ArchitectureNode[]> {
    const groups: Record<string, ArchitectureNode[]> = {};
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

// ─── Component ───────────────────────────────────────────────────────

export default function ScanResultPage() {
    const { id } = useParams<{ id: string }>();
    const { data: session } = useSession();
    const router = useRouter();
    const [scan, setScan] = useState<ScanResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["http_endpoint", "db_operation", "business_logic_service", "external_service", "queue_worker", "file_structure"]));
    const [activeTab, setActiveTab] = useState<"architecture" | "intelligence">("architecture");
    const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
    const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

    useEffect(() => {
        if (!session?.user || !id) return;

        const fetchScan = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/scan/${id}`,
                    { credentials: "include" }
                );
                if (res.ok) {
                    const data = await res.json();
                    setScan(data.scan);
                }
            } catch (err) {
                console.error("Failed to load scan", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchScan();
        const interval = setInterval(fetchScan, 3000);
        return () => clearInterval(interval);
    }, [id, session]);

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
    const intel = result?.intelligence;
    const isProcessing = !["completed", "failed"].includes(scan.status);
    const groupedNodes = arch ? groupNodesByType(arch.nodes) : {};
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

                {/* ─── Tab Switcher ────────────────────────────────────── */}
                {result && (
                    <div className="flex gap-1 bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl p-1 w-fit">
                        <button
                            onClick={() => setActiveTab("architecture")}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                                activeTab === "architecture"
                                    ? "bg-[#1E1E2E] text-white shadow"
                                    : "text-[#5A5A7A] hover:text-[#A0A0C0]"
                            }`}
                        >
                            <Network className="h-4 w-4" />
                            Architecture
                        </button>
                        <button
                            onClick={() => setActiveTab("intelligence")}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                                activeTab === "intelligence"
                                    ? "bg-[#6C63FF]/20 text-[#A89CFF] shadow border border-[#6C63FF]/30"
                                    : "text-[#5A5A7A] hover:text-[#A0A0C0]"
                            }`}
                        >
                            <ShieldAlert className="h-4 w-4" />
                            Intelligence
                            {intel && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono border ${riskConfig[intel.overall_risk_level].bg} ${riskConfig[intel.overall_risk_level].border}`} style={{ color: riskConfig[intel.overall_risk_level].color }}>
                                    {intel.overall_risk_level.toUpperCase()}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* ─── Semantic Node Sections ─────────────────────────── */}
                {activeTab === "architecture" && arch && arch.nodes.length > 0 && (
                    <div className="space-y-6 reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
                        {Object.entries(groupedNodes).map(([type, nodes]) => {
                            const config = nodeTypeConfig[type] || { label: type, color: "#A0A0C0", icon: Box, badge: type };
                            const IconComponent = config.icon;
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
                {activeTab === "architecture" && arch && arch.file_structure && arch.file_structure.length > 0 && (
                    <div className="bg-[#040408] rounded-2xl border border-[#1E1E2E] overflow-hidden flex flex-col shadow-2xl reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]" style={{ animationDelay: '400ms' }}>
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
                )}

                {/* ─── Intelligence Panel ──────────────────────────────── */}
                {activeTab === "intelligence" && intel && (
                    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">

                        {/* ── Risk Overview Header ─────────────────────── */}
                        <div className={`relative rounded-2xl border p-6 overflow-hidden ${riskConfig[intel.overall_risk_level].border} ${riskConfig[intel.overall_risk_level].glow}`}
                            style={{ background: `linear-gradient(135deg, ${riskConfig[intel.overall_risk_level].color}08 0%, #0A0A0F 60%)` }}>
                            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${riskConfig[intel.overall_risk_level].color}10 0%, transparent 60%)` }} />
                            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                {/* Risk Gauge */}
                                <div className="shrink-0">
                                    <RiskGauge score={intel.metrics.risk_score} />
                                </div>
                                {/* Theme + Risk Level */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <h2 className="text-xl font-bold text-white">{intel.architectural_theme}</h2>
                                        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${riskConfig[intel.overall_risk_level].bg} ${riskConfig[intel.overall_risk_level].border}`}
                                            style={{ color: riskConfig[intel.overall_risk_level].color }}>
                                            {riskConfig[intel.overall_risk_level].label}
                                        </span>
                                        <span className="text-[10px] font-mono text-[#5A5A7A] border border-[#1E1E2E] bg-[#13131E] px-2 py-1 rounded-full">
                                            Confidence: {intel.confidence_level.replace("_", " ")}
                                        </span>
                                    </div>
                                    {/* Primary Risk Drivers */}
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {intel.primary_risk_drivers.map((d, i) => (
                                            <span key={i} className="text-[11px] font-mono text-[#A0A0C0] bg-[#13131E] border border-[#1E1E2E] px-2.5 py-1 rounded-lg">
                                                {d}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {/* Engine Info */}
                                <div className="shrink-0 text-right hidden md:block">
                                    <p className="text-[10px] font-mono text-[#5A5A7A]">Engine v{intel.engine_version}</p>
                                    <p className="text-[10px] font-mono text-[#5A5A7A]">{new Date(intel.analyzed_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Graph Metrics Dashboard ──────────────────── */}
                        <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-[#1E1E2E] bg-[#0D0D14] flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-[#6C63FF]" />
                                <span className="text-sm font-bold text-white">Graph Metrics</span>
                                <span className="text-xs font-mono text-[#5A5A7A] ml-auto">{intel.metrics.total_nodes} nodes · {intel.metrics.total_edges} edges</span>
                            </div>
                            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-5">
                                {[
                                    { label: "Risk Score",       value: intel.metrics.risk_score,                       max: 100,  color: intel.metrics.risk_score >= 70 ? "#FF4C6A" : intel.metrics.risk_score >= 50 ? "#FF6B35" : "#F59E0B", display: String(intel.metrics.risk_score) },
                                    { label: "Density",          value: intel.metrics.density * 100,                    max: 100,  color: "#A855F7", display: `${(intel.metrics.density * 100).toFixed(1)}%` },
                                    { label: "Coupling Score",   value: intel.metrics.coupling_score,                   max: 30,   color: "#FF6B35", display: intel.metrics.coupling_score.toFixed(1) },
                                    { label: "Avg Instability",  value: intel.metrics.avg_instability * 100,            max: 100,  color: "#F59E0B", display: `${(intel.metrics.avg_instability * 100).toFixed(0)}%` },
                                    { label: "Max Depth",        value: intel.metrics.max_depth,                        max: 10,   color: "#00D4FF", display: String(intel.metrics.max_depth) },
                                    { label: "Cycles",           value: intel.metrics.cycles_detected,                  max: Math.max(1, intel.metrics.cycles_detected), color: intel.metrics.cycles_detected > 0 ? "#FF4C6A" : "#22C55E", display: String(intel.metrics.cycles_detected) },
                                    { label: "SCC Count",        value: intel.metrics.strongly_connected_components,    max: Math.max(1, intel.metrics.strongly_connected_components), color: "#6C63FF", display: String(intel.metrics.strongly_connected_components) },
                                    { label: "Avg Fan-In",       value: intel.metrics.avg_fan_in,                       max: 10,   color: "#22C55E", display: intel.metrics.avg_fan_in.toFixed(1) },
                                ].map(m => (
                                    <div key={m.label} className="space-y-2">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-[11px] text-[#5A5A7A] font-mono uppercase tracking-wide">{m.label}</span>
                                            <span className="text-sm font-bold font-mono" style={{ color: m.color }}>{m.display}</span>
                                        </div>
                                        <MetricBar value={m.value} max={m.max} color={m.color} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Two-Column: Patterns + Strategic Guidance ─── */}
                        <div className="grid md:grid-cols-2 gap-6">

                            {/* ─ Detected Patterns ─────────────────────── */}
                            <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl overflow-hidden">
                                <div className="px-5 py-3 border-b border-[#1E1E2E] bg-[#0D0D14] flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4 text-[#FF4C6A]" />
                                    <span className="text-sm font-bold text-white">Detected Patterns</span>
                                    <Badge variant="outline" className="ml-auto font-mono text-[10px] bg-[#FF4C6A]/10 text-[#FF4C6A] border-[#FF4C6A]/30">
                                        {intel.detected_patterns.length} Found
                                    </Badge>
                                </div>
                                <div className="divide-y divide-[#1E1E2E]">
                                    {intel.detected_patterns.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <CheckCircle2 className="h-8 w-8 text-[#22C55E] mx-auto mb-2" />
                                            <p className="text-sm text-[#A0A0C0]">No architectural patterns detected.</p>
                                        </div>
                                    ) : intel.detected_patterns.map((p, i) => {
                                        const PatternIcon = patternTypeIcons[p.type] || ShieldAlert;
                                        const sc = severityConfig[p.severity];
                                        const key = `pattern-${i}`;
                                        const isOpen = expandedPattern === key;
                                        return (
                                            <div key={key} className={`${sc.bg} transition-colors`}>
                                                <button
                                                    onClick={() => setExpandedPattern(isOpen ? null : key)}
                                                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
                                                >
                                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${sc.color}20`, border: `1px solid ${sc.color}30` }}>
                                                        <PatternIcon className="h-3.5 w-3.5" style={{ color: sc.color }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-white">{patternTypeLabels[p.type] || p.type}</span>
                                                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border" style={{ color: sc.color, backgroundColor: `${sc.color}15`, borderColor: `${sc.color}30` }}>
                                                                {p.severity}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-[#5A5A7A] mt-0.5 line-clamp-1">{p.description}</p>
                                                    </div>
                                                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-[#5A5A7A] shrink-0 mt-1" /> : <ChevronRight className="h-3.5 w-3.5 text-[#5A5A7A] shrink-0 mt-1" />}
                                                </button>
                                                {isOpen && (
                                                    <div className="px-4 pb-4 pt-0 ml-10 space-y-3">
                                                        <p className="text-xs text-[#A0A0C0] leading-relaxed">{p.description}</p>
                                                        {p.affected_node_ids.length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] text-[#5A5A7A] uppercase font-bold tracking-wider mb-1.5">Affected Nodes</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {p.affected_node_ids.slice(0, 6).map((nid, j) => (
                                                                        <span key={j} className="text-[10px] font-mono bg-[#13131E] border border-[#1E1E2E] text-[#A0A0C0] px-2 py-0.5 rounded truncate max-w-[160px]">{nid}</span>
                                                                    ))}
                                                                    {p.affected_node_ids.length > 6 && <span className="text-[10px] text-[#5A5A7A] italic">+{p.affected_node_ids.length - 6} more</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {Object.keys(p.evidence).length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] text-[#5A5A7A] uppercase font-bold tracking-wider mb-1.5">Evidence</p>
                                                                <div className="grid grid-cols-2 gap-1.5">
                                                                    {Object.entries(p.evidence).map(([k, v]) => (
                                                                        <div key={k} className="flex justify-between bg-[#0A0A0F] border border-[#1E1E2E] rounded px-2 py-1">
                                                                            <span className="text-[10px] font-mono text-[#5A5A7A]">{k}</span>
                                                                            <span className="text-[10px] font-mono text-[#A0A0C0]">{String(v)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ─ Strategic Guidance ────────────────────── */}
                            <div className="flex flex-col gap-4">
                                {[
                                    { label: "Refactor Strategy",       icon: Target,      color: "#A855F7", text: intel.refactor_strategy },
                                    { label: "Scaling Outlook",         icon: TrendingUp,  color: "#00D4FF", text: intel.scaling_outlook },
                                    { label: "Long-Term Recommendation", icon: ArrowUpRight, color: "#22C55E", text: intel.long_term_recommendation },
                                ].map(card => {
                                    const CardIcon = card.icon;
                                    return (
                                        <div key={card.label} className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl p-5 flex-1 relative overflow-hidden group hover:border-opacity-50 transition-colors"
                                            style={{ borderColor: `${card.color}25` }}>
                                            <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-[0.04]" style={{ backgroundColor: card.color }} />
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15`, border: `1px solid ${card.color}25` }}>
                                                    <CardIcon className="h-3.5 w-3.5" style={{ color: card.color }} />
                                                </div>
                                                <span className="text-xs font-bold text-[#5A5A7A] uppercase tracking-wider">{card.label}</span>
                                            </div>
                                            <p className="text-sm text-[#A0A0C0] leading-relaxed">{card.text}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Insights List ─────────────────────────────── */}
                        <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-[#1E1E2E] bg-[#0D0D14] flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
                                <span className="text-sm font-bold text-white">Actionable Insights</span>
                                <span className="ml-auto text-xs font-mono text-[#5A5A7A]">{intel.insights.length} items</span>
                            </div>
                            <div className="divide-y divide-[#1E1E2E]">
                                {intel.insights.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <CheckCircle2 className="h-8 w-8 text-[#22C55E] mx-auto mb-2" />
                                        <p className="text-sm text-[#A0A0C0]">Architecture looks clean — no critical insights.</p>
                                    </div>
                                ) : intel.insights.map((ins) => {
                                    const sc = severityConfig[ins.severity];
                                    const cc = categoryConfig[ins.category] || { color: "#A0A0C0", icon: Lightbulb };
                                    const CatIcon = cc.icon;
                                    const isOpen = expandedInsight === ins.id;
                                    return (
                                        <div key={ins.id} className="group">
                                            <button
                                                onClick={() => setExpandedInsight(isOpen ? null : ins.id)}
                                                className="w-full flex items-start gap-4 px-5 py-4 hover:bg-[#13131E]/50 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${cc.color}15`, border: `1px solid ${cc.color}25` }}>
                                                    <CatIcon className="h-4 w-4" style={{ color: cc.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-white">{ins.title}</span>
                                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border" style={{ color: sc.color, backgroundColor: `${sc.color}15`, borderColor: `${sc.color}30` }}>{ins.severity}</span>
                                                        <span className="text-[10px] capitalize text-[#5A5A7A] font-mono bg-[#13131E] border border-[#1E1E2E] px-2 py-0.5 rounded">{ins.category}</span>
                                                    </div>
                                                    <p className="text-xs text-[#5A5A7A] line-clamp-1">{ins.description}</p>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-2 mt-1">
                                                    <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                                    {isOpen ? <ChevronDown className="h-4 w-4 text-[#5A5A7A]" /> : <ChevronRight className="h-4 w-4 text-[#5A5A7A]" />}
                                                </div>
                                            </button>
                                            {isOpen && (
                                                <div className="px-5 pb-5 pt-1 ml-12 space-y-4">
                                                    <p className="text-sm text-[#A0A0C0] leading-relaxed">{ins.description}</p>
                                                    <div className="bg-[#13131E] border rounded-xl p-4" style={{ borderColor: `${cc.color}20` }}>
                                                        <p className="text-[11px] uppercase font-bold tracking-wider mb-2" style={{ color: cc.color }}>Recommendation</p>
                                                        <p className="text-sm text-[#A0A0C0] leading-relaxed">{ins.recommendation}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-3">
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-[#5A5A7A] tracking-wider mb-1.5">Triggered By</p>
                                                            <span className="text-[11px] font-mono bg-[#0A0A0F] border border-[#1E1E2E] text-[#A0A0C0] px-2.5 py-1 rounded-lg">{ins.triggered_by}</span>
                                                        </div>
                                                        {ins.affected_nodes.length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-[#5A5A7A] tracking-wider mb-1.5">Affected Nodes</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {ins.affected_nodes.slice(0, 4).map((n, j) => (
                                                                        <span key={j} className="text-[10px] font-mono bg-[#0A0A0F] border border-[#1E1E2E] text-[#A0A0C0] px-2 py-0.5 rounded truncate max-w-[160px]">{n}</span>
                                                                    ))}
                                                                    {ins.affected_nodes.length > 4 && <span className="text-[10px] text-[#5A5A7A] italic">+{ins.affected_nodes.length - 4} more</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Priority Order ─────────────────────────────── */}
                        {intel.priority_order.length > 0 && (
                            <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl overflow-hidden">
                                <div className="px-5 py-3 border-b border-[#1E1E2E] bg-[#0D0D14] flex items-center gap-2">
                                    <Target className="h-4 w-4 text-[#FF4C6A]" />
                                    <span className="text-sm font-bold text-white">Intervention Priority Queue</span>
                                    <span className="ml-auto text-[10px] font-mono text-[#5A5A7A]">Highest impact first</span>
                                </div>
                                <div className="p-5 flex flex-wrap gap-2">
                                    {intel.priority_order.map((nodeId, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-[#13131E] border border-[#1E1E2E] rounded-xl px-3 py-2 group hover:border-[#FF4C6A]/30 transition-colors">
                                            <span className="text-[10px] font-bold font-mono w-5 text-center rounded-full" style={{ color: i === 0 ? "#FF4C6A" : i < 3 ? "#FF6B35" : "#5A5A7A" }}>
                                                #{i + 1}
                                            </span>
                                            <span className="text-xs font-mono text-[#A0A0C0] group-hover:text-white transition-colors truncate max-w-[200px]">{nodeId}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Intelligence Not Yet Available ──────────────────── */}
                {activeTab === "intelligence" && !intel && scan.status === "completed" && (
                    <div className="bg-[#13131E] border border-dashed border-[#1E1E2E] rounded-2xl p-16 text-center">
                        <ShieldAlert className="h-12 w-12 text-[#5A5A7A] mx-auto mb-6 opacity-50" />
                        <h3 className="text-xl font-bold text-white mb-3">Intelligence Not Available</h3>
                        <p className="text-[#A0A0C0] max-w-lg mx-auto text-sm leading-relaxed">
                            This scan was completed before the Intelligence Engine was deployed.
                            Re-run the scan to generate insights, risk analysis, and architectural patterns.
                        </p>
                    </div>
                )}

                {/* ─── Empty State ─────────────────────────────────────── */}
                {activeTab === "architecture" && arch && arch.nodes.length === 0 && (!arch.file_structure || arch.file_structure.length === 0) && (
                    <div className="bg-[#13131E] border border-dashed border-[#1E1E2E] rounded-2xl p-16 text-center reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]">
                        <Network className="h-12 w-12 text-[#5A5A7A] mx-auto mb-6 opacity-50" />
                        <h3 className="text-xl font-bold text-white mb-3">No Architectural Components Detected</h3>
                        <p className="text-[#A0A0C0] max-w-lg mx-auto leading-relaxed text-sm">
                            The V3 Semantic Engine completed successfully, but could not detect any structural components (endpoints, services, DB operations) within the repository.
                        </p>
                    </div>
                )}
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
