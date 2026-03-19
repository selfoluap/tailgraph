interface TopBarProps {
  generatedAt: string;
  autoRefresh: boolean;
  activeView: string;
  isDesktop: boolean;
  isSwitchingView: boolean;
  mobileLayoutsOpen: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveMessage: string;
  onOrderByGroups: () => void;
  onOrderInGrid: () => void;
  onSaveConfig: () => void;
  onSelectView: (viewId: string) => void;
  onToggleMobileLayouts: () => void;
  onToggleRefresh: () => void;
}

export function TopBar({
  generatedAt,
  autoRefresh,
  activeView,
  isDesktop,
  isSwitchingView,
  mobileLayoutsOpen,
  saveState,
  saveMessage,
  onOrderByGroups,
  onOrderInGrid,
  onSaveConfig,
  onSelectView,
  onToggleMobileLayouts,
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
        <div className="viewControlStack">
          <div className="viewtabsRow">
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
            {!isDesktop ? (
              <button
                className={`toolbarbtn mobileLayoutToggle ${mobileLayoutsOpen ? "active" : ""}`}
                onClick={onToggleMobileLayouts}
                aria-expanded={mobileLayoutsOpen}
                aria-controls="mobile-layout-actions"
                type="button"
              >
                Layouts
              </button>
            ) : null}
          </div>
          {!isDesktop && mobileLayoutsOpen ? (
            <div className="mobileLayoutMenu" id="mobile-layout-actions">
              <button className="toolbarbtn mobileLayoutAction" onClick={onOrderByGroups} type="button">
                Group by groups
              </button>
              <button className="toolbarbtn mobileLayoutAction" onClick={onOrderInGrid} type="button">
                Align to grid
              </button>
            </div>
          ) : null}
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
