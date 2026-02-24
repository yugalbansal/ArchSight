import Parser from "tree-sitter";
// @ts-ignore
import JavaScript from "tree-sitter-javascript";
// @ts-ignore
import TypeScript from "tree-sitter-typescript";
// @ts-ignore
import Python from "tree-sitter-python";
import { ParserResult } from "../schemas/architecture.schema.js";

export interface FileStructure {
    file: string;
    language: string;
    functions: string[];
    classes: string[];
    imports: string[];
    exports: string[];
}

/**
 * Generic AST Extractor — works for ANY framework.
 * Walks the Tree-sitter AST to extract function/class/import/export declarations.
 * This guarantees useful structural output even if the specific framework is unknown.
 */
export function extractGenericStructure(parsed: ParserResult, relativeFilePath: string): FileStructure {
    const structure: FileStructure = {
        file: relativeFilePath,
        language: parsed.language,
        functions: [],
        classes: [],
        imports: [],
        exports: [],
    };

    const root = parsed.tree.rootNode;

    function walk(node: Parser.SyntaxNode) {
        // JavaScript/TypeScript function declarations: function foo() {}
        if (node.type === "function_declaration") {
            const nameNode = node.childForFieldName("name");
            if (nameNode) structure.functions.push(nameNode.text);
        }

        // Arrow functions assigned to variables: const foo = () => {}
        if (node.type === "lexical_declaration" || node.type === "variable_declaration") {
            for (const child of node.children) {
                if (child.type === "variable_declarator") {
                    const nameNode = child.childForFieldName("name");
                    const valueNode = child.childForFieldName("value");
                    if (nameNode && valueNode && (valueNode.type === "arrow_function" || valueNode.type === "function")) {
                        structure.functions.push(nameNode.text);
                    }
                }
            }
        }

        // Class declarations
        if (node.type === "class_declaration") {
            const nameNode = node.childForFieldName("name");
            if (nameNode) structure.classes.push(nameNode.text);
        }

        // Python: function definitions
        if (node.type === "function_definition") {
            const nameNode = node.childForFieldName("name");
            if (nameNode) structure.functions.push(nameNode.text);
        }

        // Python: class definitions
        if (node.type === "class_definition") {
            const nameNode = node.childForFieldName("name");
            if (nameNode) structure.classes.push(nameNode.text);
        }

        // Import statements (JS/TS)
        if (node.type === "import_statement") {
            structure.imports.push(node.text.slice(0, 120)); // Truncate long imports
        }

        // Import statements (Python)
        if (node.type === "import_from_statement" || node.type === "import_statement") {
            structure.imports.push(node.text.slice(0, 120));
        }

        // Export statements (JS/TS)
        if (node.type === "export_statement") {
            structure.exports.push(node.text.slice(0, 120));
        }

        // Method definitions inside classes (JS/TS)
        if (node.type === "method_definition") {
            const nameNode = node.childForFieldName("name");
            if (nameNode) {
                structure.functions.push(nameNode.text);
            }
        }

        for (const child of node.children) {
            walk(child);
        }
    }

    walk(root);
    return structure;
}
