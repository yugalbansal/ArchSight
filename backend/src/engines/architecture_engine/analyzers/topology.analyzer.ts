import type {
    ArchitectureGraph,
    ArchitectureNode,
    ArchitectureEdge,
    FileStructureEntry,
} from "../../../schemas/architecture-graph.schema.js";

export class TopologyAnalyzer {
    /**
     * Analyze the overall architecture type
     */
    analyzeArchitectureType(graph: ArchitectureGraph): string {
        const nodeTypes = this.getNodeTypeCounts(graph);

        // Check for microservices patterns
        if (this.hasMicroservicesPattern(graph, nodeTypes)) {
            return 'microservices';
        }

        // Check for layered architecture
        if (this.hasLayeredPattern(graph, nodeTypes)) {
            return 'layered_backend';
        }

        // Check for monolith patterns
        if (this.hasMonolithPattern(graph, nodeTypes)) {
            return 'monolith';
        }

        // Check for serverless patterns
        if (this.hasServerlessPattern(graph, nodeTypes)) {
            return 'serverless';
        }

        return 'unknown';
    }

    /**
     * Detect architectural layers
     */
    detectLayers(graph: ArchitectureGraph) {
        const layers = new Map<string, string[]>();

        graph.nodes.forEach(node => {
            const layer = this.determineNodeLayer(node);
            if (!layers.has(layer)) {
                layers.set(layer, []);
            }
            layers.get(layer)!.push(node.id);
        });

        return Array.from(layers.entries()).map(([name, services], index) => ({
            name,
            services,
            depth: this.calculateLayerDepth(name)
        }));
    }

    /**
     * Count service nodes
     */
    countServices(graph: ArchitectureGraph): number {
        return graph.nodes.filter(node =>
            ['API', 'Service', 'Worker'].includes(node.type)
        ).length;
    }

    /**
     * Count external dependencies
     */
    countExternalDependencies(graph: ArchitectureGraph): number {
        return graph.nodes.filter(node =>
            node.type === 'ExternalAPI' || node.type === 'LLM'
        ).length;
    }

    /**
     * Detect technology stack
     */
    detectStack(graph: ArchitectureGraph): string[] {
        const stack: string[] = [];

        // Derive languages from file_structure entries
        if (graph.file_structure) {
            const langs = new Set(graph.file_structure.map(f => f.language));
            langs.forEach(l => { if (l && !stack.includes(l)) stack.push(l); });
        }

        // From node analysis
        graph.nodes.forEach(node => {
            if (node.metadata?.technology) {
                const tech = node.metadata.technology;
                if (typeof tech === 'string' && !stack.includes(tech)) {
                    stack.push(tech);
                }
            }

            // Infer from node types
            if (node.type === 'DB' && !stack.includes('Database')) {
                stack.push('Database');
            }
            if (node.type === 'Queue' && !stack.includes('Queue')) {
                stack.push('Queue');
            }
        });

        return stack;
    }

    private getNodeTypeCounts(graph: ArchitectureGraph): Map<string, number> {
        const counts = new Map<string, number>();
        graph.nodes.forEach(node => {
            counts.set(node.type, (counts.get(node.type) || 0) + 1);
        });
        return counts;
    }

    private hasMicroservicesPattern(graph: ArchitectureGraph, nodeTypes: Map<string, number>): boolean {
        const apiCount = nodeTypes.get('API') || 0;
        const serviceCount = nodeTypes.get('Service') || 0;
        const totalServiceNodes = apiCount + serviceCount;

        // Multiple independent services
        return totalServiceNodes >= 3 && this.hasDistributedCommunication(graph);
    }

    private hasLayeredPattern(graph: ArchitectureGraph, nodeTypes: Map<string, number>): boolean {
        const hasApi = (nodeTypes.get('API') || 0) > 0;
        const hasService = (nodeTypes.get('Service') || 0) > 0;
        const hasDb = (nodeTypes.get('DB') || 0) > 0;

        // Classic 3-tier or more
        const layerCount = [hasApi, hasService, hasDb].filter(Boolean).length;
        return layerCount >= 2;
    }

    private hasMonolithPattern(graph: ArchitectureGraph, nodeTypes: Map<string, number>): boolean {
        const totalNodes = graph.nodes.length;
        const serviceNodes = (nodeTypes.get('Service') || 0) + (nodeTypes.get('API') || 0);

        // Few service boundaries, mostly internal components
        return totalNodes > 5 && serviceNodes <= 2;
    }

    private hasServerlessPattern(graph: ArchitectureGraph, nodeTypes: Map<string, number>): boolean {
        const workerCount = nodeTypes.get('Worker') || 0;
        const apiCount = nodeTypes.get('API') || 0;
        const totalNodes = graph.nodes.length;

        // Many workers/functions, fewer traditional services
        return (workerCount + apiCount) / totalNodes > 0.6;
    }

    private hasDistributedCommunication(graph: ArchitectureGraph): boolean {
        // Check for async communication patterns (both old Prisma enum names and canonical EdgeType)
        return graph.edges.some(edge =>
            edge.type === 'worker_to_service' || edge.type === 'service_to_external' || (edge.type as string) === 'AsyncPipeline' || (edge.type as string) === 'Queue'
        );
    }

    private determineNodeLayer(node: ArchitectureNode): string {
        switch (node.type) {
            case 'API':
            case 'Client':
                return 'presentation';
            case 'Service':
            case 'Worker':
                return 'business';
            case 'DB':
                return 'data';
            case 'Queue':
                return 'infrastructure';
            case 'ExternalAPI':
            case 'LLM':
                return 'external';
            default:
                return 'unknown';
        }
    }

    private calculateLayerDepth(layerName: string): number {
        const depths = {
            presentation: 1,
            business: 2,
            infrastructure: 3,
            data: 4,
            external: 5,
            unknown: 6
        };
        return depths[layerName as keyof typeof depths] || 6;
    }
}
