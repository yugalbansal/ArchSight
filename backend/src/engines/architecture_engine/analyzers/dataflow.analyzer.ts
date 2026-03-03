import { ArchitectureGraph } from "./topology.analyzer.js";
import { DataflowInsight } from "../../../models/architecture_insight.model.js";

export class DataflowAnalyzer {
    /**
     * Analyze data flow patterns in the architecture
     */
    analyzeDataflow(graph: ArchitectureGraph) {
        const flows = this.extractDataflows(graph);
        const complexity = this.calculateFlowComplexity(flows);

        return {
            flows,
            complexity,
            criticalFlows: this.identifyCriticalFlows(flows),
            bottlenecks: this.identifyBottlenecks(graph),
            flowMetrics: this.calculateFlowMetrics(flows)
        };
    }

    private extractDataflows(graph: ArchitectureGraph): DataflowInsight[] {
        const flows: DataflowInsight[] = [];

        // Find request flows (Client/API -> Services -> DB)
        const entryPoints = graph.nodes.filter(n => n.type === 'Client' || n.type === 'API');
        const exitPoints = graph.nodes.filter(n => n.type === 'DB' || n.type === 'ExternalAPI');

        entryPoints.forEach(entry => {
            exitPoints.forEach(exit => {
                const paths = this.findAllPaths(entry.id, exit.id, graph);
                paths.forEach(path => {
                    flows.push({
                        path,
                        type: this.determineFlowType(path, graph),
                        complexity: this.calculatePathComplexity(path, graph)
                    });
                });
            });
        });

        // Find data flows (DB -> Services -> API)
        exitPoints.forEach(exit => {
            entryPoints.forEach(entry => {
                if (exit.type === 'DB') {
                    const paths = this.findAllPaths(exit.id, entry.id, graph);
                    paths.forEach(path => {
                        flows.push({
                            path,
                            type: 'data',
                            complexity: this.calculatePathComplexity(path, graph)
                        });
                    });
                }
            });
        });

        // Find event flows (async patterns)
        const asyncFlows = this.findAsyncFlows(graph);
        flows.push(...asyncFlows);

        return flows;
    }

    private findAllPaths(startId: string, endId: string, graph: ArchitectureGraph, maxDepth: number = 6): string[][] {
        const paths: string[][] = [];
        const visited = new Set<string>();

        const dfs = (currentId: string, currentPath: string[], depth: number): void => {
            if (depth > maxDepth) return;

            if (currentId === endId) {
                paths.push([...currentPath, currentId]);
                return;
            }

            if (visited.has(currentId)) return;

            visited.add(currentId);

            const outgoingEdges = graph.edges.filter(e => e.source === currentId);
            outgoingEdges.forEach(edge => {
                dfs(edge.target, [...currentPath, currentId], depth + 1);
            });

            visited.delete(currentId);
        };

        dfs(startId, [], 0);
        return paths.slice(0, 10); // Limit to prevent explosion
    }

    private determineFlowType(path: string[], graph: ArchitectureGraph): 'request' | 'data' | 'event' {
        // Analyze the path to determine flow type
        const nodeTypes = path.map(nodeId => {
            const node = graph.nodes.find(n => n.id === nodeId);
            return node?.type || 'unknown';
        });

        // Check for async patterns
        const hasAsync = this.pathHasAsyncEdges(path, graph);
        if (hasAsync) return 'event';

        // Check if it starts with client/api (request flow)
        if (nodeTypes[0] === 'Client' || nodeTypes[0] === 'API') {
            return 'request';
        }

        // Check if it starts with DB (data flow)
        if (nodeTypes[0] === 'DB') {
            return 'data';
        }

        return 'request'; // Default
    }

    private pathHasAsyncEdges(path: string[], graph: ArchitectureGraph): boolean {
        for (let i = 0; i < path.length - 1; i++) {
            const edge = graph.edges.find(e => e.source === path[i] && e.target === path[i + 1]);
            if (edge?.type === 'AsyncPipeline') {
                return true;
            }
        }
        return false;
    }

    private calculatePathComplexity(path: string[], graph: ArchitectureGraph): number {
        let complexity = 0;

        // Base complexity from path length
        complexity += path.length * 0.1;

        // Add complexity for different node types
        path.forEach(nodeId => {
            const node = graph.nodes.find(n => n.id === nodeId);
            if (node) {
                const typeComplexity = this.getNodeTypeComplexity(node.type);
                complexity += typeComplexity;
            }
        });

        // Add complexity for edge types
        for (let i = 0; i < path.length - 1; i++) {
            const edge = graph.edges.find(e => e.source === path[i] && e.target === path[i + 1]);
            if (edge) {
                complexity += this.getEdgeTypeComplexity(edge.type);
            }
        }

        return Math.round(complexity * 100) / 100;
    }

    private getNodeTypeComplexity(nodeType: string): number {
        const complexities = {
            'Client': 0.1,
            'API': 0.2,
            'Service': 0.3,
            'Worker': 0.4,
            'DB': 0.5,
            'Queue': 0.4,
            'ExternalAPI': 0.6,
            'LLM': 0.7
        };

        return complexities[nodeType as keyof typeof complexities] || 0.3;
    }

    private getEdgeTypeComplexity(edgeType: string): number {
        const complexities = {
            'Calls': 0.1,
            'Imports': 0.05,
            'DBDependency': 0.2,
            'AsyncPipeline': 0.3
        };

        return complexities[edgeType as keyof typeof complexities] || 0.1;
    }

    private findAsyncFlows(graph: ArchitectureGraph): DataflowInsight[] {
        const asyncFlows: DataflowInsight[] = [];

        // Find all async edges
        const asyncEdges = graph.edges.filter(e => e.type === 'AsyncPipeline');

        asyncEdges.forEach(edge => {
            // Build flow around async edge
            const flow = this.buildAsyncFlow(edge, graph);
            if (flow) {
                asyncFlows.push(flow);
            }
        });

        return asyncFlows;
    }

    private buildAsyncFlow(asyncEdge: any, graph: ArchitectureGraph): DataflowInsight | null {
        // Build flow path around the async edge
        const path = [asyncEdge.source, asyncEdge.target];

        // Try to extend backwards
        const incomingEdges = graph.edges.filter(e => e.target === asyncEdge.source);
        if (incomingEdges.length > 0) {
            path.unshift(incomingEdges[0].source);
        }

        // Try to extend forwards
        const outgoingEdges = graph.edges.filter(e => e.source === asyncEdge.target);
        if (outgoingEdges.length > 0) {
            path.push(outgoingEdges[0].target);
        }

        return {
            path,
            type: 'event',
            complexity: this.calculatePathComplexity(path, graph)
        };
    }

    private calculateFlowComplexity(flows: DataflowInsight[]): number {
        if (flows.length === 0) return 0;

        const avgComplexity = flows.reduce((sum, flow) => sum + flow.complexity, 0) / flows.length;
        return Math.round(avgComplexity * 100) / 100;
    }

    private identifyCriticalFlows(flows: DataflowInsight[]): DataflowInsight[] {
        // Sort by complexity and return top flows
        return flows
            .sort((a, b) => b.complexity - a.complexity)
            .slice(0, Math.min(5, flows.length));
    }

    private identifyBottlenecks(graph: ArchitectureGraph): string[] {
        const nodeLoad = new Map<string, number>();

        // Calculate load on each node (how many flows pass through it)
        graph.nodes.forEach(node => {
            const throughEdges = graph.edges.filter(e => e.source === node.id || e.target === node.id);
            nodeLoad.set(node.id, throughEdges.length);
        });

        // Find nodes with high load
        const avgLoad = Array.from(nodeLoad.values()).reduce((sum, load) => sum + load, 0) / nodeLoad.size;
        const threshold = avgLoad * 1.5; // 50% above average

        return Array.from(nodeLoad.entries())
            .filter(([_, load]) => load > threshold)
            .map(([nodeId, _]) => nodeId);
    }

    private calculateFlowMetrics(flows: DataflowInsight[]) {
        const byType = flows.reduce((acc, flow) => {
            acc[flow.type] = (acc[flow.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const avgPathLength = flows.reduce((sum, flow) => sum + flow.path.length, 0) / flows.length;

        return {
            totalFlows: flows.length,
            byType,
            averagePathLength: Math.round(avgPathLength * 100) / 100,
            longestPath: Math.max(...flows.map(f => f.path.length)),
            shortestPath: Math.min(...flows.map(f => f.path.length))
        };
    }
}
