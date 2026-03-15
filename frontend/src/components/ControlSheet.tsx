import { useEffect, useRef, useState } from "react";

import type { FiltersState, GraphNode } from "../types/graph";
import { statusText } from "../graph/buildGraph";

const COLLAPSED_PERCENT = 58;
const DRAG_THRESHOLD_PX = 40;

interface ControlSheetProps {
  filters: FiltersState;
  groups: string[];
  tags: string[];
  peers: GraphNode[];
  isDesktop: boolean;
  sheetOpen: boolean;
  onChange: (next: Partial<FiltersState>) => void;
  onSelect: (nodeId: string) => void;
  onToggleSheet: () => void;
  onSetSheetOpen: (open: boolean) => void;
}

export function ControlSheet({
  filters,
  groups,
  tags,
  peers,
  isDesktop,
  sheetOpen,
  onChange,
  onSelect,
  onToggleSheet,
  onSetSheetOpen,
}: ControlSheetProps) {
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sheetContentRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const contentTouchRef = useRef<{
    startY: number;
    expandTriggered: boolean;
    collapseTriggered: boolean;
  } | null>(null);
  const dragRef = useRef<{
    startY: number;
    startOpen: boolean;
    deltaY: number;
  } | null>(null);

  useEffect(() => {
    if (isDesktop) {
      setDragPercent(null);
      setIsDragging(false);
      dragRef.current = null;
      contentTouchRef.current = null;
    }
  }, [isDesktop]);

  const sheetStyle =
    isDesktop
      ? undefined
      : {
          transform: `translateY(${dragPercent ?? (sheetOpen ? 0 : COLLAPSED_PERCENT)}%)`,
          transition: isDragging ? "none" : "transform 0.18s ease",
        };

  return (
    <div id="sheet" className={sheetOpen ? "open" : ""} style={sheetStyle}>
      <div
        className="handleWrap"
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          if (!isDragging && !isDesktop) {
            onToggleSheet();
          }
        }}
        onPointerDown={(event) => {
          if (isDesktop) {
            return;
          }
          dragRef.current = {
            startY: event.clientY,
            startOpen: sheetOpen,
            deltaY: 0,
          };
          setIsDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (isDesktop || !dragRef.current) {
            return;
          }

          const deltaY = event.clientY - dragRef.current.startY;
          dragRef.current.deltaY = deltaY;

          const startPercent = dragRef.current.startOpen ? 0 : COLLAPSED_PERCENT;
          const pxPerPercent = Math.max(4, window.innerHeight * 0.01);
          const nextPercent = Math.max(
            0,
            Math.min(COLLAPSED_PERCENT, startPercent + deltaY / pxPerPercent),
          );

          setDragPercent(nextPercent);
        }}
        onPointerUp={() => {
          if (isDesktop || !dragRef.current) {
            return;
          }

          const { startOpen, deltaY } = dragRef.current;
          if (Math.abs(deltaY) >= DRAG_THRESHOLD_PX) {
            suppressClickRef.current = true;
            onSetSheetOpen(startOpen ? !(deltaY > DRAG_THRESHOLD_PX) : deltaY < -DRAG_THRESHOLD_PX);
          }

          dragRef.current = null;
          setDragPercent(null);
          setIsDragging(false);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setDragPercent(null);
          setIsDragging(false);
        }}
      >
        <div className="handle" />
      </div>
      <div
        className="sheetContent"
        ref={sheetContentRef}
        onTouchStart={(event) => {
          if (isDesktop) {
            return;
          }
          contentTouchRef.current = {
            startY: event.touches[0]?.clientY ?? 0,
            expandTriggered: false,
            collapseTriggered: false,
          };
        }}
        onTouchMove={(event) => {
          if (isDesktop || !contentTouchRef.current) {
            return;
          }

          const touchY = event.touches[0]?.clientY ?? contentTouchRef.current.startY;
          const deltaY = touchY - contentTouchRef.current.startY;
          const scrollTop = sheetContentRef.current?.scrollTop ?? 0;

          if (!sheetOpen && deltaY < -10 && !contentTouchRef.current.expandTriggered) {
            contentTouchRef.current.expandTriggered = true;
            onSetSheetOpen(true);
            return;
          }

          if (
            sheetOpen &&
            scrollTop <= 0 &&
            deltaY > DRAG_THRESHOLD_PX &&
            !contentTouchRef.current.collapseTriggered
          ) {
            contentTouchRef.current.collapseTriggered = true;
            onSetSheetOpen(false);
          }
        }}
        onTouchEnd={() => {
          contentTouchRef.current = null;
        }}
        onTouchCancel={() => {
          contentTouchRef.current = null;
        }}
      >
        <div id="controls">
          <div className="searchRow">
            <div className="controlGroup">
              <div className="controlLabel">Search</div>
              <input
                id="search"
                placeholder="Search name, IP, DNS, group, Tailscale tag, OS"
                value={filters.query}
                onChange={(event) => onChange({ query: event.target.value })}
              />
            </div>
          </div>

          <div className="filterGrid">
            <div className="controlGroup">
              <div className="controlLabel">Status</div>
              <select
                id="status"
                value={filters.status}
                onChange={(event) => onChange({ status: event.target.value as FiltersState["status"] })}
              >
                <option value="all">All</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div className="controlGroup">
              <div className="controlLabel">Groups</div>
              <select
                id="groupFilter"
                value={filters.group}
                onChange={(event) => onChange({ group: event.target.value })}
              >
                <option value="all">All groups</option>
                {groups.map((group) => (
                  <option value={group} key={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
            <div className="controlGroup">
              <div className="controlLabel">Tailscale Tags</div>
              <select
                id="tagFilter"
                value={filters.tag}
                onChange={(event) => onChange({ tag: event.target.value })}
              >
                <option value="all">All Tailscale tags</option>
                {tags.map((tag) => (
                  <option value={tag} key={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
            <div className="controlGroup">
              <div className="controlLabel">Roles</div>
              <select
                id="specialFilter"
                value={filters.special}
                onChange={(event) => onChange({ special: event.target.value as FiltersState["special"] })}
              >
                <option value="all">All roles</option>
                <option value="exit">Exit</option>
                <option value="router">Router</option>
                <option value="special">Special</option>
              </select>
            </div>
          </div>
        </div>

        <div className="sectionTitle">Nodes</div>
        <div className="list">
          {peers.map((node) => (
            <button key={node.id} className="item" onClick={() => onSelect(node.id)} type="button">
              <div className="name">{node.name}</div>
              <div className="meta">
                {statusText(node)} · {node.ip || "n/a"} · {node.os || "unknown"}
              </div>
              <div>
                {node.groups.slice(0, 3).map((group) => (
                  <span className="badge group" key={group}>
                    {group}
                  </span>
                ))}
                {(node.exitNode || node.exitNodeOption) && <span className="badge exit">EXIT</span>}
                {node.subnetRouter && <span className="badge router">ROUTE</span>}
                {node.tags.slice(0, 4).map((tag) => (
                  <span className="badge" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
