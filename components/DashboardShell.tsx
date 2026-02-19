"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, LayoutDashboard, FolderGit2, ScanSearch, Lightbulb, DollarSign, Settings, FileText, Bell, Menu, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useUserSync } from "@/hooks/use-user-sync";

const navItems = [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Repositories", icon: FolderGit2, path: "/repositories" },
    { label: "Scans", icon: ScanSearch, path: "/dashboard" },
    { label: "Insights", icon: Lightbulb, path: "/insights" },
    { label: "Cost Engine", icon: DollarSign, path: "/dashboard" },
    { label: "Settings", icon: Settings, path: "/dashboard" },
    { label: "Docs", icon: FileText, path: "/dashboard" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();

    // Auto-sync Clerk user to Supabase via Express backend
    useUserSync();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top Nav */}
            <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 shrink-0 relative z-20 bg-background/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <Link href="/" className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="font-bold text-foreground">ArchSight</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 ml-8 text-sm">
                        {[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Repositories", href: "/repositories" },
                            { label: "Insights", href: "/insights" },
                            { label: "Cost Analysis", href: "/dashboard" },
                        ].map((l) => (
                            <Link key={l.label} href={l.href} className="text-muted-foreground hover:text-foreground transition-colors">
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
                    </Button>
                    <UserButton
                        appearance={{
                            elements: {
                                avatarBox: "h-8 w-8",
                            },
                        }}
                    />
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Mobile overlay */}
                {mobileOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

                {/* Sidebar */}
                <aside className={cn(
                    "border-r border-white/5 bg-background/50 backdrop-blur-md flex flex-col shrink-0 transition-all duration-200 z-40",
                    collapsed ? "w-16" : "w-56",
                    mobileOpen ? "fixed inset-y-0 left-0 top-14" : "hidden lg:flex"
                )}>
                    <div className="flex items-center justify-end p-2">
                        <Button variant="ghost" size="icon" className="text-muted-foreground h-7 w-7" onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}>
                            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
                        </Button>
                    </div>
                    <nav className="flex-1 px-2 space-y-1">
                        {navItems.map((item) => {
                            const active = pathname === item.path || (item.path === "/repositories" && pathname.startsWith("/repositories"));
                            return (
                                <Link
                                    key={item.label}
                                    href={item.path}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                                        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-auto p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
