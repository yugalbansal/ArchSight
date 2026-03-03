import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Server, Globe, Database, Zap, Cpu, Code2 } from 'lucide-react';

interface CustomNodeData {
  label: string;
  type: string;
  fullName?: string;
  category?: string;
  file?: string;
  module?: string;
}

type CustomNodeProps = NodeProps<CustomNodeData>;

/* Truncate long labels */
function truncate(s: string, max = 22) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/* Short subtitle — file path tail or module */
function subtitle(data: CustomNodeData): string {
  if (data.module) return data.module;
  if (data.file) {
    const parts = data.file.split('/');
    return parts[parts.length - 1] || '';
  }
  return '';
}

/* ── shared handle style ── */
const handle = (color: string) => ({
  background: color,
  border: `2px solid #080c18`,
  width: 8,
  height: 8,
  borderRadius: '50%',
});

/* ─────────────────────────────────────────────────────────────────────
   NODE SHELL — transparent wrapper, no background, no border
───────────────────────────────────────────────────────────────────── */
function Shell({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <div style={{ position: 'relative', background: 'transparent' }}>
      <Handle type="target"  position={Position.Top}    style={handle(accent)} />
      {children}
      <Handle type="source"  position={Position.Bottom} style={handle(accent)} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   CARD — one unified card component, parameterised by type config
───────────────────────────────────────────────────────────────────── */
interface CardCfg {
  accent: string;          // border + icon bg tint
  bg: string;              // card background
  border: string;          // border color / style
  tag: string;             // top-left label
  Icon: React.ElementType;
  dot: string;             // status dot color
  dotGlow: string;
  dashed?: boolean;
}

const Card: React.FC<{ data: CustomNodeData; cfg: CardCfg }> = ({ data, cfg }) => {
  const sub = subtitle(data);
  return (
    <Shell accent={cfg.accent}>
      <div style={{
        width: 200,
        padding: '11px 13px 12px',
        background: cfg.bg,
        border: cfg.dashed
          ? `1px dashed ${cfg.border}`
          : `1px solid ${cfg.border}`,
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* very subtle top glow line */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
          background: `linear-gradient(90deg, transparent, ${cfg.accent}55, transparent)`,
        }} />

        {/* ── tag row ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 8,
        }}>
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
            color: cfg.accent, fontFamily: 'JetBrains Mono, monospace',
            textTransform: 'uppercase', opacity: 0.9,
          }}>
            {cfg.tag}
          </span>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: cfg.dot,
            boxShadow: `0 0 6px ${cfg.dotGlow}`,
          }} />
        </div>

        {/* ── icon + name row ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `${cfg.accent}22`,
            border: `1px solid ${cfg.accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <cfg.Icon size={14} color={cfg.accent} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#e2e8f0',
              fontFamily: 'Space Mono, monospace',
              lineHeight: 1.35, wordBreak: 'break-word',
            }}>
              {truncate(data.label, 20)}
            </div>
            {sub && (
              <div style={{
                fontSize: 9, color: `${cfg.accent}88`,
                fontFamily: 'JetBrains Mono, monospace',
                marginTop: 3, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {truncate(sub, 24)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   TYPE CONFIGS
───────────────────────────────────────────────────────────────────── */
const configs: Record<string, CardCfg> = {
  api: {
    accent: '#8B5CF6', bg: 'rgba(10,8,24,0.92)',
    border: 'rgba(139,92,246,0.35)', tag: 'API ENDPOINT',
    Icon: Server, dot: '#4ade80', dotGlow: 'rgba(74,222,128,0.6)',
  },
  service: {
    accent: '#22d3ee', bg: 'rgba(4,14,22,0.92)',
    border: 'rgba(34,211,238,0.3)', tag: 'SERVICE',
    Icon: Zap, dot: '#4ade80', dotGlow: 'rgba(74,222,128,0.6)',
  },
  external: {
    accent: '#F59E0B', bg: 'rgba(16,10,4,0.92)',
    border: 'rgba(245,158,11,0.35)', tag: 'EXTERNAL',
    Icon: Globe, dot: '#f59e0b', dotGlow: 'rgba(245,158,11,0.55)',
    dashed: true,
  },
  database: {
    accent: '#10B981', bg: 'rgba(4,16,12,0.92)',
    border: 'rgba(16,185,129,0.35)', tag: 'DATABASE',
    Icon: Database, dot: '#4ade80', dotGlow: 'rgba(74,222,128,0.6)',
  },
  worker: {
    accent: '#F472B6', bg: 'rgba(16,6,14,0.92)',
    border: 'rgba(244,114,182,0.35)', tag: 'WORKER',
    Icon: Cpu, dot: '#f472b6', dotGlow: 'rgba(244,114,182,0.55)',
  },
  queue: {
    accent: '#FB923C', bg: 'rgba(16,8,4,0.92)',
    border: 'rgba(251,146,60,0.35)', tag: 'QUEUE',
    Icon: Cpu, dot: '#fb923c', dotGlow: 'rgba(251,146,60,0.55)',
  },
  llm: {
    accent: '#A78BFA', bg: 'rgba(12,8,22,0.92)',
    border: 'rgba(167,139,250,0.35)', tag: 'AI / LLM',
    Icon: Code2, dot: '#a78bfa', dotGlow: 'rgba(167,139,250,0.55)',
  },
};

function resolveConfig(type: string, category: string): CardCfg {
  const t = (type || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (t === 'api' || t === 'endpoint' || t === 'client' || c === 'api' || c === 'endpoint')
    return configs.api;
  if (t === 'externalapi' || t === 'external' || c === 'external')
    return configs.external;
  if (t === 'db' || t === 'database' || t === 'dboperation' || c === 'database' || c === 'db')
    return configs.database;
  if (t === 'worker' || c === 'worker') return configs.worker;
  if (t === 'queue' || c === 'queue') return configs.queue;
  if (t === 'llm' || c === 'llm') return configs.llm;
  return configs.service;
}

/* ─────────────────────────────────────────────────────────────────────
   SINGLE DEFAULT NODE — routes everything through one component
───────────────────────────────────────────────────────────────────── */
export const DefaultNode: React.FC<CustomNodeProps> = ({ data }) => (
  <Card data={data} cfg={resolveConfig(data.type, data.category || '')} />
);

export const nodeTypes = {
  arch: DefaultNode,
  default: DefaultNode,  // fallback in case backend sends type: 'default'
};

