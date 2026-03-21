interface UpdateToastProps {
  needRefresh: boolean;
  offlineReady: boolean;
  onRefresh: () => void;
  onDismissReady: () => void;
}

export function UpdateToast({ needRefresh, offlineReady, onRefresh, onDismissReady }: UpdateToastProps) {
  if (!needRefresh && !offlineReady) return null;

  return (
    <aside className="update-toast" aria-live="polite">
      {needRefresh ? (
        <>
          <div>
            <p className="toast-title">New version ready</p>
            <p className="toast-copy">Refresh once to load the latest trip details.</p>
          </div>
          <button className="toast-button" onClick={onRefresh}>Refresh</button>
        </>
      ) : (
        <>
          <div>
            <p className="toast-title">Offline ready</p>
            <p className="toast-copy">This version is saved for no-service moments.</p>
          </div>
          <button className="toast-button secondary" onClick={onDismissReady}>Dismiss</button>
        </>
      )}
    </aside>
  );
}
