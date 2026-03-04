/**
 * Engine-1: Repository Intelligence Engine
 * ─────────────────────────────────────────
 * Public API for the ArchSight code analysis pipeline.
 * Engine-2 (Graph Experience) and Engine-3 (AI Analysis) consume the output.
 *
 * Primary entry: analyzeRepository() → ArchitectureGraph
 */

// ─── Public API ──────────────────────────────────────────────────────
export { runV3Pipeline as analyzeRepository } from "./v3/public.js";

// ─── Schemas ─────────────────────────────────────────────────────────
export * from "./schemas/architecture.schema.js";

// ─── Canonical Graph Types (shared across all engines) ───────────────
export type {
    ArchitectureGraph,
    ArchitectureNode,
    ArchitectureEdge,
    FileStructureEntry,
} from "../../schemas/architecture-graph.schema.js";

// ─── Repository Acquisition ──────────────────────────────────────────
export { cloneRepositoryEphemeral } from "./repo_source/clone.js";
export type { CloneResult } from "./repo_source/clone.js";
export { walkDir } from "./utils/file.utils.js";

// ─── Parser (re-exported for orchestrator boot) ──────────────────────
export { detectFramework, detectFrameworks } from "./v3/parser/detector.js";
export {
    initParser,
    warmupCommonLanguages,
} from "./v3/parser/tree-sitter.js";

