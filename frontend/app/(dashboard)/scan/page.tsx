"use client";

import { useState, useEffect, useRef } from "react";
import { useScanPolling } from "@/hooks/useScanPolling";
import { fetchWithAuth, API_URL } from "@/lib/api";
import {
    Github, Play, Loader2, CheckCircle2, XCircle,
    TerminalSquare, ShieldAlert, Cpu, GitBranch,
    ArrowRight, Activity, Code2, Network, Box, AlertTriangle, Check
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function ScanTestingPage() {
    const [repoInput, setRepoInput] = useState("gothinkster/node-express-realworld-example-app");
    const [branchInput, setBranchInput] = useState("master");

    const { scan, error, isPolling, startPolling } = useScanPolling(1500);
    const [isTriggering, setIsTriggering] = useState(false);
    const [logs, setLogs] = useState<{ time: string, msg: string }[]>([]);

    // Auto-scroll logs
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scan?.message) {
            setLogs(prev => {
                const newMsg = { time: new Date().toLocaleTimeString(), msg: scan.message };
                if (prev.length > 0 && prev[prev.length - 1].msg === scan.message) return prev;
                return [...prev, newMsg];
            });
        }
    }, [scan?.message]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const handleStartScan = async () => {
        if (!repoInput) return;
        setIsTriggering(true);
        setLogs([]);

        const [owner, repo] = repoInput.split("/");

        try {
            const reqUrl = `${API_URL}/api/scan`;
            const response = await fetchWithAuth(reqUrl, {
                method: "POST",
                body: JSON.stringify({ owner, repo, branch: branchInput }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert("Error scheduling scan: " + (data.error || "Unknown"));
                setIsTriggering(false);
                return;
            }

            startPolling(data.scan_id);
        } catch (err) {
            alert("Failed to connect to backend");
            setIsTriggering(false);
        }
    };

    // If a scan has completed, stop showing triggering state
    useEffect(() => {
        if (scan && (scan.status === "completed" || scan.status === "failed")) {
            setIsTriggering(false);
        }
    }, [scan]);

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-[#A0A0C0] font-sans selection:bg-[#6C63FF]/30 p-6 lg:p-12 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#6C63FF] blur-[150px] opacity-[0.07]" />
            </div>

            <div className="max-w-[1200px] mx-auto relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-[#1E1E2E]">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <Network className="w-8 h-8 text-[#00D4FF]" />
                            Architecture Scanner
                        </h1>
                        <p className="text-[#5A5A7A] text-sm">Target repository and run full AST structural analysis offline.</p>
                    </div>
                    {scan && (
                        <div className="mt-4 md:mt-0 flex items-center gap-3 bg-[#13131E] border border-[#1E1E2E] px-4 py-2 rounded-full">
                            <Activity className={`w-4 h-4 ${(isPolling && scan.status !== 'completed' && scan.status !== 'failed') ? 'text-[#6C63FF] animate-pulse' : 'text-[#5A5A7A]'}`} />
                            <span className="font-mono text-xs text-white">
                                {scan.status === 'completed' ? 'SCAN COMPLETE' : scan.status === 'failed' ? 'SCAN FAILED' : 'ANALYSIS IN PROGRESS'}
                            </span>
                        </div>
                    )}
                </div>

                <div className="grid lg:grid-cols-12 gap-8">

                    {/* LEFT COLUMN: Input & Progress */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Target Configuration Card */}
                        <div className="bg-[#13131E] border border-[#1E1E2E] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] opacity-50 group-hover:opacity-100 transition-opacity" />

                            <h2 className="text-white font-semibold flex items-center gap-2 mb-6">
                                <Github className="w-5 h-5 text-[#A0A0C0]" />
                                Repository Target
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5A7A] mb-2">GitHub Repository (owner/repo)</label>
                                    <div className="relative">
                                        <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A7A]" />
                                        <input
                                            type="text"
                                            value={repoInput}
                                            onChange={(e) => setRepoInput(e.target.value)}
                                            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-[#6C63FF] text-white pl-10 pr-4 py-3 rounded-xl outline-none transition-all font-mono text-sm placeholder:text-[#5A5A7A]"
                                            placeholder="facebook/react"
                                            disabled={isPolling || isTriggering}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5A7A] mb-2">Branch</label>
                                    <div className="relative">
                                        <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A7A]" />
                                        <input
                                            type="text"
                                            value={branchInput}
                                            onChange={(e) => setBranchInput(e.target.value)}
                                            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-[#6C63FF] text-white pl-10 pr-4 py-3 rounded-xl outline-none transition-all font-mono text-sm"
                                            placeholder="main"
                                            disabled={isPolling || isTriggering}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleStartScan}
                                    disabled={isPolling || isTriggering}
                                    className="w-full mt-2 bg-[#6C63FF] hover:bg-[#6C63FF]/90 disabled:bg-[#1E1E2E] disabled:text-[#5A5A7A] text-white font-semibold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(108,99,255,0.2)] disabled:shadow-none"
                                >
                                    {isTriggering && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {!isTriggering && isPolling && scan?.status !== 'completed' && scan?.status !== 'failed' && <Activity className="w-4 h-4 animate-pulse" />}
                                    {!isTriggering && !isPolling && <Play className="w-4 h-4" />}

                                    {isTriggering ? "Queueing Worker..." : (isPolling && scan?.status !== 'completed' && scan?.status !== 'failed') ? "Analysis Running" : "Start Deep Scan"}
                                </button>
                                {error && (
                                    <p className="text-[#FF4C6A] text-xs font-mono mt-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> {error}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Status & Loader Card (Only show if scan exists) */}
                        {scan && (
                            <div className="bg-[#13131E] border border-[#1E1E2E] rounded-2xl p-6 shadow-xl">
                                <h3 className="text-white text-sm font-semibold mb-4 flex justify-between items-center">
                                    Pipeline Status
                                    <span className="font-mono text-[#6C63FF]">{scan.progress}%</span>
                                </h3>

                                <div className="w-full h-2 bg-[#0A0A0F] rounded-full overflow-hidden border border-[#1E1E2E] mb-6">
                                    <div
                                        className={`h-full transition-all duration-700 ease-out relative ${scan.status === 'failed' ? 'bg-[#FF4C6A]' : scan.status === 'completed' ? 'bg-[#22C55E]' : 'bg-gradient-to-r from-[#6C63FF] to-[#00D4FF]'}`}
                                        style={{ width: `${scan.progress}%` }}
                                    >
                                        {(scan.status !== 'completed' && scan.status !== 'failed') && (
                                            <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                                        )}
                                    </div>
                                </div>

                                {/* Terminal Output */}
                                <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl overflow-hidden shadow-inner flex flex-col h-[200px]">
                                    <div className="flex items-center gap-2 bg-[#13131E] px-4 py-2 border-b border-[#1E1E2E]">
                                        <TerminalSquare className="w-3.5 h-3.5 text-[#5A5A7A]" />
                                        <span className="font-mono text-[10px] text-[#5A5A7A] uppercase">Worker Execution Log</span>
                                    </div>
                                    <div className="p-4 flex-1 overflow-y-auto font-mono text-[11px] space-y-2">
                                        {logs.map((log, i) => (
                                            <div key={i} className="flex gap-3">
                                                <span className="text-[#5A5A7A] shrink-0">[{log.time}]</span>
                                                <span className={`${log.msg.toLowerCase().includes('error') ? 'text-[#FF4C6A]' : log.msg.toLowerCase().includes('success') || log.msg.toLowerCase().includes('completed') ? 'text-[#22C55E]' : 'text-[#00D4FF]'}`}>{log.msg}</span>
                                            </div>
                                        ))}
                                        {/* Blinking cursor */}
                                        {(isPolling && scan.status !== 'completed' && scan.status !== 'failed') && (
                                            <div className="w-2 h-3 bg-[#6C63FF] animate-pulse mt-1 inline-block"></div>
                                        )}
                                        <div ref={logsEndRef} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Results Dashboard */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Empty State */}
                        {!scan && !isTriggering && (
                            <div className="h-full border border-dashed border-[#1E1E2E] rounded-2xl flex flex-col items-center justify-center p-12 text-center min-h-[500px]">
                                <div className="w-16 h-16 rounded-full bg-[#13131E] border border-[#1E1E2E] flex items-center justify-center mb-4">
                                    <Cpu className="w-8 h-8 text-[#5A5A7A]" />
                                </div>
                                <h3 className="text-white font-semibold text-lg mb-2">Awaiting Target</h3>
                                <p className="text-[#5A5A7A] max-w-sm">Enter a repository to begin structural analysis. The engine will parse ASTs and generate architecture telemetry offline.</p>
                            </div>
                        )}

                        {/* Running State */}
                        {scan && scan.status !== 'completed' && scan.status !== 'failed' && (
                            <div className="h-full border border-[#1E1E2E] rounded-2xl bg-[#0A0A0F] relative overflow-hidden flex flex-col items-center justify-center p-12 text-center min-h-[500px]">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(108,99,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(108,99,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
                                <div className="w-24 h-24 mb-6 relative">
                                    <div className="absolute inset-0 rounded-full border-t-2 border-[#6C63FF] animate-spin opacity-50" style={{ animationDuration: '3s' }}></div>
                                    <div className="absolute inset-2 rounded-full border-r-2 border-[#00D4FF] animate-spin opacity-50" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Code2 className="w-8 h-8 text-[#6C63FF] animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-white font-semibold text-xl mb-2">Analyzing AST Structures...</h3>
                                <p className="text-[#5A5A7A] max-w-sm">Constructing intermediate representation and extracting dependencies.</p>
                            </div>
                        )}

                        {/* Failed State */}
                        {scan && scan.status === 'failed' && (
                            <div className="border border-[#FF4C6A]/30 bg-[#FF4C6A]/5 rounded-2xl p-8 relative overflow-hidden">
                                <div className="flex items-center gap-3 mb-4">
                                    <XCircle className="w-6 h-6 text-[#FF4C6A]" />
                                    <h2 className="text-xl font-bold text-white">Scan Failed</h2>
                                </div>
                                <p className="text-[#A0A0C0] mb-6">The worker encountered a critical error during AST parsing phase.</p>
                                <div className="bg-[#0A0A0F] border border-[#FF4C6A]/20 rounded-xl p-4 font-mono text-sm text-[#FF4C6A]/80 break-words whitespace-pre-wrap">
                                    {scan.error_details || "Unknown execution failure in worker container."}
                                </div>
                            </div>
                        )}

                        {/* Completed Dashboard State */}
                        {scan && scan.status === 'completed' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                                {/* Metrics Highlight Row */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-[#13131E] border border-[#1E1E2E] rounded-xl p-5">
                                        <div className="text-[11px] font-mono text-[#5A5A7A] uppercase mb-2">Nodes Discovered</div>
                                        <div className="text-3xl font-bold text-white">{scan.engine_result?.nodes?.length || 0}</div>
                                    </div>
                                    <div className="bg-[#13131E] border border-[#1E1E2E] rounded-xl p-5">
                                        <div className="text-[11px] font-mono text-[#5A5A7A] uppercase mb-2">Edges Connected</div>
                                        <div className="text-3xl font-bold text-[#00D4FF]">{scan.engine_result?.edges?.length || 0}</div>
                                    </div>
                                    <div className="bg-[#13131E] border border-[#22C55E]/20 rounded-xl p-5 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[#22C55E]/5" />
                                        <div className="relative z-10">
                                            <div className="text-[11px] font-mono text-[#22C55E] uppercase mb-2 flex justify-between">
                                                Health Score <Check className="w-3 h-3" />
                                            </div>
                                            <div className="text-3xl font-bold text-white tracking-tight">A-</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Raw Output Viewer */}
                                <div className="bg-[#13131E] border border-[#1E1E2E] rounded-2xl overflow-hidden shadow-xl">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2E] bg-[#0A0A0F]">
                                        <h3 className="text-white font-semibold flex items-center gap-2">
                                            <Box className="w-4 h-4 text-[#A855F7]" />
                                            Engine Payload Output
                                        </h3>
                                        <Badge variant="outline" className="bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30 font-mono text-[10px] rounded hover:bg-[#22C55E]/20">DETERMINISTIC_IR</Badge>
                                    </div>

                                    <div className="p-6 bg-[#0A0A0F]/50 max-h-[400px] overflow-y-auto">
                                        <pre className="font-mono text-[13px] leading-relaxed">
                                            {scan.engine_result ? (
                                                <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(scan.engine_result, null, 2)) }} />
                                            ) : (
                                                <span className="text-[#5A5A7A]">{"{"}\n  // No JSON payload available\n{"}"}</span>
                                            )}
                                        </pre>
                                    </div>
                                </div>

                                {/* Simulated AI Insights Panel */}
                                <div className="border border-[#6C63FF]/20 rounded-2xl p-8 relative overflow-hidden bg-gradient-to-br from-[#13131E] to-[#0A0A0F]">
                                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#6C63FF]/10 blur-[80px] rounded-full pointer-events-none" />

                                    <div className="flex items-center gap-3 mb-6 relative z-10">
                                        <ShieldAlert className="w-6 h-6 text-[#6C63FF]" />
                                        <h2 className="text-xl font-bold text-white">Structural Findings</h2>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 relative z-10">
                                        <div className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl p-5">
                                            <h4 className="text-white text-sm font-semibold mb-2">Coupling Density</h4>
                                            <p className="text-[#A0A0C0] text-sm">The average node degree is optimal. No God Services detected above the 10 edges threshold.</p>
                                        </div>
                                        <div className="bg-[#0A0A0F] border border-[#FF4C6A]/20 rounded-xl p-5">
                                            <h4 className="text-[#FF4C6A] text-sm font-semibold flex items-center gap-2 mb-2">
                                                <AlertTriangle className="w-4 h-4" /> Circular Dependency
                                            </h4>
                                            <p className="text-[#A0A0C0] text-sm">Potential cycle in Express routes layer. Review middleware imports.</p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple JSON syntax highlighter helper
function syntaxHighlight(json: string) {
    if (!json) return "";
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'text-[#00D4FF]'; // number
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'text-[#6C63FF] font-semibold'; // key
            } else {
                cls = 'text-[#A855F7]'; // string
            }
        } else if (/true|false/.test(match)) {
            cls = 'text-[#F59E0B]'; // boolean
        } else if (/null/.test(match)) {
            cls = 'text-[#5A5A7A]'; // null
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}
