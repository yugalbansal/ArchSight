import { ASTTree } from "../../schemas/architecture.schema.js";

// ─── Profiler ────────────────────────────────────────────────────────

export interface RepoProfile {
    languages: string[];
    probable_frameworks: string[];
    dependencies: Record<string, string>;
    has_docker: boolean;
}

// ─── Signals ─────────────────────────────────────────────────────────

export interface SignalBatch {
    kind: string;          // e.g., "handler_registration", "http_method"
    scopeId: string;       // e.g., "src/main.ts::Class=App::Function=getUser"
    parentScopeId: string | null;
    scopeType: "repository" | "file" | "class" | "function" | "block";
    file: string;
    occurrences: number;
    metadata_summary: Record<string, any>;
}

// ─── Evidence & Scopes ───────────────────────────────────────────────

export interface EvidenceGraph {
    scopes: Record<string, SignalBatch[]>;
    hierarchy: Record<string, string[]>; // parentScopeId -> childScopeIds[]
}

// ─── Semantic Engine ─────────────────────────────────────────────────

export type ResolutionState = "resolved" | "partial" | "unknown";

export interface SemanticNode {
    id: string;
    type: string;          // e.g., "http_endpoint"
    scopeId: string;
    file: string;
    confidence: number;    // 0.0 - 1.0
    state: ResolutionState;
    metadata: Record<string, any>;
    evidence_signals: string[]; // which signal kinds contributed
}

// ─── AST Index ───────────────────────────────────────────────────────

export interface ASTReference {
    filepath: string;
    language: string;
    load: () => Promise<ASTTree>;
    release: () => void;
}

export type ASTIndex = Record<string, ASTReference>;

// ─── Scan Context ────────────────────────────────────────────────────

export interface ExecutionError {
    layer: string;
    message: string;
    recoverable: boolean;
}

export interface RuleTrace {
    rule: string;
    matched_signals: string[];
    scopeId: string;
    confidence_delta: number;
    reason?: string;
}

export class ScanContext {
    public scanId: string;
    public profile: RepoProfile;
    public astIndex: ASTIndex;
    public signals: SignalBatch[];
    public evidence: EvidenceGraph;
    public semanticNodes: SemanticNode[];
    public architectureGraph: any;
    public errors: ExecutionError[];
    public traces: RuleTrace[];

    constructor(scanId: string) {
        this.scanId = scanId;
        this.profile = { languages: [], probable_frameworks: [], dependencies: {}, has_docker: false };
        this.astIndex = {};
        this.signals = [];
        this.evidence = { scopes: {}, hierarchy: {} };
        this.semanticNodes = [];
        this.errors = [];
        this.traces = [];
    }

    // Mutation safety: Add signals only
    public addSignals(batch: SignalBatch[]) {
        this.signals.push(...batch);
    }

    public addSemanticNode(node: SemanticNode) {
        this.semanticNodes.push(node);
    }
}
