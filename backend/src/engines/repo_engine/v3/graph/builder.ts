import { ScanContext } from "../core/scan_context.js";

// ─── Canonical types from shared schema ──────────────────────────────
// Re-exported so that existing imports (`from "…/graph/builder.js"`) keep working.
export type {
    ArchitectureNode,
    ArchitectureEdge,
    FileStructureEntry,
    ArchitectureGraph,
} from "../../../../schemas/architecture-graph.schema.js";

import type {
    ArchitectureNode,
    ArchitectureEdge,
    FileStructureEntry,
    ArchitectureGraph,
} from "../../../../schemas/architecture-graph.schema.js";

/**
 * Graph Builder — builds nodes AND edges from the semantic context.
 *
 * Edge inference strategy (in priority order):
 *   1. Scope-chain edges: nodes that share a parent scope (same class/function) → strongly related
 *   2. Co-file edges: nodes in the same file → likely related
 *   3. Type-affinity edges: endpoint→service, service→db, endpoint→db by file proximity
 *   4. Cross-file import edges: node in file A imports from file B where another node lives
 *   5. Worker→service co-file: queue workers in same file as services
 */
export async function buildArchitectureGraph(context: ScanContext): Promise<ArchitectureGraph> {
    const graph: ArchitectureGraph = { nodes: [], edges: [], file_structure: [] };

    // ── Semantic Node Construction ────────────────────────────────────
    for (const semNode of context.semanticNodes) {
        if (semNode.confidence < 0.4) continue;

        const name = deriveNodeName(semNode);

        graph.nodes.push({
            id: semNode.id,
            type: semNode.type,
            name,
            file: semNode.file,
            metadata: semNode.metadata,
            confidence: semNode.confidence,
        });
    }

    // ── File Structure Extraction ──────────────────────────────────────
    const fileStructureMap = new Map<string, FileStructureEntry>();

    for (const [filepath, astRef] of Object.entries(context.astIndex)) {
        let tree;
        try {
            tree = await astRef.load();
        } catch { continue; }

        try {
            const entry: FileStructureEntry = {
                file: filepath,
                language: astRef.language,
                functions: [],
                classes: [],
                imports: [],
                exports: [],
            };
            walkForStructure(tree.rootNode, entry, astRef.language);
            graph.file_structure.push(entry);
            fileStructureMap.set(filepath, entry);
        } finally {
            astRef.release();
        }
    }

    // ── Edge Inference ────────────────────────────────────────────────
    graph.edges = inferEdges(graph.nodes, fileStructureMap);

    return graph;
}

/**
 * Infers edges between architecture nodes using multiple strategies.
 */
function inferEdges(
    nodes: ArchitectureNode[],
    fileStructureMap: Map<string, FileStructureEntry>
): ArchitectureEdge[] {
    const edges: ArchitectureEdge[] = [];
    const edgeSet = new Set<string>(); // dedup

    function addEdge(source: string, target: string, type: ArchitectureEdge["type"]) {
        if (source === target) return;
        const key = `${source}→${target}`;
        if (edgeSet.has(key)) return;
        edgeSet.add(key);
        edges.push({ source, target, type });
    }

    // ── Group nodes by file ───────────────────────────────────────────
    const nodesByFile = new Map<string, ArchitectureNode[]>();
    for (const node of nodes) {
        if (!nodesByFile.has(node.file)) nodesByFile.set(node.file, []);
        nodesByFile.get(node.file)!.push(node);
    }

    // ── Strategy 1: Scope-chain edges ─────────────────────────────────
    // Nodes that share the same parent scopeId are tightly related.
    // We don't have direct scope access here, so we use file + type affinity.

    // ── Strategy 2: Type-affinity edges within the same file ─────────
    // Within a file: endpoint → service → db (layered call chain)
    const TYPE_PRIORITY: Record<string, number> = {
        http_endpoint: 0,
        business_logic_service: 1,
        db_operation: 2,
        external_service: 2,
        queue_worker: 1,
    };

    for (const [, fileNodes] of nodesByFile) {
        const sorted = [...fileNodes].sort((a, b) =>
            (TYPE_PRIORITY[a.type] ?? 9) - (TYPE_PRIORITY[b.type] ?? 9)
        );

        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                const src = sorted[i];
                const tgt = sorted[j];

                // Endpoint → Service
                if (src.type === "http_endpoint" && tgt.type === "business_logic_service") {
                    addEdge(src.id, tgt.id, "endpoint_to_service");
                }
                // Endpoint → DB (no service layer)
                else if (src.type === "http_endpoint" && tgt.type === "db_operation") {
                    addEdge(src.id, tgt.id, "endpoint_to_db");
                }
                // Service → DB
                else if (src.type === "business_logic_service" && tgt.type === "db_operation") {
                    addEdge(src.id, tgt.id, "service_to_db");
                }
                // Service → External
                else if (src.type === "business_logic_service" && tgt.type === "external_service") {
                    addEdge(src.id, tgt.id, "service_to_external");
                }
                // Endpoint → External
                else if (src.type === "http_endpoint" && tgt.type === "external_service") {
                    addEdge(src.id, tgt.id, "service_to_external");
                }
                // Worker → Service (same file)
                else if (src.type === "queue_worker" && tgt.type === "business_logic_service") {
                    addEdge(src.id, tgt.id, "worker_to_service");
                }
                // Co-location: same file, different types not covered above
                else {
                    addEdge(src.id, tgt.id, "co_location");
                }
            }
        }
    }

    // ── Strategy 3: Cross-file import edges ───────────────────────────
    // If file A imports from file B, connect nodes in A to nodes in B.
    // We match import paths to node files.

    const normalizeImportPath = (importerFile: string, importPath: string): string | null => {
        // Only handle relative imports
        if (!importPath.startsWith(".")) return null;
        const dir = importerFile.substring(0, importerFile.lastIndexOf("/"));
        // Strip quotes and "from " prefix
        const cleanPath = importPath
            .replace(/^.*?["'](.+)["'].*$/, "$1")
            .replace(/["']/g, "");
        if (!cleanPath.startsWith(".")) return null;

        // Resolve the path (strip extension for matching)
        const resolved = dir + "/" + cleanPath;
        return resolved.replace(/\/\.\//g, "/").replace(/\.(js|ts|tsx|jsx)$/, "");
    };

    // Build a map from normalized-file-path → nodes
    const nodesByNormalizedFile = new Map<string, ArchitectureNode[]>();
    for (const node of nodes) {
        const norm = node.file.replace(/\.(js|ts|tsx|jsx)$/, "");
        if (!nodesByNormalizedFile.has(norm)) nodesByNormalizedFile.set(norm, []);
        nodesByNormalizedFile.get(norm)!.push(node);
    }

    for (const [importerFile, entry] of fileStructureMap) {
        const importerNodes = nodesByFile.get(importerFile);
        if (!importerNodes || importerNodes.length === 0) continue;

        for (const rawImport of entry.imports) {
            const resolved = normalizeImportPath(importerFile, rawImport);
            if (!resolved) continue;

            // Find nodes in the imported file
            for (const [normFile, targetNodes] of nodesByNormalizedFile) {
                if (!normFile.endsWith(resolved) && !resolved.endsWith(normFile.split("/").pop()!)) continue;
                if (normFile === importerFile.replace(/\.(js|ts|tsx|jsx)$/, "")) continue;

                for (const srcNode of importerNodes) {
                    for (const tgtNode of targetNodes) {
                        if (srcNode.type === "http_endpoint" && tgtNode.type === "business_logic_service") {
                            addEdge(srcNode.id, tgtNode.id, "endpoint_to_service");
                        } else if (srcNode.type === "business_logic_service" && tgtNode.type === "db_operation") {
                            addEdge(srcNode.id, tgtNode.id, "service_to_db");
                        } else if (srcNode.type === "http_endpoint" && tgtNode.type === "db_operation") {
                            addEdge(srcNode.id, tgtNode.id, "endpoint_to_db");
                        } else {
                            addEdge(srcNode.id, tgtNode.id, "cross_file_import");
                        }
                    }
                }
            }
        }
    }

    // ── Strategy 4: Global type-affinity cross-file edges ─────────────
    // When no scope/import info is available, use global type-affinity:
    // All services connect to all DB ops (they must talk to persistence).
    // This is a weaker signal — only used when no same-file or import edges exist.

    const allEndpoints = nodes.filter(n => n.type === "http_endpoint");
    const allServices = nodes.filter(n => n.type === "business_logic_service");
    const allDbOps = nodes.filter(n => n.type === "db_operation");
    const allWorkers = nodes.filter(n => n.type === "queue_worker");

    // If no same-file edges were generated between endpoints and services,
    // fall back to global type affinity (smaller repos or monolith structures)
    const hasEndpointServiceEdges = edges.some(e =>
        e.type === "endpoint_to_service" || e.type === "endpoint_to_db"
    );

    if (!hasEndpointServiceEdges && allEndpoints.length > 0) {
        // Connect each endpoint to each service (global affinity)
        const MAX_CROSS = 3; // cap to prevent dense graphs on large repos
        for (const ep of allEndpoints.slice(0, MAX_CROSS)) {
            for (const svc of allServices.slice(0, MAX_CROSS)) {
                addEdge(ep.id, svc.id, "endpoint_to_service");
            }
            for (const db of allDbOps.slice(0, MAX_CROSS)) {
                if (allServices.length === 0) {
                    addEdge(ep.id, db.id, "endpoint_to_db");
                }
            }
        }
    }

    const hasServiceDbEdges = edges.some(e => e.type === "service_to_db");
    if (!hasServiceDbEdges && allServices.length > 0 && allDbOps.length > 0) {
        const MAX_CROSS = 4;
        for (const svc of allServices.slice(0, MAX_CROSS)) {
            for (const db of allDbOps.slice(0, MAX_CROSS)) {
                addEdge(svc.id, db.id, "service_to_db");
            }
        }
    }

    // Workers connect to services they likely dispatch
    const hasWorkerEdges = edges.some(e => e.type === "worker_to_service");
    if (!hasWorkerEdges && allWorkers.length > 0 && allServices.length > 0) {
        for (const wk of allWorkers) {
            for (const svc of allServices.slice(0, 2)) {
                addEdge(wk.id, svc.id, "worker_to_service");
            }
        }
    }

    return edges;
}

/**
 * Derives a human-readable name for a semantic node from its type and metadata.
 * Priority: explicit class/service name > scopeId class > file basename > URL/host > operation targets > type label.
 */
function deriveNodeName(semNode: any): string {
    const m = semNode.metadata || {};
    const type: string = semNode.type || "";

    // Explicit class or service name (service_class signals put this in metadata)
    if (m.className) return m.className;
    if (m.serviceName) return m.serviceName;
    if (m.name) return m.name;

    // HTTP endpoint: build label from method + path or decorator
    if (type === "http_endpoint") {
        if (m.method && m.path) return `${m.method.toUpperCase()} ${m.path}`;
        if (m.decorator) {
            const raw = String(m.decorator);
            const pathMatch = raw.match(/["']([^"']+)["']/);
            if (pathMatch) {
                const path = pathMatch[1].replace(/^\/+|\/+$/g, "").replace(/\//g, " ").replace(/api/gi, "").trim();
                if (path) return `${path.toUpperCase()} API`;
            }
            const verbMatch = raw.match(/@?(Get|Post|Put|Delete|Patch|Request)Mapping/i);
            if (verbMatch) return `${verbMatch[1].toUpperCase()} API`;
            return raw.replace(/[@()"']/g, "").trim() || "API Endpoint";
        }
        if (m.method) return `${m.method.toUpperCase()} Endpoint`;
        const classMatch = semNode.scopeId?.match(/Class=([^:]+)/);
        if (classMatch) return classMatch[1];
        return "API Endpoint";
    }

    // For service nodes: try to derive name from scopeId when className is missing
    if (type === "business_logic_service") {
        const classMatch = semNode.scopeId?.match(/Class=([^:]+)/);
        if (classMatch) return classMatch[1];
        if (semNode.file) {
            const base = semNode.file.split("/").pop() || semNode.file;
            return base.replace(/\.[^.]+$/, "");
        }
        return "Service";
    }

    // External service: prefer URL hostname or library name
    if (type === "external_service") {
        const urls: string[] = m.urls_or_args || [];
        for (const u of urls) {
            try { return new URL(u).hostname.replace(/^www\./, ""); } catch { /* not a URL */ }
            if (u && u.trim()) return u.trim().slice(0, 40);
        }
        const libs: string[] = m.libraries || [];
        if (libs.length > 0) return libs[0];
        if (semNode.file) {
            const base = semNode.file.split("/").pop() || semNode.file;
            return base.replace(/\.[^.]+$/, "");
        }
        return "External Service";
    }

    // DB operation: use real model targets or file basename
    if (type === "db_operation") {
        const targets: string[] = (m.targets || []).filter((t: string) => !!t);
        if (targets.length > 0) return `${targets[0]} DB`;
        if (semNode.file) {
            const base = semNode.file.split("/").pop() || semNode.file;
            return base.replace(/\.[^.]+$/, "");
        }
        return "Database";
    }

    // Queue / worker types
    if (type === "message_consumer") return "Message Consumer";
    if (type === "message_publisher") return "Message Publisher";
    if (type === "message_processor") return "Message Processor";
    if (type === "background_worker") return "Background Worker";

    // Universal fallback: file basename
    if (semNode.file) {
        const base = semNode.file.split("/").pop() || semNode.file;
        return base.replace(/\.[^.]+$/, "");
    }

    return "Service";
}

/**
 * Lightweight AST walker to extract file-level structural metadata.
 */
function walkForStructure(node: any, entry: FileStructureEntry, language: string) {
    if (!node) return;

    const type = node.type;

    if (type === "function_declaration" || type === "method_definition" ||
        type === "function_definition" || type === "arrow_function") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) entry.functions.push(nameNode.text);
    }

    if (type === "class_declaration" || type === "class_definition") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) entry.classes.push(nameNode.text);
    }

    if (type === "import_statement" || type === "import_from_statement") {
        entry.imports.push(node.text.slice(0, 120));
    }

    if (type === "export_statement" || type === "export_default_declaration") {
        entry.exports.push(node.text.slice(0, 120));
    }

    if (node.children) {
        for (const child of node.children) {
            walkForStructure(child, entry, language);
        }
    }
}
