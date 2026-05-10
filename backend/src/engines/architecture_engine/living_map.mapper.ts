type DbNode = {
  id: string;
  type: string;
  name?: string | null;
  file?: string | null;
  metadata?: unknown;
};

type DbEdge = {
  id?: string;
  fromNodeId?: string;
  toNodeId?: string;
  source?: string;
  target?: string;
  relationType?: string;
  type?: string;
};

export type LivingNode = {
  id: string;
  label: string;
  tag: string;
  cls: 's' | 'a' | 'd' | 'w';
  rx: number;
  ry: number;
  desc: string;
};

export type LivingEdge = {
  from: string;
  to: string;
  label: string;
  clr: string;
  w: number;
};

export type LivingArchMapData = {
  nodes: LivingNode[];
  edges: LivingEdge[];
  meta: {
    source: 'engine1-db';
    nodeCount: number;
    edgeCount: number;
    truncated: boolean;
  };
};

const EDGE_COLORS = {
  api: '#8c64ff',
  service: '#20d28c',
  db: '#3290e6',
  worker: '#dca028',
} as const;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function slugify(input: string): string {
  const s = (input || '').toLowerCase().trim();
  const cleaned = s
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return cleaned || 'node';
}

function cleanLabel(raw: string, fallback: string): string {
  if (!raw) return fallback;
  
  // Extract just the inner string from things like From('users') or ('table')
  const quotesMatch = raw.match(/['"]([a-zA-Z0-9_-]+)['"]/);
  if (quotesMatch) {
    let clean = quotesMatch[1];
    // if it was "From('users') DB", preserve the DB suffix
    if (raw.endsWith(' DB')) clean += ' DB';
    if (raw.endsWith(' API')) clean += ' API';
    return clean;
  }

  // Remove template literals completely if they are messy
  if (raw.includes('`') || raw.includes('${')) {
    return fallback;
  }

  // Remove parenthesis and brackets
  let clean = raw.replace(/[(){}\[\]]/g, '').trim();
  
  // if it's too long or still looks like code, just use fallback
  if (clean.length > 60 || clean.includes('=>') || clean.includes('=')) {
    return fallback;
  }
  
  return clean || fallback;
}

function stableSuffix(id: string): string {
  // Keep this deterministic without crypto deps
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (hash % 46656).toString(36).padStart(3, '0');
}

function pickLabel(node: DbNode): string {
  const e1 = node.metadata as any;
  const sem = e1?.metadata as any;
  const scopeId: string = e1?.scopeId || '';
  const file: string = e1?.file || node.file || '';

  const classFromScope = () => {
    const m = scopeId.match(/Class=([^:]+)/);
    return m ? m[1] : null;
  };
  const fileBase = (f: string) => {
    const parts = f.split('/');
    let base = parts.pop() || f;
    base = base.replace(/\.[^.]+$/, '');
    if (['page', 'layout', 'route', 'index'].includes(base.toLowerCase()) && parts.length > 0) {
      return `${parts.pop()} ${base}`;
    }
    return base;
  };

  if (node.type === 'ExternalAPI') {
    const urls: string[] = sem?.urls_or_args ? [...sem.urls_or_args] : [];
    if (node.name && (node.name.includes('http') || node.name.includes('/'))) {
        urls.push(node.name);
    }
    
    // First pass: Look for actual URLs
    for (const raw of urls) {
        let u = raw.replace(/^[\(\s'"]+|['"\)\s]+$/g, '');
        if (u.includes('http://') || u.includes('https://')) {
            try { 
                const host = new URL(u).hostname.replace(/^www\./, ''); 
                const parts = host.split('.');
                if (parts.length >= 2 && (parts[0] === 'api' || parts[0] === 'app')) {
                    return parts[1];
                }
                return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
            } catch { /**/ }
        }
    }
    
    // Second pass: Look for path-like strings (must contain slash, skip all-caps variables)
    for (const raw of urls) {
        let u = raw.replace(/^[\(\s'"]+|['"\)\s]+$/g, '');
        if (u.includes('/') && !u.match(/^[A-Z_]+$/)) {
            const pathMatch = u.match(/([a-zA-Z0-9_\-\/]+)/);
            if (pathMatch && pathMatch[1].length > 2) {
                let clean = pathMatch[1];
                if (clean.startsWith('/')) clean = clean.substring(1);
                const parts = clean.split('/').filter(p => p && !/^v\d+$/.test(p) && p !== 'api');
                if (parts.length > 0 && !parts[0].match(/^[A-Z_]+$/)) return parts[0];
            }
        }
    }

    const libs: string[] = sem?.libraries || [];
    if (libs.length > 0) return libs[0];
    
    if (node.name && node.name !== 'Unknown' && !node.name.includes('(') && !node.name.includes('`') && !node.name.match(/^[A-Z_]+$/)) {
       return node.name.replace(/['"]/g, '');
    }
    return file ? fileBase(file) : 'External API';
  }

  const isUgly = (n: string) => n.includes('`') || n.includes('${') || n.includes('(') || n.includes(')');
  if (node?.name && node.name !== 'Unknown' && !isUgly(node.name)) {
      // Don't return long URL strings as names
      if (!node.name.includes('http://') && !node.name.includes('https://')) {
          return node.name;
      }
  }

  if (node.type === 'API') {
    const decorator: string | undefined = sem?.decorator;
    if (decorator) {
      const pathMatch = decorator.match(/["']([^"']+)["']/);
      if (pathMatch) {
        const path = pathMatch[1]
          .replace(/^\/+|\/+$/g, '')
          .replace(/\//g, ' ')
          .replace(/api/gi, '')
          .trim();
        if (path) return `${path.toUpperCase()} API`;
      }
    }
    return classFromScope() || (file ? `${fileBase(file)} API` : 'API Endpoint');
  }

  if (node.type === 'Service') {
    if (sem?.className) return sem.className;
    return classFromScope() || (file ? fileBase(file) : 'Service');
  }

  if (node.type === 'DB') {
    const targets: string[] = (sem?.targets || []).filter(Boolean);
    if (targets.length > 0) return `${targets[0]} DB`;
    return file ? `${fileBase(file)} DB` : 'Database';
  }

  if (node.type === 'Queue') return 'Job Queue';
  if (node.type === 'Worker') return file ? fileBase(file) : 'Worker';
  if (node.type === 'Client') return 'Client';

  return file ? fileBase(file) : 'Component';
}

function pickDesc(node: DbNode): string {
  // Keep short; avoid hallucinating implementation details.
  switch (node.type) {
    case 'API':
      return 'Handles incoming requests and routes them into the system.';
    case 'Service':
      return 'Implements business logic and coordinates downstream dependencies.';
    case 'DB':
      return 'Persists and retrieves application data.';
    case 'Worker':
      return 'Runs background work triggered by async tasks.';
    case 'Queue':
      return 'Buffers asynchronous jobs/events between components.';
    case 'ExternalAPI':
      return 'Represents an external integration invoked by the system.';
    default:
      return 'Participates in the system architecture flow.';
  }
}

function toClsAndTag(nodeType: string): { cls: LivingNode['cls']; tag: string } {
  switch (nodeType) {
    case 'API':
      return { cls: 'a', tag: 'API Endpoint' };
    case 'DB':
      return { cls: 'd', tag: 'Datastore' };
    case 'Worker':
    case 'Queue':
      return { cls: 'w', tag: 'Worker' };
    case 'ExternalAPI':
      return { cls: 's', tag: 'External API' };
    default:
      return { cls: 's', tag: 'Service' };
  }
}

function degreeRank(nodes: DbNode[], edges: DbEdge[]) {
  const deg = new Map<string, number>();
  for (const n of nodes) deg.set(n.id, 0);
  for (const e of edges) {
    const s = e.fromNodeId || e.source;
    const t = e.toNodeId || e.target;
    if (s) deg.set(s, (deg.get(s) || 0) + 1);
    if (t) deg.set(t, (deg.get(t) || 0) + 1);
  }
  return deg;
}

function pickTopSubgraph(dbNodes: DbNode[], dbEdges: DbEdge[], maxNodes: number, maxEdges: number) {
  if (dbNodes.length <= maxNodes && dbEdges.length <= maxEdges) {
    return { nodes: dbNodes, edges: dbEdges, truncated: false };
  }

  const deg = degreeRank(dbNodes, dbEdges);
  const sorted = [...dbNodes].sort((a, b) => (deg.get(b.id) || 0) - (deg.get(a.id) || 0));
  const keep = new Set(sorted.slice(0, maxNodes).map(n => n.id));
  const edges = dbEdges
    .filter(e => {
      const s = e.fromNodeId || e.source;
      const t = e.toNodeId || e.target;
      return !!s && !!t && keep.has(s) && keep.has(t);
    })
    .slice(0, maxEdges);
  const nodes = dbNodes.filter(n => keep.has(n.id));
  return { nodes, edges, truncated: true };
}

function distributeRy(count: number, min: number, max: number, minGap = 0.15): number[] {
  // Always fit inside [min,max]. If minGap cannot be satisfied, we reduce it.
  if (count <= 0) return [];
  const span = Math.max(0.0001, max - min);
  if (count === 1) return [clamp01((min + max) / 2)];
  const maxStep = span / (count - 1);
  const step = Math.min(Math.max(maxStep, 0.0001), minGap);
  // If minGap is larger than we can fit, use maxStep.
  const effective = (minGap <= maxStep) ? minGap : maxStep;
  const total = effective * (count - 1);
  const start = min + (span - total) / 2;
  return Array.from({ length: count }, (_, i) => clamp01(start + i * effective));
}

function layoutColumns(
  items: Array<{ id: string }>,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  minGap: number,
  maxCols: number
): Map<string, { rx: number; ry: number }> {
  const out = new Map<string, { rx: number; ry: number }>();
  const count = items.length;
  if (count === 0) return out;

  const spanY = Math.max(0.0001, yMax - yMin);
  const maxRowsPerCol = Math.max(1, Math.floor(spanY / minGap) + 1);
  const colCount = Math.max(1, Math.min(maxCols, Math.ceil(count / maxRowsPerCol)));

  const rxForCol = (c: number) => {
    if (colCount === 1) return (xMin + xMax) / 2;
    return xMin + ((xMax - xMin) * (c / (colCount - 1)));
  };

  // Split items into columns round-robin to keep balance
  const columns: Array<Array<{ id: string }>> = Array.from({ length: colCount }, () => []);
  items.forEach((it, i) => columns[i % colCount].push(it));

  columns.forEach((colItems, c) => {
    const rys = distributeRy(colItems.length, yMin, yMax, minGap);
    colItems.forEach((it, r) => {
      out.set(it.id, { rx: clamp01(rxForCol(c)), ry: rys[r] ?? clamp01((yMin + yMax) / 2) });
    });
  });

  return out;
}

export function buildLivingArchMapData(dbNodesRaw: DbNode[], dbEdgesRaw: DbEdge[], insights?: any): LivingArchMapData {
  const { nodes: dbNodes, edges: dbEdges, truncated } = pickTopSubgraph(dbNodesRaw, dbEdgesRaw, 22, 60);

  const insightsMap = new Map<string, any>();
  if (insights && Array.isArray(insights.service_details)) {
    for (const s of insights.service_details) {
      insightsMap.set(s.id, s);
    }
  }

  const nodesWithLabel = dbNodes.map((n) => {
    const insightNode = insightsMap.get(n.id);
    let autoLabel = pickLabel(n);
    let label = insightNode?.name || autoLabel;
    
    // Intelligence engine might copy raw URLs or generic names like "page". 
    // If our programmatic extractor did a better job, force it to use autoLabel.
    if (n.type === 'ExternalAPI' || label.includes('http') || label === 'page' || label === 'index') {
        label = autoLabel;
    }
    
    // Globally clean the label to fix any Engine 1 AST leftovers
    label = cleanLabel(label, n.type || 'Component');
    
    const desc = insightNode?.description || pickDesc(n);
    const { cls, tag } = toClsAndTag(n.type);
    const id = `${slugify(label)}-${stableSuffix(n.id)}`;
    return { db: n, id, label, cls, tag, desc };
  });

  const idMap = new Map<string, string>(nodesWithLabel.map(n => [n.db.id, n.id]));

  const apis = nodesWithLabel.filter(n => n.cls === 'a');
  const dbs = nodesWithLabel.filter(n => n.cls === 'd');
  const workers = nodesWithLabel.filter(n => n.cls === 'w');
  const services = nodesWithLabel.filter(n => n.cls === 's');

  // Layout rules (rx/ry): keep readable, avoid stacking.
  // APIs: right side, vertical spread
  const apiLayout = layoutColumns(
    apis,
    0.76,
    0.88,
    0.08,
    0.92,
    0.12,
    2
  );
  // Services: center-left, wide vertical range
  const serviceLayout = layoutColumns(
    services,
    0.18,
    0.58,
    0.10,
    0.75,
    0.12,
    3
  );
  // DBs: lower center band.
  const dbLayout = layoutColumns(
    dbs,
    0.40,
    0.52,
    0.76,
    0.88,
    0.10,
    2
  );
  // Workers/Queue: bottom-center.
  const workerLayout = layoutColumns(
    workers,
    0.35,
    0.60,
    0.85,
    0.95,
    0.12,
    2
  );

  // Radial (spider web) layout: orchestrator in center, nodes in rings by type
  const centerRx = 0.5;
  const centerRy = 0.5;
  
  function radialPos(nodeCount: number, index: number, radiusRx: number, radiusRy: number) {
    const angle = (index / nodeCount) * 2 * Math.PI;
    return {
      rx: clamp01(centerRx + radiusRx * Math.cos(angle)),
      ry: clamp01(centerRy + radiusRy * Math.sin(angle)),
    };
  }

  const livingNodes: LivingNode[] = [];
  
  // APIs: outer ring (larger radius)
  apis.forEach((n, i) => {
    const p = radialPos(apis.length, i, 0.38, 0.38);
    livingNodes.push({ id: n.id, label: n.label, tag: n.tag, cls: n.cls, rx: p.rx, ry: p.ry, desc: n.desc });
  });
  
  // Services: middle ring
  services.forEach((n, i) => {
    const p = radialPos(services.length, i, 0.28, 0.28);
    livingNodes.push({ id: n.id, label: n.label, tag: n.tag, cls: n.cls, rx: p.rx, ry: p.ry, desc: n.desc });
  });
  
  // DBs: inner ring
  dbs.forEach((n, i) => {
    const p = radialPos(dbs.length, i, 0.18, 0.18);
    livingNodes.push({ id: n.id, label: n.label, tag: n.tag, cls: n.cls, rx: p.rx, ry: p.ry, desc: n.desc });
  });
  
  // Workers: inner ring (separate from DBs)
  workers.forEach((n, i) => {
    const p = radialPos(workers.length, i, 0.22, 0.22);
    livingNodes.push({ id: n.id, label: n.label, tag: n.tag, cls: n.cls, rx: p.rx, ry: p.ry, desc: n.desc });
  });

  const nodeByLivingId = new Map(livingNodes.map(n => [n.id, n]));

  const edgeKey = (f: string, t: string, l: string) => `${f}::${t}::${l}`;
  const seen = new Set<string>();

  const livingEdges: LivingEdge[] = [];
  for (const e of dbEdges) {
    const rawFrom = e.fromNodeId || e.source;
    const rawTo = e.toNodeId || e.target;
    if (!rawFrom || !rawTo) continue;
    const from = idMap.get(rawFrom);
    const to = idMap.get(rawTo);
    if (!from || !to) continue;

    const rel = (e.relationType || e.type || 'Calls').toString();
    const fromNode = nodeByLivingId.get(from);
    const toNode = nodeByLivingId.get(to);
    if (!fromNode || !toNode) continue;

    let label = 'data flow';
    if (rel === 'DBDependency') label = 'read/write';
    else if (rel === 'AsyncPipeline') label = 'queues job';
    else if (rel === 'Imports') label = 'imports';
    else if (rel === 'Calls') label = fromNode.cls === 'a' ? 'api request' : 'service call';

    const isErrorish = /error|exception/i.test(fromNode.label) || /error|exception/i.test(toNode.label);

    let clr: string = EDGE_COLORS.service;
    if (toNode.cls === 'd') clr = EDGE_COLORS.db;
    else if (toNode.cls === 'w') clr = EDGE_COLORS.worker;
    else if (fromNode.cls === 'a' && toNode.cls === 's') clr = EDGE_COLORS.api;
    else if (fromNode.cls === 's' && toNode.cls === 's') clr = EDGE_COLORS.service;
    if (isErrorish) clr = EDGE_COLORS.api;

    let w = 1.8;
    if (rel === 'Imports') w = 1.4;
    if (rel === 'DBDependency') w = 2.0;
    if (isErrorish) w = 1.4;

    const k = edgeKey(from, to, label);
    if (seen.has(k)) continue;
    seen.add(k);
    livingEdges.push({ from, to, label, clr, w });
  }

  return {
    nodes: livingNodes,
    edges: livingEdges,
    meta: {
      source: 'engine1-db',
      nodeCount: livingNodes.length,
      edgeCount: livingEdges.length,
      truncated,
    },
  };
}
