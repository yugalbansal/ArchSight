"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Github, GitlabIcon, Search, Plus, Check } from "lucide-react";
import { repositories } from "@/data/mockData";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const platformIcon: Record<string, React.ReactNode> = {
    github: <Github className="h-4 w-4" />,
    gitlab: <GitlabIcon className="h-4 w-4" />,
    bitbucket: <span className="text-xs font-bold">BB</span>,
};

export default function Repositories() {
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [selectedPlatform, setSelectedPlatform] = useState("");
    const { toast } = useToast();

    const filtered = repositories.filter((r) => {
        if (filter !== "all" && r.platform !== filter) return false;
        if (search && !r.name.includes(search) && !r.org.includes(search)) return false;
        return true;
    });

    const handleConnect = () => {
        toast({ title: "Repository connected!", description: "Scan started for the selected repository." });
        setModalOpen(false);
        setStep(1);
        setSelectedPlatform("");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Repositories</h1>
                <Button className="gradient-primary text-primary-foreground border-0 gap-2" onClick={() => setModalOpen(true)}>
                    <Plus className="h-4 w-4" /> Connect New Repo
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2">
                    {["all", "github", "gitlab"].map((f) => (
                        <Button key={f} variant="ghost" size="sm" onClick={() => setFilter(f)}
                            className={`border text-xs capitalize ${filter === f ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground'}`}>
                            {f === "all" ? "All" : f === "github" ? "GitHub" : "GitLab"}
                        </Button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search repos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10 text-foreground h-9" />
                </div>
            </div>

            {/* Grid */}
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((r) => (
                    <div key={r.id} className="glass p-5 hover:bg-white/[0.08] transition-all">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {platformIcon[r.platform]}
                                    <span className="text-foreground font-medium text-sm">{r.org} / {r.name}</span>
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                    {r.languages.map((l) => <Badge key={l} variant="outline" className="text-[10px] border-white/10 text-muted-foreground px-1.5 py-0">{l}</Badge>)}
                                </div>
                            </div>
                            {/* Mini score */}
                            <div className="relative w-10 h-10 shrink-0">
                                <svg viewBox="0 0 40 40" className="-rotate-90">
                                    <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                                    <circle cx="20" cy="20" r="16" fill="none"
                                        stroke={r.score >= 80 ? "hsl(142 76% 36%)" : r.score >= 60 ? "hsl(39 100% 50%)" : "hsl(0 84% 60%)"}
                                        strokeWidth="3" strokeDasharray={`${r.score} 100`} strokeLinecap="round" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">{r.score}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-4">
                            <div>Scanned: <span className="text-foreground">{r.lastScanned}</span></div>
                            <div>Services: <span className="text-foreground">{r.services}</span></div>
                            <div className="flex gap-1">
                                {r.insights.critical > 0 && <span className="text-red-400">{r.insights.critical}C</span>}
                                {r.insights.warning > 0 && <span className="text-yellow-400">{r.insights.warning}W</span>}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 gradient-primary text-primary-foreground border-0 text-xs" asChild>
                                <Link href={`/repositories/${r.id}`}>View Architecture</Link>
                            </Button>
                            <Button size="sm" variant="ghost" className="border border-white/10 text-foreground text-xs"
                                onClick={() => toast({ title: "Scan started!", description: `Scanning ${r.org}/${r.name}...` })}>
                                Scan Now
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Connect Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="glass border-white/10 bg-card sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Connect Repository</DialogTitle>
                    </DialogHeader>
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className={`flex-1 h-1 rounded-full ${step >= s ? 'gradient-primary' : 'bg-white/10'}`} />
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { name: "GitHub", icon: <Github className="h-6 w-6" /> },
                                { name: "GitLab", icon: <GitlabIcon className="h-6 w-6" /> },
                                { name: "Bitbucket", icon: <span className="text-lg font-bold">BB</span> },
                            ].map((p) => (
                                <button key={p.name} onClick={() => { setSelectedPlatform(p.name); setStep(2); }}
                                    className={`glass p-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all cursor-pointer ${selectedPlatform === p.name ? 'ring-1 ring-primary' : ''}`}>
                                    {p.icon}
                                    <span className="text-xs">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground mb-2">Select repository from {selectedPlatform}</p>
                            {["acme-corp / payment-gateway", "acme-corp / notification-hub", "startupxyz / analytics-engine"].map((r) => (
                                <button key={r} onClick={() => setStep(3)} className="w-full text-left glass p-3 text-sm text-foreground hover:bg-white/[0.08] transition-all cursor-pointer">{r}</button>
                            ))}
                        </div>
                    )}
                    {step === 3 && (
                        <div className="text-center space-y-4">
                            <Check className="h-12 w-12 text-accent mx-auto" />
                            <p className="text-foreground">Ready to scan <span className="font-semibold">acme-corp / payment-gateway</span></p>
                            <Button className="gradient-primary text-primary-foreground border-0 w-full" onClick={handleConnect}>Confirm &amp; Start Scan</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
