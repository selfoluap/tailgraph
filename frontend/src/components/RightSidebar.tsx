interface RightSidebarProps {
  onOrderByGroups: () => void;
}

export function RightSidebar({ onOrderByGroups }: RightSidebarProps) {
  return (
    <aside id="actionSidebar" aria-label="Layout actions">
      <div className="sidebarCard">
        <button className="sidebarActionButton" onClick={onOrderByGroups} type="button">
          GroupBy
        </button>
      </div>
    </aside>
  );
}
