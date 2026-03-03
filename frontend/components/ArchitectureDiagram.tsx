'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/base.css';

import { nodeTypes } from './CustomNodes';
import { edgeTypes } from './CustomEdges';

interface ArchitectureDiagramProps {
  scanId: string;
  fullscreen?: boolean;
}

function resolveEdgeColor(edge: Edge): string {
  if (edge.data?.color) return edge.data.color as string;
  const rel = ((edge.data?.relationType as string) || '').toLowerCase();
  if (rel.includes('db') || rel.includes('database')) return '#10B981';
  if (rel.includes('async') || rel.includes('pipeline')) return '#F472B6';
  if (rel.includes('external')) return '#F59E0B';
  if (rel.includes('import')) return '#94a3b8';
  return '#22d3ee';
}

/* ─────────────────────────────────────────────────────────────────────────
   Inner component (needs to be inside ReactFlowProvider for useReactFlow)
───────────────────────────────────────────────────────────────────────── */
function DiagramInner({ scanId, fullscreen }: ArchitectureDiagramProps) {
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const fitCalled = useRef(false);

  /* auto-fit once after nodes are set */
  useEffect(() => {
    if (nodes.length > 0 && !fitCalled.current) {
      fitCalled.current = true;
      // Two tries — first quick, then after paint
      setTimeout(() => fitView({ padding: 0.18, duration: 700 }), 150);
      setTimeout(() => fitView({ padding: 0.18, duration: 400 }), 600);
    }
  }, [nodes, fitView]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      fitCalled.current = false;

      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res  = await fetch(`${base}/api/architecture/${scanId}`, { credentials: 'include' });

      if (!res.ok) {
        if (res.status === 404) {
          setError('__NOT_FOUND__');
        } else {
          setError('Failed to load architecture.');
        }
        return;
      }

      const data = await res.json();
      const vizNodes: Node[] = (data.visualization?.nodes || []);
      const vizEdges: Edge[] = (data.visualization?.edges || []);

      // Trust backend dagre positions — set type to 'arch' (our fully custom node)
      const finalNodes: Node[] = vizNodes.map((n: Node) => ({
        ...n,
        type: 'arch',
        // Carry all data fields through so CustomNodes can use them
        data: {
          label: n.data?.label || n.data?.name || n.id,
          type: n.data?.type || n.data?.category || 'service',
          category: n.data?.category || n.data?.type || 'service',
          fullName: n.data?.fullName || n.data?.label,
          file: n.data?.file,
          module: n.data?.module,
        },
      }));

      const finalEdges: Edge[] = vizEdges.map((e: Edge) => {
        const color = resolveEdgeColor({ ...e, data: e.data });
        return {
          ...e,
          type: 'smoothstep',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 14,
            height: 14,
          },
          style: undefined,
          data: {
            ...e.data,
            color,
          },
        };
      });

      setNodeCount(finalNodes.length);
      setEdgeCount(finalEdges.length);
      setNodes(finalNodes);
      setEdges(finalEdges);
    } catch {
      setError('Failed to load architecture data.');
    } finally {
      setLoading(false);
    }
  }, [scanId, setNodes, setEdges]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#94a3b8', background: '#04060f', borderRadius: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #22d3ee', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'arch-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>Mapping architecture…</span>
      </div>
    </div>
  );

  if (error) {
    const isNotFound = error === '__NOT_FOUND__';
    return (
      <div style={{ height: '100%', minHeight: 340, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#04060f', borderRadius: 16,
        flexDirection: 'column', gap: 16, padding: 32, textAlign: 'center' }}>
        {isNotFound ? (
          <>
            <div style={{ fontSize: 36 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9',
              fontFamily: 'Syne, sans-serif' }}>
              No architecture data yet
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'JetBrains Mono, monospace',
              maxWidth: 320, lineHeight: 1.7 }}>
              This repo hasn&apos;t been scanned yet, or the scan is from before architecture analysis was added.
              Run a fresh scan to generate the architecture diagram.
            </div>
            <a href="/repositories" style={{ marginTop: 8, padding: '10px 22px',
              background: 'linear-gradient(135deg,#6C63FF,#22d3ee)',
              color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600,
              fontFamily: 'Syne, sans-serif', textDecoration: 'none',
              boxShadow: '0 0 20px rgba(108,99,255,0.3)' }}>
              → Scan a Repository
            </a>
          </>
        ) : (
          <div style={{ color: '#f87171', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
            {error}
          </div>
        )}
        <style>{`@keyframes arch-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (nodes.length === 0) return (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#475569', background: '#04060f', borderRadius: 16,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
      No architectural components detected
    </div>
  );

  const CSS = `
    @keyframes arch-spin { to { transform: rotate(360deg); } }
    .react-flow__node-default,
    .react-flow__node-arch {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      border-radius: 0 !important;
      width: auto !important;
      min-width: unset !important;
    }
    .react-flow__node-default.selected,
    .react-flow__node-default:focus,
    .react-flow__node-arch.selected,
    .react-flow__node-arch:focus,
    .react-flow__node.selected > div,
    .react-flow__node:focus > div {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
    }
    .react-flow__handle { pointer-events: none !important; opacity: 0 !important; }
    .react-flow__controls-button {
      background: rgba(4,6,15,0.95) !important;
      border-color: rgba(255,255,255,0.08) !important;
      color: #94a3b8 !important; fill: #94a3b8 !important;
    }
    .react-flow__controls-button:hover {
      background: rgba(34,211,238,0.1) !important;
      color: #22d3ee !important; fill: #22d3ee !important;
    }
    .react-flow__minimap { bottom: 16px !important; right: 16px !important; }
    .react-flow__edge-path { stroke-linecap: round; }
  `;

  /* ── shared canvas ── */
  const canvas = (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      minZoom={0.1}
      maxZoom={2.5}
      nodesDraggable={true}
      nodesConnectable={false}
      connectionMode={ConnectionMode.Loose}
      proOptions={{ hideAttribution: true }}
      style={{ background: 'transparent' }}
      defaultEdgeOptions={{ type: 'smoothstep' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1}
        color="rgba(255,255,255,0.035)" />
      <Controls style={{ background: 'rgba(4,6,15,0.95)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }} />
      <MiniMap
        style={{ background: 'rgba(4,6,15,0.95)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}
        nodeColor={(n) => {
          const t = ((n.data?.type || n.data?.category) || '').toLowerCase();
          if (t === 'api' || t === 'endpoint' || t === 'client') return '#8B5CF6';
          if (t === 'external' || t === 'externalapi') return '#F59E0B';
          if (t === 'db' || t === 'database' || t === 'dboperation') return '#10B981';
          if (t === 'worker' || t === 'queue') return '#F472B6';
          if (t === 'llm') return '#A78BFA';
          return '#06B6D4';
        }}
        maskColor="rgba(4,6,15,0.75)"
      />
    </ReactFlow>
  );

  /* ── legend strip (shared) ── */
  const legend = (
    <div style={{ padding: '6px 16px', display: 'flex', gap: 18, flexWrap: 'wrap',
      borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(4,6,15,0.98)' }}>
      {[
        { color: '#8B5CF6', label: 'Endpoint' },
        { color: '#06B6D4', label: 'Service' },
        { color: '#F59E0B', label: 'External' },
        { color: '#10B981', label: 'Database' },
        { color: '#F472B6', label: 'Worker' },
        { color: '#A78BFA', label: 'AI / LLM' },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
          <span style={{ fontSize: 9, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
        </div>
      ))}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
        {[
          { v: nodeCount, label: 'nodes', c: '#22d3ee' },
          { v: edgeCount, label: 'edges', c: '#a78bfa' },
        ].map(({ v, label, c }) => (
          <span key={label} style={{ fontSize: 9, color: c, fontFamily: 'JetBrains Mono, monospace',
            background: `${c}10`, border: `1px solid ${c}30`, borderRadius: 20, padding: '2px 8px' }}>
            {v} {label}
          </span>
        ))}
      </div>
    </div>
  );

  /* ── FULLSCREEN mode: no outer card, fills parent ── */
  if (fullscreen) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#04060f' }}>
        {legend}
        <div style={{ flex: 1 }}>{canvas}</div>
        <style>{CSS}</style>
      </div>
    );
  }

  /* ── CARD mode: used inside scan detail page ── */
  return (
    <div style={{ background: '#04060f', borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>

      {/* header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', fontFamily: 'Syne, sans-serif' }}>
            System Architecture
          </div>
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
            Interactive component diagram
          </div>
        </div>
      </div>

      {legend}

      <div style={{ height: 700 }}>{canvas}</div>
      <style>{CSS}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Public export — wraps DiagramInner in a ReactFlowProvider
───────────────────────────────────────────────────────────────────────── */
export function ArchitectureDiagram({ scanId, fullscreen }: ArchitectureDiagramProps) {
  return (
    <ReactFlowProvider>
      <DiagramInner scanId={scanId} fullscreen={fullscreen} />
    </ReactFlowProvider>
  );
}

