import { Job } from "bullmq";
import path from "path";

// Important: Note that this file gets executed in a completely new Node.js context (child_process)
// Dependencies must be imported freshly in this isolated environment.
import { ScanModel } from "../models/scan.model.js";
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
import "../lib/db.js";
import { getInstallationOctokit } from "../lib/github.js";

// ── Worker Boot: Initialize parser once ──────────────────────────────
// Each sandboxed process gets its own parser instance (thread safety).
let parserReady = false;
async function ensureParserReady(): Promise<void> {
    if (parserReady) return;
    await initParser();
    await warmupCommonLanguages();
    parserReady = true;
}

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

    // Initialize web-tree-sitter parser for this worker process
    await ensureParserReady();

    let cloneJob = null;
    const startTime = Date.now();

    try {
        // == STAGE 0: PRIVATE CLONE AUTHORIZATION ==
        let dynamicToken = token;
        if (!dynamicToken && installation_id) {
            console.log(`[SandboxedProcessor] Requesting temporary Installation Access Token for ${owner}/${repo}...`);
            const octokit = await getInstallationOctokit(installation_id);
            const auth = await octokit.auth({ type: "installation" }) as any;
            dynamicToken = auth.token;
        }

        // == STAGE 1: CLONING ==
        await ScanModel.updateStage(scanId, "cloning", 10, "Downloading repository codebase securely to ephemeral container...");
        cloneJob = await cloneRepositoryEphemeral(owner, repo, branch, dynamicToken);
        const rootPath = cloneJob.path;

        // == STAGE 2: DETECTING ==
        await ScanModel.updateStage(scanId, "detecting", 25, "Booting detection heuristics to identify core frameworks...");
        const frameworks = await detectFrameworks(rootPath);
        const primaryFramework = frameworks[0] ?? "unknown" as Framework;
        console.log(`[SandboxedProcessor] Frameworks detected: ${frameworks.join(", ")}`);

        // == STAGE 3: V3 SEMANTIC PIPELINE ==
        await ScanModel.updateStage(scanId, "parsing", 40, "Spinning up V3 Semantic Engine (Parsing & Extraction)...");
        const allFiles = await walkDir(rootPath);

        // Convert to V3 array format
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

        // Execute the full V3 pipeline
        const architecture = await runV3Pipeline(scanId, rootPath, sourceFiles);

        const endTime = Date.now();
        const durationMs = endTime - startTime;

        const engineResult: EngineScanResult = {
            scan_id: scanId,
            repo_id: `${owner}/${repo}`,
            framework: primaryFramework,
            frameworks,
            status: "completed",
            architecture,
            scanned_at: new Date().toISOString(),
            duration_ms: durationMs,
            meta: {
                parser: "web-tree-sitter",
                version: "0.24.7",
            },
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
