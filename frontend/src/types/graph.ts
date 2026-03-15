export interface GraphService {
  label: string;
  port: number;
  protocol: string;
}

export interface GraphNode {
  id: string;
  name: string;
  dns: string;
  hostname: string;
  ip: string;
  os: string;
  lastHandshake: string;
  lastSeen: string;
  lastWrite: string;
  groups: string[];
  tags: string[];
  routes: string[];
  online: boolean | null;
  active: boolean | null;
  relay: string;
  exitNode: boolean;
  exitNodeOption: boolean;
  subnetRouter: boolean;
  services: GraphService[];
  servicesScannedAt: string;
  servicesStatus: string;
  servicesError: string;
  role: "self" | "peer";
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  generatedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  allGroups: string[];
  allTags: string[];
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface NodePosition {
  x: number;
  y: number;
}

export type NodePositionMap = Record<string, NodePosition>;

export interface FiltersState {
  query: string;
  status: "all" | "online" | "offline" | "unknown";
  group: string;
  tag: string;
  special: "all" | "exit" | "router" | "special";
}
