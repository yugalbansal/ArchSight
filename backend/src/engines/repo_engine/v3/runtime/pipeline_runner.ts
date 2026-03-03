import { ScanContext } from "../core/scan_context.js";
import { checkpoint } from "./checkpoints.js";

// Layer 1
import { runRepoProfiler } from "../profiler/repo_profiler.js";
import { LazyAstIndexer } from "../parser/ast_indexer.js";
import { initParser } from "../parser/tree-sitter.js";
import Parser from "web-tree-sitter";

// Layer 2
import { extractRoutePattern } from "../patterns/route.pattern.js";
import { extractHttpPattern } from "../patterns/http.pattern.js";
import { extractDbPattern } from "../patterns/db.pattern.js";
import { extractAsyncPattern } from "../patterns/async.pattern.js";
import { extractServicePattern } from "../patterns/service.pattern.js";

// Layer 3
import { buildEvidenceGraph } from "../evidence/normalizer.js";

// Layer 4
import { SemanticRuleEngine } from "../semantic/rule_engine.js";
import { EndpointRule } from "../semantic/rules/endpoint.rule.js";
import { PersistenceRule } from "../semantic/rules/persistence.rule.js";
import { ExternalServiceRule } from "../semantic/rules/external.rule.js";
import { QueueWorkerRule } from "../semantic/rules/queue.rule.js";
import { CoreServiceRule } from "../semantic/rules/service.rule.js";

// Layer 5
import { buildArchitectureGraph, ArchitectureGraph } from "../graph/builder.js";

/**
 * The V3 Pipeline Runner
 * Abstracts away all internal engine logic from the external API (BullMQ / NextJS).
 */
export async function runV3Pipeline(scanId: string, repositoryRoot: string, sourceFiles: { path: string, language: string }[]): Promise<ArchitectureGraph> {
    const context = new ScanContext(scanId);

    // Engine Prep
    await initParser();
    const parser = new Parser();
    const indexer = new LazyAstIndexer(parser);

    try {
        // --- Layer 1: Profiling & Parse Index ---
        await runRepoProfiler(context, repositoryRoot);
        context.astIndex = indexer.buildIndex(sourceFiles);
        await checkpoint(context, "1_profiling");

        // --- Layer 2: Patterns ---
        // TODO: Concurrency limit (e.g. p-limit) goes here to prevent 50k overlapping IO ops
        for (const file of sourceFiles) {
            const astRef = context.astIndex[file.path];
            if (!astRef) continue;

            // Pattern Isolation: Wrap executions safely
            try { context.addSignals(await extractRoutePattern(astRef)); } catch (e: any) { context.errors.push({ layer: "patterns.route", message: e.message, recoverable: true }); }
            try { context.addSignals(await extractHttpPattern(astRef)); } catch (e: any) { context.errors.push({ layer: "patterns.http", message: e.message, recoverable: true }); }
            try { context.addSignals(await extractDbPattern(astRef)); } catch (e: any) { context.errors.push({ layer: "patterns.db", message: e.message, recoverable: true }); }
            try { context.addSignals(await extractAsyncPattern(astRef)); } catch (e: any) { context.errors.push({ layer: "patterns.async", message: e.message, recoverable: true }); }
            try { context.addSignals(await extractServicePattern(astRef)); } catch (e: any) { context.errors.push({ layer: "patterns.service", message: e.message, recoverable: true }); }
        }
        await checkpoint(context, "2_patterns");

        // --- Layer 3: Evidence ---
        buildEvidenceGraph(context);
        await checkpoint(context, "3_evidence");

        // --- Layer 4: Semantic Resolution ---
        const semanticEngine = new SemanticRuleEngine();
        semanticEngine.registerRule(EndpointRule);
        semanticEngine.registerRule(PersistenceRule);
        semanticEngine.registerRule(ExternalServiceRule);
        semanticEngine.registerRule(QueueWorkerRule);
        semanticEngine.registerRule(CoreServiceRule);
        semanticEngine.run(context);
        await checkpoint(context, "4_semantic");

        // --- Layer 5: Graph Building ---
        context.architectureGraph = await buildArchitectureGraph(context);
        await checkpoint(context, "5_graph");

        // Result Translation
        // The V2 Engine output (EngineScanResult / ExtractedArchitecture) expects certain fields.
        // For now, we will return the ArchitectureGraph, and the orchestrators will adapt it.
        return context.architectureGraph;

    } finally {
        parser.delete();
    }
}
