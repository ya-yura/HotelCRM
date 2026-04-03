import { useEffect, useMemo, useState } from "react";
import type {
  ComplianceDataset,
  ComplianceDocument,
  ComplianceReadiness,
  ComplianceSubmission
} from "@hotel-crm/shared/compliance";
import {
  listComplianceSubmissionsRequest,
  loadReservationComplianceDatasetsRequest,
  loadReservationComplianceDocumentsRequest,
  loadReservationComplianceReadinessRequest,
  prepareReservationComplianceRequest,
  retryComplianceSubmissionRequest,
  submitComplianceSubmissionRequest
} from "../lib/api";
import {
  complianceDocumentKindLabel,
  complianceKindLabel,
  complianceSeverityLabel,
  complianceSubmissionStatusLabel,
  formatDateLabel,
  reservationStatusLabel,
  roomShortLabel
} from "../lib/ru";
import { useHotelStore } from "../state/hotelStore";

export function CompliancePage() {
  const { reservations } = useHotelStore();
  const operationalReservations = useMemo(
    () => reservations.filter((item) => !["cancelled", "no_show"].includes(item.status)),
    [reservations]
  );
  const [selectedReservationId, setSelectedReservationId] = useState(operationalReservations[0]?.id ?? "");
  const [allSubmissions, setAllSubmissions] = useState<ComplianceSubmission[]>([]);
  const [reservationSubmissions, setReservationSubmissions] = useState<ComplianceSubmission[]>([]);
  const [readiness, setReadiness] = useState<ComplianceReadiness | null>(null);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [datasets, setDatasets] = useState<ComplianceDataset[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedReservationId && operationalReservations[0]?.id) {
      setSelectedReservationId(operationalReservations[0].id);
    }
  }, [operationalReservations, selectedReservationId]);

  useEffect(() => {
    void listComplianceSubmissionsRequest()
      .then((items) => setAllSubmissions(items))
      .catch(() => setAllSubmissions([]));
  }, []);

  useEffect(() => {
    if (!selectedReservationId) {
      setReadiness(null);
      setReservationSubmissions([]);
      setDocuments([]);
      setDatasets([]);
      return;
    }

    void Promise.all([
      loadReservationComplianceReadinessRequest(selectedReservationId),
      listComplianceSubmissionsRequest(selectedReservationId)
    ])
      .then(([nextReadiness, nextSubmissions]) => {
        setReadiness(nextReadiness);
        setReservationSubmissions(nextSubmissions);
        setDocuments([]);
        setDatasets([]);
      })
      .catch(() => {
        setReadiness(null);
        setReservationSubmissions([]);
      });
  }, [selectedReservationId]);

  const selectedReservation = operationalReservations.find((item) => item.id === selectedReservationId) ?? null;
  const readyCount = allSubmissions.filter((item) => item.status === "ready" || item.status === "corrected").length;
  const failedCount = allSubmissions.filter((item) => item.status === "failed").length;
  const submittedCount = allSubmissions.filter((item) => item.status === "submitted").length;

  async function refreshSelected(reservationId: string) {
    const [nextAll, nextReadiness, nextSubmissions] = await Promise.all([
      listComplianceSubmissionsRequest(),
      loadReservationComplianceReadinessRequest(reservationId),
      listComplianceSubmissionsRequest(reservationId)
    ]);
    setAllSubmissions(nextAll);
    setReadiness(nextReadiness);
    setReservationSubmissions(nextSubmissions);
  }

  async function handlePrepare() {
    if (!selectedReservationId) {
      return;
    }
    try {
      await prepareReservationComplianceRequest(selectedReservationId);
      await refreshSelected(selectedReservationId);
      setMessage("Пакет комплаенса подготовлен.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось подготовить пакет.");
    }
  }

  async function handleSubmit(submissionId: string, retry = false) {
    if (!selectedReservationId) {
      return;
    }
    try {
      if (retry) {
        await retryComplianceSubmissionRequest(submissionId);
      } else {
        await submitComplianceSubmissionRequest(submissionId);
      }
      await refreshSelected(selectedReservationId);
      setMessage(retry ? "Повторная отправка выполнена." : "Отправка выполнена.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось отправить пакет.");
    }
  }

  async function handleLoadDocsAndDatasets() {
    if (!selectedReservationId) {
      return;
    }
    try {
      const [nextDocuments, nextDatasets] = await Promise.all([
        loadReservationComplianceDocumentsRequest(selectedReservationId),
        loadReservationComplianceDatasetsRequest(selectedReservationId)
      ]);
      setDocuments(nextDocuments);
      setDatasets(nextDatasets);
      setMessage("Документы и датасеты обновлены.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось загрузить документы.");
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Комплаенс</p>
        <h2>МВД, Росстат и печатные формы</h2>
        <p className="muted">Здесь видно, что готово к check-in, что уже отправлено и где нужна ручная правка.</p>
        {message ? <p className="muted">{message}</p> : null}
      </section>

      <section className="grid">
        <article className="panel">
          <p className="eyebrow">Очередь</p>
          <h3>{readyCount}</h3>
          <p className="muted">готово к отправке</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Ошибки</p>
          <h3>{failedCount}</h3>
          <p className="muted">нужно повторить или исправить</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Отправлено</p>
          <h3>{submittedCount}</h3>
          <p className="muted">успешных пакетов</p>
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">Бронь</p>
        <div className="form-grid">
          <label>
            <span>Выберите бронь</span>
            <select
              value={selectedReservationId}
              onChange={(event) => setSelectedReservationId(event.target.value)}
            >
              {operationalReservations.map((reservation) => (
                <option key={reservation.id} value={reservation.id}>
                  {reservation.guestName} • {formatDateLabel(reservation.checkInDate)} • {roomShortLabel(reservation.roomLabel)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedReservation ? (
          <p className="muted">
            {reservationStatusLabel(selectedReservation.status)} • {selectedReservation.id} • {roomShortLabel(selectedReservation.roomLabel)}
          </p>
        ) : null}
        <div className="status-actions">
          <button className="secondary-button" type="button" onClick={() => void handlePrepare()}>
            Подготовить пакет
          </button>
          <button className="secondary-button" type="button" onClick={() => void handleLoadDocsAndDatasets()}>
            Обновить документы и датасеты
          </button>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Готовность</p>
        <h3>{readiness?.complianceReady ? "Можно заселять" : "Перед check-in нужно исправить данные"}</h3>
        <p className="muted">Профиль гостя: {readiness?.guestProfileComplete ? "полный" : "неполный"}</p>
        {readiness?.issues.length ? (
          <div className="screen">
            {readiness.issues.map((issue) => (
              <article className="panel inset-panel" key={`${issue.field}-${issue.message}`}>
                <p className="eyebrow">{complianceSeverityLabel(issue.severity)}</p>
                <h3>{issue.field}</h3>
                <p className="muted">{issue.message}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Ошибок нет, пакет можно готовить и отправлять.</p>
        )}
      </section>

      {reservationSubmissions.length > 0 ? (
        <section className="screen">
          {reservationSubmissions.map((submission) => (
            <article className="panel" key={submission.id}>
              <p className="eyebrow">
                {complianceKindLabel(submission.kind)} • {complianceSubmissionStatusLabel(submission.status)}
              </p>
              <h3>{submission.provider}</h3>
              <p className="muted">Попыток: {submission.attemptCount} • Последняя: {submission.lastAttemptAt ?? "не было"}</p>
              <p className="muted">{submission.errorMessage || "Ошибок нет"}</p>
              <div className="status-actions">
                {submission.status === "ready" || submission.status === "corrected" ? (
                  <button className="secondary-button" type="button" onClick={() => void handleSubmit(submission.id)}>
                    Отправить
                  </button>
                ) : null}
                {submission.status === "failed" ? (
                  <button className="secondary-button" type="button" onClick={() => void handleSubmit(submission.id, true)}>
                    Повторить
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {documents.length > 0 ? (
        <section className="screen">
          {documents.map((document) => (
            <article className="panel" key={document.fileName}>
              <p className="eyebrow">{complianceDocumentKindLabel(document.kind)}</p>
              <h3>{document.title}</h3>
              <p className="muted">{document.fileName}</p>
              <div dangerouslySetInnerHTML={{ __html: document.content }} />
            </article>
          ))}
        </section>
      ) : null}

      {datasets.length > 0 ? (
        <section className="screen">
          {datasets.map((dataset) => (
            <article className="panel" key={`${dataset.kind}-${dataset.generatedAt}`}>
              <p className="eyebrow">{dataset.kind}</p>
              <h3>{dataset.generatedAt}</h3>
              <p className="muted">Колонки: {dataset.columns.join(", ")}</p>
              <div className="screen">
                {dataset.rows.slice(0, 3).map((row, index) => (
                  <article className="panel inset-panel" key={`${dataset.kind}-${index}`}>
                    <p className="muted">{Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(" • ")}</p>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
