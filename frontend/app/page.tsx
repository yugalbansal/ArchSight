"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Hexagon, ArrowRight, Github, MonitorPlay, Code2,
    Network, Server, Database, GitBranch, ShieldAlert,
    Clock, TerminalSquare, Activity, Cpu, Box, Boxes, ChevronRight
} from "lucide-react";
import Link from "next/link";

export default function Landing() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 80);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

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
        <div className="min-h-screen bg-[#0A0A0F] text-[#A0A0C0] font-sans selection:bg-primary/30">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#1A1040] blur-[100px] opacity-30 animate-pulse-glow" />
                <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#00D4FF]/5 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
            </div>

            {/* SECTION 1 - Navbar */}
            <header className={`fixed top-6 left-0 right-0 z-50 transition-all duration-300 flex justify-center w-full`}>
                <nav className={`flex items-center justify-between px-6 py-3 w-full max-w-[900px] border rounded-full transition-all duration-300 ${scrolled ? 'bg-[#0A0A14]/85 backdrop-blur-xl border-white/10 shadow-lg' : 'bg-transparent border-transparent'}`}>
                    <Link href="/" className="flex items-center gap-2 group">
                        <Hexagon className="h-6 w-6 text-[#6C63FF] fill-[#6C63FF]/20 group-hover:scale-110 transition-transform" />
                        <span className="text-white font-semibold tracking-tight">ArchSight</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-6 text-[14px] font-medium">
                        <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
                        <a href="#graph" className="hover:text-white transition-colors">Architecture Graph</a>
                        <a href="#ai" className="hover:text-white transition-colors">AI Intelligence</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/auth/login" className="text-sm font-medium hover:text-white hidden sm:block transition-colors">Sign In</Link>
                        <Button className="bg-[#6C63FF] hover:bg-[#6C63FF]/90 text-white rounded-xl h-9 px-5 shadow-[0_0_24px_rgba(108,99,255,0.4)] hover:shadow-[0_0_32px_rgba(108,99,255,0.6)] transition-all font-semibold text-sm" asChild>
                            <Link href="/auth/signup">Connect Repo <ArrowRight className="ml-1 w-4 h-4" /></Link>
                        </Button>
                    </div>
                </nav>
            </header>

            {/* SECTION 2 - Hero */}
            <section className="relative z-10 pt-[160px] pb-24 px-6 flex flex-col items-center text-center">
                <Badge variant="outline" className="mb-8 font-mono bg-[#6C63FF]/15 text-[#6C63FF] border-[#6C63FF]/30 px-3 py-1.5 uppercase tracking-widest text-[11px] rounded-full">
                    Architecture Observability · Powered by AI
                </Badge>

                <h1 className="text-5xl sm:text-[72px] lg:text-[88px] leading-[1.05] font-extrabold text-white tracking-[-0.03em] max-w-[900px] mb-8 reveal opacity-0 translate-y-6">
                    See Every <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#6C63FF] to-[#00D4FF]">Risk</span> Inside <br className="hidden sm:block" /> Your Codebase.
                </h1>

                <p className="text-lg sm:text-[20px] leading-[1.7] max-w-[600px] mb-10 reveal opacity-0 translate-y-6" style={{ transitionDelay: '100ms' }}>
                    ArchSight connects to your repository, parses your entire system using AST analysis, and builds a live architecture graph — exposing circular dependencies, god services, and structural decay in real time.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 reveal opacity-0 translate-y-6" style={{ transitionDelay: '200ms' }}>
                    <Button size="lg" className="bg-[#6C63FF] hover:bg-[#6C63FF]/90 text-white rounded-xl h-14 px-8 shadow-[0_0_24px_rgba(108,99,255,0.4)] font-semibold text-base overflow-hidden relative group w-full sm:w-auto" asChild>
                        <Link href="/auth/signup">
                            <span className="relative z-10 flex items-center">Connect Your Repo <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                        </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="h-14 px-8 rounded-xl border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10 font-medium w-full sm:w-auto bg-transparent">
                        <MonitorPlay className="mr-2 w-4 h-4" /> See a Live Demo
                    </Button>
                </div>

                <p className="text-[12px] text-[#5A5A7A] mb-20 reveal opacity-0 translate-y-6" style={{ transitionDelay: '300ms' }}>
                    Works with GitHub & GitLab · Isolated Worker Container · No code stored
                </p>

                {/* Hero Visual Mockup */}
                <div className="w-full max-w-[1000px] h-[400px] sm:h-[600px] bg-[#0E0E18] border border-[#1E1E2E] rounded-[24px] relative overflow-hidden shadow-2xl reveal opacity-0 translate-y-6" style={{ transitionDelay: '400ms' }}>

                    {/* Graph SVG background */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
                        <defs>
                            <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.5" />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Edges */}
                        <path d="M 200 150 Q 500 100 800 200" fill="none" stroke="url(#edge-grad)" strokeWidth="2" strokeDasharray="6 6" className="animate-edge" />
                        <path d="M 200 150 Q 300 350 500 400" fill="none" stroke="#6C63FF" strokeOpacity="0.3" strokeWidth="2" className="animate-edge" />
                        <path d="M 500 400 Q 700 450 800 200" fill="none" stroke="#FF4C6A" strokeOpacity="0.6" strokeWidth="2" className="animate-edge" />
                        <path d="M 500 400 Q 600 500 800 520" fill="none" stroke="#00D4FF" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="4 4" className="animate-edge" />

                        {/* Nodes */}
                        <g transform="translate(150, 130)" filter="url(#glow)">
                            <rect width="100" height="40" rx="8" fill="#13131E" stroke="#6C63FF" strokeWidth="1.5" />
                            <text x="50" y="24" fill="#FFF" fontSize="12" fontFamily="monospace" textAnchor="middle">Client App</text>
                        </g>

                        <g transform="translate(450, 380)" filter="url(#glow)">
                            <rect width="120" height="40" rx="8" fill="#13131E" stroke="#FF4C6A" strokeWidth="2" className="animate-pulse" />
                            <text x="60" y="24" fill="#FFF" fontSize="12" fontFamily="monospace" textAnchor="middle">OrderService</text>
                        </g>

                        <g transform="translate(750, 180)">
                            <rect width="100" height="40" rx="8" fill="#13131E" stroke="#22C55E" strokeWidth="1" />
                            <text x="50" y="24" fill="#FFF" fontSize="12" fontFamily="monospace" textAnchor="middle">AuthService</text>
                        </g>

                        <g transform="translate(750, 500)">
                            <rect width="120" height="40" rx="8" fill="#13131E" stroke="#F59E0B" strokeWidth="1" />
                            <text x="60" y="24" fill="#FFF" fontSize="12" fontFamily="monospace" textAnchor="middle">PostgreSQL</text>
                        </g>
                    </svg>

                    {/* Floating Alert */}
                    <div className="absolute bottom-8 right-8 bg-[#13131E]/90 backdrop-blur-md border border-[#FF4C6A]/50 rounded-xl p-4 shadow-[0_8px_32px_rgba(255,76,106,0.15)] flex items-start gap-3 w-[280px] animate-float">
                        <div className="w-8 h-8 rounded-full bg-[#FF4C6A]/20 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-4 h-4 text-[#FF4C6A]" />
                        </div>
                        <div>
                            <p className="text-white text-sm font-semibold mb-1">God Service Detected</p>
                            <p className="text-[12px] text-[#A0A0C0]">OrderService has a Fan-in of 14, high structural coupling risk.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 3 - Trust Bar */}
            <section className="py-12 border-t border-b border-[#1E1E2E]/50 bg-[#0E0E16]">
                <p className="text-center text-[#5A5A7A] text-[13px] uppercase tracking-[0.12em] font-medium mb-8">Trusted by engineering teams building complex systems</p>
                <div className="flex overflow-hidden relative">
                    <div className="flex gap-16 min-w-full animate-marquee px-8 items-center justify-around">
                        {['ACME CORP', 'NEXTGEN AI', 'GLOBAL FIN', 'CLOUDSCALE', 'VERTEX', 'SYNAPSE'].map((logo, i) => (
                            <span key={i} className="font-mono text-xl text-[#5A5A7A]/40 font-bold whitespace-nowrap">{logo}</span>
                        ))}
                    </div>
                    <div className="flex gap-16 min-w-full animate-marquee px-8 items-center justify-around absolute top-0 left-full">
                        {['ACME CORP', 'NEXTGEN AI', 'GLOBAL FIN', 'CLOUDSCALE', 'VERTEX', 'SYNAPSE'].map((logo, i) => (
                            <span key={i} className="font-mono text-xl text-[#5A5A7A]/40 font-bold whitespace-nowrap">{logo}</span>
                        ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0E0E16] via-transparent to-[#0E0E16] pointer-events-none" />
                </div>
            </section>

            {/* SECTION 4 - How it Works */}
            <section id="how-it-works" className="py-32 px-6">
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-20 reveal opacity-0 translate-y-6">
                        <h2 className="text-[36px] sm:text-[48px] font-bold text-[#F0F0FF] tracking-tight mb-4">From Repository to Insight in Minutes</h2>
                        <p className="text-lg text-[#A0A0C0]">A deterministic, reproducible analysis pipeline — not a chatbot guessing at your code.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connecting line for desktop */}
                        <div className="hidden md:block absolute top-[28%] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-[#6C63FF]/10 via-[#6C63FF]/30 to-[#6C63FF]/10 border-t border-dashed border-[#6C63FF]/50 z-0" />

                        {[
                            { step: '01', icon: <Github className="w-8 h-8 text-[#6C63FF]" />, title: 'Secure Repo Connect', desc: 'Connect via GitHub App. Your repo is cloned into an isolated worker container — never stored, never shared. Full isolation per scan.' },
                            { step: '02', icon: <Network className="w-8 h-8 text-[#00D4FF]" />, title: 'AST Parsing & Graph', desc: 'Tree-sitter parses every file. Controllers, database calls, queues, and API usage are converted into a typed Architecture Graph.' },
                            { step: '03', icon: <Cpu className="w-8 h-8 text-[#A855F7]" />, title: 'AI Structural Intelligence', desc: 'The AI layer never reads raw code. It reasons over the structured graph to produce completely deterministic JSON-formatted insights.' }
                        ].map((s, i) => (
                            <div key={i} className="bg-[#13131E] border border-[#1E1E2E] rounded-[16px] p-8 relative z-10 hover:shadow-[0_8px_48px_rgba(108,99,255,0.12)] transition-shadow reveal opacity-0 translate-y-6" style={{ transitionDelay: `${i * 100}ms` }}>
                                <div className="absolute top-8 right-8 font-mono text-[#6C63FF] text-xl font-medium opacity-50">{s.step}</div>
                                <div className="w-16 h-16 rounded-xl bg-[#1A1A2E] flex items-center justify-center mb-6 border border-[#6C63FF]/20">
                                    {s.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                                <p className="text-[#A0A0C0] leading-relaxed text-[15px]">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 5 - Architecture Graph Showcase */}
            <section id="graph" className="py-24 px-6 bg-[#0E0E16] border-y border-[#1E1E2E]">
                <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-16 items-center">
                    <div className="lg:w-[40%] reveal opacity-0 translate-y-6">
                        <span className="text-[#6C63FF] font-mono text-sm tracking-widest uppercase mb-4 block">Architecture Graph Model</span>
                        <h2 className="text-[36px] sm:text-[40px] font-bold text-white leading-tight mb-6">Every Node. Every Edge. Every Risk. Mapped.</h2>
                        <p className="text-[#A0A0C0] text-lg mb-8 leading-relaxed">
                            ArchSight builds a live typed graph with 9 node types and 6 relationship types. Circular dependencies, service centrality, and hidden coupling patterns become instantly visible.
                        </p>

                        <div className="flex flex-wrap gap-3 mb-10">
                            {[
                                { label: 'Client', bg: '#6C63FF' },
                                { label: 'API Gateway', bg: '#00D4FF' },
                                { label: 'Service', bg: '#22C55E' },
                                { label: 'Worker', bg: '#F59E0B' },
                                { label: 'Database', bg: '#F59E0B' },
                                { label: 'Queue', bg: '#FF9500' },
                                { label: 'External API', bg: '#FF4C6A' },
                                { label: 'LLM Provider', bg: '#A855F7' },
                            ].map(badge => (
                                <div key={badge.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#13131E] border border-[#1E1E2E] text-xs font-mono text-white">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: badge.bg }}></span>
                                    {badge.label}
                                </div>
                            ))}
                        </div>

                        <Button variant="outline" className="h-12 border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10 bg-transparent px-6 font-medium">
                            Explore Sample Graph <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>

                    <div className="lg:w-[60%] w-full bg-[#040408] border border-[#1E1E2E] rounded-[16px] overflow-hidden shadow-2xl reveal opacity-0 translate-y-6 flex flex-col h-[450px]" style={{ transitionDelay: '200ms' }}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2E]/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <TerminalSquare className="w-5 h-5 text-[#6C63FF]" />
                                <span className="font-mono text-[13px] text-[#A0A0C0] tracking-wide">architecture_graph.json</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#FF5F58]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#28CA41]"></span>
                            </div>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#040408]">
                            <pre className="font-mono text-[13px] text-[#A0A0C0] leading-loose whitespace-pre-wrap break-all">
                                <code><span className="text-[#00D4FF]">"graph"</span>: &#123;<span className="text-[#00D4FF]">"entry_point"</span>: <span className="text-[#A855F7]">"src/server.ts"</span>,<span className="text-[#00D4FF]">"nodes"</span>: [ &#123;<span className="text-[#00D4FF]">"id"</span>: <span className="text-[#A855F7]">"AuthService"</span>,<span className="text-[#00D4FF]">"type"</span>: <span className="text-[#A855F7]">"SERVICE"</span>,<span className="text-[#00D4FF]">"framework"</span>: <span className="text-[#A855F7]">"express"</span>,<span className="text-[#00D4FF]">"metrics"</span>: &#123; <span className="text-[#00D4FF]">"fan_in"</span>: <span className="text-[#F59E0B]">4</span>, <span className="text-[#00D4FF]">"fan_out"</span>: <span className="text-[#F59E0B]">2</span> &#125; &#125;, &#123;<span className="text-[#00D4FF]">"id"</span>: <span className="text-[#A855F7]">"OrderController"</span>,<span className="text-[#00D4FF]">"type"</span>: <span className="text-[#A855F7]">"CONTROLLER"</span>,<span className="text-[#00D4FF]">"metrics"</span>: &#123; <span className="text-[#00D4FF]">"fan_in"</span>: <span className="text-[#F59E0B]">1</span>, <span className="text-[#00D4FF]">"fan_out"</span>: <span className="text-[#F59E0B]">8</span> &#125; &#125;, &#123;<span className="text-[#00D4FF]">"id"</span>: <span className="text-[#A855F7]">"PaymentProcessor"</span>,<span className="text-[#00D4FF]">"type"</span>: <span className="text-[#A855F7]">"WORKER"</span>,<span className="text-[#00D4FF]">"metrics"</span>: &#123; <span className="text-[#00D4FF]">"fan_in"</span>: <span className="text-[#F59E0B]">2</span>, <span className="text-[#00D4FF]">"fan_out"</span>: <span className="text-[#F59E0B]">1</span> &#125; &#125; ],<span className="text-[#00D4FF]">"edges"</span>: [ &#123; <span className="text-[#00D4FF]">"source"</span>: <span className="text-[#A855F7]">"OrderController"</span>, <span className="text-[#00D4FF]">"target"</span>: <span className="text-[#A855F7]">"AuthService"</span>, <span className="text-[#00D4FF]">"type"</span>: <span className="text-[#A855F7]">"CALLS"</span> &#125;, &#123; <span className="text-[#00D4FF]">"source"</span>: <span className="text-[#A855F7]">"OrderController"</span>, <span className="text-[#00D4FF]">"target"</span>: <span className="text-[#A855F7]">"PaymentProcessor"</span>, <span className="text-[#00D4FF]">"type"</span>: <span className="text-[#A855F7]">"PUBLISHES_TO"</span> &#125; ] &#125;</code>
                            </pre>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 6 - Structural Metrics */}
            <section className="py-24 px-6 bg-[#0B0B12]">
                <div className="max-w-[1200px] mx-auto">
                    <div className="mb-16 reveal opacity-0 translate-y-6">
                        <h2 className="text-[36px] font-bold text-white mb-3">Architecture Metrics That Actually Mean Something</h2>
                        <p className="text-[#A0A0C0]">Deterministic, formula-based metrics. Computed directly from the graph model.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            { name: 'Circular Dependencies', val: 3, form: 'cycles(import_chain)', desc: 'Detected cycles in import/call chains. Each cycle is a maintenance trap.', color: '#FF4C6A' },
                            { name: 'Coupling Score', val: '87%', form: '(fan-in + fan-out) / total_nodes', desc: 'Higher equals tighter coupling and higher change risk across the system.', color: '#F59E0B' },
                            { name: 'Fan-In / Fan-Out Ratio', val: '14:6', form: 'inbound / outbound references', desc: 'Reveals god services that too many other services depend on.', color: '#00D4FF' },
                            { name: 'Dependency Depth', val: 8, form: 'max_depth(node)', desc: 'Max chain length from entry point. Deep chains = fragile blast radius.', color: '#A855F7' },
                            { name: 'Service Centrality', val: '0.82', form: 'betweenness_centrality()', desc: 'Central services act as strict single points of failure.', color: '#6C63FF' },
                            { name: 'Architecture Complexity', val: 'B-', form: 'composite_health_score()', desc: 'Single composite score combining all metrics into a structural health number.', color: '#22C55E' },
                        ].map((m, i) => (
                            <div key={i} className="bg-[#13131E] border border-[#1E1E2E] rounded-2xl p-6 flex gap-6 items-start reveal opacity-0 translate-y-6" style={{ transitionDelay: `${i * 50}ms` }}>
                                <div className="w-16 h-16 shrink-0 rounded-full border-[4px] flex items-center justify-center font-bold text-white font-mono" style={{ borderColor: `${m.color}40`, borderTopColor: m.color }}>
                                    {m.val}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-white font-semibold">{m.name}</h4>
                                        <span className="font-mono text-[10px] text-[#6C63FF] bg-[#6C63FF]/10 px-2 py-0.5 rounded">{m.form}</span>
                                    </div>
                                    <p className="text-[#A0A0C0] text-sm leading-relaxed">{m.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 7 - AI Layer */}
            <section id="ai" className="py-24 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_50%,#1A1040_0%,#0A0A0F_70%)] z-0" />
                <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-16 relative z-10 items-center">

                    <div className="lg:w-1/2 w-full bg-[#040408] border border-[#1E1E2E] rounded-[16px] overflow-hidden shadow-2xl reveal opacity-0 translate-y-6">
                        <div className="flex items-center gap-4 px-5 py-4 border-b border-[#1E1E2E]/50">
                            <div className="flex gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#FF5F58]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#28CA41]"></span>
                            </div>
                            <span className="font-mono text-[13px] text-[#5A5A7A] tracking-wide">insights_engine.sh</span>
                        </div>
                        <div className="p-8 overflow-y-auto overflow-x-hidden text-[13px] font-mono leading-[1.6] bg-[#040408]">
                            <p className="text-[#5A5A7A] mb-4">// Scanning dependency graph...</p>
                            <br />
                            <p className="text-[#22C55E] mb-4">DONE: Analysis complete (1.2s)</p>
                            <br />
                            <pre className="whitespace-pre-wrap break-all leading-loose"><code><span className="text-[#6C63FF]">&#123;</span><span className="text-[#F59E0B]">"risk_alert"</span>: <span className="text-[#6C63FF]">"God Service Detected"</span>,<span className="text-[#F59E0B]">"target"</span>: <span className="text-[#A0A0C0]">"AuthManager.java"</span>,<span className="text-[#F59E0B]">"severity"</span>: <span className="text-[#FF4C6A]">"CRITICAL"</span>,<span className="text-[#F59E0B]">"structural_entropy"</span>: <span className="text-[#22C55E]">0.89</span>,<span className="text-[#F59E0B]">"refactor_plan"</span>: [<span className="text-[#A0A0C0]">"Extract PermissionHandler"</span>,<span className="text-[#A0A0C0]">"Decouple TokenValidator"</span>]<span className="text-[#6C63FF]">&#125;</span>

                                <span className="text-[#6C63FF] animate-pulse">_</span></code></pre>
                        </div>
                    </div>

                    <div className="lg:w-1/2 reveal opacity-0 translate-y-6" style={{ transitionDelay: '200ms' }}>
                        <h2 className="text-[36px] font-bold text-white mb-4">AI That Reasons Over Structure, Not Code</h2>
                        <p className="text-[#A0A0C0] text-lg mb-8">The AI never sees your source code. It receives a structured architecture summary and produces strictly typed JSON insights — reproducible, auditable, deterministic.</p>

                        <div className="space-y-6">
                            {[
                                { icon: <ShieldAlert className="text-[#FF4C6A]" />, title: 'Risk Alert Engine', desc: 'Detects god services, high coupling, circular chains.' },
                                { icon: <Boxes className="text-[#00D4FF]" />, title: 'Bottleneck Prediction', desc: 'Identifies nodes that are structural single points of failure.' },
                                { icon: <TargetBoundaryIcon className="text-[#A855F7]" />, title: 'Missing Boundary Detection', desc: 'Flags architectural gaps like direct DB access from clients.' },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-[#13131E] border border-[#1E1E2E] flex items-center justify-center shrink-0">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold">{item.title}</h4>
                                        <p className="text-[#A0A0C0] text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 8 - Timeline */}
            <section className="py-24 px-6 border-t border-[#1E1E2E]">
                <div className="max-w-[1200px] mx-auto text-center reveal opacity-0 translate-y-6">
                    <h2 className="text-[36px] font-bold text-white mb-4">Architecture Observability Over Time</h2>
                    <p className="text-[#A0A0C0] max-w-2xl mx-auto mb-16">Every scan creates a snapshot. Compare structural changes, track dependency drift, and watch your complexity score evolve over the lifecycle of your product.</p>

                    <div className="relative pt-10 pb-4">
                        {/* Timeline Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-[#1E1E2E] -translate-y-1/2"></div>

                        <div className="flex justify-between relative z-10">
                            {['v1.0', 'v1.4', 'v2.0', 'v2.3(Current)'].map((ver, i) => (
                                <div key={ver} className="flex flex-col items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 ${i === 3 ? 'border-[#6C63FF] bg-[#0A0A0F]' : 'border-[#1E1E2E] bg-[#1E1E2E]'}`}></div>
                                    <span className={`font-mono text-sm ${i === 3 ? 'text-white font-bold' : 'text-[#5A5A7A]'}`}>{ver}</span>
                                </div>
                            ))}
                        </div>

                        {/* Delta indicator mock */}
                        <div className="absolute top-4 left-[35%] w-[100px] bg-[#22C55E]/10 text-[#22C55E] text-[10px] font-mono px-2 py-1 rounded border border-[#22C55E]/20 text-center">
                            -2 Circular Deps
                        </div>
                        <div className="absolute bottom-4 right-[25%] w-[100px] bg-[#FF4C6A]/10 text-[#FF4C6A] text-[10px] font-mono px-2 py-1 rounded border border-[#FF4C6A]/20 text-center">
                            Complexity ↑ 12%
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 11 - Final CTA */}
            <section className="py-32 px-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_50%,#1A1040_0%,#0A0A0F_80%)] text-center border-t border-[#1E1E2E]">
                <div className="max-w-[800px] mx-auto relative z-10 reveal opacity-0 translate-y-6">
                    <h2 className="text-5xl sm:text-[64px] font-extrabold text-white leading-tight mb-6">
                        Your codebase has a shape. <br /> Find out what it looks like.
                    </h2>
                    <p className="text-[#A0A0C0] text-lg mb-10">
                        Connect your first repository in under 60 seconds. No code stored. No agents. Just deep structural insight.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                        <Button size="lg" className="bg-[#6C63FF] hover:bg-[#6C63FF]/90 text-white rounded-xl h-14 px-10 text-base shadow-[0_0_24px_rgba(108,99,255,0.4)]" asChild>
                            <Link href="/auth/signup">Connect Repo for Free</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="h-14 px-8 rounded-xl border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10 bg-transparent text-base">
                            Read the Docs
                        </Button>
                    </div>
                    <p className="text-[#5A5A7A] text-xs font-medium">SOC-2 Ready · Isolated Execution · No Code Retention</p>
                </div>
            </section>

            {/* SECTION 12 - Footer */}
            <footer className="bg-[#07070E] py-16 px-6 border-t border-[#1A1A2A]">
                <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Hexagon className="h-5 w-5 text-[#6C63FF] fill-[#6C63FF]/20" />
                            <span className="text-white font-semibold">ArchSight</span>
                        </div>
                        <p className="text-[#5A5A7A] text-sm mb-6">Architecture observability<br />for modern engineering.</p>
                        <div className="flex gap-4">
                            <Github className="w-5 h-5 text-[#5A5A7A] hover:text-white cursor-pointer" />
                            <TargetBoundaryIcon className="w-5 h-5 text-[#5A5A7A] hover:text-white cursor-pointer" />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Product</h4>
                        <ul className="space-y-3 text-sm text-[#A0A0C0]">
                            <li><a href="#" className="hover:text-white transition-colors">How it Works</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Company</h4>
                        <ul className="space-y-3 text-sm text-[#A0A0C0]">
                            <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Developers</h4>
                        <ul className="space-y-3 text-sm text-[#A0A0C0]">
                            <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">GitHub App Setup</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">GitLab OAuth</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">System Status</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-[1200px] mx-auto pt-8 border-t border-[#1A1A2A] text-center md:text-left text-[#3A3A5A] text-xs">
                    © 2026 ArchSight Inc. · Privacy Policy · Terms of Service
                </div>
            </footer>
        </div>
    );
}

function TargetBoundaryIcon(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
}
