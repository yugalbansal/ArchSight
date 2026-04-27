"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
    LayoutDashboard, FolderGit2, ScanSearch, Lightbulb,
    DollarSign, Settings, FileText, Bell, Menu, ChevronLeft,
    LogOut, User, Sparkles
} from "lucide-react";
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



export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();
    const { data: session } = useSession();

    const user = session?.user;
    const initials = user?.name
        ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "?";

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-[#A0A0C0] flex flex-col font-sans">

            {/* ── TOP NAV ─────────────────────────────────── */}
            <header className="h-16 border-b border-[#1E1E2E] bg-[#0A0A0F]/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 shrink-0 relative z-20">
                {/* Bottom glow line */}
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost" size="icon"
                        className="lg:hidden text-[#5A5A7A] hover:text-white hover:bg-white/5"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="relative w-6 h-6 flex items-center justify-center">
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-white/80 top-0 left-1/2 -translate-x-1/2" />
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-[#A0A0C0] left-0 top-1/2 -translate-y-1/2 opacity-60" />
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-[#A0A0C0] right-0 top-1/2 -translate-y-1/2 opacity-60" />
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-[#A0A0C0] bottom-0 left-1/2 -translate-x-1/2 opacity-60" />
                        </div>
                        <span className="font-bold text-white tracking-tight group-hover:text-[#C4B5FD] transition-colors">
                            ArchSight
                        </span>
                    </Link>

                    {/* Top nav links */}
                    <nav className="hidden md:flex items-center gap-6 ml-6 text-sm">
                        {[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Repositories", href: "/repositories" },
                            { label: "Docs", href: "/docs" },
                        ].map((l) => (
                            <AnimatedNavLink key={l.label} href={l.href}>
                                {l.label}
                            </AnimatedNavLink>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                    {/* Notification bell */}
                    <Button variant="ghost" size="icon" className="text-[#5A5A7A] hover:text-white hover:bg-white/5 relative">
                        <Bell className="h-4 w-4" />
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white/60" />
                    </Button>

                    {/* User dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 rounded-full ring-1 ring-[#2E2E3E] hover:ring-white/20 transition-all p-0.5 focus:outline-none">
                                {user?.image ? (
                                    <img src={user.image} alt={user.name || "User"} className="h-8 w-8 rounded-full object-cover" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white border border-white/20">
                                        {initials}
                                    </div>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-56 bg-[#13131E] border border-[#1E1E2E] shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
                            align="end"
                            forceMount
                        >
                            <div className="flex items-center gap-3 p-3 border-b border-[#1E1E2E]">
                                {user?.image ? (
                                    <img src={user.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                                ) : (
                                    <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white border border-white/20">
                                        {initials}
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <p className="text-sm font-semibold text-white">{user?.name || "User"}</p>
                                    <p className="text-[11px] text-[#5A5A7A] truncate max-w-[140px]">{user?.email}</p>
                                </div>
                            </div>
                            <div className="p-1">
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer text-[#A0A0C0] hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                        <User className="h-4 w-4" /> Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer text-[#A0A0C0] hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                        <Settings className="h-4 w-4" /> Settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[#1E1E2E] my-1" />
                                <DropdownMenuItem
                                    className="flex items-center gap-2 cursor-pointer text-[#FF4C6A] hover:text-[#FF4C6A] focus:text-[#FF4C6A] px-2 py-1.5 rounded-lg hover:bg-[#FF4C6A]/10 focus:bg-[#FF4C6A]/10 transition-colors"
                                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                                >
                                    <LogOut className="h-4 w-4" /> Sign out
                                </DropdownMenuItem>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Mobile Navigation Menu */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-30 lg:hidden bg-[#0A0A0F]/95 backdrop-blur-md pt-20 px-6">
                        <nav className="flex flex-col gap-4">
                            {[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Repositories", href: "/repositories" },
                                { label: "Docs", href: "/docs" },
                            ].map((l) => (
                                <Link 
                                    key={l.label} 
                                    href={l.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="text-lg font-semibold text-white py-2 border-b border-[#1E1E2E]"
                                >
                                    {l.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}

                {/* ── MAIN CONTENT ─────────────────────────── */}
                <main className="flex-1 overflow-auto bg-[#0A0A0F]">
                    {/* Ambient glow */}
                    <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#6C63FF] opacity-[0.03] rounded-full blur-[150px] pointer-events-none z-0" />
                    <div className="relative z-10 p-6 lg:p-8 max-w-[1400px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
