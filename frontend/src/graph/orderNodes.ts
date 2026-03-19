import type { GraphNode } from "../types/graph";

const CLUSTER_RADIUS = 125;
const CLUSTER_GAP = 320;
const NODE_RING_BASE = 54;
const NODE_RING_STEP = 14;
const GRID_GAP_X = 220;
const GRID_GAP_Y = 180;

interface GroupBucket {
  key: string;
  label: string;
  nodes: GraphNode[];
}

function groupLabel(node: GraphNode): { key: string; label: string } {
  const normalized = [...node.groups].map((group) => group.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (normalized.length === 0) {
    return { key: "ungrouped", label: "Ungrouped" };
  }

  return {
    key: normalized.join("|"),
    label: normalized.join(" + "),
  };
}

export function orderNodesByGroups(nodes: GraphNode[]): GraphNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));
  const selfNode = nextNodes.find((node) => node.role === "self");
  const peers = nextNodes.filter((node) => node.role !== "self");

  if (selfNode) {
    selfNode.x = 0;
    selfNode.y = 0;
    selfNode.vx = 0;
    selfNode.vy = 0;
  }

  const buckets = new Map<string, GroupBucket>();
  for (const peer of peers) {
    const bucketInfo = groupLabel(peer);
    const existing = buckets.get(bucketInfo.key);
    if (existing) {
      existing.nodes.push(peer);
      continue;
    }
    buckets.set(bucketInfo.key, {
      key: bucketInfo.key,
      label: bucketInfo.label,
      nodes: [peer],
    });
  }

  const orderedBuckets = [...buckets.values()].sort((a, b) => {
    if (a.label === "Ungrouped") {
      return 1;
    }
    if (b.label === "Ungrouped") {
      return -1;
    }
    if (a.nodes.length !== b.nodes.length) {
      return b.nodes.length - a.nodes.length;
    }
    return a.label.localeCompare(b.label);
  });

  if (orderedBuckets.length === 0) {
    return nextNodes;
  }

  const columns = Math.ceil(Math.sqrt(orderedBuckets.length));
  const rows = Math.ceil(orderedBuckets.length / columns);
  const offsetX = ((columns - 1) * CLUSTER_GAP) / 2;
  const offsetY = ((rows - 1) * CLUSTER_GAP) / 2;

  orderedBuckets.forEach((bucket, bucketIndex) => {
    const column = bucketIndex % columns;
    const row = Math.floor(bucketIndex / columns);
    const centerX = column * CLUSTER_GAP - offsetX;
    const centerY = row * CLUSTER_GAP - offsetY;
    const peerCount = bucket.nodes.length;

    bucket.nodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((node, nodeIndex) => {
        const angle = (-Math.PI / 2) + (nodeIndex * Math.PI * 2) / Math.max(peerCount, 1);
        const ringRadius = Math.min(CLUSTER_RADIUS, NODE_RING_BASE + Math.max(0, peerCount - 1) * NODE_RING_STEP);

        if (peerCount === 1) {
          node.x = centerX;
          node.y = centerY;
        } else {
          node.x = centerX + Math.cos(angle) * ringRadius;
          node.y = centerY + Math.sin(angle) * ringRadius;
        }
        node.vx = 0;
        node.vy = 0;
      });
  });

  return nextNodes;
}

export function orderNodesInGrid(nodes: GraphNode[]): GraphNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));
  const selfNode = nextNodes.find((node) => node.role === "self");
  const peers = nextNodes
    .filter((node) => node.role !== "self")
    .sort((a, b) => a.name.localeCompare(b.name));

  if (selfNode) {
    selfNode.x = 0;
    selfNode.y = 0;
    selfNode.vx = 0;
    selfNode.vy = 0;
  }

  if (peers.length === 0) {
    return nextNodes;
  }

  const columns = Math.ceil(Math.sqrt(peers.length));
  const rows = Math.ceil(peers.length / columns);
  const offsetX = ((columns - 1) * GRID_GAP_X) / 2;
  const offsetY = ((rows - 1) * GRID_GAP_Y) / 2;

  peers.forEach((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    node.x = column * GRID_GAP_X - offsetX;
    node.y = row * GRID_GAP_Y - offsetY;
    node.vx = 0;
    node.vy = 0;
  });

  return nextNodes;
}
