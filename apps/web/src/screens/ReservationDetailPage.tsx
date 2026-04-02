import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { OccupancyRecommendation } from "@hotel-crm/shared/ai";
import type { GuestDuplicateCandidate, GuestProfile } from "@hotel-crm/shared/guests";
import type { CreateCharge, PaymentRecord } from "@hotel-crm/shared/payments";
import {
  cancelReservationRequest,
  checkInReservationWithDepositRequest,
  checkOutReservationRequest,
  confirmReservationRequest,
  createChargeRequest,
  loadGuestDuplicatesRequest,
  loadGuestRequest,
  loadOccupancyRecommendations,
  markReservationNoShowRequest,
  mergeGuestsRequest,
  recordPaymentRequest,
  sendReservationPaymentLinkRequest,
  updateGuestRequest,
  updateReservationRequest
} from "../lib/api";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";
import {
  chargeTypeLabel,
  fiscalStatusLabel,
  formatDateLabel,
  paymentKindLabel,
  paymentLinkStatusLabel,
  paymentMethodLabel,
  reservationStatusLabel,
  reservationSourceLabel,
  roomShortLabel
} from "../lib/ru";

const emptyGuest: GuestProfile = {
  id: "",
  fullName: "",
  phone: "",
  email: "",
  birthDate: "",
  notes: "",
  preferences: [],
  stayHistory: [],
  mergedGuestIds: [],
  mergedIntoGuestId: null
};

export function ReservationDetailPage() {
  const { id } = useParams();
  const {
    reservations,
    rooms,
    folioDetails,
    payments,
    stays,
    auditLogs,
    reloadFromRemote
  } = useHotelStore();
  const [recommendations, setRecommendations] = useState<OccupancyRecommendation[]>([]);
  const [guest, setGuest] = useState<GuestProfile>(emptyGuest);
  const [duplicates, setDuplicates] = useState<GuestDuplicateCandidate[]>([]);
  const [message, setMessage] = useState("");
  const [dateForm, setDateForm] = useState({
    checkInDate: "",
    checkOutDate: "",
    notes: "",
    earlyCheckInGranted: false,
    lateCheckoutGranted: false
  });
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositMethod, setDepositMethod] = useState<PaymentRecord["method"]>("card");
  const [paymentChannel, setPaymentChannel] = useState<"sms" | "whatsapp" | "email">("whatsapp");
  const [paymentLinkMethod, setPaymentLinkMethod] = useState<"sbp" | "yookassa" | "tbank">("sbp");
  const [paymentLinkAmount, setPaymentLinkAmount] = useState(0);
  const [selectedRoomLabel, setSelectedRoomLabel] = useState("UNASSIGNED");
  const [chargeForm, setChargeForm] = useState({
    type: "other" as CreateCharge["type"],
    description: "",
    amount: 0
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: "card" as PaymentRecord["method"],
    note: ""
  });
  const { hasAnyRole } = useAuth();
  const canOperateReservation = hasAnyRole(["owner", "manager", "frontdesk"]);
  const reservation = reservations.find((entry) => entry.id === id);
  const folio = folioDetails.find((entry) => entry.reservationId === id);
  const stay = stays.find((entry) => entry.reservationId === id && entry.status === "active");
  const history = auditLogs.filter((entry) => entry.entityId === id).slice(0, 8);

  const availableRooms = useMemo(
    () => rooms.filter((room) => ["available", "reserved", "inspected"].includes(room.status)),
    [rooms]
  );

  useEffect(() => {
    if (!reservation) {
      return;
    }

    setDateForm({
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      notes: reservation.notes ?? "",
      earlyCheckInGranted: reservation.earlyCheckInGranted ?? false,
      lateCheckoutGranted: reservation.lateCheckoutGranted ?? false
    });
    setSelectedRoomLabel(reservation.roomLabel);
    setPaymentForm((current) => ({
      ...current,
      amount: Math.max(folio?.balanceDue ?? reservation.balanceDue, 0)
    }));
    setPaymentLinkAmount(Math.max(folio?.balanceDue ?? reservation.balanceDue, 0));
  }, [reservation, folio]);

  useEffect(() => {
    if (!id || !reservation) {
      setRecommendations([]);
      return;
    }

    void loadOccupancyRecommendations(id)
      .then((items) => setRecommendations(items))
      .catch(() => setRecommendations([]));
  }, [id, reservation]);

  useEffect(() => {
    if (!reservation?.guestId) {
      setGuest(emptyGuest);
      setDuplicates([]);
      return;
    }

    void Promise.all([
      loadGuestRequest(reservation.guestId),
      loadGuestDuplicatesRequest(reservation.guestId)
    ])
      .then(([guestProfile, duplicateItems]) => {
        setGuest(guestProfile);
        setDuplicates(duplicateItems);
      })
      .catch(() => {
        setGuest(emptyGuest);
        setDuplicates([]);
      });
  }, [reservation?.guestId]);

  async function refreshEverything() {
    await reloadFromRemote();
    if (reservation?.guestId) {
      try {
        const [guestProfile, duplicateItems] = await Promise.all([
          loadGuestRequest(reservation.guestId),
          loadGuestDuplicatesRequest(reservation.guestId)
        ]);
        setGuest(guestProfile);
        setDuplicates(duplicateItems);
      } catch {
        setDuplicates([]);
      }
    }
  }

  async function handleReservationPatch(patch: Parameters<typeof updateReservationRequest>[1], successText: string) {
    if (!reservation) {
      return;
    }

    setMessage("");
    try {
      await updateReservationRequest(reservation.id, patch);
      await refreshEverything();
      setMessage(successText);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось обновить бронь.");
    }
  }

  async function handleGuestSave() {
    if (!reservation?.guestId) {
      return;
    }

    setMessage("");
    try {
      await updateGuestRequest(reservation.guestId, {
        fullName: guest.fullName,
        phone: guest.phone,
        email: guest.email,
        birthDate: guest.birthDate,
        notes: guest.notes,
        document: guest.document
      });
      await handleReservationPatch(
        {
          guestName: guest.fullName,
          guestPhone: guest.phone,
          guestEmail: guest.email
        },
        "Данные гостя обновлены."
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось сохранить гостя.");
    }
  }

  async function handleConfirm() {
    if (!reservation) {
      return;
    }
    try {
      await confirmReservationRequest(reservation.id);
      await refreshEverything();
      setMessage("Бронь подтверждена.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось подтвердить бронь.");
    }
  }

  async function handleCheckIn() {
    if (!reservation) {
      return;
    }
    try {
      await checkInReservationWithDepositRequest({
        reservationId: reservation.id,
        depositAmount: depositAmount > 0 ? depositAmount : undefined,
        paymentMethod: depositAmount > 0 ? depositMethod : undefined
      });
      await refreshEverything();
      setDepositAmount(0);
      setMessage("Заселение выполнено.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось выполнить заселение.");
    }
  }

  async function handleCheckOut() {
    if (!reservation) {
      return;
    }
    try {
      await checkOutReservationRequest(reservation.id);
      await refreshEverything();
      setMessage("Выезд оформлен.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось оформить выезд.");
    }
  }

  async function handleCancel() {
    if (!reservation) {
      return;
    }
    try {
      await cancelReservationRequest(reservation.id);
      await refreshEverything();
      setMessage("Бронь отменена.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось отменить бронь.");
    }
  }

  async function handleNoShow() {
    if (!reservation) {
      return;
    }
    try {
      await markReservationNoShowRequest(reservation.id);
      await refreshEverything();
      setMessage("Бронь отмечена как незаезд.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось отметить незаезд.");
    }
  }

  async function handlePaymentLink() {
    if (!reservation) {
      return;
    }
    try {
      await sendReservationPaymentLinkRequest(
        reservation.id,
        paymentChannel,
        paymentLinkMethod,
        paymentLinkAmount > 0 ? paymentLinkAmount : undefined
      );
      await refreshEverything();
      setMessage("Ссылка на оплату отправлена.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось отправить ссылку на оплату.");
    }
  }

  async function handleMergeGuest(duplicateGuestId: string) {
    if (!reservation?.guestId) {
      return;
    }
    try {
      await mergeGuestsRequest(reservation.guestId, duplicateGuestId);
      await refreshEverything();
      setMessage("Дубликаты гостя объединены.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось объединить гостей.");
    }
  }

  async function handleRecordPayment() {
    if (!reservation || paymentForm.amount <= 0) {
      return;
    }
    try {
      await recordPaymentRequest({
        reservationId: reservation.id,
        guestName: reservation.guestName,
        amount: paymentForm.amount,
        method: paymentForm.method,
        provider:
          paymentForm.method === "sbp"
            ? "sbp"
            : paymentForm.method === "yookassa"
              ? "yookassa"
              : paymentForm.method === "tbank"
                ? "tbank"
                : "manual",
        kind: "payment",
        note: paymentForm.note,
        reason: paymentForm.note || "Оплата из карточки брони",
        correlationId: `folio_payment_${reservation.id}_${Date.now()}`,
        paymentLinkId: null,
        idempotencyKey: `pay_${Date.now()}`
      });
      await refreshEverything();
      setMessage("Оплата проведена.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось провести оплату.");
    }
  }

  async function handleAddCharge() {
    if (!reservation || chargeForm.amount <= 0 || chargeForm.description.trim().length < 2) {
      return;
    }
    try {
      await createChargeRequest({
        reservationId: reservation.id,
        guestName: reservation.guestName,
        type: chargeForm.type,
        description: chargeForm.description,
        amount: chargeForm.amount,
        reason: "Начисление из карточки брони",
        correlationId: `charge_${reservation.id}_${Date.now()}`,
        idempotencyKey: `charge_${Date.now()}`
      });
      await refreshEverything();
      setChargeForm({ type: "other", description: "", amount: 0 });
      setMessage("Услуга добавлена.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось добавить услугу.");
    }
  }

  if (!reservation) {
    return (
      <div className="screen">
        <section className="panel">
          <p className="eyebrow">Карточка брони</p>
          <h2>Бронь не найдена</h2>
        </section>
      </div>
    );
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Карточка брони</p>
        <h2>{reservation.guestName}</h2>
        <p className="muted">
          {formatDateLabel(reservation.checkInDate)} - {formatDateLabel(reservation.checkOutDate)} • {reservationStatusLabel(reservation.status)} • {roomShortLabel(reservation.roomLabel)}
        </p>
        <p className="muted">
          Источник: {reservationSourceLabel(reservation.source ?? "manual")} • взрослых {reservation.adultCount ?? 1} • детей {reservation.childCount ?? 0}
        </p>
        <p className="muted">
          Итого {reservation.totalAmount ?? folio?.totalAmount ?? 0} • оплачено {reservation.paidAmount ?? folio?.paidAmount ?? 0} • остаток {folio?.balanceDue ?? reservation.balanceDue}
        </p>
        {message ? <p className="muted">{message}</p> : null}
        {canOperateReservation ? (
          <div className="status-actions">
            {(reservation.status === "draft" || reservation.status === "pending_confirmation") ? (
              <button className="primary-button" onClick={() => void handleConfirm()} type="button">
                Подтвердить
              </button>
            ) : null}
            {reservation.status !== "cancelled" && reservation.status !== "checked_out" ? (
              <button className="secondary-button" onClick={() => void handleCancel()} type="button">
                Отменить
              </button>
            ) : null}
            {(reservation.status === "draft" || reservation.status === "confirmed" || reservation.status === "pending_confirmation") ? (
              <button className="secondary-button" onClick={() => void handleNoShow()} type="button">
                Незаезд
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <p className="eyebrow">Гость</p>
        <h3>Профиль гостя и данные для заезда</h3>
        <div className="form-grid">
          <label>
            <span>ФИО</span>
            <input
              disabled={!canOperateReservation}
              value={guest.fullName}
              onChange={(event) => setGuest((current) => ({ ...current, fullName: event.target.value }))}
            />
          </label>
          <label>
            <span>Телефон</span>
            <input
              disabled={!canOperateReservation}
              value={guest.phone}
              onChange={(event) => setGuest((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              disabled={!canOperateReservation}
              value={guest.email}
              onChange={(event) => setGuest((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label>
            <span>Дата рождения</span>
            <input
              disabled={!canOperateReservation}
              value={guest.birthDate}
              onChange={(event) => setGuest((current) => ({ ...current, birthDate: event.target.value }))}
              placeholder="1990-05-17"
            />
          </label>
          <label>
            <span>Документ</span>
            <input
              disabled={!canOperateReservation}
              value={guest.document?.number ?? ""}
              onChange={(event) =>
                setGuest((current) => ({
                  ...current,
                  document: {
                    type: current.document?.type ?? "passport_rf",
                    series: current.document?.series ?? "",
                    number: event.target.value,
                    issuedBy: current.document?.issuedBy ?? "",
                    issuedAt: current.document?.issuedAt ?? "",
                    issuerCode: current.document?.issuerCode ?? "",
                    birthPlace: current.document?.birthPlace ?? "",
                    registrationAddress: current.document?.registrationAddress ?? "",
                    citizenship: current.document?.citizenship ?? "RU"
                  }
                }))
              }
            />
          </label>
          <label>
            <span>Кем выдан</span>
            <input
              disabled={!canOperateReservation}
              value={guest.document?.issuedBy ?? ""}
              onChange={(event) =>
                setGuest((current) => ({
                  ...current,
                  document: {
                    type: current.document?.type ?? "passport_rf",
                    series: current.document?.series ?? "",
                    number: current.document?.number ?? "",
                    issuedBy: event.target.value,
                    issuedAt: current.document?.issuedAt ?? "",
                    issuerCode: current.document?.issuerCode ?? "",
                    birthPlace: current.document?.birthPlace ?? "",
                    registrationAddress: current.document?.registrationAddress ?? "",
                    citizenship: current.document?.citizenship ?? "RU"
                  }
                }))
              }
            />
          </label>
          <label>
            <span>Комментарий</span>
            <input
              disabled={!canOperateReservation}
              value={guest.notes}
              onChange={(event) => setGuest((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
          {canOperateReservation ? (
            <button className="primary-button" type="button" onClick={() => void handleGuestSave()}>
              Сохранить гостя
            </button>
          ) : null}
        </div>
      </section>

      {duplicates.length > 0 ? (
        <section className="panel">
          <p className="eyebrow">Дубликаты</p>
          <h3>Похожие профили гостей</h3>
          <div className="screen">
            {duplicates.map((item) => (
              <article className="panel inset-panel" key={item.guest.id}>
                <p className="eyebrow">{item.reasons.join(" • ")}</p>
                <h3>{item.guest.fullName}</h3>
                <p className="muted">{item.guest.phone || "без телефона"} • {item.guest.email || "без email"}</p>
                {canOperateReservation ? (
                  <div className="status-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => void handleMergeGuest(item.guest.id)}
                    >
                      Объединить в текущего гостя
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <p className="eyebrow">Номер и даты</p>
        <h3>Быстрые front-desk действия</h3>
        <div className="form-grid">
          <label>
            <span>Номер</span>
            <select
              disabled={!canOperateReservation}
              value={selectedRoomLabel}
              onChange={(event) => setSelectedRoomLabel(event.target.value)}
            >
              <option value="UNASSIGNED">Не назначен</option>
              {availableRooms.map((room) => (
                <option key={room.id} value={room.number}>
                  Номер {room.number} • {room.status}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Заезд</span>
            <input
              disabled={!canOperateReservation}
              type="date"
              value={dateForm.checkInDate}
              onChange={(event) =>
                setDateForm((current) => ({ ...current, checkInDate: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Выезд</span>
            <input
              disabled={!canOperateReservation}
              type="date"
              value={dateForm.checkOutDate}
              onChange={(event) =>
                setDateForm((current) => ({ ...current, checkOutDate: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Комментарий к брони</span>
            <input
              disabled={!canOperateReservation}
              value={dateForm.notes}
              onChange={(event) =>
                setDateForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Ранний заезд</span>
            <select
              disabled={!canOperateReservation}
              value={dateForm.earlyCheckInGranted ? "yes" : "no"}
              onChange={(event) =>
                setDateForm((current) => ({
                  ...current,
                  earlyCheckInGranted: event.target.value === "yes"
                }))
              }
            >
              <option value="no">Нет</option>
              <option value="yes">Разрешён</option>
            </select>
          </label>
          <label>
            <span>Поздний выезд</span>
            <select
              disabled={!canOperateReservation}
              value={dateForm.lateCheckoutGranted ? "yes" : "no"}
              onChange={(event) =>
                setDateForm((current) => ({
                  ...current,
                  lateCheckoutGranted: event.target.value === "yes"
                }))
              }
            >
              <option value="no">Нет</option>
              <option value="yes">Разрешён</option>
            </select>
          </label>
        </div>
        {canOperateReservation ? (
          <div className="status-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                void handleReservationPatch(
                  {
                    roomLabel: selectedRoomLabel,
                    checkInDate: dateForm.checkInDate,
                    checkOutDate: dateForm.checkOutDate,
                    notes: dateForm.notes,
                    earlyCheckInGranted: dateForm.earlyCheckInGranted,
                    lateCheckoutGranted: dateForm.lateCheckoutGranted
                  },
                  "Бронь обновлена."
                )
              }
            >
              Сохранить даты и номер
            </button>
            {recommendations.map((item) => (
              <button
                key={item.roomId}
                className="secondary-button"
                type="button"
                onClick={() =>
                  void handleReservationPatch({ roomLabel: item.roomLabel }, `Назначен номер ${item.roomLabel}.`)
                }
              >
                ИИ: {item.roomLabel}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <p className="eyebrow">Финансы и фронт-деск</p>
        <p className="muted">Folio: {folio?.status ?? "не создан"} • сумма {folio?.totalAmount ?? reservation.totalAmount ?? 0} • оплачено {folio?.paidAmount ?? 0} • долг {folio?.balanceDue ?? reservation.balanceDue}</p>
        <p className="muted">Активное проживание: {stay ? `Номер ${stay.roomLabel}` : "нет"}</p>
        {canOperateReservation ? (
          <>
            <div className="form-grid">
              <label>
                <span>Депозит при заселении</span>
                <input
                  type="number"
                  min="0"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Способ депозита</span>
                <select
                  value={depositMethod}
                  onChange={(event) =>
                    setDepositMethod(event.target.value as PaymentRecord["method"])
                  }
                >
                  <option value="card">Карта</option>
                  <option value="cash">Наличные</option>
                  <option value="bank_transfer">Перевод</option>
                  <option value="sbp">СБП</option>
                </select>
              </label>
              <label>
                <span>Канал ссылки на оплату</span>
                <select
                  value={paymentChannel}
                  onChange={(event) =>
                    setPaymentChannel(event.target.value as typeof paymentChannel)
                  }
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label>
                <span>Провайдер ссылки</span>
                <select
                  value={paymentLinkMethod}
                  onChange={(event) =>
                    setPaymentLinkMethod(event.target.value as typeof paymentLinkMethod)
                  }
                >
                  <option value="sbp">СБП</option>
                  <option value="yookassa">ЮKassa</option>
                  <option value="tbank">T-Bank</option>
                </select>
              </label>
              <label>
                <span>Сумма по ссылке</span>
                <input
                  type="number"
                  min="0"
                  value={paymentLinkAmount}
                  onChange={(event) => setPaymentLinkAmount(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="status-actions">
              {reservation.status === "confirmed" || reservation.status === "draft" || reservation.status === "pending_confirmation" ? (
                <button className="primary-button" onClick={() => void handleCheckIn()} type="button">
                  Заселить
                </button>
              ) : null}
              {reservation.status === "checked_in" ? (
                <button className="primary-button" onClick={() => void handleCheckOut()} type="button">
                  Оформить выезд
                </button>
              ) : null}
              <button className="secondary-button" onClick={() => void handlePaymentLink()} type="button">
                Отправить ссылку на оплату
              </button>
            </div>
            <div className="form-grid">
              <label>
                <span>Принять оплату</span>
                <input
                  type="number"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, amount: Number(event.target.value) }))
                  }
                />
              </label>
              <label>
                <span>Способ</span>
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      method: event.target.value as typeof current.method
                    }))
                  }
                >
                  <option value="card">Карта</option>
                  <option value="cash">Наличные</option>
                  <option value="bank_transfer">Перевод</option>
                  <option value="sbp">СБП</option>
                  <option value="yookassa">ЮKassa</option>
                  <option value="tbank">T-Bank</option>
                </select>
              </label>
              <label>
                <span>Комментарий к оплате</span>
                <input
                  value={paymentForm.note}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, note: event.target.value }))
                  }
                />
              </label>
              <button className="secondary-button" type="button" onClick={handleRecordPayment}>
                Провести оплату
              </button>
            </div>
            <div className="form-grid">
              <label>
                <span>Допуслуга</span>
                <select
                  value={chargeForm.type}
                  onChange={(event) =>
                    setChargeForm((current) => ({
                      ...current,
                      type: event.target.value as typeof current.type
                    }))
                  }
                >
                  <option value="other">Другое</option>
                  <option value="breakfast">Завтрак</option>
                  <option value="parking">Парковка</option>
                  <option value="laundry">Прачечная</option>
                  <option value="minibar">Мини-бар</option>
                  <option value="room">Проживание</option>
                  <option value="service">Услуга</option>
                  <option value="damage">Порча имущества</option>
                  <option value="tax_fee">Сбор / налог</option>
                  <option value="discount">Скидка</option>
                </select>
              </label>
              <label>
                <span>Описание</span>
                <input
                  value={chargeForm.description}
                  onChange={(event) =>
                    setChargeForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Сумма</span>
                <input
                  type="number"
                  min="0"
                  value={chargeForm.amount}
                  onChange={(event) =>
                    setChargeForm((current) => ({ ...current, amount: Number(event.target.value) }))
                  }
                />
              </label>
              <button className="secondary-button" type="button" onClick={handleAddCharge}>
                Добавить услугу
              </button>
            </div>
          </>
        ) : null}
      </section>

      {folio?.paymentLinks.length ? (
        <section className="screen">
          {folio.paymentLinks.map((link) => (
            <article className="panel" key={link.id}>
              <p className="eyebrow">
                Ссылка • {paymentMethodLabel(link.method)} • {paymentLinkStatusLabel(link.status)}
              </p>
              <h3>{link.amount}</h3>
              <p className="muted">{link.note || "Без комментария"}</p>
              <p className="muted">{link.url}</p>
            </article>
          ))}
        </section>
      ) : null}

      {folio?.charges.length ? (
        <section className="screen">
          {folio.charges.slice(0, 6).map((charge) => (
            <article className="panel" key={charge.id}>
              <p className="eyebrow">{chargeTypeLabel(charge.type)}</p>
              <h3>{charge.amount}</h3>
              <p className="muted">{charge.description}</p>
              <p className="muted">{charge.postedAt}</p>
            </article>
          ))}
        </section>
      ) : null}

      {payments.filter((entry) => entry.reservationId === reservation.id).length > 0 ? (
        <section className="screen">
          {payments
            .filter((entry) => entry.reservationId === reservation.id)
            .slice(0, 6)
            .map((payment) => (
              <article className="panel" key={payment.id}>
                <p className="eyebrow">
                  {paymentKindLabel(payment.kind)} • {paymentMethodLabel(payment.method)}
                </p>
                <h3>{payment.amount}</h3>
                <p className="muted">{payment.note || payment.reason || "Без комментария"}</p>
                <p className="muted">Фискальный статус: {fiscalStatusLabel(payment.fiscalization.status)}</p>
                <p className="muted">{payment.receivedAt}</p>
              </article>
            ))}
        </section>
      ) : null}

      {history.length > 0 ? (
        <section className="screen">
          {history.map((entry) => (
            <article className="panel" key={entry.id}>
              <p className="eyebrow">{entry.action}</p>
              <p className="muted">{entry.reason}</p>
              <p className="muted">{entry.createdAt}</p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
