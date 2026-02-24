import fs from "fs/promises";
import path from "path";
import { Framework } from "../schemas/architecture.schema.js";

/**
 * Determines the primary framework of the repository by inspecting root files.
 */
export async function detectFramework(repoRootStr: string): Promise<Framework> {
    try {
        // Check for package.json (Node.js projects)
        const pkgPath = path.join(repoRootStr, "package.json");
        const pkgStats = await fs.stat(pkgPath).catch(() => null);

        if (pkgStats) {
            const pkgContent = await fs.readFile(pkgPath, "utf-8");
            const pkg = JSON.parse(pkgContent);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };

            if (deps["next"]) return "nextjs";
            if (deps["@nestjs/core"]) return "nestjs";
            if (deps["express"]) return "express";
            if (deps["koa"]) return "koa";
            // Generic Node.js project (has package.json but no known framework)
            return "generic";
        }

        // Check for Python requirements.txt
        const reqPath = path.join(repoRootStr, "requirements.txt");
        const reqStats = await fs.stat(reqPath).catch(() => null);

        if (reqStats) {
            const reqContent = await fs.readFile(reqPath, "utf-8");
            if (reqContent.includes("fastapi")) return "fastapi";
            if (reqContent.includes("flask") || reqContent.includes("Flask")) return "flask";
            if (reqContent.includes("django") || reqContent.includes("Django")) return "django";
            return "generic";
        }

        // Check for pyproject.toml
        const tomlPath = path.join(repoRootStr, "pyproject.toml");
        const tomlStats = await fs.stat(tomlPath).catch(() => null);

        if (tomlStats) {
            const tomlContent = await fs.readFile(tomlPath, "utf-8");
            if (tomlContent.includes("fastapi")) return "fastapi";
            if (tomlContent.includes("flask") || tomlContent.includes("Flask")) return "flask";
            if (tomlContent.includes("django") || tomlContent.includes("Django")) return "django";
            return "generic";
        }

        // Check for manage.py (Django indicator)
        const managePyPath = path.join(repoRootStr, "manage.py");
        const managePyStats = await fs.stat(managePyPath).catch(() => null);
        if (managePyStats) return "django";

    } catch (error) {
        console.error("[RepoEngine:Detector] Error detecting framework", error);
    }

    return "unknown";
}
