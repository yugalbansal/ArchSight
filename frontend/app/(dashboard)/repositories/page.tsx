"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FolderGit2, Loader2, ArrowRight, Github, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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

    const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "archsight";

    const fetchRepos = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/github/repositories`, {
                credentials: "include"
            });
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
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner: repo.owner,
                    repo: repo.name,
                    branch: repo.default_branch,
                    // The backend automatically utilizes the Octokit Installation Token behind the scenes!
                }),
                credentials: "include"
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/scan/${data.scan_id}`); // Navigate to live scan results page
            } else {
                console.error("Failed to queue scan");
            }
        } catch (error) {
            console.error("Trigger scan error", error);
        } finally {
            setIsScanning((prev) => ({ ...prev, [repo.id]: false }));
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">GitHub Repositories</h1>
                    <p className="text-muted-foreground text-sm">
                        Connect and scan your infrastructure to construct realtime Architectural AST visualizations.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchRepos} className="border-white/10" disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button className="bg-white text-black hover:bg-gray-200" asChild>
                        <a href={`https://github.com/apps/${appSlug}/installations/new`}>
                            <Github className="h-4 w-4 mr-2" />
                            + New Repository
                        </a>
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="glass p-16 rounded-xl flex flex-col items-center justify-center text-muted-foreground border-white/5">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                    <p>Securing connection with GitHub API...</p>
                </div>
            ) : repositories.length === 0 ? (
                <div className="glass p-16 rounded-xl border border-dashed border-white/20 text-center flex flex-col items-center justify-center">
                    <div className="h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                        <FolderGit2 className="h-8 w-8 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">No Repositories Linked</h2>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm">
                        You have not granted ArchSight access to any repositories. Please install the official App into your organization or personal account.
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-500 text-white" asChild>
                        <a href={`https://github.com/apps/${appSlug}/installations/new`}>
                            Configure GitHub Access <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                    </Button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {repositories.map((repo) => (
                        <div key={repo.id} className="glass p-5 rounded-xl border border-white/5 hover:border-white/20 transition-all flex flex-col group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-black/40 rounded-lg flex items-center justify-center shrink-0 border border-white/10">
                                        <Github className="h-5 w-5 text-gray-300" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-sm font-semibold text-foreground truncate" title={repo.full_name}>
                                            {repo.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground truncate">{repo.owner}</p>
                                    </div>
                                </div>
                                {repo.private && (
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                        Private
                                    </span>
                                )}
                            </div>

                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground font-mono">
                                    {repo.default_branch}
                                </span>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-white"
                                    onClick={() => handleScanRepository(repo)}
                                    disabled={isScanning[repo.id]}
                                >
                                    {isScanning[repo.id] ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "Trigger Scan"
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
