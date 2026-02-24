import { Job } from "bullmq";
import path from "path";

// Important: Note that this file gets executed in a completely new Node.js context (child_process)
// Dependencies must be imported freshly in this isolated environment.
import { ScanModel } from "../models/scan.model.js";
import {
    cloneRepositoryEphemeral,
    detectFramework,
    walkDir,
    parseFileAst,
    extractExpressRoutes,
    extractNextjsRoutes,
    extractFastApiRoutes,
    extractGenericStructure,
    ExtractedArchitecture,
    EngineScanResult
} from "../engines/repo_engine/index.js";
import "../lib/db.js";
import { getInstallationOctokit } from "../lib/github.js"; // Injected Octokit Dependency

interface ScanJobData {
    scanId: string;
    owner: string;
    repo: string;
    branch: string;
    token?: string;
    installation_id?: number;
}

/**
 * BullMQ Sandboxed Processor.
 * Returns a Promise that resolves when the job is fully done.
 * Because this file acts as the default export, BullMQ will spawn this in 
 * an isolated Node thread/process, completely bypassing the main worker's memory heap.
 * Upon resolution/rejection, BullMQ immediately terminates this process, forcing instantaneous GC.
 */
export default async function (job: Job<ScanJobData>): Promise<EngineScanResult> {
    const { scanId, owner, repo, branch, token, installation_id } = job.data;
    console.log(`[SandboxedProcessor] Started Sandbox for Job ${job.id} - ${owner}/${repo}`);

    let cloneJob = null;
    const startTime = Date.now();

    try {
        // == STAGE 0: PRIVATE CLONE AUTHORIZATION ==
        let dynamicToken = token;
        if (!dynamicToken && installation_id) {
            console.log(`[SandboxedProcessor] Requesting temporary Installation Access Token for ${owner}/${repo}...`);
            const octokit = await getInstallationOctokit(installation_id);
            // Octokit automatically generates the token headers when making its first query. 
            // We can explicitly grab the token string directly via the auth properties:
            const auth = await octokit.auth({ type: "installation" }) as any;
            dynamicToken = auth.token;
        }

        // == STAGE 1: CLONING ==
        await ScanModel.updateStage(scanId, "cloning", 10, "Downloading repository codebase securely to ephemeral container...");
        cloneJob = await cloneRepositoryEphemeral(owner, repo, branch, dynamicToken);
        const rootPath = cloneJob.path;

        // == STAGE 2: DETECTING ==
        await ScanModel.updateStage(scanId, "detecting", 25, "Booting detection heuristics to identify core backend frameworks...");
        const framework = await detectFramework(rootPath);
        console.log(`[SandboxedProcessor] Framework detected as: ${framework}`);

        const architecture: ExtractedArchitecture = {
            services: [], routes: [], db_models: [], queues: [], external_apis: [], llm_calls: [], file_structure: []
        };

        // == STAGE 3: PARSING & EXTRACTING ==
        await ScanModel.updateStage(scanId, "parsing", 40, "Spinning up Tree-sitter AST nodes and loading language grammars...");
        const allFiles = await walkDir(rootPath);

        let parsedCount = 0;
        const totalFiles = allFiles.length;

        for (const filePath of allFiles) {
            const parsed = await parseFileAst(filePath);
            if (!parsed) continue;

            const relativePath = path.relative(rootPath, filePath);

            parsedCount++;
            if (parsedCount % 20 === 0) {
                const progress = 40 + Math.floor((parsedCount / totalFiles) * 50);
                await ScanModel.updateStage(scanId, "extracting", progress, `Scanning abstract syntax trees... (${parsedCount} of ${totalFiles} files processed)`);
            }

            // Always run generic structure extraction for every file
            const structure = extractGenericStructure(parsed, relativePath);
            if (structure.functions.length > 0 || structure.classes.length > 0) {
                architecture.file_structure!.push(structure);
            }

            // Framework-specific route extraction
            if (framework === "express" || framework === "koa" || framework === "nestjs" || framework === "generic") {
                architecture.routes.push(...extractExpressRoutes(parsed, relativePath));
            } else if (framework === "nextjs") {
                architecture.routes.push(...extractNextjsRoutes(parsed, relativePath));
            } else if (framework === "fastapi" || framework === "flask" || framework === "django") {
                architecture.routes.push(...extractFastApiRoutes(parsed, relativePath));
            }
        }

        const endTime = Date.now();
        const durationMs = endTime - startTime;

        const engineResult: EngineScanResult = {
            scan_id: scanId,
            repo_id: `${owner}/${repo}`,
            framework,
            status: "completed",
            architecture,
            scanned_at: new Date().toISOString(),
            duration_ms: durationMs
        };

        // == STAGE 4: COMPLETION ==
        console.log(`[SandboxedProcessor] Job successfully completed in ${durationMs}ms`);
        await ScanModel.markCompleted(scanId, engineResult);
        return engineResult;

    } catch (error: any) {
        console.error(`[SandboxedProcessor] Job failed:`, error);
        await ScanModel.markFailed(scanId, error.message || String(error));
        throw error;
    } finally {
        // == GUARANTEED EPHEMERAL CLEANUP ==
        if (cloneJob) {
            console.log(`[SandboxedProcessor] Forcing hard deletion of ephemeral clone artifacts via OS...`);
            await cloneJob.cleanup();
        }
    }
}
