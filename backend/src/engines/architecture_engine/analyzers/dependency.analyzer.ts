import type { ArchitectureGraph, ArchitectureNode } from "../../../schemas/architecture-graph.schema.js";
import { DependencyInsight } from "../../../models/architecture_insight.model.js";

export class DependencyAnalyzer {
    /**
     * Analyze dependencies in the architecture graph
     */
    analyzeDependencies(graph: ArchitectureGraph) {
        const dependencies = this.extractDependencies(graph);
        const dependencyMetrics = this.calculateDependencyMetrics(dependencies);

        return {
            dependencies,
            metrics: dependencyMetrics,
            criticalPaths: this.findCriticalPaths(graph),
            circularDependencies: this.detectCircularDependencies(graph)
        };
    }

    private extractDependencies(graph: ArchitectureGraph): DependencyInsight[] {
        return graph.edges.map(edge => ({
            source: edge.source,
            target: edge.target,
            type: this.mapRelationTypeToInsightType(edge.type),
            strength: this.calculateDependencyStrength(edge, graph)
        }));
    }

    private mapRelationTypeToInsightType(relationType: string): 'sync' | 'async' | 'data' {
        switch (relationType) {
            case 'Calls':
                return 'sync';
            case 'AsyncPipeline':
                return 'async';
            case 'DBDependency':
                return 'data';
            case 'Imports':
                return 'sync';
            default:
                return 'sync';
        }
    }

    private calculateDependencyStrength(edge: any, graph: ArchitectureGraph): number {
        // Base strength on edge type and context
        const typeWeights = {
            'Calls': 0.8,
            'AsyncPipeline': 0.6,
            'DBDependency': 0.9,
            'Imports': 0.4
        };

        const baseStrength = typeWeights[edge.type as keyof typeof typeWeights] || 0.5;

        // Adjust based on node importance
        const sourceNode = graph.nodes.find(n => n.id === edge.source);
        const targetNode = graph.nodes.find(n => n.id === edge.target);

        let adjustment = 1.0;

        // Critical infrastructure gets higher weight
        if (targetNode?.type === 'DB' || targetNode?.type === 'Queue') {
            adjustment *= 1.2;
        }

        // External dependencies are critical
        if (targetNode?.type === 'ExternalAPI' || targetNode?.type === 'LLM') {
            adjustment *= 1.1;
        }

        return Math.min(baseStrength * adjustment, 1.0);
    }

    private calculateDependencyMetrics(dependencies: DependencyInsight[]) {
        const totalDependencies = dependencies.length;
        const syncCount = dependencies.filter(d => d.type === 'sync').length;
        const asyncCount = dependencies.filter(d => d.type === 'async').length;
        const dataCount = dependencies.filter(d => d.type === 'data').length;

        const avgStrength = dependencies.reduce((sum, d) => sum + d.strength, 0) / totalDependencies;

        return {
            total: totalDependencies,
            byType: {
                sync: syncCount,
                async: asyncCount,
                data: dataCount
            },
            averageStrength: avgStrength,
            strongDependencies: dependencies.filter(d => d.strength > 0.7).length
        };
    }

    private findCriticalPaths(graph: ArchitectureGraph): string[][] {
        const paths: string[][] = [];

        // Find paths from Client/API to DB
        const entryPoints = graph.nodes.filter(n => n.type === 'Client' || n.type === 'API');
        const exitPoints = graph.nodes.filter(n => n.type === 'DB' || n.type === 'ExternalAPI');

        entryPoints.forEach(entry => {
            exitPoints.forEach(exit => {
                const path = this.findPath(entry.id, exit.id, graph);
                if (path.length > 1) {
                    paths.push(path);
                }
            });
        });

        // Return top 5 longest paths
        return paths
            .sort((a, b) => b.length - a.length)
            .slice(0, 5);
    }

    private findPath(startId: string, endId: string, graph: ArchitectureGraph): string[] {
        const visited = new Set<string>();
        const path: string[] = [];

        const dfs = (currentId: string): boolean => {
            if (currentId === endId) {
                path.push(currentId);
                return true;
            }

            if (visited.has(currentId)) {
                return false;
            }

            visited.add(currentId);
            path.push(currentId);

            const outgoingEdges = graph.edges.filter(e => e.source === currentId);
            for (const edge of outgoingEdges) {
                if (dfs(edge.target)) {
                    return true;
                }
            }

            path.pop();
            return false;
        };

        dfs(startId);
        return path;
    }

    private detectCircularDependencies(graph: ArchitectureGraph): string[][] {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const cycles: string[][] = [];

        const dfs = (nodeId: string, path: string[]): void => {
            if (recursionStack.has(nodeId)) {
                // Found a cycle
                const cycleStart = path.indexOf(nodeId);
                if (cycleStart !== -1) {
                    cycles.push([...path.slice(cycleStart), nodeId]);
                }
                return;
            }

            if (visited.has(nodeId)) {
                return;
            }

            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);

            const outgoingEdges = graph.edges.filter(e => e.source === nodeId);
            for (const edge of outgoingEdges) {
                dfs(edge.target, [...path]);
            }

            recursionStack.delete(nodeId);
        };

        graph.nodes.forEach(node => {
            if (!visited.has(node.id)) {
                dfs(node.id, []);
            }
        });

        return cycles;
    }
}
