import { FolderGit2, Clock, Lightbulb, DollarSign, ArrowRight, Loader2, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { recentScans, insights } from "@/data/mockData";
import { Link } from "react-router-dom";

const statCards = [
  { label: "Total Repos", value: "4", icon: FolderGit2, color: "text-primary" },
  { label: "Last Scan", value: "2h ago", icon: Clock, color: "text-accent" },
  { label: "Active Insights", value: "12", icon: Lightbulb, color: "text-yellow-400" },
  { label: "Est. LLM Cost", value: "$847", icon: DollarSign, color: "text-green-400" },
];

const severityColor = { critical: "bg-red-500/20 text-red-400 border-red-500/30", warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", info: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
const statusIcon = { completed: <CheckCircle2 className="h-4 w-4 text-green-400" />, in_progress: <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />, failed: <XCircle className="h-4 w-4 text-red-400" /> };

const Dashboard = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Good morning, Alex 👋</h1>
      <p className="text-muted-foreground text-sm">Here's your architecture overview.</p>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((s) => (
        <div key={s.label} className="glass p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <s.icon className={`h-4 w-4 ${s.color}`} />
          </div>
          <p className="text-2xl font-bold text-foreground">{s.value}</p>
        </div>
      ))}
    </div>

    <div className="grid lg:grid-cols-3 gap-6">
      {/* Recent Scans */}
      <div className="lg:col-span-2 glass p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-lg font-semibold text-foreground">Recent Scans</h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">View all</Button>
        </div>
        <div className="p-5">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Repository</TableHead>
                <TableHead className="text-muted-foreground">Time</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Insights</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentScans.map((s, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="text-foreground font-medium">{s.org} / {s.repo}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.time}</TableCell>
                  <TableCell><div className="flex items-center gap-1.5">{statusIcon[s.status]}<span className="text-sm text-muted-foreground capitalize">{s.status.replace('_', ' ')}</span></div></TableCell>
                  <TableCell className="text-right text-muted-foreground">{s.insights || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Health Score */}
      <div className="space-y-6">
        <div className="glass p-6 flex flex-col items-center">
          <h3 className="text-sm text-muted-foreground mb-4">Architecture Health</h3>
          <div className="relative w-32 h-32 mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(39 100% 50%)" strokeWidth="8" strokeDasharray={`${74 * 2.64} ${100 * 2.64}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-foreground">74</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Needs Attention</Badge>
        </div>

        {/* Quick Actions */}
        <div className="glass p-5 space-y-3">
          <h3 className="text-sm text-muted-foreground mb-2">Quick Actions</h3>
          <Button className="w-full gradient-primary text-primary-foreground border-0 justify-between" asChild>
            <Link to="/repositories">Scan New Repo <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button variant="ghost" className="w-full border border-white/10 text-foreground justify-between" asChild>
            <Link to="/insights">View All Insights <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>

    {/* Recent Insights */}
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Recent Insights</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {insights.slice(0, 3).map((ins) => (
          <div key={ins.id} className="glass p-5">
            <div className="flex items-center gap-2 mb-3">
              <Badge className={severityColor[ins.severity] + " text-xs"}>{ins.severity}</Badge>
              <span className="text-xs text-muted-foreground">{ins.repo}</span>
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">{ins.type}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ins.suggestion}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default Dashboard;
