import { ASTReference, SignalBatch } from "../core/scan_context.js";
import { resolveScope } from "../evidence/scope_resolver.js";

/**
 * Service Pattern Extractor
 * Detects:
 *  - Classes/Functions with high dependency injection/imports
 *  - Typical "Service" naming conventions and structural markers
 * 
 * Outputs: SignalBatch
 */
export async function extractServicePattern(astRef: ASTReference): Promise<SignalBatch[]> {
    const signals: SignalBatch[] = [];

    let tree;
    try {
        tree = await astRef.load();
    } catch {
        return [];
    }

    try {
        walk(tree.rootNode, astRef.filepath, signals);
    } finally {
        astRef.release();
    }

    return signals;
}

function walk(node: any, filepath: string, signals: SignalBatch[]) {
    // 1. Detect Class names containing "Service", "Manager", "Handler"
    if (node.type === "class_declaration" || node.type === "class_definition") {
        const nameNode = node.childForFieldName("name");

        if (nameNode && /(Service|Manager|Handler|Factory|Repository|Engine)$/i.test(nameNode.text)) {
            const scope = resolveScope(node, filepath);

            signals.push({
                kind: "service_class",
                scopeId: scope.id,
                parentScopeId: scope.parentId,
                scopeType: scope.type,
                file: filepath,
                occurrences: 1,
                metadata_summary: {
                    className: nameNode.text
                }
            });
        }
    }

    // 2. Detect high import / dependency injection patterns (e.g. constructor assignment in TS/Java)
    if (node.type === "lexical_declaration" || node.type === "variable_declaration") {
        const text = node.text;
        if (text.includes("new ") && /(Service|Manager|Repository)/i.test(text)) {
            const scope = resolveScope(node, filepath);
            signals.push({
                kind: "dependency_instantiation",
                scopeId: scope.id,
                parentScopeId: scope.parentId,
                scopeType: scope.type,
                file: filepath,
                occurrences: 1,
                metadata_summary: {
                    snippet: text.substring(0, 50)
                }
            });
        }
    }

    if (node.children) {
        for (const child of node.children) {
            walk(child, filepath, signals);
        }
    }
}
