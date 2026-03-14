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
  tags: string[];
  routes: string[];
  online: boolean | null;
  active: boolean | null;
  relay: string;
  exitNode: boolean;
  exitNodeOption: boolean;
  subnetRouter: boolean;
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
  allTags: string[];
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface FiltersState {
  query: string;
  status: "all" | "online" | "offline" | "unknown";
  tag: string;
  special: "all" | "exit" | "router" | "special";
}
