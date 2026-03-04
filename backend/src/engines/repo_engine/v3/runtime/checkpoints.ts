import { ScanContext } from "../core/scan_context.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Pipeline Checkpoint System
 * ──────────────────────────
 * In development: Dumps the serializable parts of the ScanContext to disk
 *                 for debugging crashed scans.
 * In production:  Log-only (Render's ephemeral filesystem makes disk writes
 *                 useless — files vanish on redeploy).
 */
export async function checkpoint(context: ScanContext, stageName: string): Promise<void> {
    // Always log checkpoint progress (lightweight)
    const nodeCount = context.semanticNodes.length;
    const signalCount = context.signals.length;
    const errorCount = context.errors.length;
    console.log(
        `[Checkpoint] ${stageName} | nodes=${nodeCount} signals=${signalCount} errors=${errorCount}`
    );

    // Skip disk writes in production — ephemeral filesystem makes them pointless
    if (IS_PRODUCTION) return;

    // Development-only: write to disk for local debugging
    const tmpDir = path.join(os.tmpdir(), "archsight-checkpoints", context.scanId);

    try {
        await fs.mkdir(tmpDir, { recursive: true });

        const serializableContext = {
            scanId: context.scanId,
            profile: context.profile,
            signals: context.signals,
            evidence: context.evidence,
            semanticNodes: context.semanticNodes,
            errors: context.errors
        };

        const outPath = path.join(tmpDir, `checkpoint_${stageName}.json`);
        await fs.writeFile(outPath, JSON.stringify(serializableContext, null, 2));

        console.log(`[Checkpoint] Saved state to disk: ${outPath}`);
    } catch (err) {
        // Non-critical — never crash the pipeline for a checkpoint failure
        console.warn(`[Checkpoint] Failed to save checkpoint for ${stageName}`, err);
    }
}

