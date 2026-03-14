import type { GraphEdge, GraphNode } from "../types/graph";

export function stepGraph(nodes: GraphNode[], edges: GraphEdge[], draggingNodeId: string | null): GraphNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));
  const nodeMap = new Map(nextNodes.map((node) => [node.id, node]));
  const selfNode = nextNodes.find((node) => node.role === "self") || null;

  for (let index = 0; index < nextNodes.length; index += 1) {
    const a = nextNodes[index];
    for (let otherIndex = index + 1; otherIndex < nextNodes.length; otherIndex += 1) {
      const b = nextNodes[otherIndex];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy + 0.01;
      const d = Math.sqrt(d2);
      const force = 1800 / d2;
      const fx = (force * dx) / d;
      const fy = (force * dy) / d;

      if (a !== selfNode && a.id !== draggingNodeId) {
        a.vx -= fx;
        a.vy -= fy;
      }
      if (b !== selfNode && b.id !== draggingNodeId) {
        b.vx += fx;
        b.vy += fy;
      }
    }
  }

  for (const edge of edges) {
    const a = nodeMap.get(edge.source);
    const b = nodeMap.get(edge.target);
    if (!a || !b) {
      continue;
    }

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
    let target = a === selfNode || b === selfNode ? 185 : 125;

    if (a.subnetRouter || b.subnetRouter) {
      target += 20;
    }
    if (a.exitNode || a.exitNodeOption || b.exitNode || b.exitNodeOption) {
      target += 10;
    }

    const force = (d - target) * 0.006;
    const fx = (force * dx) / d;
    const fy = (force * dy) / d;

    if (a !== selfNode && a.id !== draggingNodeId) {
      a.vx += fx;
      a.vy += fy;
    }
    if (b !== selfNode && b.id !== draggingNodeId) {
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  for (const node of nextNodes) {
    if (node === selfNode) {
      node.x *= 0.9;
      node.y *= 0.9;
      node.vx = 0;
      node.vy = 0;
      continue;
    }

    if (node.id === draggingNodeId) {
      continue;
    }

    node.vx *= 0.92;
    node.vy *= 0.92;
    node.x += node.vx;
    node.y += node.vy;
  }

  return nextNodes;
}
