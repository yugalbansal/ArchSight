import Parser from "tree-sitter";

export type Framework = "express" | "nextjs" | "fastapi" | "flask" | "django" | "koa" | "nestjs" | "generic" | "unknown";
export type SupportedLanguage = "javascript" | "typescript" | "python" | "unknown";

export interface ParserResult {
    tree: Parser.Tree;
    language: SupportedLanguage;
}

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
    file_structure?: any[]; // Generic AST output: functions, classes, imports, exports per file
}

export interface EngineScanResult {
    scan_id: string;
    repo_id: string;
    framework: Framework;
    status: "completed" | "failed";
    architecture: ExtractedArchitecture;
    scanned_at: string;
    duration_ms: number;
}
