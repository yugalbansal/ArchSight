"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, FolderGit2, ScanSearch, Lightbulb, DollarSign, Settings, FileText, Bell, Menu, ChevronLeft, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedNavLink } from "@/components/ui/sign-in-flow-1";

export const navItems = [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard", disabled: false },
    { label: "Repositories (App)", icon: FolderGit2, path: "/repositories", disabled: false },
    { label: "New Scan (Manual)", icon: ScanSearch, path: "/scan", disabled: false },
    { label: "Architecture Gallery", icon: Lightbulb, path: "/insights", disabled: false },
    { label: "Cost Engine", icon: DollarSign, path: "/dashboard", disabled: true },
    { label: "Settings", icon: Settings, path: "/dashboard", disabled: true },
    { label: "Docs", icon: FileText, path: "/dashboard", disabled: true },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();
    const { data: session } = useSession();

    const user = session?.user;
    const initials = user?.name
        ? user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "?";

    return (
        <div className="min-h-screen bg-black text-[#A0A0C0] flex flex-col">
            {/* Top Nav */}
            <header className="h-16 border-b border-[#333]/50 bg-[#1f1f1f57] backdrop-blur-md flex items-center justify-between px-4 lg:px-6 shrink-0 relative z-20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <Link href="/" className="flex items-center gap-2">
                         <div className="relative w-5 h-5 flex items-center justify-center">
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 top-0 left-1/2 transform -translate-x-1/2 opacity-80"></span>
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 left-0 top-1/2 transform -translate-y-1/2 opacity-80"></span>
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 right-0 top-1/2 transform -translate-y-1/2 opacity-80"></span>
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 bottom-0 left-1/2 transform -translate-x-1/2 opacity-80"></span>
                         </div>
                        <span className="font-bold text-white tracking-tight">ArchSight</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 ml-8 text-sm">
                        {[
                            { label: "Dashboard", href: "/dashboard", disabled: false },
                            { label: "Repositories", href: "/repositories", disabled: false },
                            { label: "Manual Scan", href: "/scan", disabled: false },
                            { label: "Architecture Gallery", href: "/insights", disabled: false },
                        ].map((l) => (
                            l.disabled ? (
                                <span key={l.label} className="text-muted-foreground/50 cursor-not-allowed">
                                    {l.label}
                                </span>
                            ) : (
                                <AnimatedNavLink key={l.label} href={l.href}>
                                    {l.label}
                                </AnimatedNavLink>
                            )
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
                    </Button>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 overflow-hidden">
                                {user?.image ? (
                                    <img
                                        src={user.image}
                                        alt={user.name || "User"}
                                        className="h-8 w-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                                        {initials}
                                    </div>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <div className="flex items-center gap-2 p-2">
                                <div className="flex flex-col space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">{user?.name || "User"}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                                    <User className="h-4 w-4" />
                                    Profile
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                                    <Settings className="h-4 w-4" />
                                    Settings
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                            if (item.disabled) {
                                return (
                                    <div
                                        key={item.label}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-muted-foreground/30 cursor-not-allowed"
                                        title="Coming soon"
                                    >
                                        <item.icon className="h-4 w-4 shrink-0" />
                                        {!collapsed && <span>{item.label}</span>}
                                    </div>
                                );
                            }

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
