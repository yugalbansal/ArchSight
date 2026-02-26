import { ScanContext } from "../core/scan_context.js";
import fs from "fs/promises";
import path from "path";

/**
 * Step 1: Repository Profiler
 * Fast, syntaxless heuristic file scan to populate fundamental knowledge context
 */
export async function runRepoProfiler(context: ScanContext, rootDir: string): Promise<void> {

    // E.g., read package.json
    try {
        const pkgStr = await fs.readFile(path.join(rootDir, "package.json"), "utf8");
        const pkg = JSON.parse(pkgStr);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        for (const dep of Object.keys(deps)) {
            context.profile.dependencies[dep] = deps[dep];
        }

        if (deps["express"]) context.profile.probable_frameworks.push("express");
        if (deps["react"]) context.profile.probable_frameworks.push("react");
        if (deps["next"]) context.profile.probable_frameworks.push("nextjs");
    } catch { }

    try {
        const reqStr = await fs.readFile(path.join(rootDir, "requirements.txt"), "utf8");
        if (reqStr.includes("fastapi")) context.profile.probable_frameworks.push("fastapi");
        if (reqStr.includes("flask")) context.profile.probable_frameworks.push("flask");
    } catch { }

    try {
        await fs.access(path.join(rootDir, "Dockerfile"));
        context.profile.has_docker = true;
    } catch { }
}
