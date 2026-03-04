import { Router } from "express";
import { ArchitectureEngine } from "../engines/architecture_engine/index.js";

const router = Router();
const architectureEngine = new ArchitectureEngine();

/**
 * Analyze architecture for a completed scan
 * POST /api/architecture/analyze/:scanId
 */
router.post("/analyze/:scanId", async (req, res) => {
    try {
        const { scanId } = req.params;

        // Check if analysis already exists
        const hasExisting = await architectureEngine.hasAnalysis(scanId);
        if (hasExisting) {
            return res.status(400).json({
                error: "Architecture analysis already exists for this scan"
            });
        }

        // Run analysis
        const insights = await architectureEngine.analyzeAndSave(scanId);
        const visualization = architectureEngine.generateVisualization(insights);

        res.json({
            success: true,
            insights,
            visualization
        });
    } catch (error) {
        console.error("Architecture analysis error:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Analysis failed"
        });
    }
});

/**
 * Get architecture insights and visualization for a scan
 * GET /api/architecture/:scanId
 */
router.get("/:scanId", async (req, res) => {
    try {
        const { scanId } = req.params;
        const { prisma } = await import("../lib/db.js");

        // Always load the scan with its raw architecture data (source of truth)
        const scanData = await prisma.scan.findUnique({
            where: { id: scanId },
            include: { architectureAnalysis: true }
        });

        if (!scanData) {
            return res.status(404).json({ error: "Scan not found" });
        }

        // Extract V3 architecture from rawAst (the actual engine output)
        const rawAst = scanData.rawAst as any;
        const archFromRawAst = rawAst?.architecture;

        if (!archFromRawAst || !Array.isArray(archFromRawAst.nodes) || archFromRawAst.nodes.length === 0) {
            return res.status(404).json({
                error: "Architecture analysis not found for this scan"
            });
        }

        // Generate visualization directly from the V3 node/edge data in rawAst
        const visualization = architectureEngine.generateVisualizationFromNodes(
            archFromRawAst.nodes,
            archFromRawAst.edges || []
        );

        // Include Engine 2 insights if available (richer metadata)
        const insights = scanData.architectureAnalysis
            ? (scanData.architectureAnalysis.insights as unknown)
            : null;

        return res.json({
            success: true,
            insights,
            visualization,
            summary: null
        });
    } catch (error) {
        console.error("Get architecture error:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to retrieve analysis"
        });
    }
});

/**
 * Get visualization data only (for React Flow)
 * GET /api/architecture/:scanId/visualization
 */
router.get("/:scanId/visualization", async (req, res) => {
    try {
        const { scanId } = req.params;

        const result = await architectureEngine.getInsightsWithVisualization(scanId);

        if (!result) {
            return res.status(404).json({
                error: "Architecture analysis not found"
            });
        }

        res.json({
            success: true,
            visualization: result.visualization,
            summary: result.summary
        });
    } catch (error) {
        console.error("Get visualization error:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to retrieve visualization"
        });
    }
});

/**
 * Get user's architecture analyses (for dashboard)
 * GET /api/architecture/user/:userId
 */
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const analyses = await architectureEngine.getAnalysisSummary(userId);

        res.json({
            success: true,
            analyses
        });
    } catch (error) {
        console.error("Get user analyses error:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to retrieve user analyses"
        });
    }
});

/**
 * Re-analyze architecture (if scan data has changed)
 * PUT /api/architecture/:scanId/reanalyze
 */
router.put("/:scanId/reanalyze", async (req, res) => {
    try {
        const { scanId } = req.params;

        // Delete existing analysis and create new one
        try {
            const { ArchitectureModel } = await import("../models/architecture.model.js");
            await ArchitectureModel.delete(scanId);
        } catch (error) {
            // Analysis might not exist, continue
        }

        const insights = await architectureEngine.analyzeAndSave(scanId);
        const visualization = architectureEngine.generateVisualization(insights);

        res.json({
            success: true,
            insights,
            visualization
        });
    } catch (error) {
        console.error("Reanalyze error:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Reanalysis failed"
        });
    }
});

export default router;
