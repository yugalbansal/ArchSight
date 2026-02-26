# V3 Semantic Pattern Extraction Engine

> Architecture documentation for the ArchSight Code-Vision Repository Engine.
> This document covers the complete 6-layer pipeline, data flow, and extension guide.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Pipeline Layers](#pipeline-layers)
3. [Data Flow & ScanContext](#data-flow--scancontext)
4. [Pattern Extractors](#pattern-extractors)
5. [Semantic Rules](#semantic-rules)
6. [Graph Builder](#graph-builder)
7. [Calibration System (RuleTrace)](#calibration-system-ruletrace)
8. [Orchestrator Integration](#orchestrator-integration)
9. [Extension Guide](#extension-guide)

---

## Architecture Overview

The V3 Engine is a **Pattern-First, Framework-Agnostic** code analysis pipeline. It processes any repository into a typed `ArchitectureGraph` without hardcoding framework keywords or library names.

```
Repository → AST Parsing → Pattern Signals → Evidence Graph → Semantic Resolution → Architecture Graph
```

### Design Principles

| Principle | Description |
|---|---|
| **Framework-Agnostic** | No hardcoded framework names, library strings, or keyword blacklists |
| **Structural Detection** | All classification is based on AST structure (parameters, decorators, call hierarchy) |
| **Layered Pipeline** | Each layer has a single responsibility and communicates via `ScanContext` |
| **Memory-Safe** | Lazy AST loading with explicit `load()` / `release()` lifecycle per file |
| **Calibration-Ready** | Every semantic decision is logged via `RuleTrace` for debugging |

### Directory Structure

```
repo_engine/
├── index.ts                  # Engine-1 public API (analyzeRepository)
├── V3_ENGINE.md              # This documentation
│
├── repo_source/              # Repository acquisition layer
│   ├── clone.ts              #   Ephemeral git clone
│   └── file.utils.ts         #   Directory walker (walkDir)
│
├── schemas/
│   └── architecture.schema.ts
│
└── v3/
    ├── core/
    │   └── context.ts          # ScanContext, SignalBatch, SemanticNode, RuleTrace
    │
    ├── runtime/                # Orchestration runtime
    │   ├── pipeline_runner.ts  #   V3 pipeline entry (runV3Pipeline)
    │   └── checkpoints.ts      #   Stage checkpoint persistence
    │
    ├── parser/
    │   ├── tree-sitter.ts      #   WASM grammar loader + parser
    │   ├── ast_indexer.ts      #   Lazy AST index builder
    │   ├── detector.ts         #   Framework detection
    │   └── grammars/           #   .wasm grammar files
    │
    ├── profiler/
    │   └── repo_profiler.ts    #   Repository profiling
    │
    ├── patterns/
    │   ├── registry.ts         #   Central pattern re-export
    │   ├── route.pattern.ts    #   HTTP handler registrations & decorators
    │   ├── http.pattern.ts     #   Outbound HTTP calls
    │   ├── db.pattern.ts       #   ORM persistence operations & raw SQL
    │   ├── async.pattern.ts    #   Queue/event async boundaries
    │   └── service.pattern.ts  #   Service class & dependency injection
    │
    ├── evidence/
    │   ├── scope_resolver.ts   #   AST → Scope ID resolution
    │   └── normalizer.ts       #   Signal → Evidence Graph builder
    │
    ├── semantic/
    │   ├── rule_engine.ts      #   Priority-ordered rule evaluator
    │   └── rules/
    │       ├── endpoint.rule.ts
    │       ├── persistence.rule.ts
    │       ├── service.rule.ts
    │       ├── external.rule.ts
    │       └── queue.rule.ts
    │
    └── graph/
        └── builder.ts          #   Final ArchitectureGraph construction
```

---

## Pipeline Layers

### Layer 1: Profiling & Lazy Parsing

**Files:** `profiler/repo_profiler.ts`, `parser/ast_indexer.ts`

- Scans `package.json`, `requirements.txt`, `pom.xml`, `Dockerfile` for metadata
- Builds a **lazy AST index**: each file gets an `ASTReference` with `load()` and `release()` methods
- ASTs are loaded on-demand and released immediately after use to prevent memory leaks

```typescript
interface ASTReference {
    filepath: string;
    language: string;
    load: () => Promise<ASTTree>;
    release: () => void;
}
```

### Layer 2: Pattern Extraction

**Files:** `patterns/*.pattern.ts`

Each pattern extractor walks a single file's AST and emits `SignalBatch[]` signals. Extractors are framework-agnostic and detect structural patterns only.

| Extractor | Signal Kinds | What It Detects |
|---|---|---|
| `route.pattern.ts` | `handler_registration`, `route_decorator` | `obj.get("/path", fn)`, `@router.get(...)` |
| `http.pattern.ts` | `network_request` | `fetch()`, `axios.get()`, outbound HTTP calls |
| `db.pattern.ts` | `persistence_op`, `sql_query` | `model.findMany()`, `SELECT FROM`, `session.add()` |
| `async.pattern.ts` | `async_boundary` | `queue.add()`, `channel.publish()`, event emitters |
| `service.pattern.ts` | `service_class`, `dependency_instantiation` | Classes with injected dependencies, service naming |

### Layer 3: Evidence Aggregation

**Files:** `evidence/scope_resolver.ts`, `evidence/normalizer.ts`

- **Scope Resolver**: Maps every AST node to a hierarchical scope ID (e.g., `src/app.ts::Class=App::Function=getUser`)
- **Normalizer**: Groups all signals by `scopeId` into an `EvidenceGraph` and builds parent-child hierarchy

```typescript
interface EvidenceGraph {
    scopes: Record<string, SignalBatch[]>;    // scopeId → signals
    hierarchy: Record<string, string[]>;       // parentId → childIds
}
```

### Layer 4: Semantic Resolution

**Files:** `semantic/rule_engine.ts`, `semantic/rules/*.rule.ts`

The `SemanticRuleEngine` evaluates rules in **priority order** (highest first) against each scope's signals. Rules can be `exclusive` (a scope claimed by an exclusive rule won't be re-evaluated by lower-priority exclusive rules).

| Rule | Priority | Exclusive | Output Type | Key Conditions |
|---|---|---|---|---|
| `EndpointRule` | 100 | Yes | `http_endpoint` | `handler_registration` + HTTP context args, OR `route_decorator` |
| `CoreServiceRule` | 95 | No | `business_logic_service` | `service_class` + dependencies + child DB ops |
| `QueueWorkerRule` | 85 | Yes | `queue_worker` | `async_boundary` with consume/publish ops |
| `ExternalServiceRule` | 80 | No | `external_service` | `network_request` signals |
| `PersistenceRule` | 80 | No | `db_operation` | `persistence_op` or `sql_query` signals |

### Layer 5: Graph Building

**File:** `graph/builder.ts`

Transforms `SemanticNode[]` into the final `ArchitectureGraph`. Also extracts file-level metadata (functions, classes, imports, exports) from the AST index.

```typescript
interface ArchitectureGraph {
    nodes: ArchitectureNode[];       // Semantic components
    edges: any[];                    // Relationships (future)
    file_structure: FileStructureEntry[];  // AST metadata per file
}
```

### Layer 6: Framework Inference (Future)

Currently **on hold**. Will infer framework-specific patterns based on accumulated semantic evidence from Layers 1–5. Deferred until real-world calibration is complete.

---

## Data Flow & ScanContext

The `ScanContext` is a **mutable state container** passed through all layers. It accumulates data at each stage.

```typescript
class ScanContext {
    scanId: string;
    profile: RepoProfile;
    astIndex: ASTIndex;
    signals: SignalBatch[];
    evidence: EvidenceGraph;
    semanticNodes: SemanticNode[];
    architectureGraph: ArchitectureGraph;
    errors: ExecutionError[];
    traces: RuleTrace[];          // Calibration logs
}
```

### Data Flow Diagram

```
ScanContext
  │
  ├── Layer 1: profile, astIndex populated
  │
  ├── Layer 2: signals[] populated (raw pattern signals)
  │
  ├── Layer 3: evidence.scopes, evidence.hierarchy populated
  │
  ├── Layer 4: semanticNodes[] populated (classified components)
  │
  └── Layer 5: architectureGraph populated (final output)
```

### Checkpoints

After each layer, a checkpoint is saved to disk:

```
/tmp/archsight-checkpoints/<scanId>/
  ├── 1_profiling.json
  ├── 2_patterns.json
  ├── 3_evidence.json
  ├── 4_semantic.json
  └── 5_graph.json
```

---

## Pattern Extractors

### Signal Format

Every pattern extractor outputs `SignalBatch[]`:

```typescript
interface SignalBatch {
    kind: string;                    // e.g., "handler_registration"
    scopeId: string;                 // e.g., "src/app.ts::Function=getUser"
    parentScopeId: string | null;
    scopeType: "repository" | "file" | "class" | "function" | "block";
    file: string;
    occurrences: number;
    metadata_summary: Record<string, any>;  // Extractor-specific data
}
```

### Route Pattern (`route.pattern.ts`)

Detects two structural patterns:

1. **Handler Registration**: `obj.method(path, handler)` — emits `handler_registration` with `argsPreview` for structural validation
2. **Route Decorator**: `@router.get(...)` or `@GetMapping(...)` — emits `route_decorator`

### DB Pattern (`db.pattern.ts`)

Detects:
1. **ORM Calls**: `model.findMany()`, `session.add()`, `db.execute()` — emits `persistence_op`
2. **Raw SQL**: String literals containing `SELECT...FROM`, `INSERT INTO` — emits `sql_query`

### HTTP Pattern (`http.pattern.ts`)

Detects outbound network calls: `fetch()`, `axios.get()`, `http.request()` — emits `network_request`

### Async Pattern (`async.pattern.ts`)

Detects queue/event operations: `queue.add()`, `channel.publish()`, `emitter.on()` — emits `async_boundary`

### Service Pattern (`service.pattern.ts`)

Detects:
1. **Service Classes**: Classes with names containing "Service", "Repository", "Provider" — emits `service_class`
2. **Dependency Injection**: Constructor parameters, `@Inject` decorators — emits `dependency_instantiation`

---

## Semantic Rules

### EndpointRule (Priority: 100)

**Structural Validation**: For non-decorated handlers (Express-style), the rule **requires** the handler's argument list to contain HTTP context parameters (`req`, `res`, `ctx`, `next`, `request`, `response`). This structurally eliminates false positives from utility calls like `Promise.all()` or middleware wrappers without hardcoding any keywords.

```
handler_registration + HTTP context args → http_endpoint (0.85)
route_decorator alone → http_endpoint (0.80)
handler_registration + route_decorator → http_endpoint (0.95)
```

### PersistenceRule (Priority: 80)

```
persistence_op × 1 → db_operation (0.75, partial)
persistence_op × 2+ → db_operation (0.90, resolved)
sql_query present → db_operation (0.95, resolved)
```

### CoreServiceRule (Priority: 95)

Uses **compositional multi-signal analysis** including child scope inspection:

```
service_class + dependencies + child DB ops → business_logic_service (0.95)
service_class + (dependencies OR child DB ops) → business_logic_service (0.85)
service_class alone → business_logic_service (0.70)
```

### ExternalServiceRule (Priority: 80)

```
network_request × 1 → external_service (0.85)
network_request × 2+ → external_service (0.95)
```

### QueueWorkerRule (Priority: 85)

Classifies based on operation directionality:
- Consumer only → `message_consumer`
- Publisher only → `message_publisher`
- Both → `message_processor`

---

## Calibration System (RuleTrace)

Every semantic decision is logged via `RuleTrace` on `ScanContext.traces[]`:

```typescript
interface RuleTrace {
    rule: string;              // "HTTP_Endpoint"
    matched_signals: string[]; // ["handler_registration"]
    scopeId: string;
    confidence_delta: number;  // 0 = rejected, 0.85 = accepted
    reason?: string;           // Human-readable explanation
}
```

### Example Traces

```
✅ Accepted: rule=HTTP_Endpoint, scopeId=src/routes/auth.ts::Function=login, confidence=0.85
   reason: "Structural HTTP context or Explicit Decorator found."

❌ Rejected: rule=HTTP_Endpoint, scopeId=src/app.ts::Function=use, confidence=0
   reason: "Registration found but lacks HTTP context parameters. args='(express.json())'"
```

---

## Orchestrator Integration

Two orchestrators invoke the V3 pipeline:

### BullMQ Worker (`scan.processor.ts`)

Used for **queued async scans** triggered via the API. Runs in a sandboxed child process.

### Analysis Service (`analysis.service.ts`)

Used for **synchronous local scans** during development and testing.

Both orchestrators call the same function:

```typescript
import { runV3Pipeline } from "./v3/scanner/pipeline_runner.js";

const graph = await runV3Pipeline(scanId, rootPath, sourceFiles);
// graph: { nodes: ArchitectureNode[], edges: [], file_structure: FileStructureEntry[] }
```

The `EngineScanResult` stores the graph under `architecture`:

```typescript
const result: EngineScanResult = {
    scan_id, repo_id, framework, status: "completed",
    architecture: graph,  // ArchitectureGraph
    duration_ms, scanned_at, meta: { parser: "web-tree-sitter", version: "0.24.7" }
};
```

---

## Extension Guide

### Adding a New Pattern Extractor

1. Create `v3/patterns/your.pattern.ts`
2. Export `async function extractYourPattern(astRef: ASTReference): Promise<SignalBatch[]>`
3. Walk the AST, emit signals with unique `kind` values
4. Register in `pipeline_runner.ts`:
   ```typescript
   try { context.addSignals(await extractYourPattern(astRef)); }
   catch (e: any) { context.errors.push({ layer: "patterns.your", message: e.message, recoverable: true }); }
   ```

### Adding a New Semantic Rule

1. Create `v3/semantic/rules/your.rule.ts`
2. Implement the `SemanticRule` interface:
   ```typescript
   export const YourRule: SemanticRule = {
       name: "Your_Rule",
       priority: 80,
       exclusive: false,
       evaluate: (scopeId, signals, context) => { ... }
   };
   ```
3. Register in `pipeline_runner.ts`:
   ```typescript
   semanticEngine.registerRule(YourRule);
   ```

### Key Constraints

- **Never hardcode framework names** in pattern extractors or rules
- **Always use structural AST indicators** (node types, parameters, decorators)
- **Always log decisions** via `context.traces.push(...)` for calibration
- **Always release ASTs** via `astRef.release()` after use
