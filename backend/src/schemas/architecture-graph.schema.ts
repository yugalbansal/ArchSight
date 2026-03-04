/**
 * Canonical ArchitectureGraph Schema
 * ────────────────────────────────────
 * This is the SINGLE SOURCE OF TRUTH for all graph types used across engines.
 *
 * ▸ Engine 1 (repo_engine)  — produces this graph
 * ▸ Engine 2 (architecture_engine) — consumes it for topology/coupling analysis
 * ▸ Engine 3 (intelligence_engine) — consumes it for metrics/patterns/insights
 *
 * DO NOT define duplicate ArchitectureGraph interfaces elsewhere.
 */

// ─── Node ────────────────────────────────────────────────────────────

export interface ArchitectureNode {
    id: string;
    type: string;
    name: string;
    file: string;
    metadata: Record<string, any>;
    confidence: number;
}

// ─── Edge ────────────────────────────────────────────────────────────

export type EdgeType =
    | "co_location"
    | "endpoint_to_service"
    | "service_to_db"
    | "endpoint_to_db"
    | "worker_to_service"
    | "cross_file_import"
    | "service_to_external";

export interface ArchitectureEdge {
    source: string;
    target: string;
    type: EdgeType;
}

// ─── File Structure ──────────────────────────────────────────────────

export interface FileStructureEntry {
    file: string;
    language: string;
    functions: string[];
    classes: string[];
    imports: string[];
    exports: string[];
}

// ─── Complete Graph ──────────────────────────────────────────────────

export interface ArchitectureGraph {
    nodes: ArchitectureNode[];
    edges: ArchitectureEdge[];
    file_structure: FileStructureEntry[];
}
