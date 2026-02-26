import { ASTTree, SupportedLanguage } from "../../schemas/architecture.schema.js";
import { ASTIndex, ASTReference } from "../core/scan_context.js";
import { Parser } from "web-tree-sitter";
import { getLanguageGrammar } from "./tree-sitter.js";
import fs from "fs/promises";
import path from "path";

/**
 * Lazy AST Indexer
 * Prevents OOM by loading parsing trees only when requested,
 * and releasing them immediately when done.
 */
export class LazyAstIndexer {
    private parser: Parser;

    constructor(parser: Parser) {
        this.parser = parser;
    }

    public buildIndex(files: { path: string, language: string }[]): ASTIndex {
        const index: ASTIndex = {};

        for (const file of files) {
            let cachedTree: ASTTree | null = null;
            let refCount = 0;

            const ref: ASTReference = {
                filepath: file.path,
                language: file.language,

                load: async (): Promise<ASTTree> => {
                    refCount++;
                    if (cachedTree) return cachedTree;

                    // Load grammar
                    const grammar = await getLanguageGrammar(file.language as SupportedLanguage);
                    if (!grammar) throw new Error(`Grammar not found for ${file.language}`);
                    this.parser.setLanguage(grammar);

                    // Read file and parse
                    const content = await fs.readFile(file.path, "utf-8");
                    cachedTree = this.parser.parse(content) as unknown as ASTTree;
                    return cachedTree;
                },

                release: () => {
                    refCount--;
                    if (refCount <= 0 && cachedTree) {
                        // In web-tree-sitter, trees should be explicitly deleted to free WASM memory
                        (cachedTree as any).delete?.();
                        cachedTree = null;
                    }
                }
            };
            index[file.path] = ref;
        }

        return index;
    }
}
