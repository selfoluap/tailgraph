import { useEffect, useState } from "react";

import type { GraphNode } from "../types/graph";
import { statusText } from "../graph/buildGraph";

interface DetailsPanelProps {
  node: GraphNode | null;
  onClose: () => void;
  onAddGroup: (nodeId: string, groupName: string) => void;
  onRemoveGroup: (nodeId: string, groupName: string) => void;
}

export function DetailsPanel({ node, onClose, onAddGroup, onRemoveGroup }: DetailsPanelProps) {
  const [groupDraft, setGroupDraft] = useState("");

  useEffect(() => {
    setGroupDraft("");
  }, [node?.id]);

  return (
    <div id="details" className={node ? "show" : ""}>
      <button className="closebtn" onClick={onClose} type="button">
        x
      </button>
      {node && (
        <div id="detailsBody">
          <h2>{node.name}</h2>
          <div className="kv">
            <div className="k">Status</div>
            <div>{statusText(node)}</div>
            <div className="k">IP</div>
            <div>{node.ip || "n/a"}</div>
            <div className="k">DNS</div>
            <div>{node.dns || "n/a"}</div>
            <div className="k">OS</div>
            <div>{node.os || "n/a"}</div>
            <div className="k">Seen</div>
            <div>{formatNodeTimestamp(node, "lastSeen")}</div>
            <div className="k">Last handshake</div>
            <div>{formatNodeTimestamp(node, "lastHandshake")}</div>
            <div className="k">Last write</div>
            <div>{formatNodeTimestamp(node, "lastWrite")}</div>
            <div className="k">Relay</div>
            <div>{node.relay || "unknown"}</div>
            <div className="k">Groups</div>
            <div>
              <div className="groupEditor">
                <input
                  className="groupInput"
                  placeholder="Add group"
                  value={groupDraft}
                  onChange={(event) => setGroupDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }
                    event.preventDefault();
                    onAddGroup(node.id, groupDraft);
                    setGroupDraft("");
                  }}
                />
                <button
                  className="groupAddButton"
                  onClick={() => {
                    onAddGroup(node.id, groupDraft);
                    setGroupDraft("");
                  }}
                  type="button"
                >
                  Add
                </button>
              </div>
              {node.groups.length > 0 ? (
                node.groups.map((group) => (
                  <button
                    className="badge group groupButton"
                    key={group}
                    onClick={() => onRemoveGroup(node.id, group)}
                    type="button"
                  >
                    {group} x
                  </button>
                ))
              ) : (
                <span className="badge">none</span>
              )}
            </div>
            <div className="k">Tailscale Tags</div>
            <div>
              {node.tags.length > 0 ? (
                node.tags.map((tag) => (
                  <span className="badge" key={tag}>
                    {tag}
                  </span>
                ))
              ) : (
                <span className="badge">none</span>
              )}
            </div>
            <div className="k">Services</div>
            <div>
              {node.services.length > 0 ? (
                node.services.map((service) => (
                  <a
                    className="badge service-link"
                    href={buildServiceUrl(node, service.port, service.protocol, service.label)}
                    key={`${service.protocol}-${service.port}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {service.label} {service.port}/{service.protocol}
                  </a>
                ))
              ) : (
                <span>{serviceEmptyState(node)}</span>
              )}
            </div>
            <div className="k">Service scan</div>
            <div>{formatServiceScan(node)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function serviceEmptyState(node: GraphNode): string {
  if (node.servicesError) {
    return "service discovery error";
  }
  if (node.servicesStatus === "disabled") {
    return "service discovery disabled";
  }
  return "no configured service ports reachable";
}

function buildServiceUrl(node: GraphNode, port: number, protocol: string, label: string): string {
  const host = node.dns || node.hostname || node.ip;
  const scheme = inferServiceScheme(port, protocol, label);
  return `${scheme}://${host}:${port}`;
}

function inferServiceScheme(port: number, protocol: string, label: string): string {
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

function formatServiceScan(node: GraphNode): string {
  if (node.servicesError) {
    return node.servicesError;
  }
  if (!node.servicesScannedAt) {
    return node.servicesStatus === "disabled" ? "disabled" : "n/a";
  }
  return formatAbsoluteOrRelativeTime(node.servicesScannedAt);
}

type NodeTimestampField = "lastHandshake" | "lastSeen" | "lastWrite";

export function formatNodeTimestamp(node: GraphNode, field: NodeTimestampField): string {
  if (node.role === "self" && field === "lastSeen") {
    return "current node";
  }

  const value = node[field];
  return formatAbsoluteOrRelativeTime(value, field === "lastSeen" && node.role === "self");
}

function formatAbsoluteOrRelativeTime(value: string, forceCurrentNode = false): string {
  if (forceCurrentNode) {
    return "current node";
  }
  if (!value) {
    return "n/a";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const parsedDate = new Date(timestamp);
  if (parsedDate.getUTCFullYear() <= 1) {
    return "n/a";
  }

  const elapsedMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return parsedDate.toLocaleString();
}
