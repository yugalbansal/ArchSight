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

        let name = "Unknown";
        if (semNode.metadata.method || semNode.metadata.decorator) {
            name = `[${semNode.metadata.method || semNode.metadata.decorator}] Boundary`;
        }

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
 * Lightweight AST walker to extract file-level structural metadata.
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
