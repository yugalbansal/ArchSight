import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { repositories, insights, costBreakdown, scanHistory, architectureNodes, architectureEdges, services } from "@/data/mockData";
import { ZoomIn, ZoomOut, RotateCcw, Download, Clock, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const severityColor = { critical: "bg-red-500/20 text-red-400 border-red-500/30", warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", info: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
const nodeTypeColors: Record<string, string> = { api: "bg-sky-400", service: "bg-indigo-400", database: "bg-green-400", cache: "bg-yellow-400", llm: "bg-purple-400", external: "bg-sky-400", worker: "bg-orange-400" };

const RepositoryDetail = () => {
  const { id } = useParams();
  const repo = repositories.find((r) => r.id === id) || repositories[0];
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { toast } = useToast();

  const stats = [
    { label: "Services", value: 12 }, { label: "Routes", value: 47 }, { label: "DB Models", value: 8 },
    { label: "Queue Jobs", value: 4 }, { label: "External APIs", value: 6 }, { label: "LLM Calls", value: 23 },
  ];
  const stack = ["Node.js", "Express", "PostgreSQL", "Redis", "OpenAI", "Stripe API"];
  const repoInsights = insights.filter((i) => i.repo === repo.name || i.repo === "backend-api");
  const node = selectedNode ? architectureNodes.find((n) => n.id === selectedNode) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{repo.org} / {repo.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>Branch: {repo.branch}</span>
            <span>•</span>
            <span>Last scan: {repo.lastScanned}</span>
          </div>
        </div>
        <Button className="gradient-primary text-primary-foreground border-0" onClick={() => toast({ title: "Scan started!" })}>Scan Now</Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-white/5 border border-white/10">
          {["overview", "architecture", "insights", "cost", "history"].map((t) => (
            <TabsTrigger key={t} value={t} className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary capitalize text-muted-foreground">{t === "cost" ? "Cost Analysis" : t}</TabsTrigger>
          ))}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="glass p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {stack.map((s) => <Badge key={s} className="glass text-foreground border-white/10 text-xs">{s}</Badge>)}
          </div>
          <div className="glass overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Service</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Path</TableHead>
                  <TableHead className="text-muted-foreground">Deps</TableHead>
                  <TableHead className="text-muted-foreground">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.name} className="border-white/5">
                    <TableCell className="text-foreground font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.type}</TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">{s.path}</TableCell>
                    <TableCell className="text-muted-foreground">{s.deps}</TableCell>
                    <TableCell><Badge className={severityColor[s.risk] + " text-[10px]"}>{s.risk}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Architecture Graph */}
        <TabsContent value="architecture" className="mt-6">
          <div className="flex gap-2 mb-4">
            {[{ icon: ZoomIn, label: "Zoom In" }, { icon: ZoomOut, label: "Zoom Out" }, { icon: RotateCcw, label: "Reset" }, { icon: Download, label: "Export PNG" }].map((b) => (
              <Button key={b.label} variant="ghost" size="sm" className="border border-white/10 text-muted-foreground text-xs gap-1.5">
                <b.icon className="h-3.5 w-3.5" /> {b.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-4">
            <div className="glass flex-1 p-4 relative" style={{ minHeight: 480 }}>
              <svg viewBox="0 0 900 460" className="w-full h-full">
                {architectureEdges.map((e, i) => {
                  const from = architectureNodes.find((n) => n.id === e.from)!;
                  const to = architectureNodes.find((n) => n.id === e.to)!;
                  return <line key={i} x1={from.x + 70} y1={from.y + 25} x2={to.x + 70} y2={to.y + 25} stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />;
                })}
                {architectureNodes.map((n) => (
                  <g key={n.id} onClick={() => setSelectedNode(n.id === selectedNode ? null : n.id)} className="cursor-pointer">
                    <rect x={n.x} y={n.y} width={140} height={50} rx={12} fill={`rgba(${n.color},0.1)`} stroke={`rgba(${n.color},${selectedNode === n.id ? '0.8' : '0.3'})`} strokeWidth={selectedNode === n.id ? 2 : 1} />
                    {selectedNode === n.id && <rect x={n.x - 4} y={n.y - 4} width={148} height={58} rx={14} fill="none" stroke={`rgba(${n.color},0.2)`} strokeWidth={1} />}
                    <text x={n.x + 70} y={n.y + 22} textAnchor="middle" fill={`rgb(${n.color})`} fontSize={12} fontWeight="600" fontFamily="Inter">{n.label}</text>
                    <text x={n.x + 70} y={n.y + 38} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={9} fontFamily="Inter">{n.type}</text>
                  </g>
                ))}
              </svg>
              {/* Legend */}
              <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 text-[10px]">
                {Object.entries(nodeTypeColors).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-muted-foreground capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </div>
            {node && (
              <div className="glass w-72 p-5 space-y-4 shrink-0 hidden lg:block">
                <h3 className="text-foreground font-semibold">{node.label}</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>Type: <span className="text-foreground capitalize">{node.type}</span></p>
                  <p>File: <span className="text-foreground font-mono text-xs">src/{node.type}s/{node.id}.ts</span></p>
                  <p className="font-medium text-foreground mt-4 mb-1">Connected to:</p>
                  <ul className="space-y-1">
                    {architectureEdges.filter((e) => e.from === node.id || e.to === node.id).map((e, i) => {
                      const other = e.from === node.id ? e.to : e.from;
                      return <li key={i} className="text-xs">• {architectureNodes.find((n) => n.id === other)?.label}</li>;
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights" className="mt-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {["All", "Critical", "Warning", "Info"].map((f) => (
              <Button key={f} variant="ghost" size="sm" className="border border-white/10 text-muted-foreground text-xs">{f}</Button>
            ))}
          </div>
          <div className="space-y-3">
            {repoInsights.map((ins) => (
              <div key={ins.id} className="glass p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={severityColor[ins.severity] + " text-xs"}>{ins.severity}</Badge>
                  <span className="text-sm font-semibold text-foreground">{ins.type}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Affected: <span className="text-foreground">{ins.service}</span></p>
                <p className="text-sm text-muted-foreground">{ins.suggestion}</p>
                <Button variant="ghost" size="sm" className="mt-3 text-primary text-xs border border-primary/20">View in Graph</Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="cost" className="mt-6 space-y-6">
          <div className="glass p-6">
            <h3 className="text-muted-foreground text-sm mb-1">Estimated Monthly LLM Cost</h3>
            <p className="text-4xl font-bold text-foreground">$847.20</p>
          </div>
          <div className="glass overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Endpoint</TableHead>
                  <TableHead className="text-muted-foreground">Model</TableHead>
                  <TableHead className="text-muted-foreground">Avg Tokens</TableHead>
                  <TableHead className="text-muted-foreground">Calls/day</TableHead>
                  <TableHead className="text-muted-foreground text-right">Monthly Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costBreakdown.map((c) => (
                  <TableRow key={c.endpoint} className="border-white/5">
                    <TableCell className="text-foreground font-mono text-sm">{c.endpoint}</TableCell>
                    <TableCell className="text-muted-foreground">{c.model}</TableCell>
                    <TableCell className="text-muted-foreground">{c.avgTokens.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{c.callsPerDay.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-foreground font-medium">${c.monthlyCost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <h3 className="text-foreground font-semibold mb-3">AI Optimization Suggestions</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {["Switch /api/chat to Claude Haiku — save ~$380/mo", "Add Redis caching for /api/summarize — reduce calls by 60%", "Enable batch embeddings — save ~$20/mo"].map((s, i) => (
                <div key={i} className="glass p-4">
                  <p className="text-sm text-foreground">{s}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <p className="text-green-400 font-semibold">Potential savings: $487/mo</p>
            <p className="text-sm text-green-400/70">Implement the suggestions above to reduce your LLM spend by 57%.</p>
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-6">
          <div className="relative pl-8 space-y-0">
            {scanHistory.map((s, i) => (
              <div key={i} className="relative pb-8 last:pb-0">
                {i < scanHistory.length - 1 && <div className="absolute left-[-20px] top-6 w-px h-full bg-white/10" />}
                <div className="absolute left-[-24px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                <div className="glass p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{s.date}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-foreground">Services: {s.services}</span>
                    <span className="text-foreground">Insights: {s.insights}</span>
                    <span className="text-foreground">Complexity: {s.complexity}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    <span className={s.delta.services >= 0 ? "text-accent" : "text-red-400"}>
                      {s.delta.services >= 0 ? <ArrowUp className="h-3 w-3 inline" /> : <ArrowDown className="h-3 w-3 inline" />} {Math.abs(s.delta.services)} services
                    </span>
                    <span className={s.delta.insights <= 0 ? "text-accent" : "text-yellow-400"}>
                      {s.delta.insights <= 0 ? <ArrowDown className="h-3 w-3 inline" /> : <ArrowUp className="h-3 w-3 inline" />} {Math.abs(s.delta.insights)} insights
                    </span>
                    <span className="text-muted-foreground">complexity {s.delta.complexity >= 0 ? '+' : ''}{s.delta.complexity}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-3 text-primary text-xs border border-primary/20">View Snapshot</Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RepositoryDetail;
