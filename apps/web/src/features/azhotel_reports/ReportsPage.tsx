import { useEffect, useMemo, useState } from "react";
import type { AzReportSummary } from "@hotel-crm/shared/features/azhotel_core";
import { downloadAzReportCsvRequest, loadAzReportRequest } from "../../lib/api";

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

export function ReportsPage() {
  const [filters, setFilters] = useState(defaultPeriod());
  const [report, setReport] = useState<AzReportSummary | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const maxRevenue = useMemo(
    () => Math.max(...(report?.series.map((point) => point.revenue) ?? [1])),
    [report]
  );

  async function loadData(nextFilters = filters) {
    setIsLoading(true);
    setError("");
    try {
      setReport(await loadAzReportRequest(nextFilters));
    } catch (cause) {
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
      const csv = await downloadAzReportCsvRequest(filters);
      downloadTextFile(`shahmatka-report-${filters.from}-${filters.to}.csv`, csv, "text/csv;charset=utf-8");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выгрузить CSV");
    }
  }

  async function exportPdf() {
    if (!report) {
      return;
    }

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      unit: "pt",
      format: "a4"
    });

    let y = 40;
    pdf.setFontSize(18);
    pdf.text("Шахматка: месячный отчёт", 40, y);
    y += 24;
    pdf.setFontSize(11);
    pdf.text(`Период: ${report.from} - ${report.to}`, 40, y);
    y += 20;
    pdf.text(`Выручка: ${report.totalRevenue}`, 40, y);
    y += 16;
    pdf.text(`Бронирования: ${report.totalBookings}`, 40, y);
    y += 16;
    pdf.text(`Средняя загрузка: ${report.avgOccupancyRate}%`, 40, y);
    y += 16;
    pdf.text(`ADR: ${report.adr}`, 40, y);
    y += 24;
    pdf.setFontSize(13);
    pdf.text("Дни периода", 40, y);
    y += 18;
    pdf.setFontSize(10);

    for (const point of report.series.slice(0, 20)) {
      pdf.text(
        `${point.date} | брони ${point.bookings} | загрузка ${point.occupancyRate}% | выручка ${point.revenue}`,
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
    for (const channel of report.channels) {
      pdf.text(`${channel.channel}: ${channel.bookings} броней, ${channel.revenue}`, 40, y);
      y += 14;
      if (y > 780) {
        pdf.addPage();
        y = 40;
      }
    }

    pdf.save(`shahmatka-report-${report.from}-${report.to}.pdf`);
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Отчёты</p>
        <h2>Статистика и выручка</h2>
        <p className="muted">Смотрите загрузку, выручку и бронирования по периоду, а затем выгружайте отчёт в CSV или PDF.</p>
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
            <button className="secondary-button" type="button" onClick={exportPdf}>PDF</button>
          </div>
        </form>
      </section>

      {error ? (
        <section className="panel">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="panel">
          <p className="muted">Считаем отчёт...</p>
        </section>
      ) : null}

      {report ? (
        <>
          <section className="grid">
            <article className="card tone-success">
              <p className="card-title">Выручка</p>
              <strong className="card-value">{report.totalRevenue}</strong>
            </article>
            <article className="card tone-info">
              <p className="card-title">Брони</p>
              <strong className="card-value">{report.totalBookings}</strong>
            </article>
            <article className="card tone-warning">
              <p className="card-title">Средняя загрузка</p>
              <strong className="card-value">{report.avgOccupancyRate}%</strong>
            </article>
            <article className="card tone-danger">
              <p className="card-title">ADR</p>
              <strong className="card-value">{report.adr}</strong>
            </article>
          </section>

          <section className="panel">
            <p className="eyebrow">График загрузки</p>
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
            <p className="eyebrow">График выручки</p>
            <div className="report-chart">
              {report.series.map((point) => (
                <div className="report-bar-row" key={`rev_${point.date}`}>
                  <div className="report-bar-label">{point.date}</div>
                  <div className="report-bar-track">
                    <div
                      className="report-bar-fill success"
                      style={{ width: `${Math.max(Math.round((point.revenue / Math.max(maxRevenue, 1)) * 100), 2)}%` }}
                    />
                  </div>
                  <div className="report-bar-value">{point.revenue}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">Каналы продаж</p>
            <div className="screen compact-stack">
              {report.channels.length === 0 ? (
                <p className="muted">За этот период каналов пока нет.</p>
              ) : null}
              {report.channels.map((channel) => (
                <div className="panel inset-panel" key={channel.channel}>
                  <h3>{channel.channel}</h3>
                  <p className="muted">Броней: {channel.bookings}</p>
                  <p className="muted">Выручка: {channel.revenue}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

