import { useEffect, useRef } from "react";

import { buildServiceUrl } from "../graph/serviceLinks";
import { statusText } from "../graph/buildGraph";
import { filterEdges, filterNodes } from "../graph/filterNodes";
import { NODE_GRID_SIZE } from "../graph/grid";
import { clampScale, screenToWorld, worldToScreen } from "../graph/viewport";
import type { FiltersState, GraphData, GraphNode, GraphService, ViewportState } from "../types/graph";

interface CanvasGraphProps {
  graph: GraphData;
  filters: FiltersState;
  selectedId: string | null;
  showConnections: boolean;
  showGrid: boolean;
  viewport: ViewportState;
  onViewportChange: (next: ViewportState) => void;
  onSelect: (nodeId: string | null) => void;
  onDragNode: (nodeId: string, x: number, y: number) => void;
  onDragStateChange: (nodeId: string | null) => void;
}

interface ServiceHitRegion {
  nodeId: string;
  service: GraphService;
  x: number;
  y: number;
  width: number;
  height: number;
}

const COMPACT_NODE_SCALE_THRESHOLD = 0.7;

export function getCanvasDensityScale(screenWidth: number) {
  if (screenWidth < 480) {
    return 0.82;
  }
  if (screenWidth < 900) {
    return 0.9;
  }
  return 1;
}

export function getNodeRenderMode(scale: number) {
  return scale < COMPACT_NODE_SCALE_THRESHOLD ? "compact" : "card";
}

function roundRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawServerGlyph(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const rackHeight = (height - 10) / 2;
  for (let index = 0; index < 2; index += 1) {
    const top = y + 4 + index * (rackHeight + 2);
    roundRectPath(context, x + 4, top, width - 8, rackHeight, 4);
    context.fillStyle = "rgba(255,255,255,0.08)";
    context.fill();

    context.fillStyle = "rgba(232,236,248,0.55)";
    context.fillRect(x + 10, top + rackHeight / 2 - 1, width - 20, 2);
  }
}

function getVisibleServices(node: GraphNode) {
  return node.services.slice(0, 3);
}

function nodePalette(rootStyle: CSSStyleDeclaration, node: GraphNode) {
  const accent = nodeColor(rootStyle, node);
  return {
    accent,
    border: node.id === "self" ? "rgba(96,165,250,0.95)" : accent,
    fill: node.id === "self" ? "rgba(18,34,68,0.95)" : "rgba(12,18,36,0.94)",
    compactFill: node.id === "self" ? "rgba(18,34,68,0.98)" : "rgba(12,18,36,0.98)",
    glow: `${accent}33`,
  };
}

function getNodeCardMetrics(node: GraphNode, screenWidth: number) {
  const scale = getCanvasDensityScale(screenWidth);
  const services = getVisibleServices(node);
  const width = 108 * scale;
  const glyphHeight = 34 * scale;
  const serviceAreaHeight = services.length > 0 ? services.length * 22 * scale + 8 * scale : 0;
  const height = glyphHeight + serviceAreaHeight;
  const radius = 12 * scale;
  return { width, height, radius, glyphHeight };
}

function serviceBadgeText(service: GraphService): string {
  return `${service.label} ${service.port}`;
}

function serviceBadgeMetrics(service: GraphService, screenWidth: number) {
  const scale = getCanvasDensityScale(screenWidth);
  const fontSize = Math.max(10, Math.round(11 * scale));
  const height = 20 * scale;
  const radius = 10 * scale;
  const text = serviceBadgeText(service);
  return { fontSize, height, radius, text };
}

function compactNodeMetrics(screenWidth: number) {
  const scale = getCanvasDensityScale(screenWidth);
  const radius = 10 * scale;
  return {
    radius,
    hitRadius: radius + 8,
    labelFontSize: Math.max(10, Math.round(12 * scale)),
  };
}

function nodeColor(rootStyle: CSSStyleDeclaration, node: GraphNode): string {
  if (node.role === "self") {
    return rootStyle.getPropertyValue("--self").trim();
  }
  if (node.online === true) {
    return rootStyle.getPropertyValue("--online").trim();
  }
  if (node.online === false) {
    return rootStyle.getPropertyValue("--offline").trim();
  }
  return rootStyle.getPropertyValue("--unknown").trim();
}

export function CanvasGraph({
  graph,
  filters,
  selectedId,
  showConnections,
  showGrid,
  viewport,
  onViewportChange,
  onSelect,
  onDragNode,
  onDragStateChange,
}: CanvasGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef(viewport);
  const pointerStateRef = useRef<{
    down: boolean;
    moved: boolean;
    dragStart: { x: number; y: number } | null;
    last: { x: number; y: number } | null;
    draggingNodeId: string | null;
  }>({
    down: false,
    moved: false,
    dragStart: null,
    last: null,
    draggingNodeId: null,
  });
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStateRef = useRef<{
    distance: number;
    scale: number;
  } | null>(null);
  const serviceHitRegionsRef = useRef<ServiceHitRegion[]>([]);

  const filteredNodes = filterNodes(graph.nodes, filters);
  const filteredEdges = filterEdges(graph.edges, filteredNodes);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  function findNodeAtPoint(clientX: number, clientY: number, width: number, height: number) {
    const renderMode = getNodeRenderMode(viewport.scale);
    for (let index = filteredNodes.length - 1; index >= 0; index -= 1) {
      const node = filteredNodes[index];
      const point = worldToScreen(node.x, node.y, viewport, width, height);
      if (renderMode === "compact") {
        const metrics = compactNodeMetrics(width);
        const left = point.x - metrics.hitRadius;
        const right = point.x + metrics.hitRadius;
        const top = point.y - metrics.hitRadius;
        const bottom = point.y + metrics.hitRadius;
        if (clientX >= left && clientX <= right && clientY >= top && clientY <= bottom) {
          return node;
        }
        continue;
      }
      const metrics = getNodeCardMetrics(node, width);
      const left = point.x - metrics.width / 2 - 8;
      const right = point.x + metrics.width / 2 + 8;
      const top = point.y - metrics.height / 2 - 8;
      const bottom = point.y + metrics.height / 2 + 8;
      if (clientX >= left && clientX <= right && clientY >= top && clientY <= bottom) {
        return node;
      }
    }
    return null;
  }

  function findServiceAtPoint(clientX: number, clientY: number) {
    for (let index = serviceHitRegionsRef.current.length - 1; index >= 0; index -= 1) {
      const region = serviceHitRegionsRef.current[index];
      if (
        clientX >= region.x &&
        clientX <= region.x + region.width &&
        clientY >= region.y &&
        clientY <= region.y + region.height
      ) {
        return region;
      }
    }
    return null;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    serviceHitRegionsRef.current = [];

    const rootStyle = getComputedStyle(document.documentElement);
    const renderMode = getNodeRenderMode(viewport.scale);

    if (showGrid) {
      const topLeft = screenToWorld(0, 0, viewport, width, height);
      const bottomRight = screenToWorld(width, height, viewport, width, height);
      const startCol = Math.floor(Math.min(topLeft.x, bottomRight.x) / NODE_GRID_SIZE) - 1;
      const endCol = Math.ceil(Math.max(topLeft.x, bottomRight.x) / NODE_GRID_SIZE) + 1;
      const startRow = Math.floor(Math.min(topLeft.y, bottomRight.y) / NODE_GRID_SIZE) - 1;
      const endRow = Math.ceil(Math.max(topLeft.y, bottomRight.y) / NODE_GRID_SIZE) + 1;

      context.save();
      context.strokeStyle = "rgba(99, 115, 166, 0.18)";
      context.lineWidth = 1;
      for (let col = startCol; col <= endCol; col += 1) {
        const x = worldToScreen(col * NODE_GRID_SIZE, 0, viewport, width, height).x;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let row = startRow; row <= endRow; row += 1) {
        const y = worldToScreen(0, row * NODE_GRID_SIZE, viewport, width, height).y;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      context.restore();
    }

    if (showConnections) {
      for (const edge of filteredEdges) {
        const source = graph.nodes.find((node) => node.id === edge.source);
        const target = graph.nodes.find((node) => node.id === edge.target);
        if (!source || !target) {
          continue;
        }
        const a = worldToScreen(source.x, source.y, viewport, width, height);
        const b = worldToScreen(target.x, target.y, viewport, width, height);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.strokeStyle = "rgba(120,140,190,0.55)";
        context.lineWidth = 1.2;
        context.stroke();
      }
    }

    for (const node of filteredNodes) {
      const point = worldToScreen(node.x, node.y, viewport, width, height);
      const palette = nodePalette(rootStyle, node);
      if (renderMode === "compact") {
        const metrics = compactNodeMetrics(width);

        context.beginPath();
        context.arc(point.x, point.y, metrics.radius, 0, Math.PI * 2);
        context.fillStyle = palette.compactFill;
        context.fill();
        context.strokeStyle = palette.border;
        context.lineWidth = node.role === "self" ? 2.2 : 1.6;
        context.stroke();

        context.save();
        context.shadowColor = palette.glow;
        context.shadowBlur = selectedId === node.id ? 16 : 8;
        context.beginPath();
        context.arc(point.x, point.y, metrics.radius, 0, Math.PI * 2);
        context.strokeStyle = palette.border;
        context.lineWidth = 1;
        context.stroke();
        context.restore();

        if (selectedId === node.id) {
          context.beginPath();
          context.arc(point.x, point.y, metrics.radius + 5, 0, Math.PI * 2);
          context.strokeStyle = "#ffffff";
          context.lineWidth = 2;
          context.stroke();
        }

        context.fillStyle = "#f3f6ff";
        context.font = `700 ${metrics.labelFontSize}px system-ui, sans-serif`;
        context.textAlign = "center";
        const label = node.name.length > 14 ? `${node.name.slice(0, 11)}...` : node.name;
        context.fillText(label, point.x, point.y + metrics.radius + 18);
        continue;
      }

      const metrics = getNodeCardMetrics(node, width);
      const left = point.x - metrics.width / 2;
      const top = point.y - metrics.height / 2;

      roundRectPath(context, left, top, metrics.width, metrics.height, metrics.radius);
      context.fillStyle = palette.fill;
      context.fill();
      context.strokeStyle = palette.border;
      context.lineWidth = node.role === "self" ? 2.4 : 1.6;
      context.stroke();

      context.save();
      context.shadowColor = palette.glow;
      context.shadowBlur = selectedId === node.id ? 18 : 10;
      roundRectPath(context, left, top, metrics.width, metrics.height, metrics.radius);
      context.strokeStyle = palette.border;
      context.lineWidth = 1;
      context.stroke();
      context.restore();

      drawServerGlyph(context, left, top, metrics.width, metrics.glyphHeight);

      if (selectedId === node.id) {
        roundRectPath(context, left - 4, top - 4, metrics.width + 8, metrics.height + 8, metrics.radius + 4);
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        context.stroke();
      }

      const visibleServices = getVisibleServices(node);
      if (visibleServices.length > 0) {
        let offsetY = top + metrics.glyphHeight + 6;
        for (const service of visibleServices) {
          const badge = serviceBadgeMetrics(service, width);
          context.font = `600 ${badge.fontSize}px system-ui, sans-serif`;
          const badgeX = left + 8;
          const badgeWidth = metrics.width - 16;

          roundRectPath(context, badgeX, offsetY, badgeWidth, badge.height, badge.radius);
          context.fillStyle = "rgba(255,255,255,0.06)";
          context.fill();
          context.strokeStyle = palette.border;
          context.lineWidth = 1;
          context.stroke();

          context.fillStyle = "#d7e2ff";
          context.textAlign = "left";
          context.textBaseline = "middle";
          context.fillText(badge.text, badgeX + 10, offsetY + badge.height / 2);
          context.textBaseline = "alphabetic";

          serviceHitRegionsRef.current.push({
            nodeId: node.id,
            service,
            x: badgeX,
            y: offsetY,
            width: badgeWidth,
            height: badge.height,
          });
          offsetY += badge.height + 6;
        }
      }

      context.fillStyle = "#f3f6ff";
      const labelFontSize = Math.max(12, Math.round(15 * getCanvasDensityScale(width)));
      context.font = `700 ${labelFontSize}px system-ui, sans-serif`;
      context.textAlign = "center";
      const label = node.name.length > 22 ? `${node.name.slice(0, 19)}...` : node.name;
      context.fillText(label, point.x, top + metrics.height + Math.max(18, 22 * getCanvasDensityScale(width)));
    }
  }, [filteredEdges, filteredNodes, graph.nodes, selectedId, showConnections, showGrid, viewport]);

  useEffect(() => {
    const handleResize = () => onViewportChange({ ...viewport });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onViewportChange, viewport]);

  return (
    <canvas
      id="canvas"
      ref={canvasRef}
      onPointerDown={(event) => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const serviceTarget = findServiceAtPoint(event.clientX, event.clientY);
        if (serviceTarget) {
          pointerStateRef.current.down = false;
          pointerStateRef.current.moved = false;
          pointerStateRef.current.dragStart = null;
          pointerStateRef.current.last = null;
          pointerStateRef.current.draggingNodeId = null;
          onDragStateChange(null);
          return;
        }
        activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (activePointersRef.current.size === 2) {
          const points = [...activePointersRef.current.values()];
          const dx = points[1].x - points[0].x;
          const dy = points[1].y - points[0].y;
          pinchStateRef.current = {
            distance: Math.hypot(dx, dy) || 1,
            scale: viewportRef.current.scale,
          };
          pointerStateRef.current.down = false;
          pointerStateRef.current.moved = true;
          pointerStateRef.current.draggingNodeId = null;
          pointerStateRef.current.last = null;
          onDragStateChange(null);
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }

        pointerStateRef.current.down = true;
        pointerStateRef.current.moved = false;
        pointerStateRef.current.dragStart = { x: event.clientX, y: event.clientY };
        pointerStateRef.current.last = { x: event.clientX, y: event.clientY };
        pointerStateRef.current.draggingNodeId =
          findNodeAtPoint(event.clientX, event.clientY, width, height)?.id ?? null;
        onDragStateChange(pointerStateRef.current.draggingNodeId);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (activePointersRef.current.has(event.pointerId)) {
          activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        }

        if (activePointersRef.current.size === 2 && pinchStateRef.current) {
          const width = window.innerWidth;
          const height = window.innerHeight;
          const points = [...activePointersRef.current.values()];
          const centerX = (points[0].x + points[1].x) / 2;
          const centerY = (points[0].y + points[1].y) / 2;
          const before = screenToWorld(centerX, centerY, viewportRef.current, width, height);

          const dx = points[1].x - points[0].x;
          const dy = points[1].y - points[0].y;
          const distance = Math.hypot(dx, dy) || pinchStateRef.current.distance;
          const nextScale = clampScale(
            pinchStateRef.current.scale * (distance / pinchStateRef.current.distance),
          );
          const nextViewport = { ...viewportRef.current, scale: nextScale };
          const after = screenToWorld(centerX, centerY, nextViewport, width, height);

          onViewportChange({
            x: viewportRef.current.x + after.x - before.x,
            y: viewportRef.current.y + after.y - before.y,
            scale: nextScale,
          });
          return;
        }

        if (!pointerStateRef.current.down || !pointerStateRef.current.last) {
          return;
        }
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dx = event.clientX - pointerStateRef.current.last.x;
        const dy = event.clientY - pointerStateRef.current.last.y;
        const dragStart = pointerStateRef.current.dragStart;
        if (
          dragStart &&
          (Math.abs(event.clientX - dragStart.x) > 4 || Math.abs(event.clientY - dragStart.y) > 4)
        ) {
          pointerStateRef.current.moved = true;
        }

        if (pointerStateRef.current.draggingNodeId) {
          const world = screenToWorld(event.clientX, event.clientY, viewportRef.current, width, height);
          onDragNode(pointerStateRef.current.draggingNodeId, world.x, world.y);
        } else {
          onViewportChange({
            ...viewportRef.current,
            x: viewportRef.current.x + dx / viewportRef.current.scale,
            y: viewportRef.current.y + dy / viewportRef.current.scale,
          });
        }

        pointerStateRef.current.last = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        activePointersRef.current.delete(event.pointerId);
        if (activePointersRef.current.size < 2) {
          pinchStateRef.current = null;
        }
        if (activePointersRef.current.size > 0) {
          pointerStateRef.current.down = false;
          pointerStateRef.current.draggingNodeId = null;
          onDragStateChange(null);
          return;
        }
        const width = window.innerWidth;
        const height = window.innerHeight;
        const serviceTarget = findServiceAtPoint(event.clientX, event.clientY);
        if (serviceTarget && !pointerStateRef.current.moved) {
          const node = graph.nodes.find((candidate) => candidate.id === serviceTarget.nodeId);
          if (node) {
            window.open(buildServiceUrl(node, serviceTarget.service), "_blank", "noopener,noreferrer");
            onSelect(node.id);
          }
          pointerStateRef.current.down = false;
          pointerStateRef.current.draggingNodeId = null;
          pointerStateRef.current.last = null;
          onDragStateChange(null);
          return;
        }
        if (!pointerStateRef.current.moved) {
          const node = findNodeAtPoint(event.clientX, event.clientY, width, height);
          onSelect(node?.id ?? null);
        }
        pointerStateRef.current.down = false;
        pointerStateRef.current.draggingNodeId = null;
        pointerStateRef.current.last = null;
        onDragStateChange(null);
      }}
      onPointerCancel={(event) => {
        activePointersRef.current.delete(event.pointerId);
        if (activePointersRef.current.size < 2) {
          pinchStateRef.current = null;
        }
        pointerStateRef.current.down = false;
        pointerStateRef.current.moved = false;
        pointerStateRef.current.draggingNodeId = null;
        pointerStateRef.current.last = null;
        onDragStateChange(null);
      }}
      onWheel={(event) => {
        event.preventDefault();
        const width = window.innerWidth;
        const height = window.innerHeight;
        const scaleFactor = event.deltaY < 0 ? 1.08 : 0.92;
        const before = screenToWorld(event.clientX, event.clientY, viewportRef.current, width, height);
        const nextScale = clampScale(viewportRef.current.scale * scaleFactor);
        const after = screenToWorld(
          event.clientX,
          event.clientY,
          { ...viewportRef.current, scale: nextScale },
          width,
          height,
        );
        onViewportChange({
          x: viewportRef.current.x + after.x - before.x,
          y: viewportRef.current.y + after.y - before.y,
          scale: nextScale,
        });
      }}
    />
  );
}
