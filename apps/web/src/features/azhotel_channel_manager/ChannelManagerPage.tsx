import { useEffect, useState } from "react";
import type { AzChannelDashboard, AzChannelName } from "@hotel-crm/shared/features/azhotel_core";
import {
  loadAzChannelManagerRequest,
  syncAzInventoryRequest,
  syncAzPricesRequest
} from "../../lib/api";
import { channelLabel, syncStatusLabel } from "./channelLabels";

export function ChannelManagerPage() {
  const [dashboard, setDashboard] = useState<AzChannelDashboard | null>(null);
  const [mockInfo, setMockInfo] = useState<{ today: string; bookingComApi: string; plannedRealIntegration: string } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const result = await loadAzChannelManagerRequest();
      setDashboard(result.dashboard);
      setMockInfo(result.mock);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить каналы продаж");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function syncAll(action: "inventory" | "prices") {
    setMessage("");
    setError("");
    try {
      const result =
        action === "inventory"
          ? await syncAzInventoryRequest()
          : await syncAzPricesRequest();
      setMessage(
        `${action === "inventory" ? "Инвентарь" : "Цены"} отправлены: комнат ${result.processedRooms}, каналов ${result.processedChannels}.`
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

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Каналы продаж</p>
        <h2>Доступность по площадкам и ручное обновление</h2>
        <p className="muted">
          Пока это тестовый слой, но он уже использует реальные данные по доступности номеров и текущим тарифам.
        </p>
        <div className="status-actions">
          <button className="primary-button" type="button" onClick={() => void syncAll("inventory")}>
            Обновить инвентарь
          </button>
          <button className="secondary-button" type="button" onClick={() => void syncAll("prices")}>
            Обновить цены
          </button>
        </div>
      </section>

      {mockInfo ? (
        <section className="panel">
          <p className="eyebrow">Тестовые площадки</p>
          <p className="muted">Сегодня: {mockInfo.today}</p>
          <p className="muted">Booking.com: {mockInfo.bookingComApi}</p>
          <p className="muted">Следующий этап: {mockInfo.plannedRealIntegration}</p>
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
          <p className="muted">Загружаем каналы...</p>
        </section>
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

