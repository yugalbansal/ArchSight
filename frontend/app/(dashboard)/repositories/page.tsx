"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FolderGit2, Loader2, ArrowRight, Github, RefreshCw, Activity, TerminalSquare, ShieldCheck, Box, Network, GitBranch, XCircle } from "lucide-react";
import { fetchWithAuth, API_URL } from "@/lib/api";

interface Repository {
    id: number;
    name: string;
    full_name: string;
    owner: string;
    private: boolean;
    html_url: string;
    default_branch: string;
    installation_id: number;
}

export default function Repositories() {
    const { data: session } = useSession();
    const router = useRouter();
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState<Record<number, boolean>>({});
    const [isCancelling, setIsCancelling] = useState<Record<number, boolean>>({});
    const [activeScanIds, setActiveScanIds] = useState<Record<number, string>>({});

    const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "archsight";

    const fetchRepos = async () => {
        setIsLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/api/github/repositories`);
            if (res.ok) {
                const data = await res.json();
                setRepositories(data.repositories || []);
            }
        } catch (error) {
            console.error("Failed to fetch repositories:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user) fetchRepos();
    }, [session]);

    const handleScanRepository = async (repo: Repository) => {
        setIsScanning((prev) => ({ ...prev, [repo.id]: true }));
        try {
            const res = await fetchWithAuth(`${API_URL}/api/scan`, {
                method: "POST",
                body: JSON.stringify({
                    owner: repo.owner,
                    repo: repo.name,
                    branch: repo.default_branch,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // Store scan_id so user can cancel before redirect
                setActiveScanIds((prev) => ({ ...prev, [repo.id]: data.scan_id }));
                // Short delay so Stop button is visible before redirect
                setTimeout(() => {
                    router.push(`/scan/${data.scan_id}`);
                }, 800);
            } else {
                console.error("Failed to queue scan");
                setIsScanning((prev) => ({ ...prev, [repo.id]: false }));
            }
        } catch (error) {
            console.error("Trigger scan error", error);
            setIsScanning((prev) => ({ ...prev, [repo.id]: false }));
        }
    };

    const handleCancelScan = async (repo: Repository) => {
        const scanId = activeScanIds[repo.id];
        if (!scanId || isCancelling[repo.id]) return;
        setIsCancelling((prev) => ({ ...prev, [repo.id]: true }));
        try {
            await fetchWithAuth(`${API_URL}/api/scan/${scanId}/cancel`, { method: "POST" });
        } catch (err) {
            console.error("Failed to cancel scan", err);
        } finally {
            setIsScanning((prev) => ({ ...prev, [repo.id]: false }));
            setIsCancelling((prev) => ({ ...prev, [repo.id]: false }));
            setActiveScanIds((prev) => { const n = { ...prev }; delete n[repo.id]; return n; });
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-[#A0A0C0] font-sans selection:bg-[#6C63FF]/30 p-6 lg:p-12 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#6C63FF] blur-[150px] opacity-[0.05]" />
            </div>

            <div className="max-w-[1200px] mx-auto relative z-10 space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-[#1E1E2E]">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <Github className="w-8 h-8 text-[#6C63FF]" />
                            Connected Workspaces
                        </h1>
                        <p className="text-[#5A5A7A] text-sm">Select a repository to initiate synchronous AST evaluation and architecture mapping.</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-3">
                        <button
                            onClick={fetchRepos}
                            disabled={isLoading}
                            className="bg-[#13131E] hover:bg-[#1E1E2E] border border-[#1E1E2E] text-white font-medium py-2.5 px-4 rounded-xl transition flex items-center gap-2 text-sm shadow-sm"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-[#6C63FF]' : 'text-[#A0A0C0]'}`} />
                            Sync Source
                        </button>
                        <a
                            href={`https://github.com/apps/${appSlug}/installations/new`}
                            className="bg-[#6C63FF] hover:bg-[#6C63FF]/90 text-white font-semibold py-2.5 px-5 rounded-xl transition flex items-center gap-2 text-sm shadow-[0_0_20px_rgba(108,99,255,0.2)]"
                        >
                            <FolderGit2 className="h-4 w-4" />
                            Install App
                        </a>
                    </div>
                </div>

                {isLoading ? (
                    <div className="h-full border border-[#1E1E2E] rounded-2xl bg-[#13131E] relative overflow-hidden flex flex-col items-center justify-center p-16 text-center shadow-xl">
                        <div className="w-16 h-16 mb-6 relative">
                            <div className="absolute inset-0 rounded-full border-t-2 border-[#6C63FF] animate-spin opacity-50" style={{ animationDuration: '2s' }}></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Network className="w-6 h-6 text-[#6C63FF] animate-pulse" />
                            </div>
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-2">Synchronizing with GitHub API</h3>
                        <p className="text-[#5A5A7A] max-w-sm">Fetching app installations and securely resolving repository metadata.</p>
                    </div>
                ) : repositories.length === 0 ? (
                    <div className="h-full border border-dashed border-[#1E1E2E] rounded-2xl bg-[#0A0A0F]/50 flex flex-col items-center justify-center p-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#13131E] flex items-center justify-center mb-6 border border-[#1E1E2E]">
                            <FolderGit2 className="h-8 w-8 text-[#5A5A7A]" />
                        </div>
                        <h3 className="text-white font-semibold text-xl mb-3">No Target Workspaces Detected</h3>
                        <p className="text-[#A0A0C0] max-w-md mx-auto mb-8 text-sm leading-relaxed">
                            ArchSight does not have read permissions for any repositories. Please install the App into your organization to begin structural analysis.
                        </p>
                        <a
                            href={`https://github.com/apps/${appSlug}/installations/new`}
                            className="bg-white/10 hover:bg-white/15 text-white font-semibold py-3 px-6 rounded-xl transition flex items-center gap-2 shadow-sm backdrop-blur border border-white/10"
                        >
                            Configure Scopes <ArrowRight className="ml-1 h-4 w-4" />
                        </a>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {repositories.map((repo) => (
                            <div key={repo.id} className="bg-[#13131E] p-6 rounded-2xl border border-[#1E1E2E] hover:border-[#6C63FF]/50 transition-all flex flex-col group relative overflow-hidden shadow-xl">
                                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[#6C63FF]/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-[#6C63FF]/10 transition-colors" />

                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-[#0A0A0F] rounded-xl flex items-center justify-center shrink-0 border border-[#1E1E2E] shadow-inner">
                                            <Box className="h-6 w-6 text-[#A0A0C0] group-hover:text-[#00D4FF] transition-colors" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <h3 className="text-base font-bold text-white truncate group-hover:text-[#6C63FF] transition-colors" title={repo.full_name}>
                                                {repo.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <TerminalSquare className="w-3.5 h-3.5 text-[#5A5A7A]" />
                                                <p className="text-xs text-[#5A5A7A] truncate font-mono">{repo.owner}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {repo.private && (
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#1E1E2E] text-[#A0A0C0] border border-[#5A5A7A]/30 flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3 text-[#22C55E]" /> Private
                                        </span>
                                    )}
                                </div>

                                <div className="mt-auto pt-6 border-t border-[#1E1E2E] flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2">
                                        <GitBranch className="w-4 h-4 text-[#5A5A7A]" />
                                        <span className="text-xs text-[#A0A0C0] font-mono bg-[#0A0A0F] px-2 py-1 rounded-md border border-[#1E1E2E]">
                                            {repo.default_branch}
                                        </span>
                                    </div>

                                    {isScanning[repo.id] ? (
                                        <div className="flex items-center gap-2">
                                            {/* Stop Scan button */}
                                            <button
                                                onClick={() => handleCancelScan(repo)}
                                                disabled={isCancelling[repo.id]}
                                                className="bg-[#FF4C6A]/10 hover:bg-[#FF4C6A]/20 border border-[#FF4C6A]/30 hover:border-[#FF4C6A]/60 text-[#FF4C6A] font-semibold py-2 px-3 rounded-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                                            >
                                                {isCancelling[repo.id] ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <XCircle className="h-3.5 w-3.5" />
                                                )}
                                                <span className="text-xs">{isCancelling[repo.id] ? "Stopping…" : "Stop"}</span>
                                            </button>
                                            {/* Scanning indicator */}
                                            <div className="bg-[#6C63FF]/10 text-[#6C63FF] font-semibold py-2 px-4 rounded-lg text-sm flex items-center gap-2 opacity-70">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Queueing…
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleScanRepository(repo)}
                                            className="bg-[#6C63FF]/10 hover:bg-[#6C63FF] text-[#6C63FF] hover:text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm flex items-center gap-2 group-hover:shadow-[0_0_15px_rgba(108,99,255,0.3)]"
                                        >
                                            <Activity className="h-4 w-4" />
                                            Scan Target
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
