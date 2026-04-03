type SyncBannerProps = {
  isOnline: boolean;
  queuedCount: number;
  retryingCount: number;
  failedCount: number;
  conflictCount: number;
  onRetryFailed: () => void;
};

export function SyncBanner({
  isOnline,
  queuedCount,
  retryingCount,
  failedCount,
  conflictCount,
  onRetryFailed
}: SyncBannerProps) {
  const toneClass = !isOnline
    ? "tone-warning"
    : conflictCount > 0
      ? "tone-danger"
      : queuedCount > 0 || retryingCount > 0
        ? "tone-warning"
        : "tone-success";
  const message =
    !isOnline
      ? "Устройство офлайн, изменения копятся локально"
      : conflictCount > 0
      ? `${conflictCount} конфликт${conflictCount > 1 ? "а" : ""} требуют внимания`
      : retryingCount > 0
        ? `${retryingCount} изменени${retryingCount > 1 ? "я повторно отправляются" : "е повторно отправляется"}`
        : queuedCount > 0
        ? `${queuedCount} изменени${queuedCount > 1 ? "я ждут" : "е ждёт"} синхронизации`
        : "Все локальные изменения синхронизированы";

  return (
    <section className={`panel sync-banner ${toneClass}`}>
      <p className="eyebrow">Состояние синхронизации</p>
      <h3>{message}</h3>
      <p className="muted">
        {isOnline
          ? "Даже если связь плохая, с системой можно продолжать работать."
          : "Можно продолжать работать без сети: очередь отправится автоматически после восстановления соединения."}
      </p>
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
