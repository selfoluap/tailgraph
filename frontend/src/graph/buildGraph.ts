import type { GraphData, GraphEdge, GraphNode } from "../types/graph";
import type { TailscalePeer, TailscaleStatus } from "../types/tailscale";

function dnsShort(peer: TailscalePeer): string {
  const dns = (peer.DNSName || "").replace(/\.$/, "");
  if (dns) {
    return dns.split(".")[0];
  }
  return peer.HostName || "node";
}

function isSpecial(node: GraphNode): boolean {
  return Boolean(node.exitNode || node.exitNodeOption || node.subnetRouter);
}

function normalizeNode(raw: {
  id?: string;
  name?: string;
  dns?: string;
  hostname?: string;
  ip?: string;
  os?: string;
  lastSeen?: string;
  tags?: string[];
  routes?: string[];
  online?: boolean | null;
  active?: boolean | null;
  relay?: string;
  exitNode?: boolean;
  exitNodeOption?: boolean;
  subnetRouter?: boolean;
}, role: "self" | "peer", fallbackId: string): GraphNode {
  const tags = raw.tags || [];
  const routes = raw.routes || [];
  const dns = (raw.dns || "").replace(/\.$/, "");
  const hostname = raw.hostname || "";
  const ip = raw.ip || "";

  return {
    id: String(raw.id ?? fallbackId),
    name: raw.name || (dns ? dns.split(".")[0] : hostname || String(fallbackId)),
    dns,
    hostname,
    ip,
    os: raw.os || "",
    lastSeen: raw.lastSeen || "",
    tags,
    routes,
    online: role === "self" ? true : (raw.online ?? null),
    active: role === "self" ? true : (raw.active ?? null),
    relay: raw.relay || "",
    exitNode: Boolean(raw.exitNode),
    exitNodeOption: Boolean(raw.exitNodeOption),
    subnetRouter: routes.length > 0 || Boolean(raw.subnetRouter),
    role,
    x: (Math.random() - 0.5) * 500,
    y: (Math.random() - 0.5) * 500,
    vx: 0,
    vy: 0,
    r: role === "self" ? 21 : 12,
  };
}

export function buildGraphFromStatus(status: TailscaleStatus): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const selfRaw = status.Self || {};

  const self = normalizeNode(
    {
      id: "self",
      name: dnsShort(selfRaw),
      dns: (selfRaw.DNSName || "").replace(/\.$/, ""),
      hostname: selfRaw.HostName || "",
      ip: selfRaw.TailscaleIPs?.[0] || "",
      os: selfRaw.OS || "",
      lastSeen: selfRaw.LastSeen || "",
      tags: selfRaw.Tags || [],
      routes: selfRaw.PrimaryRoutes || selfRaw.AllowedIPs || [],
      online: true,
      active: true,
      relay: selfRaw.Relay || "",
      exitNode: Boolean(selfRaw.ExitNode),
      exitNodeOption: Boolean(selfRaw.ExitNodeOption),
      subnetRouter: Boolean((selfRaw.PrimaryRoutes || selfRaw.AllowedIPs || []).length),
    },
    "self",
    "self",
  );

  self.x = 0;
  self.y = 0;
  self.r = 21;
  nodes.push(self);

  const peerNodes = Object.entries(status.Peer || {}).map(([peerId, peerRaw]) => {
    const node = normalizeNode(
      {
        id: peerId,
        name: dnsShort(peerRaw),
        dns: (peerRaw.DNSName || "").replace(/\.$/, ""),
        hostname: peerRaw.HostName || "",
        ip: peerRaw.TailscaleIPs?.[0] || "",
        os: peerRaw.OS || "",
        lastSeen: peerRaw.LastSeen || "",
        tags: peerRaw.Tags || [],
        routes: peerRaw.PrimaryRoutes || peerRaw.AllowedIPs || [],
        online: peerRaw.Online ?? null,
        active: peerRaw.Active ?? null,
        relay: peerRaw.Relay || "",
        exitNode: Boolean(peerRaw.ExitNode),
        exitNodeOption: Boolean(peerRaw.ExitNodeOption),
        subnetRouter: Boolean((peerRaw.PrimaryRoutes || peerRaw.AllowedIPs || []).length),
      },
      "peer",
      peerId,
    );
    node.r = isSpecial(node) ? 14 : 12;
    edges.push({ source: "self", target: node.id });
    return node;
  });

  peerNodes.sort((a, b) => {
    const aRank = a.online === true ? 0 : a.online === false ? 2 : 1;
    const bRank = b.online === true ? 0 : b.online === false ? 2 : 1;
    if (aRank !== bRank) {
      return aRank - bRank;
    }
    return a.name.localeCompare(b.name);
  });

  nodes.push(...peerNodes);

  return {
    generatedAt: status._meta?.generatedAtISO || new Date().toISOString(),
    nodes,
    edges,
    allTags: [...new Set(nodes.flatMap((node) => node.tags))].sort(),
  };
}

export function statusText(node: GraphNode): "self" | "online" | "offline" | "unknown" {
  if (node.role === "self") {
    return "self";
  }
  if (node.online === true) {
    return "online";
  }
  if (node.online === false) {
    return "offline";
  }
  return "unknown";
}

export function isSpecialNode(node: GraphNode): boolean {
  return isSpecial(node);
}
