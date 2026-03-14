interface TopBarProps {
  generatedAt: string;
  frozen: boolean;
  autoRefresh: boolean;
  onRecenter: () => void;
  onToggleFrozen: () => void;
  onToggleRefresh: () => void;
}

export function TopBar({
  generatedAt,
  frozen,
  autoRefresh,
  onRecenter,
  onToggleFrozen,
  onToggleRefresh,
}: TopBarProps) {
  return (
    <div className="topbar">
      <div className="chips">
        <div className="chip">generated: {generatedAt}</div>
      </div>
      <div className="toolbar">
        <button className="toolbarbtn" onClick={onRecenter}>
          Recenter
        </button>
        <button className={`toolbarbtn ${frozen ? "active" : ""}`} onClick={onToggleFrozen}>
          {frozen ? "Unfreeze" : "Freeze"}
        </button>
        <button className={`toolbarbtn ${autoRefresh ? "active" : ""}`} onClick={onToggleRefresh}>
          {autoRefresh ? "Stop refresh" : "Auto-refresh"}
        </button>
      </div>
    </div>
  );
}
