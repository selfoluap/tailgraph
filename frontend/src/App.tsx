import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchDeviceGroups,
  fetchGraphConfig,
  fetchStatus,
  saveDeviceGroups,
  saveGraphConfig,
  type LayoutConfig,
} from "./api/status";
import { CanvasGraph } from "./components/CanvasGraph";
import { ControlSheet } from "./components/ControlSheet";
import { DetailsPanel } from "./components/DetailsPanel";
import { RightSidebar } from "./components/RightSidebar";
import { TopBar } from "./components/TopBar";
import { buildGraphFromStatus } from "./graph/buildGraph";
import { filterNodes } from "./graph/filterNodes";
import { orderNodesByGroups } from "./graph/orderNodes";
import { useAutoRefresh } from "./hooks/useAutoRefresh";
import type { FiltersState, GraphData, GraphNode, NodePositionMap, ViewportState } from "./types/graph";

const defaultFilters: FiltersState = {
  query: "",
  status: "all",
  group: "all",
  tag: "all",
  special: "all",
};

const emptyGraph: GraphData = {
  generatedAt: "--",
  nodes: [],
  edges: [],
  allGroups: [],
  allTags: [],
};

const defaultViewport: ViewportState = { x: 0, y: 0, scale: 1 };
const viewIds = ["view1", "view2", "view3", "view4", "view5"] as const;

function emptyLayoutConfig(): LayoutConfig {
  return { nodes: {}, viewport: null, updatedAt: null };
}

function normalizeViews(views?: Record<string, LayoutConfig>): Record<string, LayoutConfig> {
  return Object.fromEntries(
    viewIds.map((viewId) => [viewId, views?.[viewId] ?? emptyLayoutConfig()]),
  ) as Record<string, LayoutConfig>;
}

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

function groupsEqual(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key, index) => {
    if (key !== bKeys[index]) {
      return false;
    }

    const aGroups = a[key] || [];
    const bGroups = b[key] || [];
    if (aGroups.length !== bGroups.length) {
      return false;
    }

    return aGroups.every((group, groupIndex) => group === bGroups[groupIndex]);
  });
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
  const [deviceGroups, setDeviceGroups] = useState<Record<string, string[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [viewport, setViewport] = useState<ViewportState>(defaultViewport);
  const [activeView, setActiveView] = useState<string>("view1");
  const [isSwitchingView, setIsSwitchingView] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(() => window.innerWidth >= 900);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const graphRef = useRef(graph);
  const activeViewRef = useRef(activeView);
  const viewportRef = useRef(viewport);
  const viewConfigsRef = useRef<Record<string, LayoutConfig>>(normalizeViews());
  const persistedViewConfigsRef = useRef<Record<string, LayoutConfig>>(normalizeViews());
  const persistedGroupsRef = useRef<Record<string, string[]>>({});
  const isDesktop = useIsDesktop();

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    if (saveState !== "saved" && saveState !== "error") {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSaveState("idle");
      setSaveMessage("");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  useEffect(() => {
    setSheetOpen(isDesktop);
  }, [isDesktop]);

  const loadView = useCallback(async (viewId: string) => {
    const status = await fetchStatus();
    const nextGraph = buildGraphFromStatus(status);
    const nextConfig = viewConfigsRef.current[viewId] ?? emptyLayoutConfig();

    activeViewRef.current = viewId;
    setActiveView(viewId);
    setGraph(applyPositions(nextGraph, nextConfig.nodes));
    setViewport(nextConfig.viewport ?? defaultViewport);
    setError(status.error || null);
  }, []);

  const refreshStatus = useCallback(async (keepPositions = true) => {
    const status = await fetchStatus();
    const nextGraph = buildGraphFromStatus(status);
    const activeConfig = viewConfigsRef.current[activeViewRef.current] ?? emptyLayoutConfig();

    setGraph((current) => {
      return applyPositions(
        nextGraph,
        activeConfig.nodes,
        keepPositions ? current.nodes : undefined,
      );
    });
    setError(status.error || null);
  }, []);

  const snapshotActiveView = useCallback(() => {
    const currentViewId = activeViewRef.current;
    viewConfigsRef.current = {
      ...viewConfigsRef.current,
      [currentViewId]: {
        ...(viewConfigsRef.current[currentViewId] ?? emptyLayoutConfig()),
        nodes: positionsFromNodes(graphRef.current.nodes),
        viewport: viewportRef.current,
      },
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      let nextActiveView = "view1";
      try {
        const [config, groups] = await Promise.all([fetchGraphConfig(), fetchDeviceGroups()]);
        if (cancelled) {
          return;
        }
        const nextViews = normalizeViews(config.views);
        nextActiveView = viewIds.includes(config.activeView as (typeof viewIds)[number])
          ? config.activeView
          : "view1";
        viewConfigsRef.current = nextViews;
        persistedViewConfigsRef.current = nextViews;
        persistedGroupsRef.current = groups.groups || {};
        setDeviceGroups(groups.groups || {});
      } catch (caught) {
        console.error(caught);
      }
      await loadView(nextActiveView);
    }

    bootstrap().catch((caught: unknown) => {
      if (!cancelled) {
        setError(caught instanceof Error ? caught.message : "unknown error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadView]);

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
    snapshotActiveView();
    const currentViewId = activeViewRef.current;
    const persistedConfig = persistedViewConfigsRef.current[currentViewId] ?? emptyLayoutConfig();
    const nextPositions = positionsFromNodes(graphRef.current.nodes);
    const nextViewport = viewportRef.current;
    if (
      positionsEqual(nextPositions, persistedConfig.nodes) &&
      viewportEqual(nextViewport, persistedConfig.viewport ?? defaultViewport) &&
      groupsEqual(deviceGroups, persistedGroupsRef.current)
    ) {
      setSaveState("saved");
      setSaveMessage(`View ${currentViewId.slice(-1)} and groups already saved`);
      return;
    }

    setSaveState("saving");
    setSaveMessage(`Saving view ${currentViewId.slice(-1)} and groups`);

    try {
      const [configResult, groupsResult] = await Promise.all([
        saveGraphConfig(nextPositions, nextViewport, currentViewId),
        saveDeviceGroups(deviceGroups),
      ]);
      if (!configResult.ok || !groupsResult.ok) {
        setSaveState("error");
        setSaveMessage("Save failed");
        return;
      }

      const savedViews = normalizeViews(configResult.config.views);
      viewConfigsRef.current = savedViews;
      persistedViewConfigsRef.current = savedViews;
      persistedGroupsRef.current = groupsResult.groups.groups;
      await refreshStatus(true);
      setSaveState("saved");
      setSaveMessage(`View ${currentViewId.slice(-1)} and groups saved`);
    } catch (caught) {
      console.error(caught);
      setSaveState("error");
      setSaveMessage("Save failed");
    }
  }, [deviceGroups, refreshStatus, snapshotActiveView]);

  useEffect(() => {
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => ({
        ...node,
        groups: deviceGroups[node.hostname] || node.groups,
      })),
      allGroups: [...new Set(Object.values(deviceGroups).flat())].sort(),
    }));
  }, [deviceGroups]);

  const currentPositions = useMemo(() => positionsFromNodes(graph.nodes), [graph.nodes]);

  useEffect(() => {
    const persistedConfig = persistedViewConfigsRef.current[activeView] ?? emptyLayoutConfig();
    if (
      positionsEqual(currentPositions, persistedConfig.nodes) &&
      viewportEqual(viewport, persistedConfig.viewport ?? defaultViewport) &&
      groupsEqual(deviceGroups, persistedGroupsRef.current)
    ) {
      if (saveState !== "saving" && saveState !== "saved") {
        setSaveState("idle");
      }
      return;
    }

    if (saveState !== "saving") {
      setSaveState("idle");
    }
  }, [currentPositions, deviceGroups, saveState, viewport]);

  return (
    <div id="app">
      <div className="graphStage">
        <CanvasGraph
          graph={isSwitchingView ? emptyGraph : graph}
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

        {isSwitchingView ? (
          <div className="viewLoadingOverlay" aria-hidden="true">
            <span className="spinner viewLoadingSpinner" />
          </div>
        ) : null}
      </div>

      <TopBar
        generatedAt={error ? "error" : graph.generatedAt}
        autoRefresh={autoRefresh}
        activeView={activeView}
        isSwitchingView={isSwitchingView}
        saveState={saveState}
        saveMessage={saveMessage}
        onSaveConfig={() => {
          void saveConfig();
        }}
        onSelectView={(viewId) => {
          if (viewId === activeViewRef.current) {
            return;
          }

          snapshotActiveView();
          setSaveState("idle");
          setSaveMessage("");
          setIsSwitchingView(true);
          void loadView(viewId)
            .catch((caught) => {
              console.error(caught);
              setError(caught instanceof Error ? caught.message : "unknown error");
            })
            .finally(() => {
              setIsSwitchingView(false);
            });
        }}
        onToggleRefresh={() => setAutoRefresh((current) => !current)}
      />

      <ControlSheet
        filters={filters}
        groups={graph.allGroups}
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

      <DetailsPanel
        node={selectedNode}
        onClose={() => setSelectedId(null)}
        onAddGroup={(nodeId, groupName) => {
          const clean = groupName.trim();
          if (!clean) {
            return;
          }

          const node = graph.nodes.find((candidate) => candidate.id === nodeId);
          const hostname = node?.hostname?.trim();
          if (!hostname) {
            return;
          }

          setDeviceGroups((current) => {
            const existing = current[hostname] || [];
            if (existing.some((group) => group.toLowerCase() === clean.toLowerCase())) {
              return current;
            }

            return {
              ...current,
              [hostname]: [...existing, clean].sort((a, b) => a.localeCompare(b)),
            };
          });
        }}
        onRemoveGroup={(nodeId, groupName) => {
          const node = graph.nodes.find((candidate) => candidate.id === nodeId);
          const hostname = node?.hostname?.trim();
          if (!hostname) {
            return;
          }

          setDeviceGroups((current) => {
            const nextGroups = (current[hostname] || []).filter((group) => group !== groupName);
            if (nextGroups.length === 0) {
              const { [hostname]: _removed, ...rest } = current;
              return rest;
            }

            return {
              ...current,
              [hostname]: nextGroups,
            };
          });
        }}
      />

      {isDesktop ? (
        <RightSidebar
          onOrderByGroups={() => {
            setGraph((current) => ({
              ...current,
              nodes: orderNodesByGroups(current.nodes),
            }));
            setSaveState("idle");
            setSaveMessage("");
          }}
        />
      ) : null}
    </div>
  );
}
