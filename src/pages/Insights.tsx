import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { insights } from "@/data/mockData";

const severityColor = { critical: "bg-red-500/20 text-red-400 border-red-500/30", warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", info: "bg-blue-500/20 text-blue-400 border-blue-500/30" };

const Insights = () => {
  const [filter, setFilter] = useState("all");
  const counts = { critical: insights.filter((i) => i.severity === "critical").length, warning: insights.filter((i) => i.severity === "warning").length, info: insights.filter((i) => i.severity === "info").length };
  const filtered = filter === "all" ? insights : insights.filter((i) => i.severity === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Insights</h1>

      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <div className="glass px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-sm text-foreground font-medium">{counts.critical} Critical</span>
        </div>
        <div className="glass px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-sm text-foreground font-medium">{counts.warning} Warnings</span>
        </div>
        <div className="glass px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-sm text-foreground font-medium">{counts.info} Info</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "critical", "warning", "info"].map((f) => (
          <Button key={f} variant="ghost" size="sm" onClick={() => setFilter(f)} className={`border text-xs capitalize ${filter === f ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground'}`}>
            {f === "all" ? "All" : f}
          </Button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((ins) => (
          <div key={ins.id} className="glass p-5 hover:bg-white/[0.08] transition-all">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={severityColor[ins.severity] + " text-xs"}>{ins.severity}</Badge>
              <span className="text-sm font-semibold text-foreground">{ins.type}</span>
              <span className="text-xs text-muted-foreground ml-auto">{ins.repo}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Affected: <span className="text-foreground">{ins.service}</span></p>
            <p className="text-sm text-muted-foreground">{ins.suggestion}</p>
            <Button variant="ghost" size="sm" className="mt-3 text-primary text-xs border border-primary/20">View in Graph</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Insights;
