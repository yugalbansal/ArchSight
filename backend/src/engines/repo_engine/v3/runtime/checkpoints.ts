import { ScanContext } from "../core/scan_context.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Pipeline Checkpoint System
 * Dumps the serializable parts of the ScanContext to disk 
 * so that a crashed scan can be reviewed or resumed.
 */
export async function checkpoint(context: ScanContext, stageName: string): Promise<void> {
    const tmpDir = path.join(os.tmpdir(), "archsight-checkpoints", context.scanId);

    try {
        await fs.mkdir(tmpDir, { recursive: true });

        // We cannot serialize astIndex (contains functions)
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

        console.log(`[Checkpoint] Saved state at stage: ${stageName}`);
    } catch (err) {
        console.warn(`[Checkpoint] Failed to save checkpoint for ${stageName}`, err);
    }
}
