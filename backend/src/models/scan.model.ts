import { prisma } from "../lib/db.js";
import { EngineScanResult } from "../engines/repo_engine/index.js";

export type ScanStatus = "pending" | "cloning" | "detecting" | "parsing" | "extracting" | "completed" | "failed";

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
     * Map Engine 1 relation types to Prisma RelationType enum values
     */
    private static mapRelationTypeToPrismaEnum(relationType: string): string {
        const typeMap: { [key: string]: string } = {
            'calls': 'Calls',
            'imports': 'Imports',
            'db_dependency': 'DBDependency',
            'async_pipeline': 'AsyncPipeline'
        };

        return typeMap[relationType] || 'Calls'; // Default fallback
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
                const arch = engineResult.architecture as any; // Type assertion since we checked above

                // Use transaction to ensure atomicity
                await prisma.$transaction(async (tx) => {
                    // Clear existing nodes/edges (in case of retry)
                    await tx.architectureEdge.deleteMany({ where: { scanId } });
                    await tx.architectureNode.deleteMany({ where: { scanId } });

                    // Create nodes first
                    const nodeCreates = arch.nodes.map((node: any) => ({
                        id: node.id, // Use the semantic ID from Engine 1
                        scanId,
                        type: ScanModel.mapNodeTypeToPrismaEnum(node.type), // Map to Prisma enum
                        name: node.name,
                        metadata: node // Store full node data
                    }));

                    // Insert nodes
                    for (const nodeData of nodeCreates) {
                        try {
                            await tx.architectureNode.create({ data: nodeData });
                        } catch (nodeError: any) {
                            console.warn(`[ScanModel] Failed to create node ${nodeData.id} (${nodeData.type}):`, nodeError.message);
                        }
                    }

                    // Create edges (reference nodes by their semantic IDs)
                    const edgeCreates = arch.edges.map((edge: any, index: number) => ({
                        id: `${scanId}-edge-${index}`, // Generate unique edge ID
                        scanId,
                        fromNodeId: edge.source,
                        toNodeId: edge.target,
                        relationType: ScanModel.mapRelationTypeToPrismaEnum(edge.type) // Map to Prisma enum
                    }));

                    // Insert edges
                    for (const edgeData of edgeCreates) {
                        try {
                            await tx.architectureEdge.create({ data: edgeData });
                        } catch (edgeError: any) {
                            console.warn(`[ScanModel] Failed to create edge ${edgeData.fromNodeId} -> ${edgeData.toNodeId}:`, edgeError.message);
                            // Continue with other edges
                        }
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
            console.error(`[ScanModel] Failed to save architecture data:`, error);
            // Still mark as completed but without nodes/edges
            await prisma.scan.update({
                where: { id: scanId },
                data: {
                    status: "completed",
                    progress: 100,
                    errorMessage: "Scan finished with architecture data issues.",
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
