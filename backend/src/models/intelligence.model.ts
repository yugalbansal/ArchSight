import { prisma } from "../lib/db.js";
import type { IntelligenceOutput } from "../engines/intelligence_engine/schemas.js";

export class IntelligenceModel {
    /**
     * Upsert intelligence analysis for a scan.
     * Safe to call multiple times — will overwrite if already exists.
     */
    static async saveAnalysis(scanId: string, output: IntelligenceOutput) {
        return prisma.intelligenceAnalysis.upsert({
            where: { scanId },
            create: {
                scanId,
                riskLevel:  output.overall_risk_level,
                confidence: output.confidence_level,
                theme:      output.architectural_theme,
                metrics:    output.metrics    as object,
                patterns:   output.detected_patterns as object,
                insights:   output.insights   as object,
                strategy: {
                    refactor_strategy:        output.refactor_strategy,
                    scaling_outlook:          output.scaling_outlook,
                    long_term_recommendation: output.long_term_recommendation,
                    primary_risk_drivers:     output.primary_risk_drivers,
                    priority_order:           output.priority_order,
                },
            },
            update: {
                riskLevel:  output.overall_risk_level,
                confidence: output.confidence_level,
                theme:      output.architectural_theme,
                metrics:    output.metrics    as object,
                patterns:   output.detected_patterns as object,
                insights:   output.insights   as object,
                strategy: {
                    refactor_strategy:        output.refactor_strategy,
                    scaling_outlook:          output.scaling_outlook,
                    long_term_recommendation: output.long_term_recommendation,
                    primary_risk_drivers:     output.primary_risk_drivers,
                    priority_order:           output.priority_order,
                },
            },
        });
    }

    /**
     * Retrieve the intelligence analysis for a specific scan.
     * Returns null if no analysis exists yet.
     */
    static async getByScanId(scanId: string) {
        return prisma.intelligenceAnalysis.findUnique({
            where: { scanId },
        });
    }

    /**
     * Retrieve all intelligence analyses for every scan belonging to a user.
     * Ordered most-recent first.
     */
    static async getByUserId(userId: string) {
        return prisma.intelligenceAnalysis.findMany({
            where: {
                scan: {
                    repository: {
                        userId,
                    },
                },
            },
            include: {
                scan: {
                    include: {
                        repository: {
                            select: { owner: true, name: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Delete intelligence analysis for a scan (used before re-analysis).
     */
    static async deleteByScanId(scanId: string) {
        return prisma.intelligenceAnalysis.deleteMany({
            where: { scanId },
        });
    }
}
