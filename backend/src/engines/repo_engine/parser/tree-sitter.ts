import fs from "fs/promises";
import path from "path";
import Parser from "tree-sitter";
// @ts-ignore
import JavaScript from "tree-sitter-javascript";
// @ts-ignore
import TypeScript from "tree-sitter-typescript";
// @ts-ignore
import Python from "tree-sitter-python";
import { ParserResult, SupportedLanguage } from "../schemas/architecture.schema.js";

/**
 * Identify logical language exclusively by extension.
 */
export function getLanguageForFile(filePath: string): SupportedLanguage {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".js" || ext === ".jsx") return "javascript";
    if (ext === ".ts" || ext === ".tsx") return "typescript";
    if (ext === ".py") return "python";
    return "unknown";
}

/**
 * Initialize Tree-sitter and returns the Abstract Syntax Tree (AST) for a single file.
 */
export async function parseFileAst(filePath: string): Promise<ParserResult | null> {
    const lang = getLanguageForFile(filePath);
    if (lang === "unknown") return null;

    const parser = new Parser();

    switch (lang) {
        case "javascript":
            parser.setLanguage(JavaScript as Parser.Language);
            break;
        case "typescript":
            parser.setLanguage(TypeScript.typescript as Parser.Language);
            break;
        case "python":
            parser.setLanguage(Python as Parser.Language);
            break;
    }

    const sourceCode = await fs.readFile(filePath, "utf-8");
    const tree = parser.parse(sourceCode);

    return {
        tree,
        language: lang
    };
}
