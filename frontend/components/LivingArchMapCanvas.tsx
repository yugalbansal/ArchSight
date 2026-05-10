'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL, fetchWithAuth } from '@/lib/api';

type LivingNode = {
  id: string;
  label: string;
  tag: string;
  cls: 's' | 'a' | 'd' | 'w';
  rx: number;
  ry: number;
  desc: string;
};

type LivingEdge = {
  from: string;
  to: string;
  label: string;
  clr: string;
  w: number;
};

type LivingResponse = {
  success: boolean;
  nodes: LivingNode[];
  edges: LivingEdge[];
};

type ArchitectureServiceDetail = {
  id: string;
  name: string;
  type: 'api' | 'service' | 'database' | 'external' | 'worker';
  layer: string;
  riskLevel: 'low' | 'medium' | 'high';
  endpoints: string[];
  dependencies: string[];
  coupling_score: number;
};

type ArchitectureLayer = {
  name: string;
  services: string[];
  depth: number;
};

type ArchitectureInsights = {
  layers: ArchitectureLayer[];
  service_details: ArchitectureServiceDetail[];
};

type ArchitectureResponse = {
  success: boolean;
  insights: ArchitectureInsights | null;
};

type ViewMode = 'spider' | 'layer';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function cubicPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function nodeColor(cls: LivingNode['cls']) {
  if (cls === 'a') return { stroke: 'rgba(140,100,255,0.95)', glow: 'rgba(140,100,255,0.22)' }; // purple
  if (cls === 'd') return { stroke: 'rgba(50,144,230,0.95)', glow: 'rgba(50,144,230,0.20)' }; // blue
  if (cls === 'w') return { stroke: 'rgba(220,160,40,0.95)', glow: 'rgba(220,160,40,0.18)' }; // amber
  return { stroke: 'rgba(32,210,140,0.95)', glow: 'rgba(32,210,140,0.18)' }; // teal
}

function layerTint(index: number) {
  const tints = [
    'rgba(34,211,238,0.075)',
    'rgba(124,58,237,0.070)',
    'rgba(16,185,129,0.060)',
    'rgba(234,179,8,0.060)',
  ];
  return tints[index % tints.length];
}

function buildRenderPositions(
  nodes: LivingNode[],
  viewMode: ViewMode,
  virtualWidth: number,
  virtualHeight: number,
  insights: ArchitectureInsights | null
) {
  const positions = new Map<string, { x: number; y: number }>();

  const normalizeKey = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

  // =========================================
  // SPIDER / TOPOLOGY VIEW
  // =========================================
  if (viewMode === 'spider' || !insights?.layers?.length) {
    const padX = 70;
    const padY = 54;

    for (const node of nodes) {
      positions.set(node.id, {
        x: lerp(
          padX,
          virtualWidth - padX,
          clamp(node.rx, 0, 1)
        ),
        y: lerp(
          padY,
          virtualHeight - padY,
          clamp(node.ry, 0, 1)
        ),
      });
    }

    return { positions, layerLayouts: [] };
  }

  // =========================================
  // LAYERED VIEW
  // =========================================

  const serviceByLabel = new Map<
    string,
    ArchitectureServiceDetail
  >();

  const serviceById = new Map<
    string,
    ArchitectureServiceDetail
  >();

  insights.service_details.forEach((service) => {
    serviceById.set(service.id, service);

    serviceByLabel.set(
      normalizeKey(service.name),
      service
    );

    serviceByLabel.set(
      normalizeKey(service.id),
      service
    );
  });

  const layerOrder = [...insights.layers]
    .sort((a, b) => a.depth - b.depth)
    .map((layer) => layer.name);

  for (const service of insights.service_details) {
    if (!layerOrder.includes(service.layer)) {
      layerOrder.push(service.layer);
    }
  }

  const groups = layerOrder.map(
    () => [] as LivingNode[]
  );

  const unassigned: LivingNode[] = [];

  // =========================================
  // ASSIGN NODES TO LAYERS
  // =========================================

  for (const node of nodes) {
    const service =
      serviceByLabel.get(
        normalizeKey(node.label)
      ) || serviceById.get(node.id);

    const layerName = service?.layer;

    const layerIndex = layerName
      ? layerOrder.findIndex(
          (name) =>
            normalizeKey(name) ===
            normalizeKey(layerName)
        )
      : -1;

    if (layerIndex < 0) {
      unassigned.push(node);
    } else {
      groups[layerIndex].push(node);
    }
  }

  if (unassigned.length > 0) {
    groups[groups.length - 1].push(
      ...unassigned
    );
  }

  // =========================================
  // CLEAN HORIZONTAL LAYER LAYOUT
  // =========================================

  let currentY = 140; // top offset
  const layerLayouts: { name: string; y: number; height: number; nodeCount: number }[] = [];

  groups.forEach((group, layerIndex) => {
    const total = group.length;

    if (total === 0) return;

    // =====================================
    // ADAPTIVE WRAPPED GRID
    // =====================================

    const maxPerRow =
      total >= 30
        ? 6
        : total >= 20
        ? 5
        : total >= 12
        ? 4
        : total >= 8
        ? 3
        : total;

    const rows = Math.ceil(
      total / maxPerRow
    );

    const rowGap = 84;
    const layerHeight = Math.max(140, rows * rowGap + 50);
    const layerName = layerOrder[layerIndex] || `Layer ${layerIndex + 1}`;

    layerLayouts.push({
      name: layerName,
      y: currentY,
      height: layerHeight,
      nodeCount: total,
    });

    const baseY = currentY + 55; // offset nodes down within the box

    for (let row = 0; row < rows; row++) {
      const start = row * maxPerRow;
      const rowNodes = group.slice(start, start + maxPerRow);
      const rowTotal = rowNodes.length;

      // tighter spacing
      const spacing = 170;
      const totalWidth = spacing * (rowTotal - 1);
      const startX = virtualWidth / 2 - totalWidth / 2;

      rowNodes.forEach((node, index) => {
        positions.set(node.id, {
          x: startX + index * spacing,
          y: baseY + row * rowGap,
        });
      });
    }

    currentY += layerHeight + 40; // add gap between layers
  });

  return { positions, layerLayouts };
}
// paste here ↓
function repelNodes(nodes: LivingNode[], edges: LivingEdge[] = [], canvasW = 1600, canvasH = 900, iterations = 400): LivingNode[] {
  const result = nodes.map(n => ({ ...n }));
  if (result.length === 0) return result;

  const count = result.length;
  
  // Relative width and height of a chip + padding to establish elliptical bounding box
  const relW = 260 / canvasW; 
  const relH = 100 / canvasH;

  // Step 1: Initialize positions loosely based on their class
  const zones: Record<string, { x: number; y: number }> = {
    a: { x: 0.8, y: 0.3 }, // APIs: right/top
    s: { x: 0.5, y: 0.4 }, // Services: center
    w: { x: 0.2, y: 0.6 }, // Workers: left
    d: { x: 0.5, y: 0.8 }, // DBs: bottom
  };

  result.forEach((n) => {
    const z = zones[n.cls] || { x: 0.5, y: 0.5 };
    n.rx = z.x + (Math.random() - 0.5) * 0.4;
    n.ry = z.y + (Math.random() - 0.5) * 0.4;
  });

  // Step 2: Force directed simulation
  const k = 0.015; // weaker spring constant so they don't clump
  const r = 0.5; // stronger repulsion (was 0.25)
  
  for (let iter = 0; iter < iterations; iter++) {
    // 1. Attraction (connected nodes)
    for (const e of edges) {
      const source = result.find(n => n.id === e.from);
      const target = result.find(n => n.id === e.to);
      if (source && target) {
        const dx = target.rx - source.rx;
        const dy = target.ry - source.ry;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        
        // Ideal distance between connected nodes
        const diff = dist - 0.35; // increased from 0.25 for longer edges
        const force = diff * k;
        
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        source.rx += fx;
        source.ry += fy;
        target.rx -= fx;
        target.ry -= fy;
      }
    }

    // 2. Repulsion (all nodes)
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i], b = result[j];
        const dx = b.rx - a.rx;
        const dy = b.ry - a.ry;
        
        // Normalize distance by node dimensions
        const nx = dx / relW;
        const ny = dy / relH;
        const dist2 = nx * nx + ny * ny;
        
        // push apart strongly if within 3x bounding box distance
        if (dist2 < 9.0 && dist2 > 0.0001) {
          const dist = Math.sqrt(dist2);
          const force = (3.0 - dist) / dist * r;
          
          const fx = nx * force * relW;
          const fy = ny * force * relH;
          
          a.rx -= fx;
          a.ry -= fy;
          b.rx += fx;
          b.ry += fy;
        }
      }
    }
    
    // 3. Gravity towards center (symmetric web)
    for (const n of result) {
      // Ignore zones to make the structure perfectly symmetric around the center
      n.rx += (0.5 - n.rx) * 0.0005;
      n.ry += (0.5 - n.ry) * 0.0005;
      
      // Constrain within bounds
      n.rx = Math.max(0.08, Math.min(0.92, n.rx));
      n.ry = Math.max(0.05, Math.min(0.95, n.ry));
    }
  }

  return result;
}
export function LivingArchMapCanvas({ scanId }: { scanId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef<number>(0);

  const [canvasHeight, setCanvasHeight] = useState(800);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<LivingNode[]>([]);
  const [localNodes, setLocalNodes] = useState<LivingNode[]>([]);
  const [edges, setEdges] = useState<LivingEdge[]>([]);
  const [insights, setInsights] = useState<ArchitectureInsights | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('spider');

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const draggingRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const localNodesRef = useRef<LivingNode[]>([]);
  const edgesRef = useRef<LivingEdge[]>([]);
  const insightsRef = useRef<ArchitectureInsights | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const viewModeRef = useRef<ViewMode>('spider');

  // Pan and Zoom refs
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const draggingCanvasRef = useRef<{ startX: number; startY: number; origTx: number; origTy: number } | null>(null);
  const virtualSizeRef = useRef({ w: 1600, h: 900 });

  const setHovered = (id: string | null) => {
    hoveredIdRef.current = id;
    setHoveredId(id);
  };

  useEffect(() => {
    insightsRef.current = insights;
  }, [insights]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const canMountCanvas = !loading && !error && localNodes.length > 0;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [livingRes, architectureRes] = await Promise.all([
          fetchWithAuth(`${API_URL}/api/architecture/${scanId}/living`),
          fetchWithAuth(`${API_URL}/api/architecture/${scanId}`),
        ]);

        if (!livingRes.ok) {
          setError('Failed to load architecture.');
          return;
        }
        const data = (await livingRes.json()) as LivingResponse;
        if (!data?.success) {
          setError('Failed to load architecture.');
          return;
        }

        if (architectureRes.ok) {
          const architectureData = (await architectureRes.json()) as ArchitectureResponse;
          setInsights(architectureData?.insights || null);
        } else {
          setInsights(null);
        }

        if (cancelled) return;
        const fetched = data.nodes || [];
        const fetchedEdges = data.edges || [];
        setNodes(fetched);
        
        // Massive virtual canvas area for nodes to spread out
        const count = fetched.length || 1;
        const idealArea = count * 90000; 
        const vw = Math.max(1600, Math.ceil(Math.sqrt(idealArea * 1.6)));
        const vh = Math.max(900, Math.ceil(Math.sqrt(idealArea / 1.6)));
        virtualSizeRef.current = { w: vw, h: vh };
        
        const repelled = repelNodes(fetched, fetchedEdges, vw, vh);
        
        // Center the camera and zoom out slightly by default
        const screenW = typeof window !== 'undefined' ? window.innerWidth * 0.7 : 1000;
        const screenH = 800;
        
        // Calculate a scale that fits the graph nicely in the viewport, bounded between 0.4 and 0.85
        const fitScale = Math.min(screenW / vw, screenH / vh) * 0.9;
        const defaultScale = Math.max(0.4, Math.min(0.85, fitScale));
        
        transformRef.current = { 
          x: screenW / 2 - (vw * defaultScale) / 2, 
          y: screenH / 2 - (vh * defaultScale) / 2, 
          scale: defaultScale 
        };
        
        setCanvasHeight(800); // fixed viewport height
        setLocalNodes(repelled);
        setEdges(fetchedEdges);
      } catch {
        if (!cancelled) setError('Failed to load architecture.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scanId]);

  useEffect(() => {
    localNodesRef.current = localNodes;
  }, [localNodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Connected set is computed inside the draw loop for smoothness.

  useEffect(() => {
    if (!canMountCanvas) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || 800;
      const h = parent?.clientHeight || 700;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement ?? canvas);

    return () => {
      ro.disconnect();
    };
  }, [canMountCanvas]);

  useEffect(() => {
    if (!canMountCanvas) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      const t = transformRef.current;
      const lx = (x - t.x) / t.scale;
      const ly = (y - t.y) / t.scale;

      if (draggingCanvasRef.current) {
        const { startX, startY, origTx, origTy } = draggingCanvasRef.current;
        t.x = origTx + (x - startX);
        t.y = origTy + (y - startY);
        return;
      }

      const currentNodes = localNodesRef.current;
      const { w: vw, h: vh } = virtualSizeRef.current;
      const padX = 70;
      const padY = 54;
      const { positions } = buildRenderPositions(currentNodes, viewModeRef.current, vw, vh, insightsRef.current);

      if (viewModeRef.current === 'spider' && draggingRef.current) {
        const { id, dx, dy } = draggingRef.current;
        const nx = clamp((lx - dx - padX) / Math.max(1, (vw - 2 * padX)), 0, 1);
        const ny = clamp((ly - dy - padY) / Math.max(1, (vh - 2 * padY)), 0, 1);
        setLocalNodes((prev) => prev.map((n) => (n.id === id ? { ...n, rx: nx, ry: ny } : n)));
        setHovered(id);
        return;
      }

      let best: { id: string; d2: number } | null = null;
      for (const n of currentNodes) {
        const point = positions.get(n.id);
        if (!point) continue;
        const cx = point.x;
        const cy = point.y;
        const dx = lx - cx;
        const dy = ly - cy;
        const d2 = dx * dx + dy * dy;
        if (!best || d2 < best.d2) best = { id: n.id, d2 };
      }

      if (best && best.d2 < 70 * 70) setHovered(best.id);
      else setHovered(null);
    };

    const onLeave = () => {
      setHovered(null);
      draggingCanvasRef.current = null;
      draggingRef.current = null;
    };

    const onDown = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const t = transformRef.current;
      const lx = (x - t.x) / t.scale;
      const ly = (y - t.y) / t.scale;

      const { w: vw, h: vh } = virtualSizeRef.current;
      const padX = 70;
      const padY = 54;
      const chipW = 180;
      const chipH = 54;

      const currentNodes = localNodesRef.current;
      const { positions } = buildRenderPositions(currentNodes, viewModeRef.current, vw, vh, insightsRef.current);

      if (viewModeRef.current === 'layer') {
        draggingCanvasRef.current = { startX: x, startY: y, origTx: t.x, origTy: t.y };
        canvas.style.cursor = 'grabbing';
        return;
      }

      for (let i = currentNodes.length - 1; i >= 0; i--) {
        const n = currentNodes[i];
        const point = positions.get(n.id);
        if (!point) continue;
        const cx = point.x;
        const cy = point.y;
        const left = cx - chipW / 2;
        const top = cy - chipH / 2;
        if (lx >= left && lx <= left + chipW && ly >= top && ly <= top + chipH) {
          draggingRef.current = { id: n.id, dx: lx - cx, dy: ly - cy };
          setHovered(n.id);
          canvas.style.cursor = 'grabbing';
          ev.preventDefault();
          return;
        }
      }

      draggingCanvasRef.current = { startX: x, startY: y, origTx: t.x, origTy: t.y };
      canvas.style.cursor = 'grabbing';
    };

    const onUp = () => {
      draggingRef.current = null;
      draggingCanvasRef.current = null;
      canvas.style.cursor = 'default';
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const t = transformRef.current;

      if (!ev.ctrlKey && !ev.metaKey && (Math.abs(ev.deltaX) > 0 || Math.abs(ev.deltaY) > 0)) {
         t.x -= ev.deltaX * 0.8;
         t.y -= ev.deltaY * 0.8;
         return;
      }

      const zoom = Math.exp(-ev.deltaY * 0.005);
      const newScale = clamp(t.scale * zoom, 0.1, 4);
      const actualZoom = newScale / t.scale;
      t.x = x - (x - t.x) * actualZoom;
      t.y = y - (y - t.y) * actualZoom;
      t.scale = newScale;
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('mouseup', onUp);
    };
  }, [canMountCanvas]);

  useEffect(() => {
    if (!canMountCanvas) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let failed = false;

    const draw = (ts: number) => {
      if (failed) return;
      try {
        if (!t0Ref.current) t0Ref.current = ts;
        const t = (ts - t0Ref.current) / 1000;

        // Use client sizes (more reliable than getBoundingClientRect during animations/layout)
        const w = canvas.clientWidth || 0;
        const h = canvas.clientHeight || 0;
        if (w <= 2 || h <= 2) {
          rafRef.current = requestAnimationFrame(draw);
          return;
        }

        // Ensure backing store matches (fallback if ResizeObserver didn't fire)
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const bw = Math.floor(w * dpr);
        const bh = Math.floor(h * dpr);
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        const currentNodes = localNodesRef.current;
      const currentEdges = edgesRef.current;
      const currentHovered = hoveredIdRef.current;
      const { positions, layerLayouts } = buildRenderPositions(currentNodes, viewModeRef.current, virtualSizeRef.current.w, virtualSizeRef.current.h, insightsRef.current);

      const connected = currentHovered
        ? (() => {
            const set = new Set<string>();
            if (currentHovered) set.add(currentHovered);
            for (const e of currentEdges) {
              if (e.from === currentHovered || e.to === currentHovered) {
                set.add(e.from);
                set.add(e.to);
              }
            }
            return set;
          })()
        : null;

        // Background
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#04060f';
        ctx.fillRect(0, 0, w, h);

        const tf = transformRef.current;

        // soft vignette
        const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 60, w * 0.5, h * 0.55, Math.max(w, h));
        g.addColorStop(0, 'rgba(34,211,238,0.06)');
        g.addColorStop(0.6, 'rgba(108,99,255,0.04)');
        g.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        // faint infinite grid
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        const grid = 48 * tf.scale;
        const offsetX = tf.x % grid;
        const offsetY = tf.y % grid;
        for (let x = offsetX; x <= w; x += grid) {
          ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke();
        }
        for (let y = offsetY; y <= h; y += grid) {
          ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.translate(tf.x, tf.y);
        ctx.scale(tf.scale, tf.scale);

        // Precompute positions
        const { w: vw, h: vh } = virtualSizeRef.current;
        const pos = positions;

        if (viewModeRef.current === 'layer' && layerLayouts.length > 0) {
          ctx.save();

          layerLayouts.forEach((layer, index) => {
            const { y, height, name, nodeCount } = layer;

            ctx.fillStyle = layerTint(index);
            ctx.fillRect(40, y - 55, vw - 80, height);

            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(120, y);
            ctx.lineTo(vw - 120, y);
            ctx.stroke();
          });

          ctx.restore();

          ctx.save();

          layerLayouts.forEach((layer, index) => {
            const { y, name, nodeCount } = layer;

            ctx.fillStyle = 'rgba(5,10,22,0.92)';
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (typeof (ctx as any).roundRect === 'function') {
              (ctx as any).roundRect(38, y - 42, 220, 64, 14);
            } else {
              ctx.rect(38, y - 42, 220, 64);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'rgba(148,163,184,0.75)';
            ctx.font = '700 11px ui-monospace';
            ctx.fillText(`LEVEL ${String(index + 1).padStart(2, '0')}`, 56, y - 18);

            ctx.fillStyle = 'rgba(226,232,240,0.96)';
            ctx.font = '700 14px ui-monospace';
            ctx.fillText(name.toUpperCase(), 56, y + 4);

            ctx.fillStyle = 'rgba(34,211,238,0.85)';
            ctx.font = '600 13px ui-monospace';
            ctx.fillText(`${nodeCount} nodes`, 170, y + 4);
          });

          ctx.restore();
        }

        // Edges
        for (let i = 0; i < currentEdges.length; i++) {
          const e = currentEdges[i];
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;

        // curvature based on direction
          const nx = -dy / dist;
          const ny = dx / dist;
          const curveScale = viewModeRef.current === 'layer' ? 0.002 : 0.18;
          const curveMin = viewModeRef.current === 'layer' ? 0 : 28;
          const curveMax = viewModeRef.current === 'layer' ? 12 : 96;
          const curve = clamp(dist * curveScale, curveMin, curveMax) * (a.x < b.x ? 1 : -1);

          const p0 = a;
          const p3 = b;
          const p1 = { x: a.x + dx * 0.35 + nx * curve, y: a.y + dy * 0.35 + ny * curve };
          const p2 = { x: a.x + dx * 0.65 + nx * curve, y: a.y + dy * 0.65 + ny * curve };

          const isFocus = !!connected && (e.from === currentHovered || e.to === currentHovered);
          const dimmed = !!connected && !isFocus;

        // glow stroke
          ctx.save();
          ctx.globalAlpha = dimmed ? 0.10 : (isFocus ? 0.95 : 0.45);
          ctx.strokeStyle = e.clr;
          ctx.lineWidth = (e.w || 1.8) * (isFocus ? 1.35 : 1);
          ctx.shadowBlur = isFocus ? 16 : 10;
          ctx.shadowColor = e.clr;
          ctx.setLineDash([8, 10]);
          ctx.lineDashOffset = -(t * 60 + i * 13);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
          ctx.stroke();
          ctx.restore();

        // packet envelopes
          const speed = viewModeRef.current === 'layer' ? 0.14 + (i % 5) * 0.02 : 0.22 + (i % 5) * 0.03;
          const phase = (t * speed + i * 0.07) % 1;
          const pt = cubicPoint(p0, p1, p2, p3, phase);
          
          const ptNext = cubicPoint(p0, p1, p2, p3, Math.min(1, phase + 0.01));
          const envAng = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x);

          ctx.save();
          ctx.globalAlpha = dimmed ? 0 : (isFocus ? 1 : 0.78);
          ctx.translate(pt.x, pt.y);
          ctx.rotate(envAng);
          
          ctx.fillStyle = 'rgba(6,10,22,0.9)';
          ctx.strokeStyle = e.clr;
          ctx.lineWidth = isFocus ? 1.5 : 1.0;
          ctx.shadowBlur = isFocus ? 12 : 8;
          ctx.shadowColor = e.clr;
          
          const ew = 14;
          const eh = 10;
          const hx = ew / 2;
          const hy = eh / 2;
          
          ctx.beginPath();
          ctx.rect(-hx, -hy, ew, eh);
          ctx.fill();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(-hx, -hy);
          ctx.lineTo(0, 0);
          ctx.lineTo(hx, -hy);
          ctx.stroke();
          
          ctx.restore();

        // arrow hint near end (subtle)
          const pEnd = cubicPoint(p0, p1, p2, p3, 0.94);
          const pPrev = cubicPoint(p0, p1, p2, p3, 0.90);
          const ax = pEnd.x - pPrev.x;
          const ay = pEnd.y - pPrev.y;
          const ang = Math.atan2(ay, ax);
          ctx.save();
          ctx.globalAlpha = dimmed ? 0.05 : (isFocus ? 0.28 : 0.14);
          ctx.translate(pEnd.x, pEnd.y);
          ctx.rotate(ang);
          ctx.fillStyle = e.clr;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-7, -3);
          ctx.lineTo(-7, 3);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Nodes
        for (const n of currentNodes) {
          const p = pos.get(n.id);
          if (!p) continue;

        const { stroke, glow } = nodeColor(n.cls);
          const isFocus = currentHovered === n.id;
          const dimmed = !!connected && !connected.has(n.id);

          let chipW = clamp(180, 150, 220);
          let chipH = 54;
          
          if (n.cls === 'd') {
            chipW = 170; // Make it wider to fit text inside
            chipH = 78;
          }

          if (viewModeRef.current === 'layer' && n.cls !== 'd') {
            chipW = 148;
            chipH = 44;
          } else if (viewModeRef.current === 'layer' && n.cls === 'd') {
            chipW = 92;
            chipH = 42;
          }
          
          const x = p.x - chipW / 2;
          const y = p.y - chipH / 2;

        // glow underlay
          ctx.save();
          ctx.globalAlpha = dimmed ? 0.10 : (isFocus ? 0.95 : 0.55);
          ctx.shadowBlur = isFocus ? 28 : 18;
          ctx.shadowColor = glow;
          ctx.fillStyle = 'rgba(6,12,28,0.75)';
          ctx.strokeStyle = stroke;
          ctx.lineWidth = isFocus ? 2.2 : 1.4;

          if (n.cls === 'd') {
            const rx = chipW / 2;
            const ry = 14; // cylinder top aspect

            // Body
            ctx.beginPath();
            ctx.moveTo(x, y + ry);
            ctx.lineTo(x, y + chipH - ry);
            // Bottom edge (left to right)
            ctx.ellipse(x + rx, y + chipH - ry, rx, ry, 0, Math.PI, 0, true);
            ctx.lineTo(x + chipW, y + ry);
            ctx.lineTo(x, y + ry); // close path flat at the top
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Decorator lines (stack effect)
            ctx.beginPath();
            ctx.ellipse(x + rx, y + ry + 14, rx, ry, 0, Math.PI, 0, true);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(x + rx, y + ry + 28, rx, ry, 0, Math.PI, 0, true);
            ctx.stroke();

            // Top lid
            ctx.beginPath();
            ctx.ellipse(x + rx, y + ry, rx, ry, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          } else {
            const r = 12;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + chipW - r, y);
            ctx.quadraticCurveTo(x + chipW, y, x + chipW, y + r);
            ctx.lineTo(x + chipW, y + chipH - r);
            ctx.quadraticCurveTo(x + chipW, y + chipH, x + chipW - r, y + chipH);
            ctx.lineTo(x + r, y + chipH);
            ctx.quadraticCurveTo(x, y + chipH, x, y + chipH - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();

        // small status dot
          if (n.cls !== 'd') {
            ctx.save();
            ctx.globalAlpha = dimmed ? 0.10 : 0.95;
            ctx.fillStyle = 'rgba(34,197,94,0.9)';
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(34,197,94,0.35)';
            ctx.beginPath();
            ctx.arc(x + chipW - 18, y + 16, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            // DB status dot on the top lid
            ctx.save();
            ctx.globalAlpha = dimmed ? 0.10 : 0.95;
            ctx.fillStyle = 'rgba(34,197,94,0.9)';
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(34,197,94,0.35)';
            ctx.beginPath();
            ctx.arc(x + chipW/2, y + 14, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

        // text
          ctx.save();
          ctx.globalAlpha = dimmed ? 0.18 : 0.95;
          
          if (n.cls === 'd') {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
            ctx.fillStyle = 'rgba(148,163,184,0.85)';
            // Place tag inside cylinder
            ctx.fillText((n.tag || '').toUpperCase(), x + chipW/2, y + chipH/2 + 15);

            ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
            ctx.fillStyle = 'rgba(226,232,240,0.95)';
            // Place label inside cylinder
            const label = (n.label || '').length > 18 ? `${n.label.slice(0, 18)}…` : n.label;
            ctx.fillText(label, x + chipW/2, y + chipH/2 + 30);
          } else {
            ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
            ctx.fillStyle = 'rgba(148,163,184,0.85)';
            ctx.textBaseline = 'top';
            ctx.fillText((n.tag || '').toUpperCase(), x + 14, y + 10);

            ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
            ctx.fillStyle = 'rgba(226,232,240,0.95)';
            const label = (n.label || '').length > 22 ? `${n.label.slice(0, 22)}…` : n.label;
            ctx.fillText(label, x + 14, y + 26);
          }
          ctx.restore();
        }

        ctx.restore(); // Restore from global zoom/pan

      // Tooltip
        if (currentHovered) {
          const n = currentNodes.find(nn => nn.id === currentHovered);
          const p = pos.get(currentHovered);
          if (n && p) {
            const screenX = p.x * tf.scale + tf.x;
            const screenY = p.y * tf.scale + tf.y;

            const tw = 420;
            const th = 75;
            const tx = clamp(screenX - tw / 2, 16, w - tw - 16);
            const ty = clamp(screenY + 56 * tf.scale, 16, h - th - 16);

            ctx.save();
            ctx.globalAlpha = 0.96;
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(34,211,238,0.15)';
            ctx.fillStyle = 'rgba(6,10,22,0.97)';
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            if (typeof (ctx as any).roundRect === 'function') {
              (ctx as any).roundRect(tx, ty, tw, th, 12);
            } else {
              // fallback
              ctx.rect(tx, ty, tw, th);
            }
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
            ctx.fillStyle = 'rgba(226,232,240,0.98)';
            ctx.textBaseline = 'top';
            ctx.fillText(n.label, tx + 14, ty + 10);

            ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
            ctx.fillStyle = 'rgba(203,213,225,0.75)';
            ctx.fillText(`📌 Type: ${n.tag}`, tx + 14, ty + 27);

            ctx.fillStyle = 'rgba(148,163,184,0.82)';
            const desc = (n.desc || '').length > 80 ? `${n.desc.slice(0, 80)}…` : n.desc;
            ctx.fillText(desc, tx + 14, ty + 43);
            
            ctx.fillStyle = 'rgba(107,114,128,0.70)';
            ctx.fillText(`ID: ${n.id}`, tx + 14, ty + 58);
            ctx.restore();
          }
        }

        rafRef.current = requestAnimationFrame(draw);
      } catch (e) {
        failed = true;
        console.error('LivingArchMapCanvas render error', e);
        setError('ArchMap renderer failed to initialize.');
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      t0Ref.current = 0;
    };
  }, [canMountCanvas]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#04060f] flex items-center justify-center" style={{ height: `${canvasHeight}px` }}>
        <div className="text-[#94a3b8] font-mono text-xs">Mapping architecture…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#04060f] flex items-center justify-center" style={{ height: `${canvasHeight}px` }}>
        <div className="text-[#f87171] font-mono text-xs">{error}</div>
      </div>
    );
  }

  if (localNodes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#04060f] flex items-center justify-center" style={{ height: `${canvasHeight}px` }}>
        <div className="text-[#475569] font-mono text-xs">No architectural components detected</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#04060f] overflow-hidden flex flex-col relative"
     style={{ height: `${canvasHeight}px` }}>
      <canvas ref={canvasRef} className="w-full flex-1 block" />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
        <div className="rounded-full border border-white/10 bg-[#050816]/90 backdrop-blur-xl px-2 py-2 shadow-[0_0_30px_rgba(0,0,0,0.45)] flex items-center gap-2">
          <div className="px-3 pr-4 text-[11px] uppercase tracking-[0.22em] text-[#64748b] font-semibold border-r border-white/10">
            Architecture Map
          </div>
          <button
            type="button"
            onClick={() => setViewMode('spider')}
            className={`px-4 py-2 rounded-full text-xs font-semibold font-mono transition-all border ${
              viewMode === 'spider'
                ? 'bg-[#6C63FF]/20 text-white border-[#6C63FF]/40 shadow-[0_0_18px_rgba(108,99,255,0.22)]'
                : 'bg-transparent text-[#7c8598] border-transparent hover:bg-white/5 hover:text-[#e2e8f0]'
            }`}
          >
            Topology
          </button>
          <button
            type="button"
            onClick={() => setViewMode('layer')}
            className={`px-4 py-2 rounded-full text-xs font-semibold font-mono transition-all border ${
              viewMode === 'layer'
                ? 'bg-[#00D4FF]/20 text-white border-[#00D4FF]/40 shadow-[0_0_18px_rgba(0,212,255,0.18)]'
                : 'bg-transparent text-[#7c8598] border-transparent hover:bg-white/5 hover:text-[#e2e8f0]'
            }`}
          >
            Layered View
          </button>
        </div>
      </div>
      
      {/* Legend Overlay */}
      <div className={`absolute left-3 w-[146px] bg-[#06060f]/95 border border-[#1E1E2E] rounded-lg p-2 text-[11px] font-mono space-y-1.5 shadow-[0_0_18px_rgba(0,0,0,0.28)] ${viewMode === 'layer' ? 'bottom-3' : 'top-3'}`}>
        {viewMode === 'layer' ? (
          <>
            <div className="text-[#94a3b8] font-semibold mb-0.5">Layered View</div>
            <div className="text-[#5A5A7A] leading-tight pb-1 border-b border-[#1E1E2E]">
              Each band is one architecture level.
            </div>
            {(insightsRef.current?.layers || []).slice(0, 4).map((layer, index) => (
              <div key={layer.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layerTint(index).replace('0.075', '1').replace('0.070', '1').replace('0.060', '1') }} />
                <span className="text-[#94a3b8] truncate">{layer.name}</span>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="text-[#94a3b8] font-semibold mb-1">Topology</div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#8c64ff] shadow-lg" />
              <span className="text-[#94a3b8]">Service node</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#20d28c] shadow-lg" />
              <span className="text-[#94a3b8]">API endpoint</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3290e6] shadow-lg" />
              <span className="text-[#94a3b8]">Database</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#dca028] shadow-lg" />
              <span className="text-[#94a3b8]">Worker / queue</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
