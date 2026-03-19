interface RightSidebarProps {
  showConnections: boolean;
  showGrid: boolean;
  onToggleConnections: () => void;
  onToggleGrid: () => void;
  onOrderByGroups: () => void;
  onOrderInGrid: () => void;
}

export function RightSidebar({
  showConnections,
  showGrid,
  onToggleConnections,
  onToggleGrid,
  onOrderByGroups,
  onOrderInGrid,
}: RightSidebarProps) {
  return (
    <aside id="actionSidebar" aria-label="Layout actions">
      <div className="sidebarCard">
        <button className="sidebarActionButton" onClick={onToggleConnections} type="button">
          Connections: {showConnections ? "On" : "Off"}
        </button>
      </div>
      <div className="sidebarCard sidebarCardStack">
        <button className="sidebarActionButton" onClick={onToggleGrid} type="button">
          Grid: {showGrid ? "On" : "Off"}
        </button>
      </div>
      <div className="sidebarCard sidebarCardStack">
        <button className="sidebarActionButton" onClick={onOrderByGroups} type="button">
          Group by groups
        </button>
        <button className="sidebarActionButton sidebarActionButtonSecondary" onClick={onOrderInGrid} type="button">
          Align to grid
        </button>
      </div>
    </aside>
  );
}
