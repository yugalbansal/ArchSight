/**
 * Architecture Schema — Fully Decoupled from Parser Implementation
 */

// ─── Abstract AST Types ──────────────────────────────────────────────

export type ASTNode = {
    type: string;
    text: string;
    startPosition: { row: number; column: number };
    endPosition: { row: number; column: number };
    children: ASTNode[];
    childForFieldName(name: string): ASTNode | null;
};

export type ASTTree = {
    rootNode: ASTNode;
};

// ─── Supported Languages & Frameworks ────────────────────────────────

export type SupportedLanguage =
    | "javascript"
    | "typescript"
    | "python"
    | "go"
    | "rust"
    | "java"
    | "c"
    | "cpp"
    | "html"
    | "css"
    | "json"
    | "yaml"
    | "dockerfile"
    | "bash"
    | "unknown";

export type Framework =
    | "express"
    | "nextjs"
    | "fastapi"
    | "flask"
    | "django"
    | "koa"
    | "nestjs"
    | "react"
    | "vue"
    | "svelte"
    | "gin"
    | "fiber"
    | "echo"
    | "actix"
    | "rocket"
    | "spring"
    | "generic"
    | "unknown";

// ─── Parser Result ───────────────────────────────────────────────────

export interface ParserResult {
    tree: ASTTree;
    language: SupportedLanguage;
}

// ─── Deep File Structure — Full AST Extraction ───────────────────────

export interface FileStructure {
    file: string;
    language: string;
    functions: string[];
    classes: string[];
    imports: string[];
    exports: string[];

    // Deep extraction
    decorators: string[];
    api_calls: string[];
    http_endpoints: string[];
    env_variables: string[];
    llm_calls: string[];
    db_operations: string[];
    middleware: string[];
    type_definitions: string[];
    error_handlers: string[];
    string_literals: string[];
    external_services: string[];
    auth_patterns: string[];
}

// ─── Route / Model Interfaces ────────────────────────────────────────

export interface ExtractedRoute {
    method: string;
    path: string;
    file: string;
}

export interface ExtractedModel {
    name: string;
    type: "mongoose" | "prisma" | "sqlalchemy" | "unknown";
    file: string;
}

export interface ExtractedArchitecture {
    services: any[];
    routes: ExtractedRoute[];
    db_models: ExtractedModel[];
    queues: any[];
    external_apis: any[];
    llm_calls: any[];
    file_structure?: FileStructure[];
}

// ─── Engine Scan Result ──────────────────────────────────────────────

import { ArchitectureGraph } from "../v3/graph/builder.js";

export interface EngineScanResult {
    scan_id: string;
    repo_id: string;
    framework: Framework;
    frameworks?: Framework[];
    status: "completed" | "failed";
    architecture: ExtractedArchitecture | ArchitectureGraph;
    scanned_at: string;
    duration_ms: number;
    meta?: {
        parser: string;
        version: string;
    };
}
