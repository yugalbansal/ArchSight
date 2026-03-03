import { ScanContext } from "../core/scan_context.js";

export interface ArchitectureNode {
    id: string;
    type: string;
    name: string;
    file: string;
    metadata: Record<string, any>;
    confidence: number;
}

export interface FileStructureEntry {
    file: string;
    language: string;
    functions: string[];
    classes: string[];
    imports: string[];
    exports: string[];
}

export interface ArchitectureGraph {
    nodes: ArchitectureNode[];
    edges: any[];
    file_structure: FileStructureEntry[];
}

/**
 * Graph Builder (PURE CONSTRUCTOR)
 * Takes Semantic Nodes and builds the final Architecture Graph.
 * Also extracts file-level structural metadata from the AST index.
 * No inference or classification is allowed here.
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
            name: name,
            file: semNode.file,
            metadata: semNode.metadata,
            confidence: semNode.confidence
        });
    }

    // ── File Structure Extraction ──────────────────────────────────────
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
        } finally {
            astRef.release();
        }
    }

    return graph;
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
            // Spring-style: @RequestMapping("/api/users") or @GetMapping("/users")
            const pathMatch = raw.match(/["']([^"']+)["']/);
            if (pathMatch) {
                const path = pathMatch[1].replace(/^\/+|\/+$/g, "").replace(/\//g, " ").replace(/api/gi, "").trim();
                if (path) return `${path.toUpperCase()} API`;
            }
            // e.g. @GetMapping → "GET API"
            const verbMatch = raw.match(/@?(Get|Post|Put|Delete|Patch|Request)Mapping/i);
            if (verbMatch) return `${verbMatch[1].toUpperCase()} API`;
            return raw.replace(/[@()"']/g, "").trim() || "API Endpoint";
        }
        if (m.method) return `${m.method.toUpperCase()} Endpoint`;
        // Fallback: extract class name from scopeId e.g. "src/UserController.ts::Class=UserController"
        const classMatch = semNode.scopeId?.match(/Class=([^:]+)/);
        if (classMatch) return classMatch[1];
        return "API Endpoint";
    }

    // For service nodes: try to derive name from scopeId when className is missing
    if (type === "business_logic_service") {
        // scopeId format: "src/auth/AuthService.ts::Class=AuthService"
        const classMatch = semNode.scopeId?.match(/Class=([^:]+)/);
        if (classMatch) return classMatch[1];
        // Fall back to file basename
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
        // Fallback to file basename
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
        // Fall back to file basename
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
 * Framework-agnostic: works on raw AST node types.
 */
function walkForStructure(node: any, entry: FileStructureEntry, language: string) {
    if (!node) return;

    const type = node.type;

    // Functions
    if (type === "function_declaration" || type === "method_definition" ||
        type === "function_definition" || type === "arrow_function") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) entry.functions.push(nameNode.text);
    }

    // Classes
    if (type === "class_declaration" || type === "class_definition") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) entry.classes.push(nameNode.text);
    }

    // Imports
    if (type === "import_statement" || type === "import_from_statement") {
        entry.imports.push(node.text.slice(0, 120));
    }

    // Exports
    if (type === "export_statement" || type === "export_default_declaration") {
        entry.exports.push(node.text.slice(0, 120));
    }

    // Recurse
    if (node.children) {
        for (const child of node.children) {
            walkForStructure(child, entry, language);
        }
    }
}
