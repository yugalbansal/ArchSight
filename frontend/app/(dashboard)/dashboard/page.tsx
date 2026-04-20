"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
    FolderGit2, Clock, ArrowRight, Loader2, XCircle,
    CheckCircle2, ScanSearch, Activity, Zap, Github,
    GitBranch, ExternalLink, Terminal
} from "lucide-react";
import { fetchWithAuth, API_URL } from "@/lib/api";
import { DashboardStatCard } from "@/components/ui/dashboard-stat-card";

interface ScanDocument {
    _id: string;
    repo_owner: string;
    repo_name: string;
    branch: string;
    status: string;
    progress: number;
    message: string;
    created_at: string;
    completed_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
    completed: { label: "Completed",  color: "#22C55E", glow: "rgba(34,197,94,0.3)" },
    pending:   { label: "Pending",    color: "#5A5A7A", glow: "transparent" },
    cloning:   { label: "Cloning",    color: "#00D4FF", glow: "rgba(0,212,255,0.3)" },
    detecting: { label: "Detecting",  color: "#A855F7", glow: "rgba(168,85,247,0.3)" },
    parsing:   { label: "Parsing",    color: "#F59E0B", glow: "rgba(245,158,11,0.3)" },
    extracting:{ label: "Extracting", color: "#F59E0B", glow: "rgba(245,158,11,0.3)" },
    analysing: { label: "Analysing",  color: "#6C63FF", glow: "rgba(108,99,255,0.3)" },
    failed:    { label: "Failed",     color: "#FF4C6A", glow: "rgba(255,76,106,0.3)" },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const isRunning = !["completed","failed","pending"].includes(status);
    return (
        <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border"
            style={{
                color: cfg.color,
                borderColor: `${cfg.color}40`,
                background: `${cfg.color}12`,
            }}
        >
            {isRunning ? (
                <Loader2 className="h-3 w-3 animate-spin" style={{ color: cfg.color }} />
            ) : status === "completed" ? (
                <CheckCircle2 className="h-3 w-3" style={{ color: cfg.color }} />
            ) : status === "failed" ? (
                <XCircle className="h-3 w-3" style={{ color: cfg.color }} />
            ) : (
                <Clock className="h-3 w-3" style={{ color: cfg.color }} />
            )}
            {cfg.label}
        </span>
    );
}

export default function Dashboard() {
    const { data: session } = useSession();
    const [scans, setScans] = useState<ScanDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchScans() {
            if (!session?.user) return;
            try {
                const res = await fetchWithAuth(`${API_URL}/api/scan/user/all`);
                if (res.ok) {
                    const data = await res.json();
                    setScans(data.scans || []);
                }
            } catch (error) {
                console.error("Failed to fetch recent scans", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchScans();
    }, [session]);

    const hour = new Date().getHours();
    const greeting = hour < 5 ? "Late night," : hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,";
    const completedScans = scans.filter(s => s.status === "completed").length;
    const lastScan = scans[0];

    return (
        <div className="space-y-8 max-w-6xl mx-auto">

            {/* ── HEADER ─────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#1E1E2E]">
                <div>
                    <p className="text-[#5A5A7A] text-xs font-mono uppercase tracking-widest mb-2">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                    <h1 className="text-3xl font-bold text-white mb-1.5 tracking-tight">
                        {greeting} <span className="bg-gradient-to-r from-[#C4B5FD] to-[#00D4FF] bg-clip-text text-transparent">{session?.user?.name?.split(" ")[0] || "Architect"}</span>
                    </h1>
                    <p className="text-[#5A5A7A] text-sm max-w-md">
                        Connect repositories and trigger deep AST analysis to visualize your architecture in real-time.
                    </p>
                </div>
                <Link
                    href="/scan"
                    className="inline-flex items-center gap-2 bg-[#6C63FF] hover:bg-[#6C63FF]/90 text-white font-semibold py-2.5 px-5 rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(108,99,255,0.25)] hover:shadow-[0_0_30px_rgba(108,99,255,0.4)] shrink-0"
                >
                    <Zap className="h-4 w-4" />
                    New Analysis Scan
                </Link>
            </div>

            {/* ── STAT STRIP ─────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <DashboardStatCard
                    icon={<Terminal className="w-5 h-5" />}
                    label="Total Scans"
                    value={isLoading ? "—" : scans.length}
                    subtext="All time analyses"
                    accentColor="#6C63FF"
                />
                <DashboardStatCard
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    label="Completed"
                    value={isLoading ? "—" : completedScans}
                    subtext={`${scans.length > 0 ? Math.round((completedScans / scans.length) * 100) : 0}% success rate`}
                    accentColor="#22C55E"
                />
                <DashboardStatCard
                    icon={<Activity className="w-5 h-5" />}
                    label="Last Activity"
                    value={lastScan ? new Date(lastScan.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    subtext={lastScan ? `${lastScan.repo_owner}/${lastScan.repo_name}` : "No scans yet"}
                    accentColor="#00D4FF"
                />
            </div>

            {/* ── ACTION CARDS ─────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* GitHub card */}
                <div className="relative bg-[#13131E] rounded-2xl p-6 overflow-hidden group transition-all duration-300 hover:shadow-[0_0_40px_rgba(108,99,255,0.15)] border border-[#1E1E2E] hover:border-[#6C63FF]/40">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#6C63FF] to-[#00D4FF]" />
                    <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#6C63FF]/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-[#6C63FF]/15 transition-colors" />

                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-[#6C63FF]/15 border border-[#6C63FF]/30 flex items-center justify-center mb-5">
                            <Github className="h-6 w-6 text-[#6C63FF]" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Import from GitHub</h3>
                        <p className="text-sm text-[#5A5A7A] mb-6 max-w-sm leading-relaxed">
                            Install the ArchSight GitHub App to instantly list repositories and trigger 1-click AST generation with zero config.
                        </p>
                        <Link
                            href="/repositories"
                            className="inline-flex items-center gap-2 bg-white text-black hover:bg-white/90 font-semibold py-2.5 px-5 rounded-xl transition-all text-sm"
                        >
                            Browse GitHub Repos
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                {/* GitLab coming soon */}
                <div className="relative bg-[#0D0D15] rounded-2xl p-6 overflow-hidden border border-[#1E1E2E] border-dashed opacity-50 cursor-not-allowed">
                    <div className="w-12 h-12 rounded-2xl bg-[#1E1E2E] border border-[#2E2E3E] flex items-center justify-center mb-5">
                        <FolderGit2 className="h-6 w-6 text-[#3E3E5E]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#3E3E5E] mb-2">Import from GitLab</h3>
                    <p className="text-sm text-[#2E2E4E] mb-6 max-w-sm leading-relaxed">
                        Native GitLab webhook and token integration is slated for Phase 7. For now, use the GitHub integration.
                    </p>
                    <span className="inline-flex items-center gap-2 bg-[#1E1E2E] text-[#3E3E5E] font-semibold py-2.5 px-5 rounded-xl text-sm border border-[#2E2E3E]">
                        Phase 7 — Coming Soon
                    </span>
                </div>
            </div>

            {/* ── SCAN HISTORY ─────────────────────────── */}
            <div className="bg-[#13131E] rounded-2xl border border-[#1E1E2E] overflow-hidden">
                {/* Table header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2E] bg-[#0D0D15]">
                    <div>
                        <h2 className="text-white font-semibold text-base">Scan History</h2>
                        <p className="text-[#5A5A7A] text-xs mt-0.5">Your recent asynchronous repository analyses</p>
                    </div>
                    {scans.length > 0 && (
                        <span className="text-[11px] font-mono text-[#5A5A7A] bg-[#1E1E2E] border border-[#2E2E3E] px-3 py-1 rounded-full">
                            {scans.length} record{scans.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-12 h-12 mb-4 relative">
                            <div className="absolute inset-0 rounded-full border-t-2 border-[#6C63FF] animate-spin opacity-50" style={{ animationDuration: '2s' }} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ScanSearch className="h-5 w-5 text-[#6C63FF] animate-pulse" />
                            </div>
                        </div>
                        <p className="text-[#5A5A7A] text-sm">Fetching scan history…</p>
                    </div>
                ) : scans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#1E1E2E] border border-[#2E2E3E] flex items-center justify-center mb-4">
                            <ScanSearch className="h-7 w-7 text-[#3E3E5E]" />
                        </div>
                        <h3 className="text-white font-semibold mb-1">No scans yet</h3>
                        <p className="text-[#5A5A7A] text-sm mb-5">Connect a repository to begin your first architectural analysis.</p>
                        <Link
                            href="/scan"
                            className="inline-flex items-center gap-2 bg-[#6C63FF]/15 hover:bg-[#6C63FF]/25 text-[#C4B5FD] font-semibold py-2 px-5 rounded-xl transition-all text-sm border border-[#6C63FF]/30"
                        >
                            <Zap className="h-4 w-4" /> Run First Scan
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-[#1E1E2E]">
                        {/* Column headers */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 text-[11px] font-mono uppercase tracking-widest text-[#3E3E5E]">
                            <span>Repository</span>
                            <span className="hidden md:block">Branch</span>
                            <span className="hidden lg:block">Date</span>
                            <span>Status</span>
                            <span></span>
                        </div>
                        {scans.map((s) => (
                            <div
                                key={s._id}
                                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors group"
                            >
                                {/* Repo info */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-[#1E1E2E] border border-[#2E2E3E] flex items-center justify-center shrink-0">
                                        <FolderGit2 className="h-4 w-4 text-[#5A5A7A]" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-semibold text-white text-sm truncate">
                                            <span className="text-[#5A5A7A]">{s.repo_owner}/</span>{s.repo_name}
                                        </div>
                                        <div className="text-[10px] text-[#3E3E5E] font-mono mt-0.5">#{s._id.slice(-6)}</div>
                                    </div>
                                </div>

                                {/* Branch */}
                                <div className="hidden md:flex items-center gap-1.5">
                                    <GitBranch className="h-3 w-3 text-[#3E3E5E] shrink-0" />
                                    <span className="text-[#5A5A7A] font-mono text-xs bg-[#1E1E2E] px-2 py-0.5 rounded-md border border-[#2E2E3E]">
                                        {s.branch}
                                    </span>
                                </div>

                                {/* Date */}
                                <div className="hidden lg:block text-xs text-[#5A5A7A]">
                                    {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    <br />
                                    <span className="text-[#3E3E5E] font-mono">{new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>

                                {/* Status */}
                                <StatusBadge status={s.status} />

                                {/* Action */}
                                <Link
                                    href={`/scan/${s._id}`}
                                    className="inline-flex items-center gap-1 text-[#5A5A7A] hover:text-[#C4B5FD] text-xs font-medium transition-colors group-hover:text-[#A0A0C0]"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    <span className="hidden sm:block">Details</span>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
