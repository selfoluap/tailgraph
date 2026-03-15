interface TopBarProps {
  generatedAt: string;
  autoRefresh: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  onSaveConfig: () => void;
  onToggleRefresh: () => void;
}

export function TopBar({
  generatedAt,
  autoRefresh,
  saveState,
  onSaveConfig,
  onToggleRefresh,
}: TopBarProps) {
  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Save";

  return (
    <div className="topbar">
      <div className="chips">
        <div className="chip">generated: {generatedAt}</div>
      </div>
      <div className="toolbar">
        <button
          className={`toolbarbtn ${saveState === "saved" ? "active" : ""}`}
          onClick={onSaveConfig}
          disabled={saveState === "saving"}
        >
          {saveLabel}
        </button>
        <button className={`toolbarbtn ${autoRefresh ? "active" : ""}`} onClick={onToggleRefresh}>
          {autoRefresh ? "Stop refresh" : "Auto-refresh"}
        </button>
      </div>
    </div>
  );
}
