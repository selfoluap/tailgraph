import type { FiltersState, GraphEdge, GraphNode } from "../types/graph";
import { isSpecialNode, statusText } from "./buildGraph";

export function matchesSpecialFilter(node: GraphNode, special: FiltersState["special"]): boolean {
  if (special === "all") {
    return true;
  }
  if (special === "exit") {
    return Boolean(node.exitNode || node.exitNodeOption);
  }
  if (special === "router") {
    return Boolean(node.subnetRouter);
  }
  return isSpecialNode(node);
}

export function filterNodes(nodes: GraphNode[], filters: FiltersState): GraphNode[] {
  const query = filters.query.trim().toLowerCase();
  return nodes.filter((node) => {
    const okStatus =
      filters.status === "all" || node.role === "self" || statusText(node) === filters.status;
    if (!okStatus) {
      return false;
    }

    if (!matchesSpecialFilter(node, filters.special)) {
      return false;
    }

    if (filters.group !== "all" && !node.groups.includes(filters.group)) {
      return false;
    }

    if (filters.tag !== "all" && !node.tags.includes(filters.tag)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      node.name,
      node.ip,
      node.dns,
      node.hostname,
      node.os,
      ...node.groups,
      ...node.tags,
      ...node.routes,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function filterEdges(edges: GraphEdge[], filteredNodes: GraphNode[]): GraphEdge[] {
  const ids = new Set(filteredNodes.map((node) => node.id));
  return edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
}
