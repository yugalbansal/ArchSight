"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Filter, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LogLevel = "info" | "warning" | "error" | "critical";

export interface ScanLog {
  id: string;
  timestamp?: string;
  level: LogLevel;
  category: string;
  title: string;
  message: string;
  affectedNodes?: string[];
  recommendation?: string;
  tags?: string[];
  metric?: string | number;
}

type Filters = {
  level: string[];
  category: string[];
};

const levelStyles: Record<LogLevel, string> = {
  info: "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30",
  warning: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
  error: "bg-[#FF6B35]/10 text-[#FF6B35] border-[#FF6B35]/30",
  critical: "bg-[#FF4C6A]/10 text-[#FF4C6A] border-[#FF4C6A]/30",
};

const levelDot: Record<LogLevel, string> = {
  info: "bg-[#00D4FF]",
  warning: "bg-[#F59E0B]",
  error: "bg-[#FF6B35]",
  critical: "bg-[#FF4C6A]",
};

function LogRow({
  log,
  expanded,
  onToggle,
}: {
  log: ScanLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <motion.button
        onClick={onToggle}
        className="w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.03] border-b border-[#1E1E2E] focus:outline-none"
        layout
      >
        <div className="flex items-start gap-3">
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            className="mt-0.5 shrink-0"
          >
            <ChevronDown className="h-3.5 w-3.5 text-[#5A5A7A]" />
          </motion.div>

          {/* Level dot */}
          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${levelDot[log.level]}`} />

          {/* Level badge */}
          <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border font-mono ${levelStyles[log.level]}`}>
            {log.level}
          </span>

          {/* Category */}
          <span className="shrink-0 text-[11px] font-mono text-[#5A5A7A] min-w-[90px]">
            {log.category}
          </span>

          {/* Title */}
          <span className="flex-1 text-sm font-medium text-white truncate">
            {log.title}
          </span>

          {/* Metric */}
          {log.metric !== undefined && (
            <span className="shrink-0 font-mono text-xs text-[#5A5A7A]">{log.metric}</span>
          )}
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-[#1E1E2E] bg-[#0D0D15]"
          >
            <div className="px-8 py-5 space-y-4">
              {/* Message */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A] mb-2">Description</p>
                <p className="text-sm text-[#A0A0C0] leading-relaxed">{log.message}</p>
              </div>

              {/* Recommendation */}
              {log.recommendation && (
                <div className="bg-[#6C63FF]/5 border border-[#6C63FF]/20 rounded-xl p-4">
                  <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#6C63FF] mb-2">💡 Fix Recommendation</p>
                  <p className="text-sm text-[#A0A0C0] leading-relaxed">{log.recommendation}</p>
                </div>
              )}

              {/* Affected Nodes */}
              {log.affectedNodes && log.affectedNodes.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A] mb-2">Affected Components</p>
                  <div className="flex flex-wrap gap-2">
                    {log.affectedNodes.slice(0, 8).map((node, i) => (
                      <span key={i} className="text-[11px] font-mono bg-[#1E1E2E] text-[#A0A0C0] px-2.5 py-1 rounded-lg border border-[#2E2E3E]">
                        {node}
                      </span>
                    ))}
                    {log.affectedNodes.length > 8 && (
                      <span className="text-[11px] font-mono text-[#5A5A7A] px-2 py-1">
                        +{log.affectedNodes.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {log.tags && log.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {log.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono bg-[#1E1E2E] text-[#5A5A7A] px-2 py-0.5 rounded-md border border-[#1E1E2E]">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FilterPanel({ filters, onChange, logs }: {
  filters: Filters;
  onChange: (f: Filters) => void;
  logs: ScanLog[];
}) {
  const levels = Array.from(new Set(logs.map((l) => l.level)));
  const categories = Array.from(new Set(logs.map((l) => l.category)));

  const toggle = (cat: keyof Filters, val: string) => {
    const current = filters[cat];
    onChange({ ...filters, [cat]: current.includes(val) ? current.filter((x) => x !== val) : [...current, val] });
  };

  const hasActive = Object.values(filters).some((g) => g.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-5 overflow-y-auto bg-[#0A0A0F] p-4 border-r border-[#1E1E2E]"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white uppercase tracking-widest">Filters</span>
        {hasActive && (
          <button onClick={() => onChange({ level: [], category: [] })} className="text-[10px] text-[#6C63FF] hover:text-white transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Level filter */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A]">Level</p>
        {levels.map((level) => {
          const sel = filters.level.includes(level);
          return (
            <motion.button key={level} whileHover={{ x: 2 }} onClick={() => toggle("level", level)}
              className={`flex w-full items-center justify-between gap-2 border rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${sel ? "border-[#6C63FF]/50 bg-[#6C63FF]/10 text-white" : "border-[#1E1E2E] text-[#5A5A7A] hover:border-[#2E2E3E] hover:text-white"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${levelDot[level as LogLevel] || "bg-white"}`} />
                <span className="capitalize">{level}</span>
              </div>
              {sel && <Check className="h-3 w-3 text-[#6C63FF]" />}
            </motion.button>
          );
        })}
      </div>

      {/* Category filter */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A]">Category</p>
        {categories.map((cat) => {
          const sel = filters.category.includes(cat);
          return (
            <motion.button key={cat} whileHover={{ x: 2 }} onClick={() => toggle("category", cat)}
              className={`flex w-full items-center justify-between gap-2 border rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${sel ? "border-[#6C63FF]/50 bg-[#6C63FF]/10 text-white" : "border-[#1E1E2E] text-[#5A5A7A] hover:border-[#2E2E3E] hover:text-white"}`}>
              <span>{cat}</span>
              {sel && <Check className="h-3 w-3 text-[#6C63FF]" />}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export function ScanLogsViewer({ logs, title = "Analysis Logs" }: { logs: ScanLog[]; title?: string }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ level: [], category: [] });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter((log) => {
      const matchText = log.title.toLowerCase().includes(q) || log.message.toLowerCase().includes(q) || log.category.toLowerCase().includes(q);
      const matchLevel = filters.level.length === 0 || filters.level.includes(log.level);
      const matchCat = filters.category.length === 0 || filters.category.includes(log.category);
      return matchText && matchLevel && matchCat;
    });
  }, [logs, search, filters]);

  const activeFilters = filters.level.length + filters.category.length;

  return (
    <div className="bg-[#0A0A0F] rounded-2xl border border-[#1E1E2E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1E1E2E] bg-[#0D0D15]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-[11px] text-[#5A5A7A] font-mono">{filtered.length} of {logs.length} entries</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative h-8 border-[#1E1E2E] text-xs ${showFilters ? "bg-[#6C63FF]/10 border-[#6C63FF]/30 text-[#6C63FF]" : "text-[#5A5A7A] hover:text-white hover:bg-white/5 bg-transparent"}`}
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filters
              {activeFilters > 0 && (
                <span className="ml-1.5 bg-[#FF4C6A] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </Button>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5A5A7A] pointer-events-none" />
          <Input
            placeholder="Search by title, message, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-9 text-xs bg-[#0A0A0F] border-[#1E1E2E] text-white placeholder:text-[#3E3E5E] focus-visible:ring-[#6C63FF]/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-[#5A5A7A] hover:text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-0" style={{ maxHeight: "600px" }}>
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              key="filters"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden shrink-0"
            >
              <FilterPanel filters={filters} onChange={setFilters} logs={logs} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filtered.length > 0 ? (
              filtered.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, delay: i * 0.015 }}
                >
                  <LogRow
                    log={log}
                    expanded={expandedId === log.id}
                    onToggle={() => setExpandedId((cur) => (cur === log.id ? null : log.id))}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 text-center">
                <p className="text-[#5A5A7A] text-sm font-mono">No logs match your search.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
