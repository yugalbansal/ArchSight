import path from "path";
import crypto from "crypto";

import {
    cloneRepositoryEphemeral,
    detectFramework,
    walkDir,
    parseFileAst,
    extractExpressRoutes,
    extractNextjsRoutes,
    extractFastApiRoutes,
    ExtractedArchitecture,
    EngineScanResult
} from "../engines/repo_engine/index.js";

export class AnalysisService {

    /**
     * Main entrypoint for the Code-Vision Engine Orchestrator.
     * Combines pure RepoEngine modules to orchestrate the scan.
     */
    static async scanRepository(
        owner: string,
        repo: string,
        branch: string = "main",
        token?: string
    ): Promise<EngineScanResult> {
        console.log(`[AnalysisService:Orchestrator] Starting scan for ${owner}/${repo}@${branch}`);
        let job = null;
        const startTime = Date.now();

        try {
            // STEP 1: Ephemeral Clone
            job = await cloneRepositoryEphemeral(owner, repo, branch, token);
            const rootPath = job.path;

            // STEP 2: Framework Detection
            const framework = await detectFramework(rootPath);
            console.log(`[AnalysisService:Orchestrator] Detected framework: ${framework}`);

            // Initialize the structured data object
            const architecture: ExtractedArchitecture = {
                services: [],
                routes: [],
                db_models: [],
                queues: [],
                external_apis: [],
                llm_calls: []
            };

            // STEP 3: Walk repository and parse files
            console.log(`[AnalysisService:Orchestrator] Scanning files...`);
            const allFiles = await walkDir(rootPath);

            for (const filePath of allFiles) {
                // Parse file AST (Pure Function)
                const parsed = await parseFileAst(filePath);
                if (!parsed) continue;

                // Relative clean path for the JSON output (e.g. "src/routes/user.ts")
                const relativePath = path.relative(rootPath, filePath);

                // STEP 4: Extraction based on framework
                if (framework === "express") {
                    const routes = extractExpressRoutes(parsed, relativePath);
                    architecture.routes.push(...routes);
                } else if (framework === "nextjs") {
                    const routes = extractNextjsRoutes(parsed, relativePath);
                    architecture.routes.push(...routes);
                } else if (framework === "fastapi") {
                    const routes = extractFastApiRoutes(parsed, relativePath);
                    architecture.routes.push(...routes);
                }
            }

            const endTime = Date.now();
            console.log(`[AnalysisService:Orchestrator] Scan complete in ${endTime - startTime}ms.`);
            console.log(`[AnalysisService:Orchestrator] Found ${architecture.routes.length} routes.`);

            // Return structured data for API/Database layers
            return {
                scan_id: crypto.randomUUID(),
                repo_id: `${owner}/${repo}`,
                framework,
                status: "completed",
                architecture,
                scanned_at: new Date().toISOString(),
                duration_ms: endTime - startTime
            };

        } catch (error) {
            console.error(`[AnalysisService:Orchestrator] Scan failed for ${owner}/${repo}:`, error);
            throw error;
        } finally {
            // STEP 5: Guaranteed Ephemeral Cleanup
            if (job) {
                console.log(`[AnalysisService:Orchestrator] Executing ephemeral cleanup...`);
                await job.cleanup();
            }
        }
    }
}
