import crypto from "crypto";

import {
    cloneRepositoryEphemeral,
    detectFrameworks,
    walkDir,
    initParser,
    warmupCommonLanguages,
    EngineScanResult,
    Framework,
} from "../engines/repo_engine/index.js";
import { runV3Pipeline } from "../engines/repo_engine/v3/public.js";

// Module-level parser init flag
let parserReady = false;
async function ensureParserReady(): Promise<void> {
    if (parserReady) return;
    await initParser();
    await warmupCommonLanguages();
    parserReady = true;
}

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

        // Initialize web-tree-sitter parser (once per process)
        await ensureParserReady();

        let job = null;
        const startTime = Date.now();

        try {
            // STEP 1: Ephemeral Clone
            job = await cloneRepositoryEphemeral(owner, repo, branch, token);
            const rootPath = job.path;

            // STEP 2: Framework Detection (multi-framework)
            const frameworks = await detectFrameworks(rootPath);
            const primaryFramework = frameworks[0] ?? "unknown" as Framework;
            console.log(`[AnalysisService:Orchestrator] Detected frameworks: ${frameworks.join(", ")}`);

            // STEP 3: Walk repository, collect languages, and run V3 pipeline
            console.log(`[AnalysisService:Orchestrator] Scanning files...`);
            const allFiles = await walkDir(rootPath);

            const sourceFiles = allFiles.map(fp => {
                let lang = "unknown";
                if (fp.endsWith(".js") || fp.endsWith(".jsx")) lang = "javascript";
                else if (fp.endsWith(".ts") || fp.endsWith(".tsx")) lang = "typescript";
                else if (fp.endsWith(".py")) lang = "python";
                else if (fp.endsWith(".java")) lang = "java";
                else if (fp.endsWith(".go")) lang = "go";
                else if (fp.endsWith(".rs")) lang = "rust";
                return { path: fp, language: lang };
            }).filter(f => f.language !== "unknown");

            const architecture = await runV3Pipeline(crypto.randomUUID(), rootPath, sourceFiles);

            const endTime = Date.now();
            console.log(`[AnalysisService:Orchestrator] Scan complete in ${endTime - startTime}ms.`);
            console.log(`[AnalysisService:Orchestrator] Found ${architecture.nodes.length} semantic nodes.`);

            // Return structured data for API/Database layers
            return {
                scan_id: crypto.randomUUID(),
                repo_id: `${owner}/${repo}`,
                framework: primaryFramework,
                frameworks,
                status: "completed",
                architecture,
                scanned_at: new Date().toISOString(),
                duration_ms: endTime - startTime,
                meta: {
                    parser: "web-tree-sitter",
                    version: "0.24.7",
                },
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
