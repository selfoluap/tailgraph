import type { GraphNode } from "../types/graph";
import { statusText } from "../graph/buildGraph";

interface DetailsPanelProps {
  node: GraphNode | null;
  onClose: () => void;
}

export function DetailsPanel({ node, onClose }: DetailsPanelProps) {
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
            <div>{formatLastSeen(node)}</div>
            <div className="k">Relay</div>
            <div>{node.relay || "unknown"}</div>
            <div className="k">Tags</div>
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
          </div>
        </div>
      )}
    </div>
  );
}

function formatLastSeen(node: GraphNode): string {
  if (node.role === "self") {
    return "current node";
  }
  if (!node.lastSeen) {
    return "n/a";
  }

  const timestamp = Date.parse(node.lastSeen);
  if (Number.isNaN(timestamp)) {
    return node.lastSeen;
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

  return new Date(timestamp).toLocaleString();
}
