"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MiniNavbar } from "@/components/ui/sign-in-flow-1";
import {
    Hexagon, ArrowRight, Github, MonitorPlay,
    Network, ShieldAlert,
    TerminalSquare, Cpu, Boxes,
    FileText, PieChart, Server, Database
} from "lucide-react";
import Link from "next/link";
import { Radar, IconContainer } from "@/components/ui/radar-effect";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { CinematicHero } from "@/components/ui/cinematic-hero";

export default function Landing() {



    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove("opacity-0", "translate-y-6");
                    entry.target.classList.add("opacity-100", "translate-y-0");
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach((el) => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-[#0A0A0F] text-[#A0A0C0] font-sans selection:bg-primary/30 overflow-x-hidden">
            <main className="relative z-10 w-full min-h-screen bg-[#0A0A0F] shadow-[0_80px_100px_rgba(0,0,0,1)] rounded-b-[40px] md:rounded-b-[80px] overflow-hidden border-b border-[#1A1A2A]">
            <MiniNavbar />

            <CinematicHero />

            {/* SECTION 10 - Cinematic Radar Showcase */}
            <section className="relative py-40 px-6 bg-[#050508] border-t border-[#111118] overflow-hidden">
                {/* Subtle radial glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6C63FF]/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-[1200px] mx-auto relative z-10">
                    <div className="text-center mb-24 reveal transform transition-all duration-700 ease-out">
                        <span className="text-[#6C63FF] font-mono text-sm tracking-tight uppercase mb-4 block">Structural Analysis</span>
                        <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tighter">Deep Architectural Intelligence</h2>
                        <p className="text-[#A0A0C0] text-xl max-w-2xl mx-auto font-light leading-relaxed">Discover insights that conventional tools miss through complete backend AST translation and deterministic graph mapping.</p>
                    </div>

                    <div className="flex w-full flex-col items-center justify-center relative reveal transform transition-all duration-1000 delay-200">
                        <Radar className="w-[300px] h-[300px] md:w-[500px] md:h-[500px]" />
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-12 w-full h-full pointer-events-none">
                            <div className="flex w-full max-w-4xl justify-between px-4 md:px-0">
                                <IconContainer text="AST Parsing" delay={0.2} icon={<FileText className="h-6 w-6 text-neutral-300" />} />
                                <IconContainer text="Deep Mapping" delay={0.4} icon={<Network className="h-6 w-6 text-[#00D4FF]" />} />
                            </div>
                            <div className="flex w-full max-w-2xl justify-between px-4 md:px-0">
                                <IconContainer text="Arch Check" delay={0.5} icon={<Cpu className="h-6 w-6 text-[#F59E0B]" />} />
                                <IconContainer text="Relational Logic" delay={0.7} icon={<Database className="h-6 w-6 text-[#A855F7]" />} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            </main>

            {/* SECTION 11 - Cinematic Footer */}
            <CinematicFooter />
        </div>
    );
}

function TargetBoundaryIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
}
