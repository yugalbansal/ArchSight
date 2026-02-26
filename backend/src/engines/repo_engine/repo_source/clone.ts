import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import AdmZip from "adm-zip";

export interface CloneResult {
    path: string;
    cleanup: () => Promise<void>;
}

/**
 * Downloads a GitHub repository as a ZIP, extracts it, and returns the path.
 * Ensure you call `cleanup()` in a `finally` block to delete the temporary folder.
 */
export async function cloneRepositoryEphemeral(
    owner: string,
    repo: string,
    branch: string = "main",
    token?: string
): Promise<CloneResult> {
    const jobId = crypto.randomUUID();
    const baseTempDir = path.join(os.tmpdir(), "archsight-scans");
    const jobDir = path.join(baseTempDir, jobId);
    const zipPath = path.join(jobDir, `${repo}.zip`);
    const extractPath = path.join(jobDir, "extracted");

    try {
        await fs.mkdir(extractPath, { recursive: true });

        // For private repos (using Installation Access Token), use the authenticated API endpoint.
        // For public repos (no token), fall back to the direct github.com URL.
        let url: string;
        const headers: Record<string, string> = {
            "User-Agent": "ArchSight-Engine",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        };

        if (token) {
            // Use the GitHub API zipball endpoint — required for private repos.
            // Installation Access Tokens must use 'token' prefix, not 'Bearer'.
            url = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;
            headers["Authorization"] = `token ${token}`;
        } else {
            // Public repo fallback
            url = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
        }

        console.log(`[RepoEngine:Scanner] Downloading ZIP: ${url}`);

        const response = await fetch(url, { headers, redirect: "follow" });

        if (!response.ok) {
            throw new Error(`Failed to download repo: ${response.status} ${response.statusText}`);
        }

        // Save ZIP to disk
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(zipPath, buffer);

        // Extract ZIP
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractPath, true);

        // GitHub zips wrap contents in `<repo>-<branch>` directory
        const extractedItems = await fs.readdir(extractPath);
        let rootPath = extractPath;
        if (extractedItems.length === 1) {
            const itemStat = await fs.stat(path.join(extractPath, extractedItems[0]));
            if (itemStat.isDirectory()) {
                rootPath = path.join(extractPath, extractedItems[0]);
            }
        }

        return {
            path: rootPath,
            cleanup: async () => {
                console.log(`[RepoEngine:Scanner] Cleaning up disk: ${jobDir}`);
                await fs.rm(jobDir, { recursive: true, force: true }).catch(() => { });
            }
        };

    } catch (error) {
        // If anything fails during setup, immediately clean up
        console.error(`[RepoEngine:Scanner] Clone failed, forcing cleanup: ${jobDir}`);
        await fs.rm(jobDir, { recursive: true, force: true }).catch(() => { });
        throw error;
    }
}
