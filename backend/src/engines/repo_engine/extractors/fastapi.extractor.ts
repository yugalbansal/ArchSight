import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import { ExtractedRoute, ParserResult } from "../schemas/architecture.schema.js";

export function extractFastApiRoutes(parsed: ParserResult, relativeFilePath: string): ExtractedRoute[] {
    const routes: ExtractedRoute[] = [];

    if (parsed.language !== "python") return routes;

    // Matches: @app.get("/path")
    const queryString = `
        (decorated_definition
            (decorator
                (call
                    function: (attribute
                        attribute: (identifier) @method
                        (#match? @method "^(get|post|put|delete|patch)$")
                    )
                    arguments: (argument_list
                        (string
                            (string_content) @path
                        )
                    )
                )
            )
        )
    `;

    try {
        const query = new Parser.Query(Python as Parser.Language, queryString);
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
        console.error(`[RepoEngine:Extractor] Error extracting FastAPI routes from ${relativeFilePath}:`, err);
    }

    return routes;
}
