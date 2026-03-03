import { ArchitectureGraph } from "./topology.analyzer.js";

export class CouplingAnalyzer {
    /**
     * Analyze coupling in the architecture
     */
    analyzeCoupling(graph: ArchitectureGraph) {
        const nodeCouplingScores = this.calculateNodeCouplingScores(graph);
        const overallCoupling = this.calculateOverallCoupling(nodeCouplingScores);
        const couplingLevel = this.determineCouplingLevel(overallCoupling);

        return {
            overall: overallCoupling,
            level: couplingLevel,
            nodeScores: nodeCouplingScores,
            highCouplingNodes: this.identifyHighCouplingNodes(nodeCouplingScores),
            couplingMatrix: this.buildCouplingMatrix(graph)
        };
    }

    private calculateNodeCouplingScores(graph: ArchitectureGraph): Map<string, number> {
        const scores = new Map<string, number>();
        const totalNodes = graph.nodes.length;

        graph.nodes.forEach(node => {
            const incomingEdges = graph.edges.filter(edge => edge.target === node.id);
            const outgoingEdges = graph.edges.filter(edge => edge.source === node.id);

            // Calculate coupling based on connections
            const totalConnections = incomingEdges.length + outgoingEdges.length;
            const couplingScore = totalConnections / (totalNodes - 1); // Normalized by possible connections

            // Weight by connection types
            const weightedScore = this.applyConnectionWeights(incomingEdges, outgoingEdges);

            // Final score combines raw coupling with weighted importance
            const finalScore = Math.min((couplingScore + weightedScore) / 2, 1.0);

            scores.set(node.id, finalScore);
        });

        return scores;
    }

    private applyConnectionWeights(incomingEdges: any[], outgoingEdges: any[]): number {
        const weights = {
            'Calls': 0.8,
            'DBDependency': 0.9,
            'AsyncPipeline': 0.6,
            'Imports': 0.4
        };

        let totalWeight = 0;
        let totalConnections = 0;

        [...incomingEdges, ...outgoingEdges].forEach(edge => {
            const weight = weights[edge.type as keyof typeof weights] || 0.5;
            totalWeight += weight;
            totalConnections++;
        });

        return totalConnections > 0 ? totalWeight / totalConnections : 0;
    }

    private calculateOverallCoupling(nodeScores: Map<string, number>): number {
        if (nodeScores.size === 0) return 0;

        const scores = Array.from(nodeScores.values());
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        return Math.round(average * 100) / 100;
    }

    private determineCouplingLevel(overallScore: number): 'low' | 'medium' | 'high' {
        if (overallScore <= 0.3) return 'low';
        if (overallScore <= 0.6) return 'medium';
        return 'high';
    }

    private identifyHighCouplingNodes(nodeScores: Map<string, number>): string[] {
        const threshold = 0.7;
        return Array.from(nodeScores.entries())
            .filter(([_, score]) => score > threshold)
            .map(([nodeId, _]) => nodeId);
    }

    private buildCouplingMatrix(graph: ArchitectureGraph): { [key: string]: { [key: string]: number } } {
        const matrix: { [key: string]: { [key: string]: number } } = {};

        // Initialize matrix
        graph.nodes.forEach(node => {
            matrix[node.id] = {};
            graph.nodes.forEach(otherNode => {
                matrix[node.id][otherNode.id] = 0;
            });
        });

        // Fill matrix with coupling strengths
        graph.edges.forEach(edge => {
            const strength = this.calculateEdgeCouplingStrength(edge);
            matrix[edge.source][edge.target] = strength;
        });

        return matrix;
    }

    private calculateEdgeCouplingStrength(edge: any): number {
        const typeStrengths = {
            'Calls': 0.8,
            'DBDependency': 0.9,
            'AsyncPipeline': 0.5,
            'Imports': 0.3
        };

        return typeStrengths[edge.type as keyof typeof typeStrengths] || 0.4;
    }

    /**
     * Calculate coupling score for a specific service (used in service insights)
     */
    calculateServiceCouplingScore(serviceId: string, graph: ArchitectureGraph): number {
        const nodeScores = this.calculateNodeCouplingScores(graph);
        return nodeScores.get(serviceId) || 0;
    }
}
