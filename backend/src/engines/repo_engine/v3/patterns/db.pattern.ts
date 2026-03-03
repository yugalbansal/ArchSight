import { ASTReference, SignalBatch } from "../core/scan_context.js";
import { resolveScope } from "../evidence/scope_resolver.js";

/**
 * Database Pattern Extractor
 * Detects:
 *  - ORM patterns (find, update, create, delete, execute, query, save)
 *  - SQL-like strings
 * 
 * Outputs: SignalBatch
 */
export async function extractDbPattern(astRef: ASTReference): Promise<SignalBatch[]> {
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
    // 1. Detect ORM-style persistence calls
    if (node.type === "call_expression") {
        const fn = node.childForFieldName("function");
        if (fn && (fn.type === "member_expression" || fn.type === "attribute")) {
            const prop = fn.childForFieldName("property") || fn.childForFieldName("attribute");

            if (prop && /^(findMany|findOne|findById|create|update|delete|save|execute|query|insert|bulkCreate|add|commit|refresh|fetch_all|fetch_one)$/i.test(prop.text)) {
                const scope = resolveScope(node, filepath);
                signals.push({
                    kind: "persistence_op",
                    scopeId: scope.id,
                    parentScopeId: scope.parentId,
                    scopeType: scope.type,
                    file: filepath,
                    occurrences: 1,
                    metadata_summary: {
                        operation: prop.text,
                        target: fn.text.split(".")[0], // e.g. "db", "user", "prisma"
                        text: fn.text                  // full expression e.g. "prisma.user"
                    }
                });
            }
        }
    }

    // 2. Detect RAW SQL strings
    if (node.type === "string" || node.type === "template_string" || node.type === "string_literal") {
        const txt = node.text.toUpperCase();
        if (txt.includes("SELECT ") && txt.includes(" FROM ") ||
            txt.includes("INSERT INTO ") ||
            txt.includes("UPDATE ") && txt.includes(" SET ") ||
            txt.includes("DELETE FROM ")) {

            const scope = resolveScope(node, filepath);
            signals.push({
                kind: "sql_query",
                scopeId: scope.id,
                parentScopeId: scope.parentId,
                scopeType: scope.type,
                file: filepath,
                occurrences: 1,
                metadata_summary: {
                    queryPreview: node.text.substring(0, 100)
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
