import { prisma } from "../lib/db.js";
import { EngineScanResult } from "../engines/repo_engine/index.js";

export type ScanStatus = "pending" | "cloning" | "detecting" | "parsing" | "extracting" | "analysing" | "completed" | "failed";

export class ScanModel {
    /**
     * Map Engine 1 node types to Prisma NodeType enum values
     */
    private static mapNodeTypeToPrismaEnum(nodeType: string): string {
        const typeMap: { [key: string]: string } = {
            'http_endpoint': 'API',
            'db_operation': 'DB',
            'business_logic_service': 'Service',
            'external_service': 'ExternalAPI',
            'queue_worker': 'Worker',
            'client': 'Client',
            'llm': 'LLM',
            'queue': 'Queue'
        };

        return typeMap[nodeType] || 'Service'; // Default fallback
    }

    /**
     * Map Engine 1 relation types to Prisma RelationType enum values.
     * Engine 1 produces: co_location, endpoint_to_service, service_to_db,
     * endpoint_to_db, worker_to_service, cross_file_import, service_to_external
     */
    private static mapRelationTypeToPrismaEnum(relationType: string): string {
        const typeMap: { [key: string]: string } = {
            // Legacy / direct matches
            'calls': 'Calls',
            'imports': 'Imports',
            'db_dependency': 'DBDependency',
            'async_pipeline': 'AsyncPipeline',
            // Engine 1 V3 edge types → closest Prisma enum
            'co_location': 'Calls',
            'endpoint_to_service': 'Calls',
            'service_to_db': 'DBDependency',
            'endpoint_to_db': 'DBDependency',
            'worker_to_service': 'AsyncPipeline',
            'cross_file_import': 'Imports',
            'service_to_external': 'Calls',
        };

        return typeMap[relationType] || 'Calls';
    }
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
        try {
            // Check if architecture is ArchitectureGraph (has nodes/edges) or ExtractedArchitecture (legacy)
            const hasNodesAndEdges = 'nodes' in engineResult.architecture && 'edges' in engineResult.architecture;

            if (hasNodesAndEdges) {
                const arch = engineResult.architecture as any;

                // Use transaction with INCREASED TIMEOUT (default 5s is too short for
                // bulk inserts over a remote Supabase connection — 47+ nodes + 63+ edges
                // easily exceeds 5s with individual creates).
                await prisma.$transaction(async (tx) => {
                    // Clear existing nodes/edges (in case of retry)
                    await tx.architectureEdge.deleteMany({ where: { scanId } });
                    await tx.architectureNode.deleteMany({ where: { scanId } });

                    // ── Bulk-insert nodes via createMany ─────────────────────────
                    // Deduplicate by ID to prevent unique constraint violations
                    const seenNodeIds = new Set<string>();
                    const nodeData = arch.nodes
                        .filter((node: any) => {
                            if (seenNodeIds.has(node.id)) return false;
                            seenNodeIds.add(node.id);
                            return true;
                        })
                        .map((node: any) => ({
                            id: node.id,
                            scanId,
                            type: ScanModel.mapNodeTypeToPrismaEnum(node.type) as any,
                            name: node.name || 'Unknown',
                            metadata: node,
                        }));

                    if (nodeData.length > 0) {
                        await tx.architectureNode.createMany({
                            data: nodeData,
                            skipDuplicates: true,
                        });
                    }

                    // ── Bulk-insert edges via createMany ─────────────────────────
                    // Only include edges whose source AND target nodes exist
                    const edgeData = arch.edges
                        .map((edge: any, index: number) => ({
                            id: `${scanId}-edge-${index}`,
                            scanId,
                            fromNodeId: edge.source,
                            toNodeId: edge.target,
                            relationType: ScanModel.mapRelationTypeToPrismaEnum(edge.type) as any,
                        }))
                        .filter((edge: any) =>
                            seenNodeIds.has(edge.fromNodeId) && seenNodeIds.has(edge.toNodeId)
                        );

                    if (edgeData.length > 0) {
                        await tx.architectureEdge.createMany({
                            data: edgeData,
                            skipDuplicates: true,
                        });
                    }

                    // Update scan status
                    await tx.scan.update({
                        where: { id: scanId },
                        data: {
                            status: "completed",
                            progress: 100,
                            errorMessage: "Scan successfully finished.",
                            rawAst: engineResult as any,
                            completedAt: new Date()
                        }
                    });
                }, {
                    timeout: 30000, // 30 seconds (default 5s is too short for remote DB)
                });

                console.log(`[ScanModel] Successfully saved ${arch.nodes.length} nodes and ${arch.edges.length} edges for scan ${scanId}`);
            } else {
                // Legacy ExtractedArchitecture - just update scan status
                await prisma.scan.update({
                    where: { id: scanId },
                    data: {
                        status: "completed",
                        progress: 100,
                        errorMessage: "Scan finished (legacy format).",
                        rawAst: engineResult as any,
                        completedAt: new Date()
                    }
                });
                console.log(`[ScanModel] Scan completed with legacy architecture format for scan ${scanId}`);
            }
        } catch (error: any) {
            console.error(`[ScanModel] Failed to save architecture data:`, error.message);
            // Still mark as completed but without nodes/edges
            await prisma.scan.update({
                where: { id: scanId },
                data: {
                    status: "completed",
                    progress: 100,
                    errorMessage: `Scan finished with architecture data issues: ${error.message}`,
                    rawAst: engineResult as any,
                    completedAt: new Date()
                }
            });
        }
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
