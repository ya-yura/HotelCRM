import { useEffect, useMemo, useState } from "react";
import type {
  AzChannelBookingIngest,
  AzChannelDashboard,
  AzChannelName,
  AzDirectQuote
} from "@hotel-crm/shared/features/azhotel_core";
import {
  createDirectProvisionalPublic,
  createDirectQuotePublic,
  confirmDirectReservationPublic,
  ingestAzChannelBookingRequest,
  loadAzChannelManagerRequest,
  requestDirectAvailabilityPublic,
  syncAzBookingsRequest,
  syncAzInventoryRequest,
  syncAzPricesRequest
} from "../../lib/api";
import { useAuth } from "../../state/authStore";
import { channelLabel, syncStatusLabel } from "./channelLabels";

const defaultIngestForm: AzChannelBookingIngest = {
  channel: "booking_com",
  externalBookingId: `manual_${Date.now()}`,
  roomTypeId: "double",
  guestName: "Новый OTA гость",
  guestPhone: "",
  guestEmail: "",
  checkInDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  checkOutDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  totalAmount: 8400,
  adultCount: 2,
  childCount: 0,
  commissionRate: 0.15,
  partnerName: "",
  status: "confirmed"
};

export function ChannelManagerPage() {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState<AzChannelDashboard | null>(null);
  const [mockInfo, setMockInfo] = useState<{ today: string; providers: AzChannelName[]; bookingComApi: string; plannedRealIntegration: string } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [ingestForm, setIngestForm] = useState<AzChannelBookingIngest>(defaultIngestForm);
  const [directSearch, setDirectSearch] = useState({
    checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    checkOutDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    roomTypeId: "double"
  });
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [quote, setQuote] = useState<AzDirectQuote | null>(null);
  const [provisional, setProvisional] = useState<{
    reservationId: string;
    status: "pending_confirmation" | "confirmed";
    totalAmount: number;
    balanceDue: number;
    paymentLinkId: string | null;
    paymentLinkUrl: string | null;
    expiresAt: string | null;
    source: "direct";
  } | null>(null);

  const roomTypeOptions = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    const mapped = dashboard.roomTypeMappings.map((item) => ({
      id: item.roomTypeId,
      label: item.roomTypeLabel
    }));

    const unique = new Map<string, string>();
    mapped.forEach((item) => unique.set(item.id, item.label));
    dashboard.rooms.forEach((room) => {
      const normalized = room.roomType.trim().toLowerCase().replaceAll(/\s+/g, "_");
      if (!unique.has(normalized)) {
        unique.set(normalized, room.roomType);
      }
    });
    return [...unique.entries()].map(([id, label]) => ({ id, label }));
  }, [dashboard]);

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const result = await loadAzChannelManagerRequest();
      setDashboard(result.dashboard);
      setMockInfo(result.mock);
      if (result.dashboard.roomTypeMappings[0] && !roomTypeOptions.length) {
        const first = result.dashboard.roomTypeMappings[0];
        setIngestForm((current) => ({ ...current, roomTypeId: first.roomTypeId }));
        setDirectSearch((current) => ({ ...current, roomTypeId: first.roomTypeId }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить каналы продаж");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function syncAll(action: "inventory" | "prices" | "bookings") {
    setMessage("");
    setError("");
    try {
      const result =
        action === "inventory"
          ? await syncAzInventoryRequest()
          : action === "prices"
            ? await syncAzPricesRequest()
            : await syncAzBookingsRequest();
      setMessage(
        `${action === "inventory" ? "Инвентарь" : action === "prices" ? "Цены" : "OTA-бронирования"} обработаны: единиц ${result.processedRooms}, каналов ${result.processedChannels}.`
      );
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выполнить синхронизацию");
    }
  }

  async function syncRoom(roomId: string, channel: AzChannelName, action: "inventory" | "prices") {
    setMessage("");
    setError("");
    try {
      if (action === "inventory") {
        await syncAzInventoryRequest({ roomId, channel });
      } else {
        await syncAzPricesRequest({ roomId, channel });
      }
      setMessage(`${action === "inventory" ? "Инвентарь" : "Цены"} отправлены в ${channelLabel(channel)}.`);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить площадку");
    }
  }

  async function ingestBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const reservation = await ingestAzChannelBookingRequest(ingestForm);
      setMessage(`Входящая бронь создана: ${reservation.guestName} / ${reservation.id}.`);
      setIngestForm({
        ...defaultIngestForm,
        roomTypeId: ingestForm.roomTypeId,
        externalBookingId: `manual_${Date.now()}`
      });
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось импортировать OTA-бронь");
    }
  }

  async function runDirectQuote() {
    if (!session?.propertyId) {
      return;
    }
    setAvailabilityMessage("");
    setError("");
    try {
      const availability = await requestDirectAvailabilityPublic(session.propertyId, {
        checkInDate: directSearch.checkInDate,
        checkOutDate: directSearch.checkOutDate,
        adults: 2,
        children: 0,
        roomTypeId: directSearch.roomTypeId,
        promoCode: ""
      });
      const firstOption = availability.options.find((item) => item.roomTypeId === directSearch.roomTypeId) ?? availability.options[0];
      if (!firstOption) {
        setQuote(null);
        setAvailabilityMessage("По выбранным датам нет доступных квот.");
        return;
      }

      const nextQuote = await createDirectQuotePublic(session.propertyId, {
        checkInDate: directSearch.checkInDate,
        checkOutDate: directSearch.checkOutDate,
        adults: 2,
        children: 0,
        roomTypeId: firstOption.roomTypeId,
        promoCode: ""
      });
      setQuote(nextQuote);
      setAvailabilityMessage(`Найдена квота по типу ${firstOption.roomTypeLabel}: ${firstOption.availableUnits} ед.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось получить direct quote");
    }
  }

  async function createProvisional() {
    if (!session?.propertyId || !quote) {
      return;
    }
    setError("");
    try {
      const result = await createDirectProvisionalPublic(session.propertyId, {
        quoteId: quote.id,
        guestName: "Гость direct sales",
        guestPhone: "+79990001122",
        guestEmail: "direct@example.com",
        notes: "Created from channel manager direct-sales lab"
      });
      setProvisional(result);
      setMessage(`Создано временное прямое бронирование ${result.reservationId}.`);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать provisional booking");
    }
  }

  async function confirmProvisional() {
    if (!session?.propertyId || !provisional) {
      return;
    }
    setError("");
    try {
      const result = await confirmDirectReservationPublic(session.propertyId, provisional.reservationId);
      setProvisional(result);
      setMessage(`Прямое бронирование ${result.reservationId} подтверждено.`);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось подтвердить прямое бронирование");
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Дистрибуция</p>
        <h2>Channel manager, direct sales и защита от overbooking</h2>
        <p className="muted">
          Контур держит цены и доступность согласованными, импортирует OTA-бронирования в основную модель резерваций и даёт базовый public booking flow для прямых продаж.
        </p>
        <div className="status-actions">
          <button className="primary-button" type="button" onClick={() => void syncAll("inventory")}>
            Push inventory
          </button>
          <button className="secondary-button" type="button" onClick={() => void syncAll("prices")}>
            Push rates
          </button>
          <button className="secondary-button" type="button" onClick={() => void syncAll("bookings")}>
            Pull bookings
          </button>
        </div>
      </section>

      {dashboard ? (
        <section className="grid">
          <article className="card tone-success">
            <p className="card-title">Доля direct</p>
            <strong className="card-value">{dashboard.directBookingSummary.directShareRevenue}%</strong>
            <p className="card-detail">Выручка без OTA-комиссий</p>
          </article>
          <article className="card tone-warning">
            <p className="card-title">Pending payment links</p>
            <strong className="card-value">{dashboard.directBookingSummary.pendingPaymentLinks}</strong>
            <p className="card-detail">Прямые оплаты ждут подтверждения</p>
          </article>
          <article className="card tone-info">
            <p className="card-title">Временные direct reservations</p>
            <strong className="card-value">{dashboard.directBookingSummary.provisionalReservations}</strong>
            <p className="card-detail">Уже держат квоту и защищают от overbooking</p>
          </article>
        </section>
      ) : null}

      {mockInfo ? (
        <section className="panel">
          <p className="eyebrow">Adapter foundation</p>
          <p className="muted">Сегодня: {mockInfo.today}</p>
          <p className="muted">Провайдеры: {mockInfo.providers.map((item) => channelLabel(item)).join(", ")}</p>
          <p className="muted">Bridge: {mockInfo.bookingComApi}</p>
          <p className="muted">Next real integration: {mockInfo.plannedRealIntegration}</p>
        </section>
      ) : null}

      {error ? (
        <section className="panel">
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {message ? (
        <section className="panel">
          <p className="muted">{message}</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="panel">
          <p className="muted">Загружаем дистрибуцию...</p>
        </section>
      ) : null}

      {dashboard ? (
        <>
          <section className="panel">
            <p className="eyebrow">Source analytics</p>
            <div className="screen compact-stack">
              {dashboard.sourceMetrics.map((metric) => (
                <div className="inset-panel" key={metric.source}>
                  <p className="eyebrow">{metric.source}</p>
                  <p className="muted">
                    Бронирований: {metric.reservations} • выручка: {metric.revenue} • комиссия: {metric.commissionCost}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">Accounts and mappings</p>
            <div className="screen compact-stack">
              {dashboard.accounts.map((account) => (
                <div className="inset-panel" key={account.id}>
                  <p className="eyebrow">{channelLabel(account.channel)}</p>
                  <p className="muted">
                    {account.title} • {account.status} • комиссия {Math.round(account.defaultCommissionRate * 100)}%
                  </p>
                  <p className="muted">{account.credentialsMask}</p>
                </div>
              ))}
              {dashboard.roomTypeMappings.map((mapping) => (
                <div className="inset-panel" key={mapping.id}>
                  <p className="eyebrow">{mapping.roomTypeLabel}</p>
                  <p className="muted">
                    {channelLabel(mapping.channel)} • {mapping.externalRoomTypeName} • units {mapping.unitCount}
                  </p>
                </div>
              ))}
              {dashboard.ratePlanMappings.map((mapping) => (
                <div className="inset-panel" key={mapping.id}>
                  <p className="eyebrow">{mapping.ratePlanName}</p>
                  <p className="muted">
                    {channelLabel(mapping.channel)} • {mapping.roomTypeId} • base rate {mapping.baseRate}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">Inbound OTA ingest</p>
            <form className="form-grid" onSubmit={(event) => void ingestBooking(event)}>
              <label>
                <span>Канал</span>
                <select
                  value={ingestForm.channel}
                  onChange={(event) =>
                    setIngestForm((current) => ({
                      ...current,
                      channel: event.target.value as AzChannelName
                    }))
                  }
                >
                  <option value="booking_com">Booking.com</option>
                  <option value="ostrovok">Ostrovok</option>
                  <option value="yandex_travel">Yandex Travel</option>
                </select>
              </label>
              <label>
                <span>External booking ID</span>
                <input
                  value={ingestForm.externalBookingId}
                  onChange={(event) =>
                    setIngestForm((current) => ({ ...current, externalBookingId: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Тип номера</span>
                <select
                  value={ingestForm.roomTypeId}
                  onChange={(event) =>
                    setIngestForm((current) => ({ ...current, roomTypeId: event.target.value }))
                  }
                >
                  {roomTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Гость</span>
                <input
                  value={ingestForm.guestName}
                  onChange={(event) =>
                    setIngestForm((current) => ({ ...current, guestName: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Заезд</span>
                <input
                  type="date"
                  value={ingestForm.checkInDate}
                  onChange={(event) =>
                    setIngestForm((current) => ({ ...current, checkInDate: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Выезд</span>
                <input
                  type="date"
                  value={ingestForm.checkOutDate}
                  onChange={(event) =>
                    setIngestForm((current) => ({ ...current, checkOutDate: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Сумма</span>
                <input
                  type="number"
                  min="0"
                  value={ingestForm.totalAmount}
                  onChange={(event) =>
                    setIngestForm((current) => ({ ...current, totalAmount: Number(event.target.value) }))
                  }
                />
              </label>
              <label>
                <span>Комиссия</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={ingestForm.commissionRate}
                  onChange={(event) =>
                    setIngestForm((current) => ({ ...current, commissionRate: Number(event.target.value) }))
                  }
                />
              </label>
              <button className="primary-button" type="submit">
                Импортировать OTA-бронь
              </button>
            </form>
          </section>

          <section className="panel">
            <p className="eyebrow">Direct sales lab</p>
            <div className="form-grid">
              <label>
                <span>Заезд</span>
                <input
                  type="date"
                  value={directSearch.checkInDate}
                  onChange={(event) =>
                    setDirectSearch((current) => ({ ...current, checkInDate: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Выезд</span>
                <input
                  type="date"
                  value={directSearch.checkOutDate}
                  onChange={(event) =>
                    setDirectSearch((current) => ({ ...current, checkOutDate: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Тип номера</span>
                <select
                  value={directSearch.roomTypeId}
                  onChange={(event) =>
                    setDirectSearch((current) => ({ ...current, roomTypeId: event.target.value }))
                  }
                >
                  {roomTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondary-button" type="button" onClick={() => void runDirectQuote()}>
                Получить quote
              </button>
            </div>
            {availabilityMessage ? <p className="muted">{availabilityMessage}</p> : null}
            {quote ? (
              <div className="inset-panel">
                <p className="eyebrow">{quote.roomTypeLabel}</p>
                <p className="muted">
                  {quote.checkInDate} - {quote.checkOutDate} • {quote.totalAmount} • депозит {quote.depositAmount}
                </p>
                <p className="muted">Доступно квот: {quote.availableUnits} • expires {quote.expiresAt}</p>
                <div className="status-actions">
                  <button className="primary-button" type="button" onClick={() => void createProvisional()}>
                    Создать provisional
                  </button>
                  {provisional ? (
                    <button className="secondary-button" type="button" onClick={() => void confirmProvisional()}>
                      Confirm direct booking
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {provisional ? (
              <div className="inset-panel">
                <p className="eyebrow">Reservation {provisional.reservationId}</p>
                <p className="muted">
                  {provisional.status} • сумма {provisional.totalAmount} • долг {provisional.balanceDue}
                </p>
                {provisional.paymentLinkUrl ? (
                  <p className="muted">Payment link: {provisional.paymentLinkUrl}</p>
                ) : (
                  <p className="muted">Депозит не требуется</p>
                )}
              </div>
            ) : null}
          </section>

          <section className="panel">
            <p className="eyebrow">Task queue and message log</p>
            <div className="screen compact-stack">
              {dashboard.recentTasks.map((task) => (
                <div className="inset-panel" key={task.id}>
                  <p className="eyebrow">{channelLabel(task.channel)} • {task.action}</p>
                  <p className="muted">
                    {task.status} • items {task.processedItems} • {task.message}
                  </p>
                </div>
              ))}
              {dashboard.messageLog.map((log) => (
                <div className="inset-panel" key={log.id}>
                  <p className="eyebrow">{channelLabel(log.channel)} • {log.direction} • {log.type}</p>
                  <p className="muted">{log.payloadSummary}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="screen">
        {dashboard?.rooms.map((room) => (
          <article className="panel" key={room.roomId}>
            <p className="eyebrow">
              Номер {room.roomNumber} • {room.roomType}
            </p>
            <h3>{room.available ? "Доступен в продаже" : "Сейчас недоступен"}</h3>
            <p className="muted">
              Статус номера: {room.roomStatus} • Следующая доступность: {room.nextAvailableDate}
            </p>
            <p className="muted">Базовая цена на сегодня: {room.basePrice}</p>

            <div className="screen compact-stack">
              {room.channels.map((entry) => (
                <div className="panel inset-panel" key={`${room.roomId}_${entry.channel}`}>
                  <p className="eyebrow">{channelLabel(entry.channel)}</p>
                  <p className="muted">
                    Инвентарь: {syncStatusLabel(entry.inventoryStatus)}
                    {entry.inventorySyncedAt ? ` • ${entry.inventorySyncedAt}` : ""}
                  </p>
                  <p className="muted">
                    Цена: {syncStatusLabel(entry.priceStatus)}
                    {entry.priceSyncedAt ? ` • ${entry.priceSyncedAt}` : ""}
                  </p>
                  <div className="status-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => void syncRoom(room.roomId, entry.channel, "inventory")}
                    >
                      Инвентарь
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => void syncRoom(room.roomId, entry.channel, "prices")}
                    >
                      Цены
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
