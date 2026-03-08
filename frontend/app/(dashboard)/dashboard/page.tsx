"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FolderGit2, Clock, ArrowRight, Loader2, XCircle, CheckCircle2, ScanSearch, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchWithAuth, API_URL } from "@/lib/api";

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

const statusIcon: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 className="h-4 w-4 text-green-400" />,
    pending: <Clock className="h-4 w-4 text-gray-400" />,
    cloning: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />,
    detecting: <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />,
    parsing: <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />,
    extracting: <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />,
    analysing: <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />,
    failed: <XCircle className="h-4 w-4 text-red-400" />,
};

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

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Good {new Date().getHours() < 12 ? "morning" : "evening"}, {session?.user?.name?.split(" ")[0] || "Architect"} 👋
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Welcome to ArchSight. Import a repository to automatically generate structural AST architecture diagrams and intelligence.
                    </p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg" asChild>
                    <Link href="/scan" className="flex items-center gap-2">
                        <ScanSearch className="h-4 w-4" />
                        New Analysis Scan
                    </Link>
                </Button>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="glass p-6 rounded-xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
                    <FolderGit2 className="h-8 w-8 text-blue-400 mb-4" />
                    <h3 className="text-lg font-bold text-foreground mb-2">Import from GitHub</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                        Install the ArchSight GitHub App to instantly list all your repositories and trigger 1-click AST generation.
                    </p>
                    <Button variant="default" className="bg-white text-black hover:bg-gray-200" asChild>
                        <Link href="/repositories">Browse GitHub Repos <ArrowRight className="h-4 w-4 ml-2" /></Link>
                    </Button>
                </div>

                <div className="glass p-6 rounded-xl border border-white/5 bg-black/20 opacity-50 cursor-not-allowed">
                    <FolderGit2 className="h-8 w-8 text-gray-500 mb-4" />
                    <h3 className="text-lg font-bold text-foreground mb-2">Import from GitLab (Coming Soon)</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                        Native GitLab webhook and token integration is slated for Phase 7. For now, use the GitHub integration.
                    </p>
                    <Button variant="outline" disabled className="bg-transparent border-white/10 text-muted-foreground">
                        Phase 7 Feature
                    </Button>
                </div>
            </div>

            {/* Scan History */}
            <div className="glass p-0 rounded-xl overflow-hidden border border-white/10">
                <div className="p-6 border-b border-white/10 bg-black/40">
                    <h2 className="text-xl font-bold text-foreground">Scan History</h2>
                    <p className="text-sm text-muted-foreground mt-1">Your recent asynchronous GitHub repository analyzes.</p>
                </div>

                <div className="p-0">
                    <Table>
                        <TableHeader className="bg-zinc-950">
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-muted-foreground px-6">Repository</TableHead>
                                <TableHead className="text-muted-foreground">Branch</TableHead>
                                <TableHead className="text-muted-foreground">Time</TableHead>
                                <TableHead className="text-muted-foreground">Status / Progress</TableHead>
                                <TableHead className="text-right px-6 text-muted-foreground">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        Fetching historical scans...
                                    </TableCell>
                                </TableRow>
                            ) : scans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-16">
                                        <ScanSearch className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                        <h3 className="text-lg font-medium text-foreground mb-1">No scopes found</h3>
                                        <p className="text-sm text-muted-foreground">You haven&apos;t scanned any repositories yet.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                scans.map((s) => (
                                    <TableRow key={s._id} className="border-white/5 hover:bg-white/[0.02]">
                                        <TableCell className="px-6 py-4">
                                            <div className="font-medium text-blue-400">
                                                {s.repo_owner} / {s.repo_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono mt-1">ID: {s._id.slice(-6)}</div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground font-mono text-sm">{s.branch}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(s.created_at).toLocaleDateString()}
                                            <br />
                                            {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {statusIcon[s.status] || statusIcon.pending}
                                                <span className="text-sm font-medium capitalize text-foreground">{s.status}</span>
                                                <span className="text-xs text-muted-foreground font-mono ml-2">{s.progress}%</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate w-48 mt-1">
                                                {s.message}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <Button variant="ghost" size="sm" asChild className="hover:text-blue-400">
                                                <Link href={`/scan/${s._id}`}>
                                                    View Details
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

        </div>
    );
}
