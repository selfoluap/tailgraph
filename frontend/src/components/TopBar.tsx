interface TopBarProps {
  generatedAt: string;
  autoRefresh: boolean;
  activeView: string;
  isSwitchingView: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveMessage: string;
  onSaveConfig: () => void;
  onSelectView: (viewId: string) => void;
  onToggleRefresh: () => void;
}

export function TopBar({
  generatedAt,
  autoRefresh,
  activeView,
  isSwitchingView,
  saveState,
  saveMessage,
  onSaveConfig,
  onSelectView,
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
        <div className="viewtabs" role="tablist" aria-label="Saved views">
          {[1, 2, 3, 4, 5].map((index) => {
            const viewId = `view${index}`;
            return (
              <button
                key={viewId}
                className={`toolbarbtn viewtab ${activeView === viewId ? "active" : ""}`}
                onClick={() => onSelectView(viewId)}
                role="tab"
                aria-selected={activeView === viewId}
                disabled={isSwitchingView}
                type="button"
              >
                {index}
              </button>
            );
          })}
        </div>
        <button
          className={`toolbarbtn ${saveState === "saved" ? "active" : ""}`}
          onClick={onSaveConfig}
          disabled={saveState === "saving"}
          type="button"
        >
          {saveState === "saving" ? <span className="spinner" aria-hidden="true" /> : null}
          {saveLabel}
        </button>
        <button
          className={`toolbarbtn ${autoRefresh ? "active" : ""}`}
          onClick={onToggleRefresh}
          type="button"
        >
          {autoRefresh ? "Stop refresh" : "Auto-refresh"}
        </button>
      </div>
    </div>
  );
}
