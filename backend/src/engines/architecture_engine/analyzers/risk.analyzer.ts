import { ArchitectureGraph } from "./topology.analyzer.js";

export class RiskAnalyzer {
    /**
     * Analyze risks in the architecture
     */
    analyzeRisks(graph: ArchitectureGraph) {
        const nodeRisks = this.calculateNodeRisks(graph);
        const architectureRisks = this.identifyArchitectureRisks(graph);
        const overallRiskScore = this.calculateOverallRiskScore(nodeRisks, architectureRisks);

        return {
            overallScore: overallRiskScore,
            nodeRisks,
            architectureRisks,
            riskFactors: this.identifyRiskFactors(graph),
            recommendations: this.generateRecommendations(architectureRisks)
        };
    }

    private calculateNodeRisks(graph: ArchitectureGraph): Map<string, number> {
        const risks = new Map<string, number>();

        graph.nodes.forEach(node => {
            let riskScore = 0;

            // Connection-based risk
            const connections = graph.edges.filter(e => e.source === node.id || e.target === node.id);
            const connectionRisk = Math.min(connections.length / 10, 0.4); // Max 0.4 for connections

            // Type-based risk
            const typeRisk = this.getNodeTypeRisk(node.type);

            // Centrality risk (how critical the node is)
            const centralityRisk = this.calculateCentralityRisk(node.id, graph);

            riskScore = (connectionRisk + typeRisk + centralityRisk) / 3;

            risks.set(node.id, Math.min(riskScore, 1.0));
        });

        return risks;
    }

    private getNodeTypeRisk(nodeType: string): number {
        const typeRisks = {
            'DB': 0.8,           // Database failures are critical
            'ExternalAPI': 0.7,  // External dependencies can fail
            'LLM': 0.6,          // AI services can be unreliable
            'Queue': 0.5,        // Queue failures affect async processing
            'API': 0.4,          // API layer failures affect user experience
            'Service': 0.3,      // Service failures are contained
            'Worker': 0.3,       // Worker failures are usually recoverable
            'Client': 0.2        // Client failures are user-specific
        };

        return typeRisks[nodeType as keyof typeof typeRisks] || 0.3;
    }

    private calculateCentralityRisk(nodeId: string, graph: ArchitectureGraph): number {
        // Calculate how many paths go through this node (betweenness centrality approximation)
        const connectedNodes = new Set<string>();

        graph.edges.forEach(edge => {
            if (edge.source === nodeId) {
                connectedNodes.add(edge.target);
            }
            if (edge.target === nodeId) {
                connectedNodes.add(edge.source);
            }
        });

        const centralityScore = connectedNodes.size / (graph.nodes.length - 1);
        return centralityScore * 0.6; // Scale to max 0.6
    }

    private identifyArchitectureRisks(graph: ArchitectureGraph) {
        const risks = [];

        // Single point of failure
        const criticalNodes = this.findCriticalNodes(graph);
        if (criticalNodes.length > 0) {
            risks.push({
                type: 'single_point_of_failure',
                severity: 'high',
                nodes: criticalNodes,
                description: 'Critical nodes that could cause system-wide failures'
            });
        }

        // Circular dependencies
        const cycles = this.detectCircularDependencies(graph);
        if (cycles.length > 0) {
            risks.push({
                type: 'circular_dependencies',
                severity: 'medium',
                cycles,
                description: 'Circular dependencies that can cause deployment and runtime issues'
            });
        }

        // Over-coupling
        const overCoupledNodes = this.findOverCoupledNodes(graph);
        if (overCoupledNodes.length > 0) {
            risks.push({
                type: 'high_coupling',
                severity: 'medium',
                nodes: overCoupledNodes,
                description: 'Highly coupled components that are difficult to maintain'
            });
        }

        // External dependency risks
        const externalDeps = graph.nodes.filter(n => n.type === 'ExternalAPI' || n.type === 'LLM');
        if (externalDeps.length > 3) {
            risks.push({
                type: 'external_dependency_risk',
                severity: 'low',
                count: externalDeps.length,
                description: 'Many external dependencies increase system fragility'
            });
        }

        return risks;
    }

    private findCriticalNodes(graph: ArchitectureGraph): string[] {
        const critical: string[] = [];

        graph.nodes.forEach(node => {
            // Node is critical if removing it disconnects the graph significantly
            const connections = graph.edges.filter(e => e.source === node.id || e.target === node.id);

            if (connections.length > graph.nodes.length * 0.3) {
                critical.push(node.id);
            }

            // Database and queue nodes are inherently critical
            if (node.type === 'DB' || node.type === 'Queue') {
                critical.push(node.id);
            }
        });

        return [...new Set(critical)]; // Remove duplicates
    }

    private detectCircularDependencies(graph: ArchitectureGraph): string[][] {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const cycles: string[][] = [];

        const dfs = (nodeId: string, path: string[]): void => {
            if (recursionStack.has(nodeId)) {
                const cycleStart = path.indexOf(nodeId);
                if (cycleStart !== -1) {
                    cycles.push([...path.slice(cycleStart), nodeId]);
                }
                return;
            }

            if (visited.has(nodeId)) return;

            visited.add(nodeId);
            recursionStack.add(nodeId);

            const outgoingEdges = graph.edges.filter(e => e.source === nodeId);
            for (const edge of outgoingEdges) {
                dfs(edge.target, [...path, nodeId]);
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

    private findOverCoupledNodes(graph: ArchitectureGraph): string[] {
        const threshold = 0.7;
        return graph.nodes
            .filter(node => {
                const connections = graph.edges.filter(e => e.source === node.id || e.target === node.id);
                const couplingScore = connections.length / (graph.nodes.length - 1);
                return couplingScore > threshold;
            })
            .map(node => node.id);
    }

    private calculateOverallRiskScore(nodeRisks: Map<string, number>, architectureRisks: any[]): number {
        // Average node risks
        const avgNodeRisk = Array.from(nodeRisks.values()).reduce((sum, risk) => sum + risk, 0) / nodeRisks.size;

        // Architecture risk penalty
        let architectureRiskPenalty = 0;
        architectureRisks.forEach(risk => {
            switch (risk.severity) {
                case 'high': architectureRiskPenalty += 0.3; break;
                case 'medium': architectureRiskPenalty += 0.2; break;
                case 'low': architectureRiskPenalty += 0.1; break;
            }
        });

        const totalRisk = Math.min(avgNodeRisk + architectureRiskPenalty, 1.0);
        return Math.round(totalRisk * 100) / 100;
    }

    private identifyRiskFactors(graph: ArchitectureGraph) {
        const factors = [];

        const nodeCount = graph.nodes.length;
        const edgeCount = graph.edges.length;
        const complexity = edgeCount / nodeCount;

        if (complexity > 3) {
            factors.push({
                factor: 'high_complexity',
                value: complexity,
                description: 'High number of connections per component'
            });
        }

        const externalNodes = graph.nodes.filter(n => n.type === 'ExternalAPI' || n.type === 'LLM');
        if (externalNodes.length > nodeCount * 0.2) {
            factors.push({
                factor: 'external_dependency_ratio',
                value: externalNodes.length / nodeCount,
                description: 'High ratio of external dependencies'
            });
        }

        return factors;
    }

    private generateRecommendations(architectureRisks: any[]): string[] {
        const recommendations: string[] = [];

        architectureRisks.forEach(risk => {
            switch (risk.type) {
                case 'single_point_of_failure':
                    recommendations.push('Consider adding redundancy or circuit breakers for critical components');
                    break;
                case 'circular_dependencies':
                    recommendations.push('Refactor circular dependencies by introducing interfaces or breaking cycles');
                    break;
                case 'high_coupling':
                    recommendations.push('Reduce coupling by applying dependency injection and interface segregation');
                    break;
                case 'external_dependency_risk':
                    recommendations.push('Implement fallback mechanisms and caching for external dependencies');
                    break;
            }
        });

        return recommendations;
    }

    /**
     * Calculate risk level for a specific service (used in service insights)
     */
    calculateServiceRiskLevel(serviceId: string, graph: ArchitectureGraph): 'low' | 'medium' | 'high' {
        const nodeRisks = this.calculateNodeRisks(graph);
        const riskScore = nodeRisks.get(serviceId) || 0;

        if (riskScore <= 0.3) return 'low';
        if (riskScore <= 0.6) return 'medium';
        return 'high';
    }
}


