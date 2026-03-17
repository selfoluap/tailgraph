import type { GraphNode } from "../types/graph";

export const NODE_GRID_SIZE = 35;

interface GridCell {
  col: number;
  row: number;
}

function toGridCell(x: number, y: number): GridCell {
  return {
    col: Math.round(x / NODE_GRID_SIZE),
    row: Math.round(y / NODE_GRID_SIZE),
  };
}

function fromGridCell(cell: GridCell) {
  return {
    x: cell.col === 0 ? 0 : cell.col * NODE_GRID_SIZE,
    y: cell.row === 0 ? 0 : cell.row * NODE_GRID_SIZE,
  };
}

function cellKey(cell: GridCell): string {
  return `${cell.col},${cell.row}`;
}

function nearestAvailableCell(target: GridCell, occupied: Set<string>): GridCell {
  const targetKey = cellKey(target);
  if (!occupied.has(targetKey)) {
    return target;
  }

  for (let radius = 1; radius <= 64; radius += 1) {
    const candidates: GridCell[] = [];
    for (let row = target.row - radius; row <= target.row + radius; row += 1) {
      for (let col = target.col - radius; col <= target.col + radius; col += 1) {
        const onRing =
          row === target.row - radius ||
          row === target.row + radius ||
          col === target.col - radius ||
          col === target.col + radius;
        if (!onRing) {
          continue;
        }
        candidates.push({ col, row });
      }
    }

    candidates.sort((a, b) => {
      const aDistance = Math.hypot(a.col - target.col, a.row - target.row);
      const bDistance = Math.hypot(b.col - target.col, b.row - target.row);
      if (aDistance !== bDistance) {
        return aDistance - bDistance;
      }
      if (a.row !== b.row) {
        return a.row - b.row;
      }
      return a.col - b.col;
    });

    for (const candidate of candidates) {
      if (!occupied.has(cellKey(candidate))) {
        return candidate;
      }
    }
  }

  return target;
}

export function snapNodePointToGrid(x: number, y: number) {
  return fromGridCell(toGridCell(x, y));
}

export function snapNodesToGrid(nodes: GraphNode[]): GraphNode[] {
  const nextNodes = nodes.map((node) => ({ ...node, vx: 0, vy: 0 }));
  const occupied = new Set<string>();

  return nextNodes.map((node) => {
    const snappedCell = nearestAvailableCell(toGridCell(node.x, node.y), occupied);
    occupied.add(cellKey(snappedCell));
    return {
      ...node,
      ...fromGridCell(snappedCell),
    };
  });
}

export function moveNodeToNearestGridCell(
  nodes: GraphNode[],
  nodeId: string,
  x: number,
  y: number,
): GraphNode[] {
  const nextNodes = nodes.map((node) => ({ ...node }));
  const occupied = new Set<string>();

  for (const node of nextNodes) {
    if (node.id === nodeId) {
      continue;
    }
    const snappedCell = toGridCell(node.x, node.y);
    occupied.add(cellKey(snappedCell));
    const snapped = fromGridCell(snappedCell);
    node.x = snapped.x;
    node.y = snapped.y;
    node.vx = 0;
    node.vy = 0;
  }

  return nextNodes.map((node) => {
    if (node.id !== nodeId) {
      return node;
    }
    const snappedCell = nearestAvailableCell(toGridCell(x, y), occupied);
    const snapped = fromGridCell(snappedCell);
    return {
      ...node,
      x: snapped.x,
      y: snapped.y,
      vx: 0,
      vy: 0,
    };
  });
}
