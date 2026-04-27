import { Router } from "express";
import { getAuthSession } from "../lib/auth-middleware.js";
import { prisma } from "../lib/db.js";
import { IntelligenceModel } from "../models/intelligence.model.js";
import {
    analyzeArchitecture,
    buildReportPayload,
    answerQuestionFromReport,
    generateSimpleReport,
} from "../engines/intelligence_engine/index.js";
import type { ArchitectureGraph } from "../schemas/architecture-graph.schema.js";
import type {
    IntelligenceOutput,
    GraphMetrics,
    DetectedPattern,
    InsightItem,
    RiskLevel,
    ConfidenceLevel,
} from "../engines/intelligence_engine/schemas.js";

const router = Router();

interface ChatRequestBody {
    message?: string;
    mode?: "full_report" | "qa";
}

function mapRecordToIntelligenceOutput(record: {
    scanId: string;
    riskLevel: string;
    confidence: string;
    theme: string;
    metrics: unknown;
    patterns: unknown;
    insights: unknown;
    strategy: unknown;
    updatedAt: Date;
}): IntelligenceOutput {
    const strategy =
        record.strategy && typeof record.strategy === "object"
            ? (record.strategy as {
                  refactor_strategy?: string;
                  scaling_outlook?: string;
                  long_term_recommendation?: string;
                  primary_risk_drivers?: string[];
                  priority_order?: string[];
              })
            : {};

    const detectedPatterns = Array.isArray(record.patterns)
        ? (record.patterns as DetectedPattern[])
        : [];

    const insights = Array.isArray(record.insights)
        ? (record.insights as InsightItem[])
        : [];

    return {
        scan_id: record.scanId,
        architectural_theme: record.theme,
        overall_risk_level: record.riskLevel as RiskLevel,
        confidence_level: record.confidence as ConfidenceLevel,
        primary_risk_drivers: Array.isArray(strategy.primary_risk_drivers)
            ? strategy.primary_risk_drivers
            : [],
        priority_order: Array.isArray(strategy.priority_order)
            ? strategy.priority_order
            : [],
        refactor_strategy: strategy.refactor_strategy ?? "",
        scaling_outlook: strategy.scaling_outlook ?? "",
        long_term_recommendation: strategy.long_term_recommendation ?? "",
        insights,
        detected_patterns: detectedPatterns,
        metrics: record.metrics as GraphMetrics,
        analyzed_at: record.updatedAt.toISOString(),
        engine_version: "3.0.0",
    };
}

async function getOwnedScan(userId: string, scanId: string) {
    return prisma.scan.findUnique({
        where: { id: scanId },
        include: {
            repository: true,
            intelligenceAnalysis: true,
        },
    }).then(scan => {
        if (!scan) return null;
        if (scan.repository.userId !== userId) return null;
        return scan;
    });
}

/**
 * GET /api/intelligence/user/all
 * Returns intelligence analyses for all scans owned by the current user.
 */
router.get("/user/all", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user?.id) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const analyses = await IntelligenceModel.getByUserId(session.user.id);
        return res.status(200).json({ analyses });
    } catch (error) {
        console.error("[API:Intelligence] Failed to fetch user analyses:", error);
        return res.status(500).json({ error: "Internal Server Error fetching intelligence analyses." });
    }
});

/**
 * POST /api/intelligence/:scanId/chat
 * Grounded chatbot/report endpoint backed by stored Intelligence Engine output.
 */
router.post("/:scanId/chat", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user?.id) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const { scanId } = req.params;
        const ownedScan = await getOwnedScan(session.user.id, scanId);
        if (!ownedScan) {
            return res.status(404).json({ error: "Scan not found." });
        }

        const body = (req.body || {}) as ChatRequestBody;
        const mode = body.mode === "qa" ? "qa" : "full_report";
        const message = typeof body.message === "string" ? body.message.trim() : "";

        const analysisRecord = await IntelligenceModel.getByScanId(scanId);
        if (!analysisRecord) {
            return res.status(404).json({
                error: "Intelligence analysis not found for this scan. Run reanalysis first.",
            });
        }

        const output = mapRecordToIntelligenceOutput({
            scanId: analysisRecord.scanId,
            riskLevel: analysisRecord.riskLevel,
            confidence: analysisRecord.confidence,
            theme: analysisRecord.theme,
            metrics: analysisRecord.metrics,
            patterns: analysisRecord.patterns,
            insights: analysisRecord.insights,
            strategy: analysisRecord.strategy,
            updatedAt: analysisRecord.updatedAt,
        });

        const repoFullName = `${ownedScan.repository.owner}/${ownedScan.repository.name}`;
        const branch = ownedScan.branch;
        const report = await buildReportPayload(output, repoFullName, branch);
        const reply = mode === "qa" ? await answerQuestionFromReport(message, report) : report.summary;

        let finalMarkdown = report.report_markdown;
        if (mode === "full_report") {
            finalMarkdown = await generateSimpleReport(report);
        }

        return res.status(200).json({
            reply,
            mode,
            report_markdown: finalMarkdown,
            implementation_plan: report.implementation_plan,
            llm_handoff_markdown: report.llm_handoff_markdown,
            source: {
                scan_id: scanId,
                repository: repoFullName,
                branch,
                risk_level: output.overall_risk_level,
                risk_score: output.metrics.risk_score,
            },
        });
    } catch (error) {
        console.error("[API:Intelligence] Chat/report generation failed:", error);
        return res.status(500).json({ error: "Internal Server Error generating intelligence report." });
    }
});

/**
 * GET /api/intelligence/:scanId
 * Returns intelligence analysis for a specific scan (owner-only).
 */
router.get("/:scanId", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user?.id) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const { scanId } = req.params;
        const ownedScan = await getOwnedScan(session.user.id, scanId);

        if (!ownedScan) {
            return res.status(404).json({ error: "Scan not found." });
        }

        const analysis = await IntelligenceModel.getByScanId(scanId);
        if (!analysis) {
            return res.status(404).json({ error: "Intelligence analysis not found for this scan." });
        }

        return res.status(200).json({ analysis });
    } catch (error) {
        console.error("[API:Intelligence] Failed to fetch scan analysis:", error);
        return res.status(500).json({ error: "Internal Server Error fetching intelligence analysis." });
    }
});

/**
 * POST /api/intelligence/:scanId/reanalyze
 * Re-runs Engine 3 analysis from stored scan graph and upserts the result.
 */
router.post("/:scanId/reanalyze", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user?.id) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const { scanId } = req.params;
        const ownedScan = await getOwnedScan(session.user.id, scanId);

        if (!ownedScan) {
            return res.status(404).json({ error: "Scan not found." });
        }

        const raw = ownedScan.rawAst as any;
        const graph = raw?.architecture as ArchitectureGraph | undefined;

        if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
            return res.status(400).json({ error: "Scan does not contain a valid architecture graph for reanalysis." });
        }

        const intelligence = await analyzeArchitecture({
            scan_id: ownedScan.id,
            repo_id: `${ownedScan.repository.owner}/${ownedScan.repository.name}`,
            framework: raw?.framework ?? ownedScan.framework ?? "unknown",
            frameworks: raw?.frameworks ?? [raw?.framework ?? ownedScan.framework ?? "unknown"],
            graph,
        });

        await IntelligenceModel.saveAnalysis(scanId, intelligence);

        return res.status(200).json({
            message: "Intelligence reanalysis completed successfully.",
            analysis: intelligence,
        });
    } catch (error) {
        console.error("[API:Intelligence] Failed to reanalyze scan:", error);
        return res.status(500).json({ error: "Internal Server Error during intelligence reanalysis." });
    }
});

export default router;
