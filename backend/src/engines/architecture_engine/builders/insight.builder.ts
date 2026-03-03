import { ArchitectureInsights, ServiceInsight, ArchitectureMetrics } from "../../../models/architecture_insight.model.js";
import { ArchitectureGraph } from "../analyzers/topology.analyzer.js";

interface AnalysisResults {
    topology: {
        architectureType: string;
        layers: any[];
        services: number;
        externalDependencies: number;
        detectedStack: string[];
    };
    dependencies: {
        dependencies: any[];
        metrics: any;
    };
    coupling: {
        overall: number;
        level: 'low' | 'medium' | 'high';
        nodeScores: Map<string, number>;
    };
    dataflow: {
        flows: any[];
        complexity: number;
    };
    risks: {
        overallScore: number;
        nodeRisks: Map<string, number>;
    };
}

export class InsightBuilder {
    /**
     * Build complete architecture insights from analysis results
     */
    build(graph: ArchitectureGraph, results: AnalysisResults): ArchitectureInsights {
        const serviceDetails = this.buildServiceDetails(graph, results);
        const metrics = this.calculateMetrics(results, serviceDetails);

        return {
            architecture_type: results.topology.architectureType,
            services: results.topology.services,
            external_dependencies: results.topology.externalDependencies,
            risk_score: results.risks.overallScore,
            coupling: results.coupling.level,
            detected_stack: results.topology.detectedStack,
            layers: results.topology.layers,
            service_details: serviceDetails,
            dependencies: results.dependencies.dependencies,
            dataflow: results.dataflow.flows,
            metrics
        };
    }

    private buildServiceDetails(graph: ArchitectureGraph, results: AnalysisResults): ServiceInsight[] {
        return graph.nodes
            .filter(node => this.isServiceNode(node.type))
            .map(node => ({
                id: node.id,
                name: node.name,
                type: this.mapNodeTypeToServiceType(node.type),
                layer: this.determineServiceLayer(node),
                riskLevel: this.calculateServiceRiskLevel(node.id, results.risks.nodeRisks),
                endpoints: this.extractServiceEndpoints(node),
                dependencies: this.findServiceDependencies(node.id, graph),
                coupling_score: results.coupling.nodeScores.get(node.id) || 0
            }));
    }

    private isServiceNode(nodeType: string): boolean {
        const serviceTypes = ['API', 'Service', 'Worker', 'DB', 'Queue', 'ExternalAPI', 'LLM'];
        return serviceTypes.includes(nodeType);
    }

    private mapNodeTypeToServiceType(nodeType: string): 'api' | 'service' | 'database' | 'external' | 'worker' {
        const typeMap = {
            'API': 'api' as const,
            'Service': 'service' as const,
            'Worker': 'worker' as const,
            'DB': 'database' as const,
            'Queue': 'service' as const,
            'ExternalAPI': 'external' as const,
            'LLM': 'external' as const,
            'Client': 'service' as const
        };

        return typeMap[nodeType as keyof typeof typeMap] || 'service';
    }

    private determineServiceLayer(node: any): string {
        const layerMap = {
            'Client': 'presentation',
            'API': 'presentation',
            'Service': 'business',
            'Worker': 'business',
            'DB': 'data',
            'Queue': 'infrastructure',
            'ExternalAPI': 'external',
            'LLM': 'external'
        };

        return layerMap[node.type as keyof typeof layerMap] || 'unknown';
    }

    private calculateServiceRiskLevel(serviceId: string, nodeRisks: Map<string, number>): 'low' | 'medium' | 'high' {
        const riskScore = nodeRisks.get(serviceId) || 0;

        if (riskScore <= 0.3) return 'low';
        if (riskScore <= 0.6) return 'medium';
        return 'high';
    }

    private extractServiceEndpoints(node: any): string[] {
        // Extract endpoints from node metadata if available
        if (node.metadata?.endpoints) {
            return Array.isArray(node.metadata.endpoints) ? node.metadata.endpoints : [];
        }

        // Generate placeholder endpoints for API nodes
        if (node.type === 'API') {
            return [`/${node.name.toLowerCase()}`];
        }

        return [];
    }

    private findServiceDependencies(serviceId: string, graph: ArchitectureGraph): string[] {
        return graph.edges
            .filter(edge => edge.source === serviceId)
            .map(edge => edge.target);
    }

    private calculateMetrics(results: AnalysisResults, serviceDetails: ServiceInsight[]): ArchitectureMetrics {
        const totalServices = serviceDetails.length;
        const totalDependencies = results.dependencies.dependencies.length;
        const avgCoupling = results.coupling.overall;

        return {
            total_services: totalServices,
            total_dependencies: totalDependencies,
            avg_coupling: avgCoupling,
            complexity_score: this.calculateComplexityScore(totalServices, totalDependencies, results.dataflow.complexity),
            maintainability_score: this.calculateMaintainabilityScore(avgCoupling, results.risks.overallScore)
        };
    }

    private calculateComplexityScore(services: number, dependencies: number, dataflowComplexity: number): number {
        // Combine multiple complexity factors
        const structuralComplexity = dependencies / Math.max(services, 1);
        const flowComplexity = dataflowComplexity;

        const overallComplexity = (structuralComplexity + flowComplexity) / 2;
        return Math.round(overallComplexity * 100) / 100;
    }

    private calculateMaintainabilityScore(coupling: number, riskScore: number): number {
        // Higher coupling and risk reduce maintainability
        const couplingPenalty = coupling * 30;
        const riskPenalty = riskScore * 20;

        const maintainability = 100 - couplingPenalty - riskPenalty;
        return Math.max(Math.round(maintainability), 0);
    }

    /**
     * Build a summary insight for quick overview
     */
    buildSummary(insights: ArchitectureInsights) {
        return {
            architecture_type: insights.architecture_type,
            total_services: insights.services,
            risk_level: this.getRiskLevel(insights.risk_score),
            coupling_level: insights.coupling,
            maintainability: this.getMaintainabilityLevel(insights.metrics.maintainability_score),
            key_technologies: insights.detected_stack.slice(0, 3),
            recommendations: this.generateRecommendations(insights)
        };
    }

    private getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' {
        if (riskScore <= 0.3) return 'low';
        if (riskScore <= 0.6) return 'medium';
        return 'high';
    }

    private getMaintainabilityLevel(score: number): 'low' | 'medium' | 'high' {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    private generateRecommendations(insights: ArchitectureInsights): string[] {
        const recommendations = [];

        if (insights.coupling === 'high') {
            recommendations.push('Consider reducing coupling between components');
        }

        if (insights.risk_score > 0.6) {
            recommendations.push('Address high-risk components to improve system reliability');
        }

        if (insights.metrics.complexity_score > 3) {
            recommendations.push('Simplify architecture by reducing unnecessary dependencies');
        }

        if (insights.external_dependencies > insights.services) {
            recommendations.push('Consider reducing external dependencies or adding fallback mechanisms');
        }

        return recommendations;
    }
}
