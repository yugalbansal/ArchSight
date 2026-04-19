import { Router } from "express";
import { getAuthSession } from "../lib/auth-middleware.js";
import { prisma } from "../lib/db.js";
import { IntelligenceModel } from "../models/intelligence.model.js";
import { analyzeArchitecture } from "../engines/intelligence_engine/index.js";
import type { ArchitectureGraph } from "../schemas/architecture-graph.schema.js";

const router = Router();

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
