import { ArchitectureInsights, VisualizationData } from "../../models/architecture_insight.model.js";
import { ArchitectureModel } from "../../models/architecture.model.js";
import { TopologyAnalyzer, ArchitectureGraph } from "./analyzers/topology.analyzer.js";
import { DependencyAnalyzer } from "./analyzers/dependency.analyzer.js";
import { CouplingAnalyzer } from "./analyzers/coupling.analyzer.js";
import { DataflowAnalyzer } from "./analyzers/dataflow.analyzer.js";
import { RiskAnalyzer } from "./analyzers/risk.analyzer.js";
import { InsightBuilder } from "./builders/insight.builder.js";
import dagre from "dagre";

export class ArchitectureEngine {
    private topologyAnalyzer: TopologyAnalyzer;
    private dependencyAnalyzer: DependencyAnalyzer;
    private couplingAnalyzer: CouplingAnalyzer;
    private dataflowAnalyzer: DataflowAnalyzer;
    private riskAnalyzer: RiskAnalyzer;
    private insightBuilder: InsightBuilder;

    constructor() {
        this.topologyAnalyzer = new TopologyAnalyzer();
        this.dependencyAnalyzer = new DependencyAnalyzer();
        this.couplingAnalyzer = new CouplingAnalyzer();
        this.dataflowAnalyzer = new DataflowAnalyzer();
        this.riskAnalyzer = new RiskAnalyzer();
        this.insightBuilder = new InsightBuilder();
    }

    /**
     * Convert Engine 1 output (Prisma nodes/edges) to ArchitectureGraph
     */
    private convertToArchitectureGraph(nodes: any[], edges: any[]): ArchitectureGraph {
        return {
            nodes: nodes.map(node => ({
                id: node.id,
                type: node.type,
                name: node.name,
                metadata: node.metadata
            })),
            edges: edges.map(edge => ({
                id: edge.id,
                source: edge.fromNodeId,
                target: edge.toNodeId,
                type: edge.relationType
            })),
            metadata: {
                totalFiles: nodes.length,
                languages: this.extractLanguages(nodes),
                repositorySize: nodes.length
            }
        };
    }

    private extractLanguages(nodes: any[]): string[] {
        const languages = new Set<string>();
        nodes.forEach(node => {
            if (node.metadata?.language) {
                languages.add(node.metadata.language);
            }
        });
        return Array.from(languages);
    }

    /**
     * Main analysis method - takes scan data and produces insights
     */
    async analyzeAndSave(scanId: string): Promise<ArchitectureInsights> {
        // Get scan data from database
        const scanData = await this.getScanData(scanId);
        if (!scanData) {
            throw new Error(`Scan ${scanId} not found`);
        }

        // Convert to ArchitectureGraph
        const graph = this.convertToArchitectureGraph(scanData.nodes, scanData.edges);

        // Run all analyzers
        const analysisResults = await this.runAnalyzers(graph);

        // Build insights
        const insights = this.insightBuilder.build(graph, analysisResults);

        // Save to database
        await ArchitectureModel.saveAnalysis(scanId, insights);

        return insights;
    }

    /**
     * Check if architecture analysis already exists for a scan
     */
    async hasAnalysis(scanId: string): Promise<boolean> {
        return ArchitectureModel.existsForScan(scanId);
    }

    /**
     * Get a summary of architecture analyses for a user (for dashboard listing)
     */
    async getAnalysisSummary(userId: string) {
        return ArchitectureModel.getByUserId(userId);
    }

    private async getScanData(scanId: string) {
        const { prisma } = await import("../../lib/db.js");

        return await prisma.scan.findUnique({
            where: { id: scanId },
            include: {
                nodes: true,
                edges: true,
                repository: true
            }
        });
    }

    private async runAnalyzers(graph: ArchitectureGraph) {
        // Run topology analysis
        const architectureType = this.topologyAnalyzer.analyzeArchitectureType(graph);
        const layers = this.topologyAnalyzer.detectLayers(graph);
        const services = this.topologyAnalyzer.countServices(graph);
        const externalDependencies = this.topologyAnalyzer.countExternalDependencies(graph);
        const detectedStack = this.topologyAnalyzer.detectStack(graph);

        // Run other analyzers
        const dependencyResults = this.dependencyAnalyzer.analyzeDependencies(graph);
        const couplingResults = this.couplingAnalyzer.analyzeCoupling(graph);
        const dataflowResults = this.dataflowAnalyzer.analyzeDataflow(graph);
        const riskResults = this.riskAnalyzer.analyzeRisks(graph);

        return {
            topology: {
                architectureType,
                layers,
                services,
                externalDependencies,
                detectedStack
            },
            dependencies: dependencyResults,
            coupling: couplingResults,
            dataflow: dataflowResults,
            risks: riskResults
        };
    }

    /**
     * Get existing insights with visualization
     */
    async getInsightsWithVisualization(scanId: string) {
        const insights = await ArchitectureModel.getByScanId(scanId);
        if (!insights) return null;

        // Get raw nodes and edges from database for visualization
        const { prisma } = await import("../../lib/db.js");
        const scanData = await prisma.scan.findUnique({
            where: { id: scanId },
            include: {
                nodes: true,
                edges: true
            }
        });

        return {
            insights,
            visualization: this.generateVisualizationFromNodes(scanData?.nodes || [], scanData?.edges || []),
            summary: this.insightBuilder.buildSummary(insights)
        };
    }

    /**
     * Generate React Flow visualization from insights
     */
    generateVisualization(insights: ArchitectureInsights): VisualizationData {
        const nodes = this.generateNodes(insights);
        const edges = this.generateEdges(insights);
        const layout = this.calculateLayout(insights);

        return { nodes, edges, layout };
    }

    private generateNodes(insights: ArchitectureInsights) {
        return insights.service_details.map((service, index) => {
            const position = this.calculateNodePosition(service, index, insights);

            return {
                id: service.id,
                type: 'customNode',
                position,
                data: {
                    label: service.name,
                    type: service.type,
                    risk: service.riskLevel,
                    layer: service.layer
                },
                style: {
                    backgroundColor: this.getNodeColor(service.riskLevel),
                    border: `2px solid ${this.getBorderColor(service.type)}`,
                    borderRadius: '8px',
                    padding: '10px',
                    minWidth: '120px'
                }
            };
        });
    }

    private generateEdges(insights: ArchitectureInsights) {
        return insights.dependencies.map(dep => ({
            id: `${dep.source}-${dep.target}`,
            source: dep.source,
            target: dep.target,
            type: dep.type === 'async' ? 'smoothstep' : 'default',
            animated: dep.type === 'async',
            style: {
                strokeWidth: Math.max(dep.strength * 3, 1),
                stroke: this.getEdgeColor(dep.type)
            }
        }));
    }

    private calculateNodePosition(service: any, index: number, insights: ArchitectureInsights) {
        const layerIndex = insights.layers.findIndex(layer =>
            layer.services.includes(service.id)
        );

        const layerY = layerIndex * 200 + 50;
        const serviceIndexInLayer = insights.layers[layerIndex]?.services.indexOf(service.id) || 0;
        const layerX = serviceIndexInLayer * 200 + 100;

        return {
            x: layerX,
            y: layerY
        };
    }

    private calculateLayout(insights: ArchitectureInsights) {
        return {
            direction: 'TB' as const,
            nodeSpacing: 200,
            layerSpacing: 200
        };
    }

    private getNodeColor(riskLevel: string): string {
        const colors = {
            low: '#10B981',    // Green
            medium: '#F59E0B', // Yellow
            high: '#EF4444'    // Red
        };
        return colors[riskLevel as keyof typeof colors] || '#6B7280';
    }

    private getBorderColor(serviceType: string): string {
        const colors = {
            api: '#3B82F6',      // Blue
            service: '#8B5CF6',  // Purple
            database: '#F97316', // Orange
            external: '#6B7280', // Gray
            worker: '#14B8A6'    // Teal
        };
        return colors[serviceType as keyof typeof colors] || '#6B7280';
    }

    private getEdgeColor(dependencyType: string): string {
        const colors = {
            sync: '#6B7280',     // Gray
            async: '#8B5CF6',    // Purple
            data: '#F97316'      // Orange
        };
        return colors[dependencyType as keyof typeof colors] || '#6B7280';
    }

    /**
     * Generate visualization directly from database nodes (more reliable)
     */
    generateVisualizationFromNodes(dbNodes: any[], dbEdges: any[]): VisualizationData {
        const nodes = dbNodes.map((node, index) => {
            // Extract meaningful name from metadata with better logic
            let displayName = this.extractNodeName(node);
            let nodeCategory = this.mapNodeToSemanticType(node.type);

            const position = this.calculateLayeredPosition(nodeCategory, index, dbNodes.length);

            return {
                id: node.id,
                type: 'default',
                position,
                data: {
                    label: displayName.length > 28 ? displayName.substring(0, 28) + '…' : displayName,
                    type: node.type,
                    fullName: displayName,
                    category: nodeCategory
                }
                // No inline style — CustomNodes.tsx handles all visual styling
            };
        });

        // Generate edges - combine database edges with inferred relationships
        const allEdges = [...dbEdges];

        // If we have few/no edges, generate logical architectural connections
        if (dbEdges.length < 2) {
            const inferredEdges = this.generateArchitecturalEdges(dbNodes);
            allEdges.push(...inferredEdges);
        }

        const edges = allEdges.map((edge, index) => ({
            id: edge.id || `generated-edge-${index}`,
            source: edge.fromNodeId || edge.source,
            target: edge.toNodeId || edge.target,
            type: 'smoothstep',
            animated: false, // CustomEdge handles animation via CSS
            // No markerEnd, no style — CustomEdge handles arrows and colors
            data: {
                label: this.getEdgeLabel(edge, allEdges.indexOf(edge)),
                color: this.getEdgeColorByType(edge.relationType || edge.type || 'Calls'),
                relationType: edge.relationType || edge.type,
            }
        }));

        // Apply intelligent layout using dagre
        const layoutedElements = this.getLayoutedElements(nodes, edges);

        return {
            nodes: layoutedElements.nodes,
            edges: layoutedElements.edges,
            layout: {
                direction: 'TB' as const,
                nodeSpacing: 200,
                layerSpacing: 180
            }
        };
    }

    private getLayoutedElements(nodes: any[], edges: any[]) {
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        // Configure layout direction and spacing
        dagreGraph.setGraph({
            rankdir: 'TB',  // Top to bottom flow
            ranksep: 150,   // Vertical spacing between ranks
            nodesep: 120,   // Horizontal spacing between nodes
            edgesep: 50     // Spacing between edges
        });

        // Add nodes to dagre graph
        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: 200, height: 80 });
        });

        // Add edges to dagre graph
        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        // Calculate layout
        dagre.layout(dagreGraph);

        // Apply calculated positions to nodes
        nodes.forEach((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            if (nodeWithPosition) {
                node.position = {
                    x: nodeWithPosition.x - 100, // Center the node
                    y: nodeWithPosition.y - 40
                };
            }
        });

        return { nodes, edges };
    }

    private extractNodeName(node: any): string {
        // node.metadata in DB = the full Engine 1 node object (stored via `metadata: node` in scan.model.ts)
        // So the real semantic metadata is at node.metadata.metadata
        // node.name is the name saved by builder.ts — use it unless it's "Unknown" (old scans)
        const storedName: string | undefined = (node.name && node.name !== 'Unknown') ? node.name : undefined;
        if (storedName) return storedName;

        // The full Engine 1 node blob stored as metadata
        const e1node = node.metadata as any;
        // Actual semantic metadata (e.g. { className, decorator, urls_or_args, ... })
        const sem = e1node?.metadata as any;
        // scopeId from Engine 1 (e.g. "src/auth/AuthService.ts::Class=AuthService")
        const scopeId: string = e1node?.scopeId || '';
        // file path from Engine 1
        const e1file: string = e1node?.file || node.file || '';

        // Helper: extract Class name from scopeId
        const classFromScope = (): string | null => {
            const m = scopeId.match(/Class=([^:]+)/);
            return m ? m[1] : null;
        };

        // Helper: file basename without extension
        const fileBase = (f: string): string => {
            const base = f.split('/').pop() || f;
            return base.replace(/\.[^.]+$/, '');
        };

        // ── API Endpoint ─────────────────────────────────────────────
        if (node.type === 'API') {
            if (sem?.decorator) {
                const pathMatch = sem.decorator.match(/["']([^"']+)["']/);
                if (pathMatch) {
                    let path = pathMatch[1].replace(/^\/+|\/+$/g, '').replace(/\//g, ' ').replace(/api/gi, '').trim();
                    if (path) return `${path.toUpperCase()} API`;
                }
                const verbMatch = sem.decorator.match(/@?(Get|Post|Put|Delete|Patch|Request)Mapping/i);
                if (verbMatch) return `${verbMatch[1].toUpperCase()} API`;
                return sem.decorator.replace(/[@()"']/g, '').trim() || 'API Endpoint';
            }
            if (sem?.method && sem?.path) return `${sem.method.toUpperCase()} ${sem.path}`;
            if (sem?.method) return `${sem.method.toUpperCase()} Endpoint`;
            return classFromScope() || (e1file ? fileBase(e1file) : 'API Endpoint');
        }

        // ── Service ──────────────────────────────────────────────────
        if (node.type === 'Service') {
            if (sem?.className) return sem.className;
            if (sem?.serviceName) return sem.serviceName;
            return classFromScope() || (e1file ? fileBase(e1file) : 'Service');
        }

        // ── External API ─────────────────────────────────────────────
        if (node.type === 'ExternalAPI') {
            const urls: string[] = sem?.urls_or_args || [];
            for (const u of urls) {
                try { return new URL(u).hostname.replace(/^www\./, ''); } catch { /**/ }
                if (u?.trim()) return u.trim().slice(0, 40);
            }
            const libs: string[] = sem?.libraries || [];
            if (libs.length > 0) return libs[0];
            return e1file ? fileBase(e1file) : 'External API';
        }

        // ── DB ───────────────────────────────────────────────────────
        if (node.type === 'DB') {
            const targets: string[] = (sem?.targets || []).filter(Boolean);
            if (targets.length > 0) return `${targets[0]} DB`;
            return e1file ? `${fileBase(e1file)} DB` : 'Database';
        }

        // ── Queue / Worker / Client ───────────────────────────────────
        if (node.type === 'Queue') return 'Message Queue';
        if (node.type === 'Worker') return e1file ? fileBase(e1file) : 'Background Worker';
        if (node.type === 'Client') return 'Client App';

        // Final fallback
        return e1file ? fileBase(e1file) : 'Service Component';
    }

    private mapNodeToSemanticType(nodeType: string): string {
        const typeMap: Record<string, string> = {
            // Prisma enum types (stored in architectureNode.type)
            'API': 'endpoint',
            'Service': 'service',
            'DB': 'database',
            'ExternalAPI': 'external',
            'Worker': 'worker',
            'Queue': 'queue',
            'Client': 'client',
            'LLM': 'service',
            // V3 Engine 1 semantic types (stored in rawAst.architecture.nodes[].type)
            'http_endpoint': 'endpoint',
            'db_operation': 'database',
            'business_logic_service': 'service',
            'external_service': 'external',
            'queue_worker': 'worker',
            'message_consumer': 'worker',
            'message_publisher': 'worker',
            'message_processor': 'worker',
            'llm': 'service',
            'client': 'client',
            'queue': 'queue',
        };
        return typeMap[nodeType] || 'service';
    }

    private calculateLayeredPosition(category: string, index: number, totalNodes: number) {
        // Layer-based positioning for proper architecture visualization
        const layerConfig = {
            endpoint: { y: 50, spacing: 220 },
            service: { y: 280, spacing: 200 },
            database: { y: 510, spacing: 250 },
            external: { y: 740, spacing: 200 },
            worker: { y: 420, spacing: 200 },
            queue: { y: 350, spacing: 200 },
            client: { y: 20, spacing: 200 }
        };

        const layer = layerConfig[category as keyof typeof layerConfig] || layerConfig.service;

        // Count nodes in this category for proper spacing
        const nodesInCategory = Math.ceil(totalNodes / Object.keys(layerConfig).length);
        const categoryIndex = index % nodesInCategory;

        return {
            x: 100 + (categoryIndex * layer.spacing),
            y: layer.y
        };
    }

    private getNodeColorByCategory(category: string): string {
        const colors = {
            endpoint: '#3B82F6',    // Blue - API endpoints
            service: '#8B5CF6',     // Purple - Business services
            database: '#F97316',    // Orange - Databases
            external: '#6B7280',    // Gray - External services
            worker: '#14B8A6',      // Teal - Background workers
            queue: '#F59E0B',       // Yellow - Message queues
            client: '#22C55E'       // Green - Client applications
        };
        return colors[category as keyof typeof colors] || '#64748B';
    }

    private getBorderColorByCategory(category: string): string {
        const colors = {
            endpoint: '#1E40AF',
            service: '#6B21A8',
            database: '#C2410C',
            external: '#374151',
            worker: '#0D9488',
            queue: '#D97706',
            client: '#16A34A'
        };
        return colors[category as keyof typeof colors] || '#475569';
    }

    private calculateNodePositionFromIndex(index: number, totalNodes: number) {
        // Create a grid layout
        const nodesPerRow = Math.ceil(Math.sqrt(totalNodes));
        const row = Math.floor(index / nodesPerRow);
        const col = index % nodesPerRow;

        return {
            x: col * 200 + 100,
            y: row * 150 + 100
        };
    }

    private getEdgeLabel(edge: any, index: number): string {
        const relationType = edge.relationType || edge.type || 'Calls';

        // Generate meaningful labels based on edge type and context
        switch (relationType) {
            case 'Calls':
                const callLabels = [
                    'api request',
                    'service call',
                    'processes data',
                    'handles request',
                    'authentication',
                    'validation'
                ];
                return callLabels[index % callLabels.length];

            case 'DBDependency':
                const dbLabels = [
                    'stores data',
                    'queries database',
                    'saves record',
                    'retrieves data'
                ];
                return dbLabels[index % dbLabels.length];

            case 'AsyncPipeline':
                const asyncLabels = [
                    'queues task',
                    'async process',
                    'background job',
                    'event trigger'
                ];
                return asyncLabels[index % asyncLabels.length];

            case 'Imports':
                return 'imports';

            default:
                // Fallback labels for unknown types
                const defaultLabels = [
                    'data flow',
                    'communicates',
                    'sends data',
                    'response'
                ];
                return defaultLabels[index % defaultLabels.length];
        }
    }

    private getEdgeColorByType(relationType: string): string {
        const colors = {
            'Calls': '#64748B',
            'Imports': '#94A3B8',
            'DBDependency': '#F97316',
            'AsyncPipeline': '#8B5CF6'
        };
        return colors[relationType as keyof typeof colors] || '#64748B';
    }

    private getBorderColorByType(nodeType: string): string {
        const colors = {
            'API': '#1E40AF',
            'Service': '#6B21A8',
            'DB': '#C2410C',
            'ExternalAPI': '#374151',
            'Worker': '#0D9488',
            'Client': '#16A34A',
            'Queue': '#D97706',
            'LLM': '#BE185D'
        };
        return colors[nodeType as keyof typeof colors] || '#475569';
    }

    private generateArchitecturalEdges(nodes: any[]) {
        const edges: any[] = [];

        // Group nodes by type
        const nodesByType = {
            API: nodes.filter(n => n.type === 'API'),
            Service: nodes.filter(n => n.type === 'Service'),
            DB: nodes.filter(n => n.type === 'DB'),
            ExternalAPI: nodes.filter(n => n.type === 'ExternalAPI'),
            Worker: nodes.filter(n => n.type === 'Worker'),
            Queue: nodes.filter(n => n.type === 'Queue')
        };

        // Pattern 1: API -> Services (typical request flow)
        nodesByType.API.forEach((apiNode, apiIndex) => {
            if (nodesByType.Service.length > apiIndex) {
                const targetService = nodesByType.Service[apiIndex];
                edges.push({
                    id: `api-service-${apiIndex}`,
                    source: apiNode.id,
                    target: targetService.id,
                    type: 'Calls',
                    inferred: true
                });
            }
        });

        // Pattern 2: Services -> External APIs (business logic calling external services)
        nodesByType.Service.forEach((serviceNode, serviceIndex) => {
            if (nodesByType.ExternalAPI.length > serviceIndex) {
                const targetExternal = nodesByType.ExternalAPI[serviceIndex];
                edges.push({
                    id: `service-external-${serviceIndex}`,
                    source: serviceNode.id,
                    target: targetExternal.id,
                    type: 'Calls',
                    inferred: true
                });
            }
        });

        // Pattern 3: Services -> DB (data persistence)
        nodesByType.Service.forEach((serviceNode, serviceIndex) => {
            if (nodesByType.DB.length > 0) {
                const targetDB = nodesByType.DB[serviceIndex % nodesByType.DB.length];
                edges.push({
                    id: `service-db-${serviceIndex}`,
                    source: serviceNode.id,
                    target: targetDB.id,
                    type: 'DBDependency',
                    inferred: true
                });
            }
        });

        // Pattern 4: Workers -> Queue (async pipeline)
        nodesByType.Worker.forEach((workerNode, workerIndex) => {
            if (nodesByType.Queue.length > 0) {
                const targetQueue = nodesByType.Queue[workerIndex % nodesByType.Queue.length];
                edges.push({
                    id: `worker-queue-${workerIndex}`,
                    source: workerNode.id,
                    target: targetQueue.id,
                    type: 'AsyncPipeline',
                    inferred: true
                });
            }
        });

        return edges;
    }
}

