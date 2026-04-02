type SyncBannerProps = {
  queuedCount: number;
  failedCount: number;
  conflictCount: number;
  onRetryFailed: () => void;
};

export function SyncBanner({
  queuedCount,
  failedCount,
  conflictCount,
  onRetryFailed
}: SyncBannerProps) {
  const toneClass = conflictCount > 0 ? "tone-danger" : queuedCount > 0 ? "tone-warning" : "tone-success";
  const message =
    conflictCount > 0
      ? `${conflictCount} конфликт${conflictCount > 1 ? "а" : ""} требуют внимания`
      : queuedCount > 0
        ? `${queuedCount} изменени${queuedCount > 1 ? "я ждут" : "е ждёт"} синхронизации`
        : "Все локальные изменения синхронизированы";

  return (
    <section className={`panel sync-banner ${toneClass}`}>
      <p className="eyebrow">Состояние синхронизации</p>
      <h3>{message}</h3>
      <p className="muted">Даже если связь плохая, с системой можно продолжать работать.</p>
      <div className="status-actions">
        {failedCount > 0 ? (
          <button className="secondary-button" type="button" onClick={onRetryFailed}>
            Повторить ({failedCount})
          </button>
        ) : null}
        {conflictCount > 0 ? (
          <a className="secondary-link" href="#conflict-inbox">
            Открыть конфликты
          </a>
        ) : null}
      </div>
    </section>
  );
}
