import { ASTReference, SignalBatch } from "../core/scan_context.js";
import { resolveScope } from "../evidence/scope_resolver.js";

/**
 * Route Pattern Extractor
 * Detects:
 *  - Request/Response parameters
 *  - decorators
 *  - callback registrations
 *
 * Outputs: SignalBatch
 */
export async function extractRoutePattern(astRef: ASTReference): Promise<SignalBatch[]> {
    const signals: SignalBatch[] = [];

    // Memory-safe AST Lifecycle: Load tree, analyze, release
    let tree;
    try {
        tree = await astRef.load();
    } catch (err) {
        return [];
    }

    try {
        // Walk the AST looking for handler patterns
        const root = tree.rootNode;
        walk(root, astRef.filepath, signals);
    } finally {
        astRef.release();
    }

    return signals;
}

function walk(node: any, filepath: string, signals: SignalBatch[]) {
    // 1. Detect Handler Registrations: app.get("/path", fn)
    if (node.type === "call_expression") {
        const fn = node.childForFieldName("function");
        if (fn && (fn.type === "member_expression" || fn.type === "attribute")) {
            const prop = fn.childForFieldName("property") || fn.childForFieldName("attribute");
            const obj = fn.childForFieldName("object"); // e.g. 'app', 'router', 'Promise'

            if (prop && /^(get|post|put|delete|patch|use|all)$/.test(prop.text)) {

                // Extract arguments to check if it has structural routing elements like Request/Response params
                const argsNode = node.childForFieldName("arguments");
                const argsText = argsNode ? argsNode.text : "";

                // Found a handler registration
                const scope = resolveScope(node, filepath);
                signals.push({
                    kind: "handler_registration",
                    scopeId: scope.id,
                    parentScopeId: scope.parentId,
                    scopeType: scope.type,
                    file: filepath,
                    occurrences: 1,
                    metadata_summary: {
                        method: prop.text.toUpperCase(),
                        text: node.text.slice(0, 100),
                        argsPreview: argsText.slice(0, 100)
                    }
                });
            }
        }
    }

    // 2. Detect decorators (Python @app.get, Java @GetMapping)
    if (node.type === "decorator" || node.type === "annotation") {
        if (/(get|post|put|delete|patch|request)mapping/i.test(node.text) || /\.(get|post|put|delete)/i.test(node.text)) {
            const scopeNode = node.parent || node;
            const scope = resolveScope(scopeNode, filepath);

            signals.push({
                kind: "route_decorator",
                scopeId: scope.id,
                parentScopeId: scope.parentId,
                scopeType: scope.type,
                file: filepath,
                occurrences: 1,
                metadata_summary: {
                    decorator: node.text.slice(0, 50)
                }
            });
        }
    }

    // Recurse
    if (node.children) {
        for (const child of node.children) {
            walk(child, filepath, signals);
        }
    }
}
