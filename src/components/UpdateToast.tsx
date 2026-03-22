interface UpdateToastProps {
  needRefresh: boolean;
  onRefresh: () => void;
}

export function UpdateToast({ needRefresh, onRefresh }: UpdateToastProps) {
  if (!needRefresh) return null;

  return (
    <aside className="update-toast" aria-live="polite">
      <div>
        <p className="toast-title">New version ready</p>
        <p className="toast-copy">Refresh once to load the latest trip details.</p>
      </div>
      <button className="toast-button" onClick={onRefresh}>Refresh</button>
    </aside>
  );
}
