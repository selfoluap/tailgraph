import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchGraphConfig, fetchStatus, saveGraphConfig } from "./api/status";
import { CanvasGraph } from "./components/CanvasGraph";
import { ControlSheet } from "./components/ControlSheet";
import { DetailsPanel } from "./components/DetailsPanel";
import { TopBar } from "./components/TopBar";
import { buildGraphFromStatus } from "./graph/buildGraph";
import { filterNodes } from "./graph/filterNodes";
import { useAutoRefresh } from "./hooks/useAutoRefresh";
import type { FiltersState, GraphData, GraphNode, NodePositionMap, ViewportState } from "./types/graph";

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

function applyPositions(
  graph: GraphData,
  persistedPositions: NodePositionMap,
  currentNodes?: GraphNode[],
): GraphData {
  const currentNodeMap = currentNodes ? new Map(currentNodes.map((node) => [node.id, node])) : null;

  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const current = currentNodeMap?.get(node.id);
      if (current) {
        return {
          ...node,
          x: current.x,
          y: current.y,
          vx: current.vx,
          vy: current.vy,
        };
      }

      const persisted = persistedPositions[node.id];
      if (!persisted) {
        return node;
      }

      return {
        ...node,
        x: persisted.x,
        y: persisted.y,
        vx: 0,
        vy: 0,
      };
    }),
  };
}

function positionsFromNodes(nodes: GraphNode[]): NodePositionMap {
  return Object.fromEntries(nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
}

function positionsEqual(a: NodePositionMap, b: NodePositionMap): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key) => a[key]?.x === b[key]?.x && a[key]?.y === b[key]?.y);
}

function viewportEqual(a: ViewportState, b: ViewportState): boolean {
  return a.x === b.x && a.y === b.y && a.scale === b.scale;
}

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
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(() => window.innerWidth >= 900);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const graphRef = useRef(graph);
  const persistedPositionsRef = useRef<NodePositionMap>({});
  const persistedViewportRef = useRef<ViewportState>({ x: 0, y: 0, scale: 1 });
  const isDesktop = useIsDesktop();

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  useEffect(() => {
    if (saveState !== "saved") {
      return undefined;
    }

    const timer = window.setTimeout(() => setSaveState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  useEffect(() => {
    setSheetOpen(isDesktop);
  }, [isDesktop]);

  const refreshStatus = useCallback(async (keepPositions = true) => {
    const status = await fetchStatus();
    const nextGraph = buildGraphFromStatus(status);

    setGraph((current) => {
      return applyPositions(
        nextGraph,
        persistedPositionsRef.current,
        keepPositions ? current.nodes : undefined,
      );
    });
    setError(status.error || null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const config = await fetchGraphConfig();
        if (cancelled) {
          return;
        }
        persistedPositionsRef.current = config.nodes;
        if (config.viewport) {
          persistedViewportRef.current = config.viewport;
          setViewport(config.viewport);
        }
      } catch (caught) {
        console.error(caught);
      }
      await refreshStatus(false);
    }

    bootstrap().catch((caught: unknown) => {
      if (!cancelled) {
        setError(caught instanceof Error ? caught.message : "unknown error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshStatus]);

  useAutoRefresh(autoRefresh, async () => {
    await refreshStatus(true);
  });

  const selectedNode = graph.nodes.find((node) => node.id === selectedId) || null;
  const filteredPeers = useMemo(
    () =>
      filterNodes(graph.nodes, filters)
        .filter((node) => node.role !== "self")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filters, graph.nodes],
  );

  const saveConfig = useCallback(async () => {
    const nextPositions = positionsFromNodes(graphRef.current.nodes);
    const nextViewport = viewport;
    if (
      positionsEqual(nextPositions, persistedPositionsRef.current) &&
      viewportEqual(nextViewport, persistedViewportRef.current)
    ) {
      setSaveState("saved");
      return;
    }

    setSaveState("saving");

    try {
      const result = await saveGraphConfig(nextPositions, nextViewport);
      if (!result.ok) {
        setSaveState("error");
        return;
      }
      persistedPositionsRef.current = nextPositions;
      persistedViewportRef.current = nextViewport;
      setSaveState("saved");
    } catch (caught) {
      console.error(caught);
      setSaveState("error");
    }
  }, [viewport]);

  const currentPositions = useMemo(() => positionsFromNodes(graph.nodes), [graph.nodes]);

  useEffect(() => {
    if (
      positionsEqual(currentPositions, persistedPositionsRef.current) &&
      viewportEqual(viewport, persistedViewportRef.current)
    ) {
      if (saveState !== "saving" && saveState !== "saved") {
        setSaveState("idle");
      }
      return;
    }

    if (saveState !== "saving") {
      setSaveState("idle");
    }
  }, [currentPositions, saveState, viewport]);

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
        onDragStateChange={() => {}}
      />

      <TopBar
        generatedAt={error ? "error" : graph.generatedAt}
        autoRefresh={autoRefresh}
        saveState={saveState}
        onSaveConfig={() => {
          void saveConfig();
        }}
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
