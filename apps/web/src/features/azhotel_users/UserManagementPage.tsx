import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { azAccessRoleLabel, roleLabel } from "../../lib/ru";
import { createStaffUserRequest } from "../../lib/api";
import { deriveOnboardingState, withGuideMode } from "../../lib/onboarding";
import { useAuth } from "../../state/authStore";
import { useHotelStore } from "../../state/hotelStore";

export function UserManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { session, users, refreshUsers } = useAuth();
  const { rooms, reservations, stays, payments } = useHotelStore();
  const [form, setForm] = useState({
    name: "",
    role: "frontdesk" as "manager" | "frontdesk" | "housekeeping" | "maintenance" | "accountant",
    azAccessRole: "staff" as "admin" | "staff",
    email: "",
    pin: "",
    quickUnlockEnabled: true
  });
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const onboarding = deriveOnboardingState({
    session,
    users,
    rooms,
    reservations,
    stays,
    payments
  });
  const isGuideMode = searchParams.get("guide") === "1";
  const onboardingNotice =
    typeof location.state === "object" && location.state && "onboardingNotice" in location.state
      ? String((location.state as { onboardingNotice?: string }).onboardingNotice ?? "")
      : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    try {
      await createStaffUserRequest({
        ...form,
        email: form.email.trim() || undefined
      });
      await refreshUsers();
      setForm({
        name: "",
        role: "frontdesk",
        azAccessRole: "staff",
        email: "",
        pin: "",
        quickUnlockEnabled: true
      });
      if (isGuideMode && onboarding.isOwner) {
        navigate(withGuideMode("/shahmatka/bookings/new"), {
          state: { onboardingNotice: "Сотрудник создан. Теперь заведём первую бронь." }
        });
        return;
      }
      setMessage("Вторичный аккаунт создан.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось создать пользователя.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Пользователи</p>
        <h2>Управление вторичными аккаунтами</h2>
        <p className="muted">Админ может создавать дополнительные аккаунты и задавать для них уровень доступа: админ или сотрудник.</p>
        {onboarding.isOwner && (isGuideMode || onboarding.nextStep?.id === "staff") ? (
          <div className="panel inset-panel guide-panel">
            <p className="eyebrow">Шаг 2 из 4</p>
            <h3>Теперь добавьте хотя бы одного сотрудника</h3>
            <p className="muted">
              Для первого запуска хватит одного администратора или сотрудника уборки. Главное, чтобы работа не велась под владельцем.
            </p>
          </div>
        ) : null}
        {onboardingNotice ? <p className="muted">{onboardingNotice}</p> : null}
      </section>

      <section className="panel">
        <p className="eyebrow">Новый пользователь</p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Имя</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label>
            <span>Уровень доступа в Шахматке</span>
            <select
              value={form.azAccessRole}
              onChange={(event) =>
                setForm((current) => ({
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
            <span>Операционная роль</span>
            <select
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value as typeof current.role
                }))
              }
            >
              <option value="manager">Управляющий</option>
              <option value="frontdesk">Администратор стойки</option>
              <option value="housekeeping">Уборка</option>
              <option value="maintenance">Техслужба</option>
              <option value="accountant">Бухгалтер</option>
            </select>
          </label>
          <label>
            <span>Email</span>
            <input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
          <label>
            <span>PIN для входа</span>
            <input
              value={form.pin}
              onChange={(event) => setForm((current) => ({ ...current, pin: event.target.value }))}
            />
          </label>
          <label>
            <span>Быстрая разблокировка</span>
            <select
              value={form.quickUnlockEnabled ? "on" : "off"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  quickUnlockEnabled: event.target.value === "on"
                }))
              }
            >
              <option value="on">Включена</option>
              <option value="off">Выключена</option>
            </select>
          </label>
          {message ? <p className="muted">{message}</p> : null}
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "Создаём..." : "Создать аккаунт"}
          </button>
        </form>
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
    </div>
  );
}

