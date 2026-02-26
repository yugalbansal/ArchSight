/**
 * V3 Engine Public Boundary
 * ──────────────────────────
 * This is the ONLY file that external modules should import from v3/.
 * All internal pipeline layers remain private behind this boundary.
 */

export { runV3Pipeline } from "./runtime/pipeline_runner.js";
export type { ArchitectureGraph, ArchitectureNode, FileStructureEntry } from "./graph/builder.js";
