export interface ArchitectureInsights {
  architecture_type: string;
  services: number;
  external_dependencies: number;
  risk_score: number;
  coupling: 'low' | 'medium' | 'high';
  detected_stack: string[];
  layers: LayerInsight[];
  service_details: ServiceInsight[];
  dependencies: DependencyInsight[];
  dataflow: DataflowInsight[];
  metrics: ArchitectureMetrics;
}

export interface LayerInsight {
  name: string;
  services: string[];
  depth: number;
}

export interface ServiceInsight {
  id: string;
  name: string;
  type: 'api' | 'service' | 'database' | 'external' | 'worker';
  layer: string;
  riskLevel: 'low' | 'medium' | 'high';
  endpoints: string[];
  dependencies: string[];
  coupling_score: number;
}

export interface DependencyInsight {
  source: string;
  target: string;
  type: 'sync' | 'async' | 'data';
  strength: number;
}

export interface DataflowInsight {
  path: string[];
  type: 'request' | 'data' | 'event';
  complexity: number;
}

export interface ArchitectureMetrics {
  total_services: number;
  total_dependencies: number;
  avg_coupling: number;
  complexity_score: number;
  maintainability_score: number;
}

// For visualization generation
export interface VisualizationData {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  layout: LayoutConfig;
}

export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: string;
    risk?: string;
    layer?: string;
    fullName?: string;
  };
  style?: any;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface LayoutConfig {
  direction: 'TB' | 'LR';
  nodeSpacing: number;
  layerSpacing: number;
}

