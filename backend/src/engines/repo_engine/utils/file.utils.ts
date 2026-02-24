import fs from "fs/promises";
import path from "path";

/**
 * Walks a directory recursively and returns all valid file paths.
 */
export async function walkDir(dir: string): Promise<string[]> {
    let results: string[] = [];

    try {
        const list = await fs.readdir(dir);
        for (const file of list) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);

            if (stat && stat.isDirectory()) {
                // Ignore build/environment artifacts
                if (file === "node_modules" || file === ".git" || file === ".next" || file === "venv" || file === ".venv" || file === "dist" || file === "build") {
                    continue;
                }
                results = results.concat(await walkDir(filePath));
            } else {
                results.push(filePath);
            }
        }
    } catch (err) {
        console.error(`[FileUtils] Error walking directory ${dir}:`, err);
    }

    return results;
}
