import { prisma } from "../lib/db.js";
import { EngineScanResult } from "../engines/repo_engine/index.js";

export type ScanStatus = "pending" | "cloning" | "detecting" | "parsing" | "extracting" | "completed" | "failed";

export class ScanModel {
    /**
     * Create a new pending scan job in Prisma
     */
    static async createPendingScan(owner: string, repo: string, branch: string = "main", userId?: string): Promise<string> {
        if (!userId) {
            throw new Error("userId is required to create a scan in Prisma");
        }

        // Upsert the Repository first
        const repository = await prisma.repository.upsert({
            where: {
                userId_owner_name: {
                    userId,
                    owner,
                    name: repo
                }
            },
            update: {},
            create: {
                userId,
                owner,
                name: repo,
                provider: "github"
            }
        });

        const scan = await prisma.scan.create({
            data: {
                repositoryId: repository.id,
                status: "pending",
                progress: 0,
                branch,
                errorMessage: "Queued for processing..."
            }
        });

        return scan.id;
    }

    /**
     * Helper for the Background Worker to update the real-time stage of a scan
     */
    static async updateStage(scanId: string, status: ScanStatus, progress: number, message: string) {
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status,
                progress,
                errorMessage: message // We use errorMessage to temporarily store the current stage message
            }
        });
    }

    /**
     * Helper for the Background Worker to mark a scan as completely finished and save the AST data
     */
    static async markCompleted(scanId: string, engineResult: EngineScanResult) {
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: "completed",
                progress: 100,
                errorMessage: "Scan successfully finished.",
                rawAst: engineResult as any,
                completedAt: new Date()
            }
        });
    }

    /**
     * Helper for the Background Worker to mark a scan as failed
     */
    static async markFailed(scanId: string, error: string) {
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: "failed",
                errorMessage: error
            }
        });
    }

    /**
     * Fetch a scan by ID for front-end polling
     */
    static async getById(scanId: string) {
        const scan = await prisma.scan.findUnique({
            where: { id: scanId },
            include: { repository: true }
        });

        if (!scan) return null;

        // Map it back to the expected flattened format for the frontend API response
        return {
            _id: scan.id,
            user_id: scan.repository.userId,
            repo_owner: scan.repository.owner,
            repo_name: scan.repository.name,
            branch: scan.branch,
            status: scan.status,
            progress: scan.progress,
            message: scan.errorMessage,
            engine_result: scan.rawAst,
            created_at: scan.startedAt,
            completed_at: scan.completedAt,
            error_details: scan.status === "failed" ? scan.errorMessage : undefined
        };
    }

    /**
     * Fetch all scans for a specific user to populate the Dashboard
     */
    static async getByUserId(userId: string) {
        const scans = await prisma.scan.findMany({
            where: { repository: { userId } },
            include: { repository: true },
            orderBy: { startedAt: 'desc' },
            take: 20
        });

        // Map back to expected flat UI format
        return scans.map(scan => ({
            _id: scan.id,
            user_id: scan.repository.userId,
            repo_owner: scan.repository.owner,
            repo_name: scan.repository.name,
            branch: scan.branch,
            status: scan.status,
            progress: scan.progress,
            message: scan.errorMessage,
            created_at: scan.startedAt,
            completed_at: scan.completedAt,
        }));
    }
}
