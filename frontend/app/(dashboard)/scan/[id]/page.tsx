"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ArrowLeft, Loader2, CheckCircle2, XCircle, Clock,
    FolderTree, Route, FileCode, Box, Import, FileOutput,
    GitBranch, Timer, Cpu, ChevronDown, ChevronRight,
    TerminalSquare, Network, ShieldAlert, Activity, GitCommit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface FileStructure {
    file: string;
    language: string;
    functions: string[];
    classes: string[];
    imports: string[];
    exports: string[];
}

interface ExtractedRoute {
    method: string;
    path: string;
    file: string;
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
        status: string;
        architecture: {
            services: any[];
            routes: ExtractedRoute[];
            db_models: any[];
            queues: any[];
            external_apis: any[];
            llm_calls: any[];
            file_structure?: FileStructure[];
        };
        scanned_at: string;
        duration_ms: number;
    };
}

const methodColors: Record<string, string> = {
    GET: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30",
    POST: "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30",
    PUT: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
    DELETE: "bg-[#FF4C6A]/10 text-[#FF4C6A] border-[#FF4C6A]/30",
    PATCH: "bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/30",
};

const langColors: Record<string, string> = {
    typescript: "text-[#00D4FF]",
    javascript: "text-[#F59E0B]",
    python: "text-[#22C55E]",
};

export default function ScanResultPage() {
    const { id } = useParams<{ id: string }>();
    const { data: session } = useSession();
    const router = useRouter();
    const [scan, setScan] = useState<ScanResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

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
        // If still processing, poll every 3s
        const interval = setInterval(fetchScan, 3000);
        return () => clearInterval(interval);
    }, [id, session]);

    // Stop polling when completed/failed
    useEffect(() => {
        if (scan?.status === "completed" || scan?.status === "failed") {
            // no-op: cleanup handled by return above
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
    const isProcessing = !["completed", "failed"].includes(scan.status);

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-[#A0A0C0] font-sans selection:bg-[#6C63FF]/30 p-6 lg:p-12 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#6C63FF] blur-[150px] opacity-[0.03]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#00D4FF] blur-[150px] opacity-[0.02]" />
            </div>

            <div className="max-w-[1200px] mx-auto relative z-10 space-y-8">
                {/* Header */}
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
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Banner */}
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

                {scan.status === "failed" && (
                    <div className="bg-[#13131E] border border-[#FF4C6A]/30 rounded-xl p-6 relative overflow-hidden shadow-[0_0_30px_rgba(255,76,106,0.1)]">
                        <div className="absolute inset-0 bg-[#FF4C6A]/5" />
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#FF4C6A]/10 flex items-center justify-center shrink-0 border border-[#FF4C6A]/20">
                                <XCircle className="h-5 w-5 text-[#FF4C6A]" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg mb-1">Analysis Interrupted</h3>
                                <p className="text-[#A0A0C0] text-sm mb-3">The AST parser encountered a fatal error during extraction.</p>
                                <div className="bg-[#0A0A0F] border border-[#1E1E2E] p-4 rounded-lg">
                                    <p className="text-[#FF4C6A] text-xs font-mono break-all">{scan.error_details || "Unknown exception occurred in parser worker."}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Cards */}
                {result && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]">
                        <div className="bg-[#13131E] p-5 rounded-2xl border border-[#1E1E2E] flex flex-col gap-3 group hover:border-[#6C63FF]/30 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-[#6C63FF]/10 flex items-center justify-center border border-[#6C63FF]/20">
                                <Cpu className="h-5 w-5 text-[#6C63FF] group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5A5A7A] uppercase tracking-wider mb-1">Architecture Base</p>
                                <p className="text-xl font-bold text-white capitalize">{result.framework || "Unknown"}</p>
                            </div>
                        </div>
                        <div className="bg-[#13131E] p-5 rounded-2xl border border-[#1E1E2E] flex flex-col gap-3 group hover:border-[#00D4FF]/30 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 flex items-center justify-center border border-[#00D4FF]/20">
                                <Route className="h-5 w-5 text-[#00D4FF] group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5A5A7A] uppercase tracking-wider mb-1">Discovered Routes</p>
                                <p className="text-xl font-bold text-white">{arch?.routes?.length || 0}</p>
                            </div>
                        </div>
                        <div className="bg-[#13131E] p-5 rounded-2xl border border-[#1E1E2E] flex flex-col gap-3 group hover:border-[#A855F7]/30 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 flex items-center justify-center border border-[#A855F7]/20">
                                <FolderTree className="h-5 w-5 text-[#A855F7] group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5A5A7A] uppercase tracking-wider mb-1">AST Nodes Parsed</p>
                                <p className="text-xl font-bold text-white">{arch?.file_structure?.length || 0}</p>
                            </div>
                        </div>
                        <div className="bg-[#13131E] p-5 rounded-2xl border border-[#1E1E2E] flex flex-col gap-3 group hover:border-[#22C55E]/30 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center border border-[#22C55E]/20">
                                <Timer className="h-5 w-5 text-[#22C55E] group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#5A5A7A] uppercase tracking-wider mb-1">Extraction Time</p>
                                <p className="text-xl font-bold text-white">{(result.duration_ms / 1000).toFixed(2)}s</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-8 reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
                    {/* Routes Table */}
                    {arch && arch.routes.length > 0 && (
                        <div className="bg-[#05050A] rounded-2xl border border-[#1E1E2E] overflow-hidden flex flex-col h-[600px] shadow-2xl">
                            <div className="p-4 border-b border-[#1E1E2E] flex items-center justify-between bg-[#0A0A0F]">
                                <div className="flex items-center gap-2">
                                    <Route className="h-4 w-4 text-[#00D4FF]" />
                                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Extracted Endpoints</h2>
                                </div>
                                <Badge variant="outline" className="bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30 font-mono text-[10px]">
                                    {arch.routes.length} Targets
                                </Badge>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#1E1E2E]">
                                {arch.routes.map((route, i) => (
                                    <div key={i} className="flex flex-col gap-2 px-5 py-4 hover:bg-[#13131E]/50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${methodColors[route.method] || "bg-[#5A5A7A]/20 text-[#A0A0C0] border-[#5A5A7A]/30"}`}>
                                                {route.method}
                                            </span>
                                            <span className="text-sm font-mono text-white group-hover:text-[#00D4FF] transition-colors">{route.path}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-[#5A5A7A] font-mono ml-12">
                                            <ChevronRight className="w-3 h-3" />
                                            <span className="truncate">{route.file}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* File Structure — AST Output Terminal */}
                    {arch && arch.file_structure && arch.file_structure.length > 0 && (
                        <div className="bg-[#040408] rounded-2xl border border-[#1E1E2E] overflow-hidden flex flex-col h-[600px] shadow-2xl">
                            <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1E1E2E] bg-[#0A0A0F]">
                                <TerminalSquare className="w-4 h-4 text-[#A855F7]" />
                                <span className="font-mono text-xs text-[#A0A0C0] tracking-wide">ast_topology_viewer</span>
                                <div className="ml-auto flex gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F58]"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#28CA41]"></span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#1E1E2E]/50">
                                {arch.file_structure.map((file, i) => {
                                    const isExpanded = expandedFiles.has(file.file);
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
                                                <span className="text-[13px] font-mono text-white truncate group-hover:text-[#A855F7] transition-colors relative top-[1px]">{file.file}</span>
                                                <div className="ml-auto flex items-center gap-2 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    {file.functions.length > 0 && (
                                                        <span className="text-[10px] text-[#00D4FF] font-mono">
                                                            +fn({file.functions.length})
                                                        </span>
                                                    )}
                                                    {file.classes.length > 0 && (
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
                        </div>
                    )}
                </div>

                {/* Empty State */}
                {arch && arch.routes.length === 0 && (!arch.file_structure || arch.file_structure.length === 0) && (
                    <div className="bg-[#13131E] border border-dashed border-[#1E1E2E] rounded-2xl p-16 text-center reveal opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]">
                        <Network className="h-12 w-12 text-[#5A5A7A] mx-auto mb-6 opacity-50" />
                        <h3 className="text-xl font-bold text-white mb-3">AST Extraction Result Empty</h3>
                        <p className="text-[#A0A0C0] max-w-lg mx-auto leading-relaxed text-sm">
                            The parsing engine completed successfully, but could not detect any supported structural components (routes, classes, or recognized functions) within the repository.
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
