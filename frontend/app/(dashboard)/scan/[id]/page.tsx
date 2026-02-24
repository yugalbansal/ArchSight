"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ArrowLeft, Loader2, CheckCircle2, XCircle, Clock,
    FolderTree, Route, FileCode, Box, Import, FileOutput,
    GitBranch, Timer, Cpu, ChevronDown, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    GET: "bg-green-500/20 text-green-400 border-green-500/30",
    POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PUT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
    PATCH: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const langColors: Record<string, string> = {
    typescript: "text-blue-400",
    javascript: "text-yellow-400",
    python: "text-green-400",
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
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                <p className="text-muted-foreground">Loading scan results...</p>
            </div>
        );
    }

    if (!scan) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <XCircle className="h-10 w-10 text-red-500 mb-4" />
                <p className="text-foreground text-lg font-medium">Scan not found</p>
                <Button variant="outline" className="mt-4" asChild>
                    <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
            </div>
        );
    }

    const result = scan.engine_result;
    const arch = result?.architecture;
    const isProcessing = !["completed", "failed"].includes(scan.status);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {scan.repo_owner}/{scan.repo_name}
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                        <GitBranch className="h-3.5 w-3.5" /> {scan.branch}
                        <span className="text-white/20">•</span>
                        ID: <span className="font-mono">{scan._id.slice(-8)}</span>
                    </p>
                </div>
            </div>

            {/* Status Banner */}
            {isProcessing && (
                <div className="glass p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center gap-4">
                    <Loader2 className="h-6 w-6 text-blue-400 animate-spin shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-foreground capitalize">{scan.status}</p>
                        <p className="text-xs text-muted-foreground">{scan.message}</p>
                        <div className="mt-2 h-1.5 w-64 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${scan.progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {scan.status === "failed" && (
                <div className="glass p-5 rounded-xl border border-red-500/20 bg-red-500/5">
                    <div className="flex items-center gap-3 mb-2">
                        <XCircle className="h-5 w-5 text-red-400" />
                        <p className="text-sm font-semibold text-red-400">Scan Failed</p>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{scan.error_details}</p>
                </div>
            )}

            {/* Summary Cards */}
            {result && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="glass p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <Cpu className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Framework</span>
                            </div>
                            <p className="text-lg font-bold text-foreground capitalize">{result.framework}</p>
                        </div>
                        <div className="glass p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <Route className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Routes</span>
                            </div>
                            <p className="text-lg font-bold text-foreground">{arch?.routes?.length || 0}</p>
                        </div>
                        <div className="glass p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <FolderTree className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Files Parsed</span>
                            </div>
                            <p className="text-lg font-bold text-foreground">{arch?.file_structure?.length || 0}</p>
                        </div>
                        <div className="glass p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <Timer className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">Duration</span>
                            </div>
                            <p className="text-lg font-bold text-foreground">
                                {(result.duration_ms / 1000).toFixed(1)}s
                            </p>
                        </div>
                    </div>

                    {/* Routes Table */}
                    {arch && arch.routes.length > 0 && (
                        <div className="glass rounded-xl border border-white/10 overflow-hidden">
                            <div className="p-5 border-b border-white/10 bg-black/40 flex items-center gap-2">
                                <Route className="h-5 w-5 text-blue-400" />
                                <h2 className="text-lg font-bold text-foreground">API Routes</h2>
                                <span className="ml-auto text-xs text-muted-foreground font-mono">{arch.routes.length} endpoints</span>
                            </div>
                            <div className="divide-y divide-white/5">
                                {arch.routes.map((route, i) => (
                                    <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                                        <span className={`text-[11px] uppercase font-bold px-2 py-0.5 rounded border ${methodColors[route.method] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
                                            {route.method}
                                        </span>
                                        <span className="text-sm font-mono text-foreground">{route.path}</span>
                                        <span className="ml-auto text-xs text-muted-foreground truncate max-w-[200px]">{route.file}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* File Structure — AST Output */}
                    {arch && arch.file_structure && arch.file_structure.length > 0 && (
                        <div className="glass rounded-xl border border-white/10 overflow-hidden">
                            <div className="p-5 border-b border-white/10 bg-black/40 flex items-center gap-2">
                                <FileCode className="h-5 w-5 text-purple-400" />
                                <h2 className="text-lg font-bold text-foreground">AST File Structure</h2>
                                <span className="ml-auto text-xs text-muted-foreground font-mono">
                                    {arch.file_structure.length} files •{" "}
                                    {arch.file_structure.reduce((sum, f) => sum + f.functions.length, 0)} functions •{" "}
                                    {arch.file_structure.reduce((sum, f) => sum + f.classes.length, 0)} classes
                                </span>
                            </div>
                            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                                {arch.file_structure.map((file, i) => {
                                    const isExpanded = expandedFiles.has(file.file);
                                    return (
                                        <div key={i}>
                                            <button
                                                onClick={() => toggleFile(file.file)}
                                                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors text-left"
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                                )}
                                                <FileCode className={`h-4 w-4 shrink-0 ${langColors[file.language] || "text-gray-400"}`} />
                                                <span className="text-sm font-mono text-foreground truncate">{file.file}</span>
                                                <div className="ml-auto flex items-center gap-3 shrink-0">
                                                    {file.functions.length > 0 && (
                                                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                                                            {file.functions.length} fn
                                                        </span>
                                                    )}
                                                    {file.classes.length > 0 && (
                                                        <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-mono">
                                                            {file.classes.length} cls
                                                        </span>
                                                    )}
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="bg-black/30 px-5 py-4 space-y-3 border-t border-white/5">
                                                    {file.functions.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Box className="h-3.5 w-3.5 text-blue-400" />
                                                                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Functions</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {file.functions.map((fn, j) => (
                                                                    <span key={j} className="text-xs font-mono bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                                                        {fn}()
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {file.classes.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Box className="h-3.5 w-3.5 text-purple-400" />
                                                                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Classes</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {file.classes.map((cls, j) => (
                                                                    <span key={j} className="text-xs font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-1 rounded">
                                                                        {cls}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {file.imports.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Import className="h-3.5 w-3.5 text-gray-400" />
                                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Imports</span>
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                {file.imports.slice(0, 10).map((imp, j) => (
                                                                    <p key={j} className="text-[11px] font-mono text-muted-foreground truncate">{imp}</p>
                                                                ))}
                                                                {file.imports.length > 10 && (
                                                                    <p className="text-[11px] text-muted-foreground/50">...and {file.imports.length - 10} more</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {file.exports.length > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <FileOutput className="h-3.5 w-3.5 text-green-400" />
                                                                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Exports</span>
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                {file.exports.slice(0, 10).map((exp, j) => (
                                                                    <p key={j} className="text-[11px] font-mono text-muted-foreground truncate">{exp}</p>
                                                                ))}
                                                                {file.exports.length > 10 && (
                                                                    <p className="text-[11px] text-muted-foreground/50">...and {file.exports.length - 10} more</p>
                                                                )}
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
                    )}

                    {/* Empty State */}
                    {arch && arch.routes.length === 0 && (!arch.file_structure || arch.file_structure.length === 0) && (
                        <div className="glass p-12 rounded-xl border border-dashed border-white/20 text-center">
                            <FolderTree className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">No Architecture Detected</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                The engine could not extract meaningful structural data from this repository.
                                This may occur if the codebase uses an unsupported language or has an unusual project structure.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
