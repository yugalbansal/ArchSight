import { ASTReference, SignalBatch } from "../core/scan_context.js";
import { resolveScope } from "../evidence/scope_resolver.js";

/**
 * HTTP Client Pattern Extractor
 * Detects:
 *  - fetch, axios, requests calls
 *  - HTTP verbs (get, post, put, delete, patch) coupled with URL-like strings
 * 
 * Outputs: SignalBatch
 */
export async function extractHttpPattern(astRef: ASTReference): Promise<SignalBatch[]> {
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
    if (node.type === "call_expression") {
        const fnName = getCallName(node);
        const argsText = getArgumentsText(node);

        if (fnName) {
            const isHttpLib = /^(fetch|axios|requests)(\.(get|post|put|delete|patch|request))?$/.test(fnName);
            const isHttpVerb = /^(get|post|put|delete|patch)$/.test(fnName);
            const hasUrl = argsText.includes('http://') || argsText.includes('https://') || /['"]\//.test(argsText);

            if (isHttpLib || (isHttpVerb && hasUrl)) {
                const scope = resolveScope(node, filepath);
                signals.push({
                    kind: "network_request",
                    scopeId: scope.id,
                    parentScopeId: scope.parentId,
                    scopeType: scope.type,
                    file: filepath,
                    occurrences: 1,
                    metadata_summary: {
                        library: fnName,
                        args: argsText.substring(0, 100)
                    }
                });
            }
        }
    }

    if (node.children) {
        for (const child of node.children) {
            walk(child, filepath, signals);
        }
    }
}

function getCallName(node: any): string | null {
    const fn = node.childForFieldName("function");
    if (!fn) return null;
    return fn.text;
}

function getArgumentsText(node: any): string {
    const args = node.childForFieldName("arguments");
    return args ? args.text : "";
}
