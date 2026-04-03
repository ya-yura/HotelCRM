import { useEffect, useMemo, useState } from "react";
import {
  buildManagementReportCsv,
  buildManagementReportSummary,
  type ManagementReportSummary
} from "@hotel-crm/shared/management";
import {
  downloadManagementReportCsvRequest,
  loadManagementReportRequest
} from "../lib/api";
import { useHotelStore } from "../state/hotelStore";

function defaultPeriod() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(value);
}

export function ManagementReportsPage() {
  const {
    reservations,
    rooms,
    housekeepingTasks,
    maintenanceIncidents,
    folios,
    payments,
    complianceSubmissions
  } = useHotelStore();
  const [filters, setFilters] = useState(defaultPeriod());
  const [remoteReport, setRemoteReport] = useState<ManagementReportSummary | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const localReport = useMemo(
    () =>
      buildManagementReportSummary({
        reservations,
        rooms,
        housekeepingTasks,
        maintenanceIncidents,
        folios,
        payments,
        complianceSubmissions,
        range: filters,
        sourceMode: "cached"
      }),
    [complianceSubmissions, filters, folios, housekeepingTasks, maintenanceIncidents, payments, reservations, rooms]
  );

  const report = remoteReport ?? localReport;
  const usingCachedSummary = !remoteReport || remoteReport.sourceMode === "cached";
  const maxRevenue = useMemo(
    () => Math.max(...report.series.map((point) => Math.max(point.bookedRevenue, point.cashCollected)), 1),
    [report]
  );

  async function loadData(nextFilters = filters) {
    setIsLoading(true);
    setError("");
    try {
      setRemoteReport(await loadManagementReportRequest(nextFilters));
    } catch (cause) {
      setRemoteReport(null);
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить отчёт");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData(filters);
  }, []);

  async function exportCsv() {
    try {
      const csv = await downloadManagementReportCsvRequest(filters);
      downloadTextFile(`hotel-management-report-${filters.from}-${filters.to}.csv`, csv, "text/csv;charset=utf-8");
    } catch {
      downloadTextFile(
        `hotel-management-report-${filters.from}-${filters.to}.csv`,
        buildManagementReportCsv(report),
        "text/csv;charset=utf-8"
      );
    }
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      unit: "pt",
      format: "a4"
    });

    let y = 40;
    pdf.setFontSize(18);
    pdf.text("HotelCRM: управленческий отчёт", 40, y);
    y += 22;
    pdf.setFontSize(11);
    pdf.text(`Период: ${report.range.from} - ${report.range.to}`, 40, y);
    y += 16;
    pdf.text(`Средняя загрузка: ${report.avgOccupancyRate}%`, 40, y);
    y += 16;
    pdf.text(`Выручка по бронированиям: ${formatCurrency(report.cash.bookedRevenueTotal)} ₽`, 40, y);
    y += 16;
    pdf.text(`Собрано денег: ${formatCurrency(report.cash.cashCollectedTotal)} ₽`, 40, y);
    y += 16;
    pdf.text(`Долг: ${formatCurrency(report.cash.outstandingBalanceTotal)} ₽`, 40, y);
    y += 24;
    pdf.setFontSize(13);
    pdf.text("Дневная динамика", 40, y);
    y += 18;
    pdf.setFontSize(10);

    for (const point of report.series.slice(0, 20)) {
      pdf.text(
        `${point.date} | загрузка ${point.occupancyRate}% | бронь-выручка ${point.bookedRevenue} | cash ${point.cashCollected}`,
        40,
        y
      );
      y += 14;
      if (y > 780) {
        pdf.addPage();
        y = 40;
      }
    }

    y += 10;
    pdf.setFontSize(13);
    pdf.text("Каналы", 40, y);
    y += 18;
    pdf.setFontSize(10);
    for (const channel of report.sourceMix) {
      pdf.text(
        `${channel.source}: ${channel.reservations} броней, ${formatCurrency(channel.bookedRevenue)} ₽, доля ${channel.sharePercent}%`,
        40,
        y
      );
      y += 14;
      if (y > 780) {
        pdf.addPage();
        y = 40;
      }
    }

    pdf.save(`hotel-management-report-${report.range.from}-${report.range.to}.pdf`);
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Управленческие отчёты</p>
        <h2>Загрузка, выручка, долги и операционка в одном отчёте</h2>
        <p className="muted">
          Здесь цифры считаются от бронирований, номерного фонда, folio и платежей, поэтому ими можно пользоваться для ежедневных решений.
        </p>
      </section>

      <section className="panel">
        <form
          className="form-grid az-inline-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void loadData(filters);
          }}
        >
          <label>
            <span>С даты</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            />
          </label>
          <label>
            <span>По дату</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            />
          </label>
          <div className="status-actions">
            <button className="primary-button" type="submit">Показать</button>
            <button className="secondary-button" type="button" onClick={() => void exportCsv()}>CSV</button>
            <button className="secondary-button" type="button" onClick={() => void exportPdf()}>PDF</button>
          </div>
        </form>
      </section>

      {usingCachedSummary ? (
        <section className="panel tone-warning">
          <p className="eyebrow">Локальный fallback</p>
          <h3>Часть управленческой аналитики показана из локального или кешированного состояния.</h3>
          <p className="muted">
            Это лучше, чем пустой экран: отчёт всё равно строится из последних известных бронирований, номеров, folio и платежей.
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="panel">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="panel">
          <p className="muted">Собираем отчёт...</p>
        </section>
      ) : null}

      <section className="grid">
        <article className="card tone-success">
          <p className="card-title">Выручка по бронированиям</p>
          <strong className="card-value">{formatCurrency(report.cash.bookedRevenueTotal)} ₽</strong>
        </article>
        <article className="card tone-info">
          <p className="card-title">Собрано денег</p>
          <strong className="card-value">{formatCurrency(report.cash.cashCollectedTotal)} ₽</strong>
        </article>
        <article className="card tone-warning">
          <p className="card-title">Средняя загрузка</p>
          <strong className="card-value">{report.avgOccupancyRate}%</strong>
        </article>
        <article className="card tone-danger">
          <p className="card-title">Долг</p>
          <strong className="card-value">{formatCurrency(report.cash.outstandingBalanceTotal)} ₽</strong>
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">Операционные показатели</p>
        <div className="management-kpi-grid">
          <div className="management-kpi-cell">
            <span className="muted">ADR</span>
            <strong>{formatCurrency(report.metrics.adr)} ₽</strong>
          </div>
          <div className="management-kpi-cell">
            <span className="muted">RevPAR</span>
            <strong>{formatCurrency(report.metrics.revpar)} ₽</strong>
          </div>
          <div className="management-kpi-cell">
            <span className="muted">Неоплаченные проживания</span>
            <strong>{report.metrics.unpaidStays}</strong>
          </div>
          <div className="management-kpi-cell">
            <span className="muted">Грязные / заблокированные</span>
            <strong>{report.metrics.dirtyRooms} / {report.metrics.blockedRooms}</strong>
          </div>
          <div className="management-kpi-cell">
            <span className="muted">Отмены / no-show</span>
            <strong>{report.cancellationCount} / {report.noShowCount}</strong>
          </div>
          <div className="management-kpi-cell">
            <span className="muted">Прямые / OTA</span>
            <strong>{report.metrics.directShare}% / {report.metrics.otaShare}%</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Загрузка по дням</p>
        <div className="report-chart">
          {report.series.map((point) => (
            <div className="report-bar-row" key={`occ_${point.date}`}>
              <div className="report-bar-label">{point.date}</div>
              <div className="report-bar-track">
                <div className="report-bar-fill info" style={{ width: `${Math.max(point.occupancyRate, 2)}%` }} />
              </div>
              <div className="report-bar-value">{point.occupancyRate}%</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Выручка и cash</p>
        <div className="report-chart">
          {report.series.map((point) => (
            <div className="report-dual-row" key={`rev_${point.date}`}>
              <div className="report-bar-label">{point.date}</div>
              <div className="report-dual-bars">
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill success"
                    style={{ width: `${Math.max(Math.round((point.bookedRevenue / maxRevenue) * 100), 2)}%` }}
                  />
                </div>
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill warning"
                    style={{ width: `${Math.max(Math.round((point.cashCollected / maxRevenue) * 100), 2)}%` }}
                  />
                </div>
              </div>
              <div className="report-bar-value">
                {formatCurrency(point.bookedRevenue)} / {formatCurrency(point.cashCollected)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="management-two-column">
        <article className="panel">
          <p className="eyebrow">Отчёт по долгам</p>
          <div className="compact-stack">
            {report.debts.length === 0 ? <p className="muted">Долгов по бронированиям нет.</p> : null}
            {report.debts.slice(0, 8).map((debt) => (
              <div className="panel inset-panel" key={debt.reservationId}>
                <h3>{debt.guestName}</h3>
                <p className="muted">{debt.source} • {debt.checkInDate} - {debt.checkOutDate}</p>
                <strong>{formatCurrency(debt.balanceDue)} ₽</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Отчёт по каналам</p>
          <div className="compact-stack">
            {report.sourceMix.map((source) => (
              <div className="source-mix-row" key={source.source}>
                <div>
                  <strong>{source.source}</strong>
                  <p className="muted">{source.reservations} броней • {source.nights} ночей</p>
                </div>
                <div className="source-mix-metrics">
                  <span>{formatCurrency(source.bookedRevenue)} ₽</span>
                  <span>{source.sharePercent}%</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="management-two-column">
        <article className="panel">
          <p className="eyebrow">Housekeeping productivity</p>
          <div className="management-kpi-grid">
            <div className="management-kpi-cell"><span className="muted">Открытые задачи</span><strong>{report.housekeeping.openTasks}</strong></div>
            <div className="management-kpi-cell"><span className="muted">Проверка ждёт</span><strong>{report.housekeeping.inspectionRequested}</strong></div>
            <div className="management-kpi-cell"><span className="muted">Проблемы</span><strong>{report.housekeeping.problemReported}</strong></div>
            <div className="management-kpi-cell"><span className="muted">Выполнено сегодня</span><strong>{report.housekeeping.completedToday}</strong></div>
            <div className="management-kpi-cell"><span className="muted">Техинциденты</span><strong>{report.housekeeping.openIncidents}</strong></div>
            <div className="management-kpi-cell"><span className="muted">Блокировка фонда</span><strong>{report.housekeeping.blockedRooms}</strong></div>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Платежи и комплаенс</p>
          <div className="compact-stack">
            {report.paymentMethods.map((method) => (
              <div className="source-mix-row" key={method.method}>
                <div>
                  <strong>{method.method}</strong>
                  <p className="muted">{method.count} операций</p>
                </div>
                <div className="source-mix-metrics">
                  <span>{formatCurrency(method.amount)} ₽</span>
                </div>
              </div>
            ))}
            <div className="management-kpi-grid">
              <div className="management-kpi-cell"><span className="muted">Draft</span><strong>{report.compliance.draft}</strong></div>
              <div className="management-kpi-cell"><span className="muted">Ready</span><strong>{report.compliance.ready}</strong></div>
              <div className="management-kpi-cell"><span className="muted">Submitted</span><strong>{report.compliance.submitted}</strong></div>
              <div className="management-kpi-cell"><span className="muted">Failed</span><strong>{report.compliance.failed}</strong></div>
            </div>
          </div>
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">Примечания к расчёту</p>
        <div className="compact-stack">
          {report.notes.map((note) => (
            <p className="muted" key={note}>{note}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
