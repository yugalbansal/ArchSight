import { ScanContext, SemanticNode, SignalBatch, ResolutionState } from "../core/scan_context.js";

export interface SemanticRule {
    name: string;
    priority: number;
    exclusive: boolean;
    evaluate: (scopeId: string, signals: SignalBatch[], context: ScanContext) => SemanticNode | null;
}

/**
 * Semantic Resolution Engine
 * Evaluates evidence using deterministic, priority-ordered rules.
 */
export class SemanticRuleEngine {
    private rules: SemanticRule[] = [];

    public registerRule(rule: SemanticRule) {
        this.rules.push(rule);
        // Sort highest priority first
        this.rules.sort((a, b) => b.priority - a.priority);
    }

    public run(context: ScanContext) {
        const nodes: SemanticNode[] = [];

        // For each scope of evidence...
        for (const [scopeId, signals] of Object.entries(context.evidence.scopes)) {
            let handled = false;

            // Evaluate rules in priority order
            for (const rule of this.rules) {
                if (handled && rule.exclusive) continue; // Skip if a higher-priority exclusive rule already claimed this scope

                const node = rule.evaluate(scopeId, signals as SignalBatch[], context);
                if (node) {
                    nodes.push(node);
                    if (rule.exclusive) handled = true;
                }
            }
        }

        // Mutation safety: context layers write only to their namespace
        context.semanticNodes.push(...nodes);
    }
}
