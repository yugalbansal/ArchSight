import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Zap, Github, Twitter, Linkedin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: "🔍", title: "Repository Intelligence", desc: "Connect GitHub, GitLab or Bitbucket. We parse your entire codebase automatically." },
  { icon: "🕸", title: "Live Architecture Graph", desc: "Visual service maps with nodes for APIs, DBs, Queues, Workers, and LLM providers." },
  { icon: "🤖", title: "AI Engineering Insights", desc: "Detect circular deps, god services, N+1 queries, bottlenecks and more." },
  { icon: "💰", title: "LLM Cost Engine", desc: "Estimate your monthly AI spend per endpoint. Get optimization suggestions." },
  { icon: "📊", title: "Change Monitoring", desc: "Track architecture complexity over time. See diffs between scans." },
  { icon: "🔐", title: "Team Ready", desc: "Invite your team. Share architecture snapshots." },
];

const steps = [
  { num: 1, title: "Connect your repository" },
  { num: 2, title: "We scan and parse your code" },
  { num: 3, title: "Architecture graph is generated" },
  { num: 4, title: "AI analyzes structure" },
  { num: 5, title: "View your dashboard" },
];

const pricing = [
  {
    name: "Starter",
    price: "Free",
    desc: "For individual developers",
    popular: false,
    features: [
      { text: "1 repository", included: true },
      { text: "3 scans / month", included: true },
      { text: "Basic insights", included: true },
      { text: "LLM Cost Engine", included: false },
      { text: "Team access", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$29",
    desc: "For serious engineers",
    popular: true,
    features: [
      { text: "10 repositories", included: true },
      { text: "Unlimited scans", included: true },
      { text: "AI insights", included: true },
      { text: "LLM Cost Engine", included: true },
      { text: "Change monitoring", included: true },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Team",
    price: "$99",
    desc: "For engineering teams",
    popular: false,
    features: [
      { text: "Unlimited repositories", included: true },
      { text: "Unlimited scans", included: true },
      { text: "AI insights", included: true },
      { text: "LLM Cost Engine", included: true },
      { text: "Team access & monitoring", included: true },
      { text: "Priority support", included: true },
    ],
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/8 blur-[120px] animate-pulse-glow" />
      </div>

      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'radial-gradient(circle, hsl(240 5% 30%) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-4 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-foreground">ArchSight</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-muted-foreground border border-white/10" asChild>
            <Link to="/auth/login">Sign In</Link>
          </Button>
          <Button className="gradient-primary text-primary-foreground border-0" asChild>
            <Link to="/auth/signup">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
            <Badge className="glass text-accent border-accent/20 text-xs px-3 py-1">AI Powered</Badge>
            <Badge className="glass text-primary border-primary/20 text-xs px-3 py-1">GitHub Connected</Badge>
            <Badge className="glass text-secondary border-secondary/20 text-xs px-3 py-1">Real-time Analysis</Badge>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text leading-tight">
            Your Codebase.<br />Understood.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            ArchSight connects to your repo and automatically generates live architecture diagrams, AI insights, and LLM cost analysis.
          </p>
          <div className="flex items-center justify-center gap-4 mb-16">
            <Button size="lg" className="gradient-primary text-primary-foreground border-0 px-8 text-base" asChild>
              <Link to="/auth/signup">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="ghost" className="border border-white/10 text-foreground px-8 text-base" asChild>
              <Link to="/dashboard">View Demo</Link>
            </Button>
          </div>

          {/* Floating mockup */}
          <div className="glass p-6 max-w-3xl mx-auto animate-float">
            <div className="bg-background/50 rounded-lg p-8 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-4 text-xs text-muted-foreground">ArchSight — backend-api</span>
              </div>
              <svg viewBox="0 0 600 200" className="w-full h-auto">
                {[
                  { x: 280, y: 20, label: "API Gateway", color: "56,189,248" },
                  { x: 100, y: 100, label: "UserService", color: "99,102,241" },
                  { x: 280, y: 100, label: "AuthService", color: "99,102,241" },
                  { x: 460, y: 100, label: "EmailWorker", color: "251,146,60" },
                  { x: 60, y: 170, label: "PostgreSQL", color: "34,197,94" },
                  { x: 240, y: 170, label: "Redis", color: "250,204,21" },
                  { x: 420, y: 170, label: "OpenAI", color: "168,85,247" },
                ].map((n, i) => (
                  <g key={i}>
                    <rect x={n.x} y={n.y} width={120} height={32} rx={8} fill={`rgba(${n.color},0.15)`} stroke={`rgba(${n.color},0.4)`} strokeWidth={1} />
                    <text x={n.x + 60} y={n.y + 20} textAnchor="middle" fill={`rgb(${n.color})`} fontSize={10} fontFamily="Inter">{n.label}</text>
                  </g>
                ))}
                <line x1="340" y1="52" x2="160" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <line x1="340" y1="52" x2="340" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <line x1="340" y1="52" x2="520" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <line x1="160" y1="132" x2="120" y2="170" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <line x1="160" y1="132" x2="300" y2="170" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <line x1="340" y1="132" x2="120" y2="170" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <line x1="340" y1="132" x2="480" y2="170" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">Everything you need</h2>
          <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">Powerful tools to understand, monitor, and optimize your architecture.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="glass p-6 hover:bg-white/[0.08] transition-all duration-300 group cursor-default">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">How it works</h2>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center flex-1 relative">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg mb-4">{s.num}</div>
                <p className="text-sm text-muted-foreground max-w-[140px]">{s.title}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px bg-gradient-to-r from-primary/40 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">Simple pricing</h2>
          <p className="text-muted-foreground text-center mb-16">Start free, scale when you're ready.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((p, i) => (
              <div key={i} className={`glass p-8 flex flex-col relative ${p.popular ? 'gradient-border ring-1 ring-primary/30' : ''}`}>
                {p.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground border-0 text-xs">Most Popular</Badge>
                )}
                <h3 className="text-xl font-bold text-foreground mb-1">{p.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">{p.price}</span>
                  {p.price !== "Free" && <span className="text-muted-foreground">/mo</span>}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      {f.included ? <Check className="h-4 w-4 text-accent" /> : <X className="h-4 w-4 text-muted-foreground/40" />}
                      <span className={f.included ? 'text-muted-foreground' : 'text-muted-foreground/40'}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <Button className={p.popular ? 'gradient-primary text-primary-foreground border-0 w-full' : 'w-full border border-white/10'} variant={p.popular ? "default" : "ghost"} asChild>
                  <Link to="/auth/signup">Get Started</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">ArchSight</span>
          </div>
          <p className="text-sm text-muted-foreground">Built for developers who care about architecture.</p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <Github className="h-5 w-5 hover:text-foreground transition-colors cursor-pointer" />
            <Twitter className="h-5 w-5 hover:text-foreground transition-colors cursor-pointer" />
            <Linkedin className="h-5 w-5 hover:text-foreground transition-colors cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
