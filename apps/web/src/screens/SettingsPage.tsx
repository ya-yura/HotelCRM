import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PropertySummary } from "@hotel-crm/shared/properties";
import { ApiError, createRoomRequest, createStaffUserRequest, loadCurrentPropertyRequest, reauthRequest, updateCurrentPropertyRequest } from "../lib/api";
import { azAccessRoleLabel, propertyTypeLabel, roleLabel, vatRateLabel } from "../lib/ru";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";

const emptyProperty: PropertySummary = {
  id: "",
  name: "",
  city: "",
  timezone: "Europe/Moscow",
  currency: "RUB",
  address: "",
  active: true,
  propertyType: "small_hotel",
  legalInfo: {
    legalEntityName: "",
    taxId: "",
    registrationNumber: "",
    vatRate: "none"
  },
  notificationSettings: {
    newReservationPush: true,
    arrivalReminderPush: true,
    housekeepingAlerts: true,
    financeAlerts: true
  },
  operationSettings: {
    defaultCheckInTime: "14:00",
    defaultCheckOutTime: "12:00",
    housekeepingStartTime: "09:00",
    housekeepingEndTime: "18:00",
    sharedDeviceMode: true
  },
  complianceSettings: {
    requireDocumentBeforeCheckIn: true,
    requireBirthDateBeforeCheckIn: true,
    requireMigrationCardForForeignGuests: true,
    autoPrepareMvdSubmission: true,
    autoPrepareRosstatSubmission: true,
    mvdProvider: "manual",
    rosstatProvider: "manual"
  }
};

export function SettingsPage() {
  const { session, users, logout, refreshUsers, refreshSession, hasAnyAzAccess, hasAnyRole } = useAuth();
  const { rooms, reloadFromRemote } = useHotelStore();
  const canManageStaff = hasAnyAzAccess(["admin"]) && hasAnyRole(["owner", "manager"]);
  const canManageProperty = hasAnyRole(["owner", "manager"]);
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "frontdesk" as "manager" | "frontdesk" | "housekeeping" | "maintenance" | "accountant",
    azAccessRole: "staff" as "admin" | "staff",
    email: "",
    pin: "",
    quickUnlockEnabled: true
  });
  const [roomForm, setRoomForm] = useState({
    number: "",
    roomType: "Стандарт",
    priority: "normal" as "normal" | "arrival_soon" | "blocked",
    unitKind: "room" as "room" | "bed" | "glamp_unit",
    floor: "",
    zone: "",
    occupancyLimit: 2,
    amenities: [] as string[],
    minibarEnabled: false,
    nextArrivalLabel: "",
    glampingMetadata: null as null
  });
  const [propertyForm, setPropertyForm] = useState<PropertySummary>(emptyProperty);
  const [propertySecret, setPropertySecret] = useState("");
  const [propertyMessage, setPropertyMessage] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const [roomMessage, setRoomMessage] = useState("");
  const [isPropertyLoading, setIsPropertyLoading] = useState(true);
  const [isPropertySaving, setIsPropertySaving] = useState(false);

  useEffect(() => {
    if (!session) {
      setIsPropertyLoading(false);
      return;
    }

    setIsPropertyLoading(true);
    void loadCurrentPropertyRequest()
      .then((property) => setPropertyForm(property))
      .catch(() => setPropertyMessage("Не удалось загрузить настройки объекта."))
      .finally(() => setIsPropertyLoading(false));
  }, [session]);

  async function handleCreateStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStaffMessage("");
    try {
      await createStaffUserRequest({
        ...staffForm,
        email: staffForm.email.trim() || undefined
      });
      await refreshUsers();
      setStaffForm({
        name: "",
        role: "frontdesk",
        azAccessRole: "staff",
        email: "",
        pin: "",
        quickUnlockEnabled: true
      });
      setStaffMessage("Сотрудник создан.");
    } catch (cause) {
      setStaffMessage(cause instanceof Error ? cause.message : "Не удалось создать сотрудника.");
    }
  }

  async function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoomMessage("");
    try {
      await createRoomRequest(roomForm);
      await reloadFromRemote();
      setRoomForm({
        number: "",
        roomType: "Стандарт",
        priority: "normal",
        unitKind: "room",
        floor: "",
        zone: "",
        occupancyLimit: 2,
        amenities: [],
        minibarEnabled: false,
        nextArrivalLabel: "",
        glampingMetadata: null
      });
      setRoomMessage("Номер добавлен.");
    } catch (cause) {
      setRoomMessage(cause instanceof Error ? cause.message : "Не удалось добавить номер.");
    }
  }

  async function handleSaveProperty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageProperty) {
      return;
    }

    setPropertyMessage("");
    setIsPropertySaving(true);
    try {
      await reauthRequest(propertySecret);
      await updateCurrentPropertyRequest({
        name: propertyForm.name,
        city: propertyForm.city,
        timezone: propertyForm.timezone,
        currency: propertyForm.currency,
        address: propertyForm.address,
        propertyType: propertyForm.propertyType,
        legalInfo: propertyForm.legalInfo,
        notificationSettings: propertyForm.notificationSettings,
        operationSettings: propertyForm.operationSettings,
        complianceSettings: propertyForm.complianceSettings,
        active: propertyForm.active
      });
      await refreshSession();
      setPropertySecret("");
      setPropertyMessage("Настройки объекта сохранены.");
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "RECENT_AUTH_REQUIRED") {
        setPropertyMessage("Для сохранения подтвердите действие паролем или PIN ниже.");
      } else {
        setPropertyMessage(cause instanceof Error ? cause.message : "Не удалось сохранить настройки объекта.");
      }
    } finally {
      setIsPropertySaving(false);
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <h2>Настройки</h2>
        <p>Здесь находятся сессия, сотрудники, номерной фонд и профиль объекта с настройками общей операционки.</p>
      </section>

      <section className="panel">
        <p className="eyebrow">Текущая сессия</p>
        <h3>{session?.userName ?? "Нет активной сессии"}</h3>
        <p className="muted">Отель: {session?.propertyName ?? "не указан"}</p>
        <p className="muted">Роль: {roleLabel(session?.role)}</p>
        <p className="muted">Доступ в Шахматке: {azAccessRoleLabel(session?.azAccessRole)}</p>
        <p className="muted">Устройство: {session?.deviceLabel ?? "не указано"}</p>
        <p className="muted">Способ входа: {session?.authMethod === "pin" ? "PIN" : "Пароль"}</p>
        <p className="muted">Быстрая разблокировка: {session?.quickUnlockEnabled ? "включена" : "выключена"}</p>
        <p className="muted">Последнее подтверждение: {session?.recentAuthAt ?? "неизвестно"}</p>
        <div className="status-actions">
          <button className="secondary-button" onClick={() => void logout()} type="button">
            Выйти с этого устройства
          </button>
        </div>
      </section>

      <section className="screen">
        {users.map((user) => (
          <article className="panel" key={user.id}>
            <p className="eyebrow">{azAccessRoleLabel(user.azAccessRole)} • {roleLabel(user.role)}</p>
            <h3>{user.name}</h3>
            <p className="muted">ID: {user.id}</p>
            <p className="muted">Email: {user.email || "не указан"}</p>
            <p className="muted">Быстрая разблокировка: {user.quickUnlockEnabled ? "да" : "нет"}</p>
            <p className="muted">{user.pinHint}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <p className="eyebrow">Объект</p>
        <h3>Профиль и операционные настройки</h3>
        {isPropertyLoading ? (
          <p className="muted">Загружаем профиль объекта...</p>
        ) : (
          <form className="form-grid" onSubmit={handleSaveProperty}>
            <label>
              <span>Название объекта</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.name}
                onChange={(event) => setPropertyForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              <span>Тип объекта</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.propertyType}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    propertyType: event.target.value as typeof current.propertyType
                  }))
                }
              >
                <option value="small_hotel">{propertyTypeLabel("small_hotel")}</option>
                <option value="hostel">{propertyTypeLabel("hostel")}</option>
                <option value="guest_house">{propertyTypeLabel("guest_house")}</option>
                <option value="glamping">{propertyTypeLabel("glamping")}</option>
              </select>
            </label>
            <label>
              <span>Город</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.city}
                onChange={(event) => setPropertyForm((current) => ({ ...current, city: event.target.value }))}
              />
            </label>
            <label>
              <span>Адрес</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.address}
                onChange={(event) => setPropertyForm((current) => ({ ...current, address: event.target.value }))}
              />
            </label>
            <label>
              <span>Часовой пояс</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.timezone}
                onChange={(event) =>
                  setPropertyForm((current) => ({ ...current, timezone: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Валюта</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.currency}
                onChange={(event) =>
                  setPropertyForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
                }
              />
            </label>
            <label>
              <span>Юрлицо</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.legalInfo.legalEntityName}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    legalInfo: { ...current.legalInfo, legalEntityName: event.target.value }
                  }))
                }
              />
            </label>
            <label>
              <span>ИНН</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.legalInfo.taxId}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    legalInfo: { ...current.legalInfo, taxId: event.target.value }
                  }))
                }
              />
            </label>
            <label>
              <span>Рег. номер</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.legalInfo.registrationNumber}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    legalInfo: { ...current.legalInfo, registrationNumber: event.target.value }
                  }))
                }
              />
            </label>
            <label>
              <span>НДС</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.legalInfo.vatRate}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    legalInfo: {
                      ...current.legalInfo,
                      vatRate: event.target.value as typeof current.legalInfo.vatRate
                    }
                  }))
                }
              >
                <option value="none">{vatRateLabel("none")}</option>
                <option value="0">{vatRateLabel("0")}</option>
                <option value="10">{vatRateLabel("10")}</option>
                <option value="20">{vatRateLabel("20")}</option>
              </select>
            </label>
            <label>
              <span>Заезд по умолчанию</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.operationSettings.defaultCheckInTime}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    operationSettings: {
                      ...current.operationSettings,
                      defaultCheckInTime: event.target.value
                    }
                  }))
                }
              />
            </label>
            <label>
              <span>Выезд по умолчанию</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.operationSettings.defaultCheckOutTime}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    operationSettings: {
                      ...current.operationSettings,
                      defaultCheckOutTime: event.target.value
                    }
                  }))
                }
              />
            </label>
            <label>
              <span>Старт уборки</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.operationSettings.housekeepingStartTime}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    operationSettings: {
                      ...current.operationSettings,
                      housekeepingStartTime: event.target.value
                    }
                  }))
                }
              />
            </label>
            <label>
              <span>Окончание уборки</span>
              <input
                disabled={!canManageProperty}
                value={propertyForm.operationSettings.housekeepingEndTime}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    operationSettings: {
                      ...current.operationSettings,
                      housekeepingEndTime: event.target.value
                    }
                  }))
                }
              />
            </label>
            <label>
              <span>Подтверждение изменений</span>
              <input
                disabled={!canManageProperty}
                type="password"
                value={propertySecret}
                onChange={(event) => setPropertySecret(event.target.value)}
                placeholder="Пароль или PIN"
              />
            </label>
            <label>
              <span>Режим общего устройства</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.operationSettings.sharedDeviceMode ? "on" : "off"}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    operationSettings: {
                      ...current.operationSettings,
                      sharedDeviceMode: event.target.value === "on"
                    }
                  }))
                }
              >
                <option value="on">Включён</option>
                <option value="off">Выключен</option>
              </select>
            </label>
            <label>
              <span>Push по новым броням</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.notificationSettings.newReservationPush ? "on" : "off"}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    notificationSettings: {
                      ...current.notificationSettings,
                      newReservationPush: event.target.value === "on"
                    }
                  }))
                }
              >
                <option value="on">Включён</option>
                <option value="off">Выключен</option>
              </select>
            </label>
            <label>
              <span>Push по заездам</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.notificationSettings.arrivalReminderPush ? "on" : "off"}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    notificationSettings: {
                      ...current.notificationSettings,
                      arrivalReminderPush: event.target.value === "on"
                    }
                  }))
                }
              >
                <option value="on">Включён</option>
                <option value="off">Выключен</option>
              </select>
            </label>
            <label>
              <span>Push по уборке</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.notificationSettings.housekeepingAlerts ? "on" : "off"}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    notificationSettings: {
                      ...current.notificationSettings,
                      housekeepingAlerts: event.target.value === "on"
                    }
                  }))
                }
              >
                <option value="on">Включён</option>
                <option value="off">Выключен</option>
              </select>
            </label>
            <label>
              <span>Push по финансам</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.notificationSettings.financeAlerts ? "on" : "off"}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    notificationSettings: {
                      ...current.notificationSettings,
                      financeAlerts: event.target.value === "on"
                    }
                  }))
                }
              >
                <option value="on">Включён</option>
                <option value="off">Выключен</option>
              </select>
            </label>
            <label>
              <span>Документ обязателен до заезда</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.complianceSettings.requireDocumentBeforeCheckIn ? "on" : "off"}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    complianceSettings: {
                      ...current.complianceSettings,
                      requireDocumentBeforeCheckIn: event.target.value === "on"
                    }
                  }))
                }
              >
                <option value="on">Да</option>
                <option value="off">Нет</option>
              </select>
            </label>
            <label>
              <span>Дата рождения обязательна</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.complianceSettings.requireBirthDateBeforeCheckIn ? "on" : "off"}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    complianceSettings: {
                      ...current.complianceSettings,
                      requireBirthDateBeforeCheckIn: event.target.value === "on"
                    }
                  }))
                }
              >
                <option value="on">Да</option>
                <option value="off">Нет</option>
              </select>
            </label>
            <label>
              <span>Миграционная карта для иностранцев</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.complianceSettings.requireMigrationCardForForeignGuests ? "on" : "off"}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    complianceSettings: {
                      ...current.complianceSettings,
                      requireMigrationCardForForeignGuests: event.target.value === "on"
                    }
                  }))
                }
              >
                <option value="on">Да</option>
                <option value="off">Нет</option>
              </select>
            </label>
            <label>
              <span>Автоподготовка пакета МВД</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.complianceSettings.autoPrepareMvdSubmission ? "on" : "off"}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    complianceSettings: {
                      ...current.complianceSettings,
                      autoPrepareMvdSubmission: event.target.value === "on"
                    }
                  }))
                }
              >
                <option value="on">Да</option>
                <option value="off">Нет</option>
              </select>
            </label>
            <label>
              <span>Автоподготовка пакета Росстат</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.complianceSettings.autoPrepareRosstatSubmission ? "on" : "off"}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    complianceSettings: {
                      ...current.complianceSettings,
                      autoPrepareRosstatSubmission: event.target.value === "on"
                    }
                  }))
                }
              >
                <option value="on">Да</option>
                <option value="off">Нет</option>
              </select>
            </label>
            <label>
              <span>Провайдер МВД</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.complianceSettings.mvdProvider}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    complianceSettings: {
                      ...current.complianceSettings,
                      mvdProvider: event.target.value
                    }
                  }))
                }
              >
                <option value="manual">Manual</option>
                <option value="mock_mvd_gateway">Mock MVD gateway</option>
              </select>
            </label>
            <label>
              <span>Провайдер Росстат</span>
              <select
                disabled={!canManageProperty}
                value={propertyForm.complianceSettings.rosstatProvider}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    complianceSettings: {
                      ...current.complianceSettings,
                      rosstatProvider: event.target.value
                    }
                  }))
                }
              >
                <option value="manual">Manual</option>
                <option value="mock_rosstat_gateway">Mock Rosstat gateway</option>
              </select>
            </label>
            {propertyMessage ? <p className="muted">{propertyMessage}</p> : null}
            {canManageProperty ? (
              <button className="primary-button" type="submit" disabled={isPropertySaving}>
                {isPropertySaving ? "Сохраняем..." : "Сохранить настройки объекта"}
              </button>
            ) : null}
          </form>
        )}
      </section>

      {canManageStaff ? (
        <section className="panel">
          <p className="eyebrow">Сотрудники</p>
          <h3>Добавить сотрудника</h3>
          <form className="form-grid" onSubmit={handleCreateStaff}>
            <label>
              <span>Имя</span>
              <input
                value={staffForm.name}
                onChange={(event) =>
                  setStaffForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Email</span>
              <input
                value={staffForm.email}
                onChange={(event) =>
                  setStaffForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="Необязательно"
              />
            </label>
            <label>
              <span>Роль</span>
              <select
                value={staffForm.role}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    role: event.target.value as typeof current.role
                  }))
                }
              >
                <option value="manager">Управляющий</option>
                <option value="frontdesk">Администратор</option>
                <option value="housekeeping">Уборка</option>
                <option value="maintenance">Техслужба</option>
                <option value="accountant">Бухгалтер</option>
              </select>
            </label>
            <label>
              <span>Доступ в Шахматке</span>
              <select
                value={staffForm.azAccessRole}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    azAccessRole: event.target.value as typeof current.azAccessRole
                  }))
                }
              >
                <option value="admin">Админ</option>
                <option value="staff">Сотрудник</option>
              </select>
            </label>
            <label>
              <span>PIN</span>
              <input
                value={staffForm.pin}
                onChange={(event) =>
                  setStaffForm((current) => ({ ...current, pin: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Быстрая разблокировка</span>
              <select
                value={staffForm.quickUnlockEnabled ? "on" : "off"}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    quickUnlockEnabled: event.target.value === "on"
                  }))
                }
              >
                <option value="on">Включена</option>
                <option value="off">Выключена</option>
              </select>
            </label>
            <button className="primary-button" type="submit">Создать сотрудника</button>
            {staffMessage ? <p className="muted">{staffMessage}</p> : null}
          </form>
          <div className="status-actions">
            <Link className="secondary-link" to="/shahmatka/users">
              Открыть управление пользователями
            </Link>
          </div>
        </section>
      ) : null}

      {hasAnyRole(["owner", "manager"]) ? (
        <section className="panel">
          <p className="eyebrow">Номерной фонд</p>
          <h3>Добавить номер</h3>
          <form className="form-grid" onSubmit={handleCreateRoom}>
            <label>
              <span>Номер</span>
              <input
                value={roomForm.number}
                onChange={(event) =>
                  setRoomForm((current) => ({ ...current, number: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Тип номера</span>
              <input
                value={roomForm.roomType}
                onChange={(event) =>
                  setRoomForm((current) => ({ ...current, roomType: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Приоритет</span>
              <select
                value={roomForm.priority}
                onChange={(event) =>
                  setRoomForm((current) => ({
                    ...current,
                    priority: event.target.value as typeof current.priority
                  }))
                }
              >
                <option value="normal">Обычный</option>
                <option value="arrival_soon">Скорый заезд</option>
                <option value="blocked">Блок</option>
              </select>
            </label>
            <button className="primary-button" type="submit">Добавить номер</button>
            {roomMessage ? <p className="muted">{roomMessage}</p> : null}
          </form>
          <p className="muted">Сейчас настроено номеров: {rooms.length}.</p>
          <div className="status-actions">
            <Link className="secondary-link" to="/setup">
              Открыть чек-лист запуска
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
