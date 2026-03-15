interface TopBarProps {
  generatedAt: string;
  autoRefresh: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveMessage: string;
  onSaveConfig: () => void;
  onToggleRefresh: () => void;
}

export function TopBar({
  generatedAt,
  autoRefresh,
  saveState,
  saveMessage,
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
        {saveMessage ? <div className={`chip savechip ${saveState}`}>{saveMessage}</div> : null}
      </div>
      <div className="toolbar">
        <button
          className={`toolbarbtn ${saveState === "saved" ? "active" : ""}`}
          onClick={onSaveConfig}
          disabled={saveState === "saving"}
        >
          {saveState === "saving" ? <span className="spinner" aria-hidden="true" /> : null}
          {saveLabel}
        </button>
        <button className={`toolbarbtn ${autoRefresh ? "active" : ""}`} onClick={onToggleRefresh}>
          {autoRefresh ? "Stop refresh" : "Auto-refresh"}
        </button>
      </div>
    </div>
  );
}
