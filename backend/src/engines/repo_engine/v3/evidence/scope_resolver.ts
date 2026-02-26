import { ASTTree } from "../../schemas/architecture.schema.js";

/**
 * Scope Types
 */
export type ScopeType = "repository" | "file" | "class" | "function" | "block";

export interface ResolvedScope {
    id: string; // e.g. "src/main.ts::Class=App::Function=init"
    parentId: string | null;
    type: ScopeType;
    name: string;
}

/**
 * Universal Scope Resolver
 * Walks up the AST from any given node to build a deterministic scope hierarchy.
 */
export function resolveScope(node: any, filepath: string): ResolvedScope {

    const classScope = findEnclosingScope(node, ["class_declaration", "class_definition"]);
    const funcScope = findEnclosingScope(node, ["function_declaration", "method_definition", "arrow_function", "function_definition"]);

    let type: ScopeType = "file";
    let name = filepath;
    let id = filepath;
    let parentId: string | null = "repository"; // All files belong to the repository

    // If inside a class
    if (classScope) {
        const className = getIdentifierName(classScope) || "AnonymousClass";
        id = `${filepath}::Class=${className}`;
        type = "class";
        name = className;
        parentId = filepath; // Class belongs to file
    }

    // If inside a function (could be inside a class or file)
    if (funcScope) {
        const funcName = getIdentifierName(funcScope) || "AnonymousFunction";

        // If it's a method inside a class
        if (classScope) {
            parentId = id; // Parent is the Class
            id = `${id}::Function=${funcName}`;
        } else {
            parentId = filepath; // Parent is the File
            id = `${filepath}::Function=${funcName}`;
        }

        type = "function";
        name = funcName;
    }

    // Note: 'block' scope (like inside an if-statement) is often too granular for architecture,
    // so we cap resolution at the Function level for standard architectural signals.

    return { id, parentId, type, name };
}

// ─── Helpers ────────────────────────────────────────────────────────

function findEnclosingScope(node: any, types: string[]): any | null {
    let current = node.parent;
    while (current) {
        if (types.includes(current.type)) {
            return current;
        }
        current = current.parent;
    }
    return null;
}

function getIdentifierName(node: any): string | null {
    // Try to find the name/identifier child
    const nameNode = node.childForFieldName("name") || node.childForFieldName("identifier") || node.children.find((c: any) => c.type === "identifier");
    return nameNode ? nameNode.text : null;
}
