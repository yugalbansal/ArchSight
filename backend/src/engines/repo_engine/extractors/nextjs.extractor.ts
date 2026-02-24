import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import { ExtractedRoute, ParserResult } from "../schemas/architecture.schema.js";

export function extractNextjsRoutes(parsed: ParserResult, relativeFilePath: string): ExtractedRoute[] {
    const routes: ExtractedRoute[] = [];

    // Only applies to /app/**/route.ts or /pages/api/** files
    const isAppRouter = relativeFilePath.includes("app/") && relativeFilePath.endsWith("route.ts");
    const isPagesRouter = relativeFilePath.includes("pages/api/");

    // Simplification for now: Only strictly matching standard App Router and Pages Router isn't necessary 
    // if we just look for standard HTTP exported functions. But the path filter helps speed things up.
    if (!isAppRouter && !isPagesRouter) {
        return routes;
    }

    const queryString = `
        (export_statement
            declaration: (function_declaration
                name: (identifier) @method
                (#match? @method "^(GET|POST|PUT|DELETE|PATCH)$")
            )
        )
        (export_statement
            declaration: (lexical_declaration
                (variable_declarator
                    name: (identifier) @method
                    (#match? @method "^(GET|POST|PUT|DELETE|PATCH)$")
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

            if (methodNode) {
                let apiPath = relativeFilePath;

                if (isAppRouter) {
                    const appIndex = relativeFilePath.indexOf("app");
                    apiPath = relativeFilePath.substring(appIndex + 3);
                    apiPath = apiPath.replace("/route.ts", "");
                } else if (isPagesRouter) {
                    const pagesIndex = relativeFilePath.indexOf("pages");
                    apiPath = relativeFilePath.substring(pagesIndex + 5);
                    apiPath = apiPath.replace(/\.(ts|js)$/, "");
                }

                if (apiPath === "") apiPath = "/";

                routes.push({
                    method: methodNode.text.toUpperCase(),
                    path: apiPath,
                    file: relativeFilePath
                });
            }
        }
    } catch (err) {
        console.error(`[RepoEngine:Extractor] Error extracting Next.js routes from ${relativeFilePath}:`, err);
    }

    return routes;
}
