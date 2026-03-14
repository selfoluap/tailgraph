import { useEffect, useRef } from "react";

import { statusText } from "../graph/buildGraph";
import { filterEdges, filterNodes } from "../graph/filterNodes";
import { clampScale, screenToWorld, worldToScreen } from "../graph/viewport";
import type { FiltersState, GraphData, GraphNode, ViewportState } from "../types/graph";

interface CanvasGraphProps {
  graph: GraphData;
  filters: FiltersState;
  selectedId: string | null;
  viewport: ViewportState;
  onViewportChange: (next: ViewportState) => void;
  onSelect: (nodeId: string | null) => void;
  onDragNode: (nodeId: string, x: number, y: number) => void;
  onDragStateChange: (nodeId: string | null) => void;
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

  const filteredNodes = filterNodes(graph.nodes, filters);
  const filteredEdges = filterEdges(graph.edges, filteredNodes);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  function findNodeAtPoint(clientX: number, clientY: number, width: number, height: number) {
    for (let index = filteredNodes.length - 1; index >= 0; index -= 1) {
      const node = filteredNodes[index];
      const point = worldToScreen(node.x, node.y, viewport, width, height);
      const radius = node.r * Math.max(0.9, Math.min(1.4, viewport.scale)) + 8;
      const dx = clientX - point.x;
      const dy = clientY - point.y;
      if (dx * dx + dy * dy <= radius * radius) {
        return node;
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

    const rootStyle = getComputedStyle(document.documentElement);

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

    for (const node of filteredNodes) {
      const point = worldToScreen(node.x, node.y, viewport, width, height);
      const radius = node.r * Math.max(0.9, Math.min(1.4, viewport.scale));

      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fillStyle = nodeColor(rootStyle, node);
      context.fill();

      if (selectedId === node.id) {
        context.beginPath();
        context.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        context.stroke();
      }

      if (node.exitNode || node.exitNodeOption) {
        context.beginPath();
        context.arc(point.x + radius * 0.85, point.y - radius * 0.85, 6, 0, Math.PI * 2);
        context.fillStyle = rootStyle.getPropertyValue("--accent").trim();
        context.fill();
      }

      if (node.subnetRouter) {
        context.beginPath();
        context.arc(point.x - radius * 0.85, point.y - radius * 0.85, 6, 0, Math.PI * 2);
        context.fillStyle = rootStyle.getPropertyValue("--router").trim();
        context.fill();
      }

      context.fillStyle = "#e8ecf8";
      context.font = "12px system-ui, sans-serif";
      context.textAlign = "center";
      const label = node.name.length > 22 ? `${node.name.slice(0, 19)}...` : node.name;
      context.fillText(label, point.x, point.y + radius + 16);
    }
  }, [filteredEdges, filteredNodes, graph.nodes, selectedId, viewport]);

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
