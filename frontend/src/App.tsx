import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchStatus } from "./api/status";
import { CanvasGraph } from "./components/CanvasGraph";
import { ControlSheet } from "./components/ControlSheet";
import { DetailsPanel } from "./components/DetailsPanel";
import { TopBar } from "./components/TopBar";
import { buildGraphFromStatus } from "./graph/buildGraph";
import { filterNodes } from "./graph/filterNodes";
import { stepGraph } from "./graph/simulation";
import { useAutoRefresh } from "./hooks/useAutoRefresh";
import type { FiltersState, GraphData, ViewportState } from "./types/graph";

const defaultFilters: FiltersState = {
  query: "",
  status: "all",
  tag: "all",
  special: "all",
};

const emptyGraph: GraphData = {
  generatedAt: "--",
  nodes: [],
  edges: [],
  allTags: [],
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isDesktop;
}

export default function App() {
  const [graph, setGraph] = useState<GraphData>(emptyGraph);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, scale: 1 });
  const [frozen, setFrozen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(() => window.innerWidth >= 900);
  const [error, setError] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const graphRef = useRef(graph);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  useEffect(() => {
    setSheetOpen(isDesktop);
  }, [isDesktop]);

  const refreshStatus = useCallback(async (keepPositions = true) => {
    const status = await fetchStatus();
    const nextGraph = buildGraphFromStatus(status);

    setGraph((current) => {
      if (!keepPositions) {
        return nextGraph;
      }

      const previous = new Map(current.nodes.map((node) => [node.id, node]));
      return {
        ...nextGraph,
        nodes: nextGraph.nodes.map((node) => {
          const old = previous.get(node.id);
          return old
            ? { ...node, x: old.x, y: old.y, vx: old.vx, vy: old.vy }
            : node;
        }),
      };
    });
    setError(status.error || null);
  }, []);

  useEffect(() => {
    refreshStatus(false).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "unknown error");
    });
  }, [refreshStatus]);

  useAutoRefresh(autoRefresh, async () => {
    await refreshStatus(true);
  });

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (!frozen) {
        setGraph((current) => ({
          ...current,
          nodes: stepGraph(current.nodes, current.edges, draggingNodeId),
        }));
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [draggingNodeId, frozen]);

  const selectedNode = graph.nodes.find((node) => node.id === selectedId) || null;
  const filteredPeers = useMemo(
    () =>
      filterNodes(graph.nodes, filters)
        .filter((node) => node.role !== "self")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filters, graph.nodes],
  );

  const recenter = useCallback(() => {
    const selfNode = graphRef.current.nodes.find((node) => node.role === "self");
    setViewport({
      x: selfNode ? -selfNode.x : 0,
      y: selfNode ? -selfNode.y : 0,
      scale: 1,
    });
  }, []);

  return (
    <div id="app">
      <CanvasGraph
        graph={graph}
        filters={filters}
        selectedId={selectedId}
        viewport={viewport}
        onViewportChange={setViewport}
        onSelect={setSelectedId}
        onDragNode={(nodeId, x, y) => {
          setGraph((current) => ({
            ...current,
            nodes: current.nodes.map((node) =>
              node.id === nodeId ? { ...node, x, y, vx: 0, vy: 0 } : node,
            ),
          }));
        }}
        onDragStateChange={setDraggingNodeId}
      />

      <TopBar
        generatedAt={error ? "error" : graph.generatedAt}
        frozen={frozen}
        autoRefresh={autoRefresh}
        onRecenter={recenter}
        onToggleFrozen={() => setFrozen((current) => !current)}
        onToggleRefresh={() => setAutoRefresh((current) => !current)}
      />

      <ControlSheet
        filters={filters}
        tags={graph.allTags}
        peers={filteredPeers}
        isDesktop={isDesktop}
        sheetOpen={sheetOpen}
        onChange={(next) => setFilters((current) => ({ ...current, ...next }))}
        onSelect={(nodeId) => {
          setSelectedId(nodeId);
          const node = graph.nodes.find((candidate) => candidate.id === nodeId);
          if (node) {
            setViewport((current) => ({ ...current, x: -node.x, y: -node.y }));
          }
        }}
        onToggleSheet={() => {
          if (!isDesktop) {
            setSheetOpen((current) => !current);
          }
        }}
        onSetSheetOpen={setSheetOpen}
      />

      <DetailsPanel node={selectedNode} onClose={() => setSelectedId(null)} />
    </div>
  );
}
