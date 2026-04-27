"use client";
/* eslint-disable @next/next/no-img-element */
import { Settings, Bell, ChevronRight, Github, Globe, Shield, Lock, User, Palette, Bell as BellIcon } from "lucide-react";
import { useSession } from "next-auth/react";

const settingsSections = [
    {
        title: "Account",
        icon: User,
        items: [
            { label: "Profile Information", description: "Update your name, email and avatar", icon: User, available: false },
            { label: "Password & Security", description: "Change password or enable 2FA", icon: Lock, available: false },
        ],
    },
    {
        title: "Integrations",
        icon: Github,
        items: [
            { label: "GitHub App", description: "Manage connected repositories and installation permissions", icon: Github, available: true, href: "https://github.com/apps/archsight/installations" },
            { label: "External APIs", description: "Configure webhooks and external service tokens", icon: Globe, available: false },
        ],
    },
    {
        title: "Notifications",
        icon: BellIcon,
        items: [
            { label: "Scan Alerts", description: "Email and in-app alerts when scans complete or fail", icon: Bell, available: false },
        ],
    },
    {
        title: "Appearance",
        icon: Palette,
        items: [
            { label: "Theme", description: "Dark mode is currently enforced for the best experience", icon: Palette, available: false },
        ],
    },
    {
        title: "Security",
        icon: Shield,
        items: [
            { label: "Data Retention", description: "Control how long scan results and engine payloads are stored", icon: Shield, available: false },
        ],
    },
];

export default function SettingsPage() {
    const { data: session } = useSession();
    const user = session?.user;

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="pb-6 border-b border-[#1E1E2E]">
                <p className="text-[#5A5A7A] text-xs font-mono uppercase tracking-widest mb-2">Configuration</p>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-1.5">Settings</h1>
                <p className="text-[#5A5A7A] text-sm">Manage your account, integrations, and workspace preferences.</p>
            </div>

            {/* User Card */}
            {user && (
                <div className="bg-[#13131E] border border-[#1E1E2E] rounded-2xl p-5 flex items-center gap-4">
                    {user.image ? (
                        <img src={user.image} alt={user.name || ""} className="w-14 h-14 rounded-full object-cover border-2 border-white/10" />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-xl">
                            {user.name?.charAt(0) || "?"}
                        </div>
                    )}
                    <div>
                        <p className="text-white font-semibold text-lg">{user.name || "Unknown User"}</p>
                        <p className="text-[#5A5A7A] text-sm">{user.email}</p>
                    </div>
                    <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-[#3E3E5E] bg-[#1E1E2E] px-3 py-1.5 rounded-full border border-[#2E2E3E]">Free Plan</span>
                </div>
            )}

            {/* Settings Sections */}
            {settingsSections.map((section) => (
                <div key={section.title}>
                    <div className="flex items-center gap-2 mb-3">
                        <section.icon className="w-4 h-4 text-[#5A5A7A]" />
                        <h2 className="text-sm font-semibold text-[#5A5A7A] uppercase tracking-widest">{section.title}</h2>
                    </div>
                    <div className="bg-[#13131E] border border-[#1E1E2E] rounded-2xl overflow-hidden divide-y divide-[#1E1E2E]">
                        {section.items.map((item) => (
                            <div key={item.label} className={`flex items-center gap-4 px-5 py-4 group ${item.available ? "hover:bg-white/[0.02] cursor-pointer" : "opacity-40 cursor-not-allowed"}`}>
                                <div className="w-9 h-9 rounded-xl bg-[#1E1E2E] flex items-center justify-center shrink-0">
                                    <item.icon className="w-4 h-4 text-[#5A5A7A]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium">{item.label}</p>
                                    <p className="text-[#5A5A7A] text-xs mt-0.5">{item.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!item.available && (
                                        <span className="text-[10px] font-mono text-[#3E3E5E] bg-[#1E1E2E] px-2 py-0.5 rounded-full border border-[#2E2E3E]">Soon</span>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-[#3E3E5E] group-hover:text-[#5A5A7A] transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
