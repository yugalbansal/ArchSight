import { prisma } from "../lib/db.js";
import { ArchitectureInsights } from "./architecture_insight.model.js";

export class ArchitectureModel {
    /**
     * Save architecture analysis results for a scan
     */
    static async saveAnalysis(scanId: string, insights: ArchitectureInsights) {
        const analysis = await prisma.architectureAnalysis.upsert({
            where: { scanId },
            update: {
                insights: insights as any,
                updatedAt: new Date()
            },
            create: {
                scanId,
                insights: insights as any
            }
        });

        return analysis.id;
    }

    /**
     * Get architecture analysis by scan ID
     */
    static async getByScanId(scanId: string): Promise<ArchitectureInsights | null> {
        const analysis = await prisma.architectureAnalysis.findUnique({
            where: { scanId },
            include: {
                scan: {
                    include: { repository: true }
                }
            }
        });

        if (!analysis) return null;

        return analysis.insights as unknown as ArchitectureInsights;
    }

    /**
     * Get analysis with repository info for API response
     */
    static async getWithRepoInfo(scanId: string) {
        const analysis = await prisma.architectureAnalysis.findUnique({
            where: { scanId },
            include: {
                scan: {
                    include: { repository: true }
                }
            }
        });

        if (!analysis) return null;

        return {
            id: analysis.id,
            scanId: analysis.scanId,
            insights: analysis.insights as unknown as ArchitectureInsights,
            repository: {
                owner: analysis.scan.repository.owner,
                name: analysis.scan.repository.name,
                branch: analysis.scan.branch
            },
            createdAt: analysis.createdAt,
            updatedAt: analysis.updatedAt
        };
    }

    /**
     * Get all architecture analyses for a user
     */
    static async getByUserId(userId: string) {
        const analyses = await prisma.architectureAnalysis.findMany({
            where: {
                scan: {
                    repository: { userId }
                }
            },
            include: {
                scan: {
                    include: { repository: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return analyses.map(analysis => {
            const insights = analysis.insights as unknown as ArchitectureInsights;
            return {
                id: analysis.id,
                scanId: analysis.scanId,
                repository: {
                    owner: analysis.scan.repository.owner,
                    name: analysis.scan.repository.name
                },
                architecture_type: insights.architecture_type,
                services: insights.services,
                risk_score: insights.risk_score,
                coupling: insights.coupling,
                createdAt: analysis.createdAt
            };
        });
    }

    /**
     * Check if architecture analysis exists for a scan
     */
    static async existsForScan(scanId: string): Promise<boolean> {
        const count = await prisma.architectureAnalysis.count({
            where: { scanId }
        });
        return count > 0;
    }

    /**
     * Delete architecture analysis
     */
    static async delete(scanId: string) {
        return await prisma.architectureAnalysis.delete({
            where: { scanId }
        });
    }
}


