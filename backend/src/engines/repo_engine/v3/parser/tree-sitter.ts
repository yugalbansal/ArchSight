import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import Parser from "web-tree-sitter";
import { ParserResult, SupportedLanguage, ASTTree } from "../../schemas/architecture.schema.js";

// ─── Re-export types for extractors ──────────────────────────────────

export type TSLanguage = Parser.Language;
export type TSQuery = ReturnType<Parser.Language["query"]>;
export type TSNode = Parser.SyntaxNode;

// ─── Module-Level Singletons (per-worker isolation) ──────────────────

let parserInstance: Parser | null = null;
let initialized = false;
const languageCache = new Map<string, Parser.Language>();
const queryCache = new Map<string, TSQuery>();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GRAMMARS_DIR = path.join(__dirname, "grammars");

// ─── Grammar File Mapping ────────────────────────────────────────────

const GRAMMAR_FILES: Record<string, string> = {
    javascript: "tree-sitter-javascript.wasm",
    typescript: "tree-sitter-typescript.wasm",
    tsx: "tree-sitter-tsx.wasm",
    python: "tree-sitter-python.wasm",
    go: "tree-sitter-go.wasm",
    rust: "tree-sitter-rust.wasm",
    java: "tree-sitter-java.wasm",
    c: "tree-sitter-c.wasm",
    cpp: "tree-sitter-cpp.wasm",
    html: "tree-sitter-html.wasm",
    css: "tree-sitter-css.wasm",
    json: "tree-sitter-json.wasm",
    yaml: "tree-sitter-yaml.wasm",
    dockerfile: "tree-sitter-dockerfile.wasm",
    bash: "tree-sitter-bash.wasm",
};

// ─── Extension → Language Mapping ────────────────────────────────────

const EXTENSION_MAP: Record<string, SupportedLanguage> = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".py": "python",
    ".pyw": "python",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",
    ".hxx": "cpp",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".json": "json",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
};

// Filename-based detection for special files
const FILENAME_MAP: Record<string, SupportedLanguage> = {
    "Dockerfile": "dockerfile",
    ".bashrc": "bash",
    ".zshrc": "bash",
    ".bash_profile": "bash",
    ".profile": "bash",
};

// Shebang → Language mapping
const SHEBANG_MAP: Array<{ pattern: RegExp; language: SupportedLanguage }> = [
    { pattern: /python3?/, language: "python" },
    { pattern: /node/, language: "javascript" },
    { pattern: /bash|sh|zsh/, language: "bash" },
];

// ─── Initialization ──────────────────────────────────────────────────

/**
 * Initialize web-tree-sitter runtime. MUST be called once at worker boot.
 * Safe to call multiple times — idempotent.
 */
export async function initParser(): Promise<void> {
    if (initialized && parserInstance) return;

    await Parser.init();
    parserInstance = new Parser();
    initialized = true;
    console.log("[Parser] web-tree-sitter initialized");
}

/**
 * Preload commonly-used grammars at worker boot to mitigate cold-start latency.
 * Loads JS, TS, and Python grammars.
 */
export async function warmupCommonLanguages(): Promise<void> {
    const common: SupportedLanguage[] = ["javascript", "typescript", "python"];
    for (const lang of common) {
        try {
            await loadLanguage(lang);
        } catch (err) {
            console.warn(`[Parser] Warmup failed for ${lang}:`, err);
        }
    }
    console.log("[Parser] Common languages warmed up (JS, TS, Python)");
}

// ─── Language Loading (Lazy, Cached) ─────────────────────────────────

/**
 * Load a WASM grammar for the given language. Cached after first load.
 * Returns null if grammar file doesn't exist (graceful degradation).
 */
async function loadLanguage(lang: string): Promise<Parser.Language | null> {
    if (lang === "unknown") return null;

    // Check cache first
    if (languageCache.has(lang)) {
        return languageCache.get(lang)!;
    }

    const wasmFile = GRAMMAR_FILES[lang];
    if (!wasmFile) {
        console.warn(`[Parser] No grammar mapping for language: ${lang}`);
        return null;
    }

    const wasmPath = path.join(GRAMMARS_DIR, wasmFile);

    // Check if WASM file exists before attempting load
    try {
        await fs.access(wasmPath);
    } catch {
        console.warn(`[Parser] Grammar WASM not found: ${wasmPath}`);
        return null;
    }

    const language = await Parser.Language.load(wasmPath);
    languageCache.set(lang, language);
    console.log(`[Parser] Loaded grammar: ${lang}`);
    return language;
}

/**
 * Get a loaded language grammar. For use by extractors to build queries.
 * Returns null if language is unsupported.
 */
export async function getLanguageGrammar(lang: SupportedLanguage): Promise<Parser.Language | null> {
    return loadLanguage(lang);
}

// ─── Query Cache ─────────────────────────────────────────────────────

function hashQueryString(queryString: string): string {
    return createHash("md5").update(queryString).digest("hex").slice(0, 12);
}

/**
 * Get or compile a tree-sitter query. Cached per language + query pattern.
 * Key format: `${languageName}:${hash(queryString)}`
 */
export async function getOrCreateQuery(
    lang: SupportedLanguage,
    queryString: string
): Promise<TSQuery | null> {
    const cacheKey = `${lang}:${hashQueryString(queryString)}`;

    if (queryCache.has(cacheKey)) {
        return queryCache.get(cacheKey)!;
    }

    const language = await loadLanguage(lang);
    if (!language) return null;

    const query = language.query(queryString);
    queryCache.set(cacheKey, query);
    return query;
}

// ─── Language Detection ──────────────────────────────────────────────

/**
 * Detect language for a file using a confidence-ordered hierarchy:
 * 1. File extension (highest confidence)
 * 2. Filename match (Dockerfile, .bashrc, etc.)
 * 3. Shebang line (fallback for scripts)
 */
export function getLanguageForFile(filePath: string): SupportedLanguage {
    // 1. Extension-based (highest confidence)
    const ext = path.extname(filePath).toLowerCase();
    if (ext && EXTENSION_MAP[ext]) {
        return EXTENSION_MAP[ext];
    }

    // 2. Filename-based
    const basename = path.basename(filePath);
    if (FILENAME_MAP[basename]) {
        return FILENAME_MAP[basename];
    }

    return "unknown";
}

/**
 * Detect language via shebang (first line). Used as fallback when extension fails.
 */
export function getLanguageFromShebang(firstLine: string): SupportedLanguage {
    if (!firstLine.startsWith("#!")) return "unknown";

    for (const { pattern, language } of SHEBANG_MAP) {
        if (pattern.test(firstLine)) {
            return language;
        }
    }

    return "unknown";
}

/**
 * Resolve the actual grammar key to use for parsing.
 * TypeScript .tsx files need the TSX grammar, not the TS grammar.
 */
function resolveGrammarKey(filePath: string, lang: SupportedLanguage): string {
    if (lang === "typescript") {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === ".tsx") {
            return "tsx";
        }
    }
    if (lang === "javascript") {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === ".jsx") {
            // JSX uses the javascript grammar (it includes JSX support)
            return "javascript";
        }
    }
    return lang;
}

// ─── Core Parse Function ─────────────────────────────────────────────

/**
 * Parse a file and return its AST. Same signature and return type
 * as the previous native implementation for backward compatibility.
 * 
 * Returns null for unsupported languages (graceful degradation).
 */
export async function parseFileAst(filePath: string): Promise<ParserResult | null> {
    if (!initialized || !parserInstance) {
        throw new Error("[Parser] web-tree-sitter not initialized. Call initParser() at worker boot.");
    }

    let lang = getLanguageForFile(filePath);

    // If extension detection fails, try shebang
    if (lang === "unknown") {
        try {
            const fd = await fs.open(filePath, "r");
            const buf = Buffer.alloc(256);
            await fd.read(buf, 0, 256, 0);
            await fd.close();
            const firstLine = buf.toString("utf-8").split("\n")[0];
            lang = getLanguageFromShebang(firstLine);
        } catch {
            // Silent — file might not be readable
        }
    }

    if (lang === "unknown") return null;

    // Resolve TSX vs TS grammar
    const grammarKey = resolveGrammarKey(filePath, lang);
    const language = await loadLanguage(grammarKey);
    if (!language) return null;

    parserInstance.setLanguage(language);

    const sourceCode = await fs.readFile(filePath, "utf-8");
    const tree = parserInstance.parse(sourceCode);

    if (!tree) return null;

    return {
        tree: tree as unknown as ASTTree,
        language: lang,
    };
}
