import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import { ExtractedRoute, ParserResult } from "../schemas/architecture.schema.js";

export function extractExpressRoutes(parsed: ParserResult, relativeFilePath: string): ExtractedRoute[] {
    const routes: ExtractedRoute[] = [];

    // Matches: app.get('/path', ...) or router.post('/path', ...)
    const queryString = `
        (call_expression
            function: (member_expression
                object: (identifier) @obj
                property: (property_identifier) @method
                (#match? @method "^(get|post|put|delete|patch)$")
            )
            arguments: (arguments
                (string
                    (string_fragment) @path
                )
            )
        )
    `;

    try {
        const language = parsed.language === "javascript" ? JavaScript : TypeScript.typescript;
        const query = new Parser.Query(language as Parser.Language, queryString);
        const matches = query.matches(parsed.tree.rootNode);

        for (const match of matches) {
            const methodNode = match.captures.find(c => c.name === "method")?.node;
            const pathNode = match.captures.find(c => c.name === "path")?.node;

            if (methodNode && pathNode) {
                routes.push({
                    method: methodNode.text.toUpperCase(),
                    path: pathNode.text,
                    file: relativeFilePath
                });
            }
        }
    } catch (err) {
        console.error(`[RepoEngine:Extractor] Error extracting Express routes from ${relativeFilePath}:`, err);
    }

    return routes;
}
