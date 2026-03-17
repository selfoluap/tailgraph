import type { GraphService, GraphNode } from "../types/graph";

export function buildServiceUrl(node: GraphNode, service: GraphService): string {
  const host = node.dns || node.ip || node.hostname;
  const scheme = inferServiceScheme(service.port, service.protocol, service.label);
  return `${scheme}://${host}:${service.port}`;
}

export function inferServiceScheme(port: number, protocol: string, label: string): string {
  const normalizedProtocol = protocol.toLowerCase();
  const normalizedLabel = label.toLowerCase();
  if (normalizedProtocol === "http" || normalizedProtocol === "https") {
    return normalizedProtocol;
  }
  if (port === 443 || port === 8443 || normalizedLabel.includes("https")) {
    return "https";
  }
  return "http";
}
