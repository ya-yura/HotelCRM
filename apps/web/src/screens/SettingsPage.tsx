import { useState } from "react";
import { Link } from "react-router-dom";
import { createRoomRequest, createStaffUserRequest } from "../lib/api";
import { azAccessRoleLabel, roleLabel } from "../lib/ru";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";

export function SettingsPage() {
  const { session, users, logout, refreshUsers, hasAnyAzAccess } = useAuth();
  const { rooms, reloadFromRemote } = useHotelStore();
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "frontdesk" as "frontdesk" | "housekeeping" | "accountant",
    azAccessRole: "staff" as "admin" | "staff",
    pin: ""
  });
  const [roomForm, setRoomForm] = useState({
    number: "",
    roomType: "Стандарт",
    priority: "normal" as "normal" | "arrival_soon" | "blocked"
  });
  const [message, setMessage] = useState("");

  async function handleCreateStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await createStaffUserRequest(staffForm);
      await refreshUsers();
      setStaffForm({ name: "", role: "frontdesk", azAccessRole: "staff", pin: "" });
      setMessage("Сотрудник создан.");
    } catch {
      setMessage("Не удалось создать сотрудника.");
    }
  }

  async function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await createRoomRequest(roomForm);
      await reloadFromRemote();
      setRoomForm({ number: "", roomType: "Стандарт", priority: "normal" });
      setMessage("Номер добавлен.");
    } catch {
      setMessage("Не удалось добавить номер.");
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <h2>Настройки</h2>
        <p>Здесь находятся сессия, сотрудники, номера и базовая настройка работы отеля.</p>
      </section>

      <section className="panel">
        <p className="eyebrow">Текущая сессия</p>
        <h3>{session?.userName ?? "Нет активной сессии"}</h3>
        <p className="muted">Отель: {session?.propertyName ?? "не указан"}</p>
        <p className="muted">Роль: {roleLabel(session?.role)}</p>
        <p className="muted">Доступ в Шахматке: {azAccessRoleLabel(session?.azAccessRole)}</p>
        <p className="muted">Вход выполнен: {session?.createdAt ?? "неизвестно"}</p>
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
            <p className="muted">{user.pinHint}</p>
          </article>
        ))}
      </section>

      {hasAnyAzAccess(["admin"]) ? (
        <>
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
                  <option value="frontdesk">Администратор</option>
                  <option value="housekeeping">Уборка</option>
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
              <button className="primary-button" type="submit">Создать сотрудника</button>
            </form>
            <div className="status-actions">
              <Link className="secondary-link" to="/shahmatka/users">
                Открыть управление пользователями
              </Link>
            </div>
          </section>

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
            </form>
            <p className="muted">Сейчас настроено номеров: {rooms.length}.</p>
            <div className="status-actions">
              <Link className="secondary-link" to="/setup">
                Открыть чек-лист запуска
              </Link>
            </div>
          </section>
        </>
      ) : null}

      {message ? (
        <section className="panel">
          <p className="muted">{message}</p>
        </section>
      ) : null}
    </div>
  );
}

