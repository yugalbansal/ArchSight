import fs from "fs/promises";
import path from "path";
import { Framework } from "../../schemas/architecture.schema.js";

// Common subdirectory names that contain backend/frontend projects
const PROJECT_SUBDIRS = [
    "backend", "server", "api", "app", "src",
    "frontend", "client", "web", "ui",
    "services", "packages", "apps",
];

/**
 * Detect ALL frameworks used in a repository (multi-framework support).
 * Scans both root AND immediate subdirectories to support monorepos.
 * 
 * Detection hierarchy (confidence-ordered):
 * 1. Package manager files — highest confidence
 * 2. Lock files
 * 3. Config files
 * 4. Subdirectory scanning (1-level deep)
 */
export async function detectFrameworks(repoRootStr: string): Promise<Framework[]> {
    const frameworks: Framework[] = [];

    try {
        // ── Scan root-level ──────────────────────────────────────────
        await scanDirectoryForFrameworks(repoRootStr, frameworks);

        // ── Scan immediate subdirectories ────────────────────────────
        // This catches monorepo layouts like:
        //   root/fastapi-backend/requirements.txt
        //   root/frontend/package.json
        try {
            const entries = await fs.readdir(repoRootStr, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist" || entry.name === "build" || entry.name === "__pycache__" || entry.name === "venv" || entry.name === ".venv") continue;

                const subdirPath = path.join(repoRootStr, entry.name);
                await scanDirectoryForFrameworks(subdirPath, frameworks);

                // Also check 2-level deep for patterns like: root/apps/backend/package.json
                if (PROJECT_SUBDIRS.includes(entry.name.toLowerCase())) {
                    try {
                        const subEntries = await fs.readdir(subdirPath, { withFileTypes: true });
                        for (const subEntry of subEntries) {
                            if (!subEntry.isDirectory()) continue;
                            if (subEntry.name.startsWith(".") || subEntry.name === "node_modules") continue;
                            await scanDirectoryForFrameworks(path.join(subdirPath, subEntry.name), frameworks);
                        }
                    } catch { /* ignore */ }
                }
            }
        } catch {
            // If we can't read subdirs, root-level detection is enough
        }

    } catch (error) {
        console.error("[RepoEngine:Detector] Error detecting frameworks", error);
    }

    // Deduplicate
    const unique = [...new Set(frameworks)];

    if (unique.length === 0) {
        return ["generic"];
    }

    return unique;
}

/**
 * Backward-compatible single-framework detection.
 */
export async function detectFramework(repoRootStr: string): Promise<Framework> {
    const frameworks = await detectFrameworks(repoRootStr);
    return frameworks[0] ?? "unknown";
}

// ─── Core Detection Logic (runs on any directory) ────────────────────

async function scanDirectoryForFrameworks(dirPath: string, frameworks: Framework[]): Promise<void> {
    await detectNodeFrameworks(dirPath, frameworks);
    await detectPythonFrameworks(dirPath, frameworks);
    await detectGoFrameworks(dirPath, frameworks);
    await detectRustFrameworks(dirPath, frameworks);
    await detectJavaFrameworks(dirPath, frameworks);
}

// ─── Node.js Framework Detection ─────────────────────────────────────

async function detectNodeFrameworks(dirPath: string, frameworks: Framework[]): Promise<void> {
    const pkgContent = await readFileSafe(path.join(dirPath, "package.json"));
    if (!pkgContent) return;

    try {
        const pkg = JSON.parse(pkgContent);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps["next"] && !frameworks.includes("nextjs")) frameworks.push("nextjs");
        if (deps["@nestjs/core"] && !frameworks.includes("nestjs")) frameworks.push("nestjs");
        if (deps["express"] && !frameworks.includes("express")) frameworks.push("express");
        if (deps["koa"] && !frameworks.includes("koa")) frameworks.push("koa");
        if (deps["react"] && !deps["next"] && !frameworks.includes("react")) frameworks.push("react");
        if ((deps["vue"] || deps["@vue/cli-service"]) && !frameworks.includes("vue")) frameworks.push("vue");
        if ((deps["svelte"] || deps["@sveltejs/kit"]) && !frameworks.includes("svelte")) frameworks.push("svelte");
    } catch { /* malformed package.json */ }

    // Config file fallbacks
    if (!frameworks.includes("nextjs")) {
        const hasNextConfig = await fileExists(path.join(dirPath, "next.config.js"))
            || await fileExists(path.join(dirPath, "next.config.mjs"))
            || await fileExists(path.join(dirPath, "next.config.ts"));
        if (hasNextConfig) frameworks.push("nextjs");
    }
}

// ─── Python Framework Detection ──────────────────────────────────────

async function detectPythonFrameworks(dirPath: string, frameworks: Framework[]): Promise<void> {
    const reqContent = await readFileSafe(path.join(dirPath, "requirements.txt"));
    if (reqContent) {
        if (reqContent.includes("fastapi") && !frameworks.includes("fastapi")) frameworks.push("fastapi");
        if (/flask|Flask/.test(reqContent) && !frameworks.includes("flask")) frameworks.push("flask");
        if (/django|Django/.test(reqContent) && !frameworks.includes("django")) frameworks.push("django");
    }

    const tomlContent = await readFileSafe(path.join(dirPath, "pyproject.toml"));
    if (tomlContent) {
        if (tomlContent.includes("fastapi") && !frameworks.includes("fastapi")) frameworks.push("fastapi");
        if (/flask|Flask/.test(tomlContent) && !frameworks.includes("flask")) frameworks.push("flask");
        if (/django|Django/.test(tomlContent) && !frameworks.includes("django")) frameworks.push("django");
    }

    if (!frameworks.includes("django")) {
        if (await fileExists(path.join(dirPath, "manage.py"))) frameworks.push("django");
    }
}

// ─── Go Framework Detection ─────────────────────────────────────────

async function detectGoFrameworks(dirPath: string, frameworks: Framework[]): Promise<void> {
    const goModContent = await readFileSafe(path.join(dirPath, "go.mod"));
    if (!goModContent) return;

    if (goModContent.includes("github.com/gin-gonic/gin") && !frameworks.includes("gin")) frameworks.push("gin");
    if (goModContent.includes("github.com/gofiber/fiber") && !frameworks.includes("fiber")) frameworks.push("fiber");
    if (goModContent.includes("github.com/labstack/echo") && !frameworks.includes("echo")) frameworks.push("echo");
}

// ─── Rust Framework Detection ───────────────────────────────────────

async function detectRustFrameworks(dirPath: string, frameworks: Framework[]): Promise<void> {
    const cargoContent = await readFileSafe(path.join(dirPath, "Cargo.toml"));
    if (!cargoContent) return;

    if ((cargoContent.includes("actix-web") || cargoContent.includes("actix_web")) && !frameworks.includes("actix")) frameworks.push("actix");
    if (cargoContent.includes("rocket") && !frameworks.includes("rocket")) frameworks.push("rocket");
}

// ─── Java Framework Detection ───────────────────────────────────────

async function detectJavaFrameworks(dirPath: string, frameworks: Framework[]): Promise<void> {
    const pomContent = await readFileSafe(path.join(dirPath, "pom.xml"));
    if (pomContent) {
        if ((pomContent.includes("spring-boot") || pomContent.includes("org.springframework")) && !frameworks.includes("spring")) {
            frameworks.push("spring");
        }
    }

    const gradle = await readFileSafe(path.join(dirPath, "build.gradle")) || await readFileSafe(path.join(dirPath, "build.gradle.kts"));
    if (gradle) {
        if ((gradle.includes("spring-boot") || gradle.includes("org.springframework")) && !frameworks.includes("spring")) {
            frameworks.push("spring");
        }
    }
}

// ─── Utilities ───────────────────────────────────────────────────────

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.stat(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readFileSafe(filePath: string): Promise<string | null> {
    try {
        return await fs.readFile(filePath, "utf-8");
    } catch {
        return null;
    }
}
