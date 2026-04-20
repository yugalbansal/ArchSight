"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderTree, Search, File, GitBranch, Import, FileOutput,
  FunctionSquare, Box, AlertTriangle, CheckCircle2,
  Activity, X, Code2, TrendingUp
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileStructureEntry {
  file: string;
  language: string;
  functions: string[];
  classes: string[];
  imports: string[];
  exports: string[];
}

interface ArchitectureNode {
  id: string;
  type: string;
  name: string;
  file: string;
  metadata: Record<string, unknown>;
  confidence: number;
}

interface NodeMetrics {
  node_id: string;
  node_type: string;
  file: string;
  fan_in: number;
  fan_out: number;
  centrality: number;
  instability: number;
  in_cycle: boolean;
  depth: number;
}

interface InsightItem {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  affected_nodes: string[];
  recommendation: string;
  triggered_by: string;
}

interface FileExplorerProps {
  fileStructure: FileStructureEntry[];
  architectureNodes?: ArchitectureNode[];
  nodeMetrics?: NodeMetrics[];
  insights?: InsightItem[];
  scanId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortenPath(fullPath: string): string {
  const parts = fullPath.split("/");
  const idx = parts.findIndex((p) => p === "extracted");
  if (idx >= 0 && idx + 1 < parts.length) return parts.slice(idx + 2).join("/");
  return parts.slice(-4).join("/");
}

type FileNodeType = { name: string; type: "file" | "folder"; extension?: string; path?: string; children?: FileNodeType[] };

function buildInteractiveFileTree(files: FileStructureEntry[]): FileNodeType[] {
  const root: FileNodeType[] = [];
  const pathMap: Record<string, FileNodeType> = {};

  for (const entry of files) {
    const shortPath = shortenPath(entry.file);
    const parts = shortPath.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const key = parts.slice(0, i + 1).join("/");

      if (!pathMap[key]) {
        const ext = isFile ? part.split(".").pop() : undefined;
        const node: FileNodeType = {
          name: part,
          type: isFile ? "file" : "folder",
          extension: ext,
          path: isFile ? entry.file : undefined,
          children: isFile ? undefined : [],
        };
        pathMap[key] = node;
        currentLevel.push(node);
      }
      if (!isFile) currentLevel = pathMap[key].children!;
    }
  }
  return root;
}

const langBadgeColor: Record<string, string> = {
  typescript: "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30",
  javascript: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
  python: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30",
  java: "bg-[#FF4C6A]/10 text-[#FF4C6A] border-[#FF4C6A]/30",
};

const severityColor: Record<string, string> = {
  critical: "#FF4C6A",
  high: "#FF6B35",
  medium: "#F59E0B",
  low: "#22C55E",
};

const categoryIcon: Record<string, LucideIcon> = {
  risk: AlertTriangle,
  performance: Activity,
  architecture: GitBranch,
  scalability: TrendingUp,
};

// ─── Interactive File Tree ────────────────────────────────────────────────────

function InteractiveFileItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileNodeType;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === "folder";
  const isSelected = node.path === selectedPath;

  const ext = node.extension || "";
  const iconColor: Record<string, string> = {
    tsx: "text-[#569cd6]", ts: "text-[#4ec9b0]", jsx: "text-[#61dafb]",
    js: "text-[#dcdcaa]", css: "text-[#c586c0]", json: "text-[#ce9178]",
    md: "text-[#6a9955]", py: "text-[#4ec9b0]", go: "text-[#61dafb]",
  };
  const fileColor = iconColor[ext] || "text-[#808080]";

  return (
    <div>
      <button
        className={`w-full flex items-center gap-1.5 py-[3px] rounded-lg text-left transition-all duration-100 group ${
          isSelected
            ? "bg-[#6C63FF]/15 border-l-2 border-[#6C63FF]"
            : "hover:bg-white/[0.04] border-l-2 border-transparent"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => {
          if (isFolder) setOpen(!open);
          else if (node.path) onSelect(node.path);
        }}
      >
        {/* Arrow for folders */}
        <span className={`w-3 h-3 flex items-center justify-center shrink-0 transition-transform duration-150 ${isFolder && open ? "rotate-90" : ""}`}>
          {isFolder ? (
            <svg width="5" height="7" viewBox="0 0 6 8" fill="none" className={isSelected ? "text-[#6C63FF]" : "text-[#5A5A7A]"}>
              <path d="M1 1L5 4L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <Code2 className={`h-2.5 w-2.5 ${fileColor} opacity-70`} />
          )}
        </span>

        {/* Folder / file icon */}
        {isFolder ? (
          <svg width="13" height="11" viewBox="0 0 16 14" fill="currentColor" className={`shrink-0 ${isSelected ? "text-[#dcb67a]" : "text-[#dcb67a]/60"}`}>
            <path d="M1.5 1C0.671573 1 0 1.67157 0 2.5V11.5C0 12.3284 0.671573 13 1.5 13H14.5C15.3284 13 16 12.3284 16 11.5V4.5C16 3.67157 15.3284 3 14.5 3H8L6.5 1H1.5Z" />
          </svg>
        ) : (
          <File className={`h-3 w-3 shrink-0 ${fileColor} opacity-70`} />
        )}

        <span className={`font-mono text-[12px] truncate transition-colors ${
          isSelected ? "text-white font-semibold" : isFolder ? "text-[#A0A0C0] group-hover:text-white" : "text-[#7A7A9A] group-hover:text-white"
        }`}>
          {node.name}
        </span>

        {isSelected && <span className="ml-auto mr-2 w-1.5 h-1.5 rounded-full bg-[#6C63FF] shrink-0" />}
      </button>

      {isFolder && open && node.children && (
        <div>
          {node.children.map((child, i) => (
            <InteractiveFileItem key={i} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── File Detail Panel ────────────────────────────────────────────────────────

function FileDetailPanel({
  filePath,
  fileEntry,
  nodes,
  metrics,
  insights,
}: {
  filePath: string;
  fileEntry: FileStructureEntry | undefined;
  nodes: ArchitectureNode[];
  metrics: NodeMetrics[];
  insights: InsightItem[];
}) {
  if (!fileEntry) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#3E3E5E]">
        <FolderTree className="w-10 h-10 opacity-30" />
        <p className="text-sm font-mono">Select a file to inspect</p>
      </div>
    );
  }

  const shortPath = shortenPath(filePath);
  const relatedNodes = nodes.filter((n) => n.file === filePath || shortenPath(n.file) === shortPath);
  const relatedMetrics = metrics.filter((m) => relatedNodes.some((n) => n.id === m.node_id || shortenPath(m.file) === shortPath));
  const relatedInsights = insights.filter((ins) =>
    ins.affected_nodes.some((nodeId) => relatedNodes.some((n) => n.id === nodeId))
  );

  const issues = relatedInsights.filter((i) => ["critical", "high", "medium"].includes(i.severity));
  const goodPoints: string[] = [];
  if (relatedMetrics.some((m) => m.fan_in > 3)) goodPoints.push("High reusability — used by multiple components");
  if (relatedMetrics.every((m) => !m.in_cycle)) goodPoints.push("No circular dependencies detected");
  if (relatedMetrics.some((m) => m.instability < 0.3)) goodPoints.push("Stable module — unlikely to need frequent changes");
  if (fileEntry.exports.length > 0) goodPoints.push(`Exports ${fileEntry.exports.length} symbol${fileEntry.exports.length > 1 ? "s" : ""} — good modularity`);

  // Determine purpose
  const purposeParts: string[] = [];
  if (relatedNodes.some((n) => n.type === "http_endpoint")) purposeParts.push("🔗 Defines HTTP API endpoints");
  if (relatedNodes.some((n) => n.type === "db_operation")) purposeParts.push("🗄️ Performs database operations");
  if (relatedNodes.some((n) => n.type === "business_logic_service")) purposeParts.push("⚙️ Contains core business logic / service layer");
  if (relatedNodes.some((n) => n.type === "external_service")) purposeParts.push("🌐 Integrates with external services or APIs");
  if (relatedNodes.some((n) => n.type === "queue_worker")) purposeParts.push("📬 Implements background job / queue worker");
  if (fileEntry.classes.length > 0 && purposeParts.length === 0) purposeParts.push(`📦 Defines ${fileEntry.classes.length} class${fileEntry.classes.length > 1 ? "es" : ""}`);
  if (fileEntry.functions.length > 0 && purposeParts.length === 0) purposeParts.push(`⚡ Contains ${fileEntry.functions.length} utility function${fileEntry.functions.length > 1 ? "s" : ""}`);
  if (purposeParts.length === 0) purposeParts.push("📄 Supporting module or configuration file");

  return (
    <div className="flex-1 overflow-y-auto space-y-5 p-5">
      {/* File header */}
      <div>
        <div className="flex items-start gap-3 mb-1">
          <File className="w-5 h-5 text-[#5A5A7A] mt-0.5 shrink-0" />
          <div>
            <p className="text-white font-semibold font-mono text-sm break-all">{shortPath}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${langBadgeColor[fileEntry.language] || "text-[#5A5A7A] border-[#2E2E3E]"}`}>
                {fileEntry.language}
              </span>
              {relatedNodes.length > 0 && (
                <span className="text-[10px] font-mono text-[#5A5A7A]">{relatedNodes.length} semantic node{relatedNodes.length > 1 ? "s" : ""}</span>
              )}
              {issues.length > 0 && (
                <span className="text-[10px] font-mono text-[#FF4C6A] flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> {issues.length} issue{issues.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Purpose */}
      <div className="bg-[#0D0D18] border border-[#1E1E2E] rounded-xl p-4">
        <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A] mb-3">Purpose</p>
        <div className="space-y-2">
          {purposeParts.map((p, i) => (
            <p key={i} className="text-sm text-[#A0A0C0]">{p}</p>
          ))}
        </div>
      </div>

      {/* Metrics */}
      {relatedMetrics.length > 0 && (
        <div className="bg-[#0D0D18] border border-[#1E1E2E] rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A] mb-3">Structural Metrics</p>
          <div className="grid grid-cols-2 gap-3">
            {relatedMetrics.slice(0, 1).map((m, i) => (
              <div key={i} className="contents">
                <div className="bg-[#0A0A0F] rounded-lg p-3 border border-[#1E1E2E]">
                  <p className="text-[10px] text-[#5A5A7A] mb-1">Fan-In</p>
                  <p className="text-lg font-bold text-white">{m.fan_in}</p>
                  <p className="text-[10px] text-[#5A5A7A]">incoming deps</p>
                </div>
                <div className="bg-[#0A0A0F] rounded-lg p-3 border border-[#1E1E2E]">
                  <p className="text-[10px] text-[#5A5A7A] mb-1">Fan-Out</p>
                  <p className="text-lg font-bold text-white">{m.fan_out}</p>
                  <p className="text-[10px] text-[#5A5A7A]">outgoing deps</p>
                </div>
                <div className="bg-[#0A0A0F] rounded-lg p-3 border border-[#1E1E2E]">
                  <p className="text-[10px] text-[#5A5A7A] mb-1">Instability</p>
                  <p className={`text-lg font-bold ${m.instability > 0.7 ? "text-[#FF4C6A]" : m.instability > 0.4 ? "text-[#F59E0B]" : "text-[#22C55E]"}`}>
                    {(m.instability * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="bg-[#0A0A0F] rounded-lg p-3 border border-[#1E1E2E]">
                  <p className="text-[10px] text-[#5A5A7A] mb-1">In Cycle</p>
                  <p className={`text-lg font-bold ${m.in_cycle ? "text-[#FF4C6A]" : "text-[#22C55E]"}`}>
                    {m.in_cycle ? "Yes ⚠️" : "No ✓"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A]">Issues Found ({issues.length})</p>
          {issues.map((ins, i) => {
            const color = severityColor[ins.severity] || "#A0A0C0";
            const Icon = categoryIcon[ins.category] || AlertTriangle;
            return (
              <div key={i} className="bg-[#0D0D18] border rounded-xl p-4" style={{ borderColor: `${color}25` }}>
                <div className="flex items-start gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
                  <p className="text-sm font-semibold text-white leading-tight">{ins.title}</p>
                  <span className="ml-auto shrink-0 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ color, background: `${color}15` }}>
                    {ins.severity}
                  </span>
                </div>
                <p className="text-xs text-[#A0A0C0] leading-relaxed mb-3">{ins.description}</p>
                {ins.recommendation && (
                  <div className="bg-[#6C63FF]/5 border border-[#6C63FF]/20 rounded-lg p-3">
                    <p className="text-[10px] font-mono text-[#6C63FF] mb-1">💡 How to fix</p>
                    <p className="text-xs text-[#A0A0C0]">{ins.recommendation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Good points */}
      {goodPoints.length > 0 && (
        <div className="bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#22C55E] mb-3">✓ Good Points</p>
          <div className="space-y-2">
            {goodPoints.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] mt-0.5 shrink-0" />
                <p className="text-xs text-[#A0A0C0]">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Functions / Classes / Imports */}
      <div className="space-y-3">
        {fileEntry.functions.length > 0 && (
          <div className="bg-[#0D0D18] border border-[#1E1E2E] rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A] mb-2 flex items-center gap-1.5">
              <FunctionSquare className="w-3 h-3" /> Functions ({fileEntry.functions.length})
            </p>
            <div className="space-y-1">
              {fileEntry.functions.slice(0, 10).map((fn, i) => (
                <p key={i} className="text-[12px] font-mono text-[#00D4FF]">{fn}()</p>
              ))}
              {fileEntry.functions.length > 10 && (
                <p className="text-[11px] text-[#5A5A7A] italic">+{fileEntry.functions.length - 10} more</p>
              )}
            </div>
          </div>
        )}

        {fileEntry.classes.length > 0 && (
          <div className="bg-[#0D0D18] border border-[#1E1E2E] rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A] mb-2 flex items-center gap-1.5">
              <Box className="w-3 h-3" /> Classes ({fileEntry.classes.length})
            </p>
            <div className="space-y-1">
              {fileEntry.classes.map((cls, i) => (
                <p key={i} className="text-[12px] font-mono text-[#A855F7]">{cls}</p>
              ))}
            </div>
          </div>
        )}

        {fileEntry.imports.length > 0 && (
          <div className="bg-[#0D0D18] border border-[#1E1E2E] rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A] mb-2 flex items-center gap-1.5">
              <Import className="w-3 h-3" /> Imports ({fileEntry.imports.length})
            </p>
            <div className="space-y-1">
              {fileEntry.imports.slice(0, 8).map((imp, i) => (
                <p key={i} className="text-[11px] font-mono text-[#7A7A9A] truncate">{imp}</p>
              ))}
              {fileEntry.imports.length > 8 && (
                <p className="text-[11px] text-[#5A5A7A] italic">+{fileEntry.imports.length - 8} more</p>
              )}
            </div>
          </div>
        )}

        {fileEntry.exports.length > 0 && (
          <div className="bg-[#0D0D18] border border-[#1E1E2E] rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-[2px] text-[#5A5A7A] mb-2 flex items-center gap-1.5">
              <FileOutput className="w-3 h-3" /> Exports ({fileEntry.exports.length})
            </p>
            <div className="space-y-1">
              {fileEntry.exports.slice(0, 8).map((exp, i) => (
                <p key={i} className="text-[11px] font-mono text-[#22C55E] truncate">{exp}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function FileExplorerPanel({ fileStructure, architectureNodes = [], nodeMetrics = [], insights = [] }: FileExplorerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const treeData = useMemo(() => buildInteractiveFileTree(fileStructure), [fileStructure]);

  const filteredFiles = useMemo(() => {
    if (!search) return fileStructure;
    const q = search.toLowerCase();
    return fileStructure.filter((f) => shortenPath(f.file).toLowerCase().includes(q));
  }, [fileStructure, search]);

  const selectedEntry = useMemo(
    () => fileStructure.find((f) => f.file === selectedPath),
    [fileStructure, selectedPath]
  );

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  return (
    <div className="flex gap-0 h-[700px] bg-[#0A0A0F] border border-[#1E1E2E] rounded-2xl overflow-hidden">
      {/* Left: File Tree */}
      <div className="w-72 shrink-0 flex flex-col border-r border-[#1E1E2E]">
        {/* Tree header */}
        <div className="px-3 pt-3 pb-2 border-b border-[#1E1E2E] bg-[#0D0D15]">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            <span className="text-[10px] font-mono text-[#5A5A7A] uppercase tracking-widest ml-1">Explorer</span>
            <span className="ml-auto text-[10px] font-mono text-[#3E3E5E]">{fileStructure.length} files</span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#5A5A7A] pointer-events-none" />
            <input
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-7 pl-7 pr-2 text-[11px] font-mono bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg text-white placeholder:text-[#3E3E5E] focus:outline-none focus:border-[#6C63FF]/40"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-[#5A5A7A]" />
              </button>
            )}
          </div>
        </div>

        {/* Tree / search results */}
        <div className="flex-1 overflow-y-auto p-2">
          {search ? (
            <div className="space-y-0.5">
              {filteredFiles.length === 0 ? (
                <p className="text-[11px] text-[#3E3E5E] font-mono text-center py-4">No files found</p>
              ) : (
                filteredFiles.map((f, i) => {
                  const short = shortenPath(f.file);
                  const isSelected = f.file === selectedPath;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(f.file)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg transition-all text-[11px] font-mono truncate ${isSelected ? "bg-[#6C63FF]/15 text-white border-l-2 border-[#6C63FF]" : "text-[#7A7A9A] hover:bg-white/[0.04] hover:text-white"}`}
                    >
                      {short}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {treeData.map((node, i) => (
                <InteractiveFileItem key={i} node={node} depth={0} selectedPath={selectedPath} onSelect={handleSelect} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: File detail */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {!selectedPath ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-[#1E1E2E] flex items-center justify-center">
              <FolderTree className="w-8 h-8 text-[#3E3E5E]" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Select a file to inspect</p>
              <p className="text-[#5A5A7A] text-xs font-mono max-w-xs">
                Click any file in the explorer to see its purpose, detected issues, structural metrics, and fix recommendations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              <span className="text-[10px] font-mono bg-[#1E1E2E] text-[#5A5A7A] px-2.5 py-1.5 rounded-full">Purpose analysis</span>
              <span className="text-[10px] font-mono bg-[#1E1E2E] text-[#5A5A7A] px-2.5 py-1.5 rounded-full">Issue detection</span>
              <span className="text-[10px] font-mono bg-[#1E1E2E] text-[#5A5A7A] px-2.5 py-1.5 rounded-full">Fix recommendations</span>
              <span className="text-[10px] font-mono bg-[#1E1E2E] text-[#5A5A7A] px-2.5 py-1.5 rounded-full">Structural metrics</span>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPath}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-y-auto"
            >
              <FileDetailPanel
                filePath={selectedPath}
                fileEntry={selectedEntry}
                nodes={architectureNodes}
                metrics={nodeMetrics}
                insights={insights}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
