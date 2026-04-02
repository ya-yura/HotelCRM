import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../state/authStore";

type Mode = "login" | "signup";

export function LoginPage() {
  const { session, login, registerOwner, isLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("signup");
  const [loginForm, setLoginForm] = useState({
    identifier: "",
    secret: "",
    deviceLabel: "Стойка ресепшен"
  });
  const [signupForm, setSignupForm] = useState({
    ownerName: "",
    hotelName: "",
    email: "",
    password: "",
    city: "",
    timezone: "Europe/Moscow",
    currency: "RUB",
    address: "",
    propertyType: "small_hotel" as "small_hotel" | "hostel" | "guest_house" | "glamping"
  });
  const [error, setError] = useState("");

  function validateSignupForm() {
    if (signupForm.ownerName.trim().length < 2) {
      return "Укажите имя владельца: минимум 2 символа.";
    }
    if (signupForm.hotelName.trim().length < 2) {
      return "Укажите название отеля: минимум 2 символа.";
    }
    if (!signupForm.email.includes("@")) {
      return "Введите корректный email.";
    }
    if (signupForm.password.length < 6) {
      return "Пароль должен быть не короче 6 символов.";
    }
    if (signupForm.city.trim().length < 2) {
      return "Укажите город.";
    }
    if (signupForm.address.trim().length < 3) {
      return "Укажите адрес: минимум 3 символа.";
    }
    return "";
  }

  if (session) {
    return <Navigate to="/shahmatka" replace />;
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await login(loginForm.identifier, loginForm.secret, loginForm.deviceLabel);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Неверный логин, ID сотрудника, пароль или PIN.");
    }
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validationError = validateSignupForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await registerOwner(signupForm);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось создать аккаунт отеля. Проверьте поля и попробуйте ещё раз."
      );
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Запуск отеля</p>
        <h2>Создайте рабочее пространство отеля или войдите в систему</h2>
        <p className="muted">
          Сначала владелец создаёт аккаунт отеля. После этого внутри системы добавляются сотрудники, номера и брони.
        </p>
        <div className="status-actions">
          <button className="secondary-button" type="button" onClick={() => setMode("signup")}>
            Создать отель
          </button>
          <button className="secondary-button" type="button" onClick={() => setMode("login")}>
            Войти
          </button>
        </div>
      </section>

      <section className="panel">
        {isLoading ? <p className="muted">Загружаем сессию...</p> : null}

        {mode === "signup" ? (
          <form className="form-grid" onSubmit={handleSignup}>
            <label>
              <span>Ваше имя</span>
              <input
                value={signupForm.ownerName}
                onChange={(event) => setSignupForm((current) => ({ ...current, ownerName: event.target.value }))}
                placeholder="Например, Анна Петрова"
              />
            </label>
            <label>
              <span>Название отеля</span>
              <input
                value={signupForm.hotelName}
                onChange={(event) => setSignupForm((current) => ({ ...current, hotelName: event.target.value }))}
                placeholder="Например, Гостиный двор"
              />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={signupForm.email} onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label>
              <span>Пароль</span>
              <input
                type="password"
                value={signupForm.password}
                onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Минимум 6 символов"
              />
            </label>
            <label>
              <span>Тип объекта</span>
              <select
                value={signupForm.propertyType}
                onChange={(event) =>
                  setSignupForm((current) => ({
                    ...current,
                    propertyType: event.target.value as typeof current.propertyType
                  }))
                }
              >
                <option value="small_hotel">Небольшой отель</option>
                <option value="hostel">Хостел</option>
                <option value="guest_house">Гостевой дом</option>
                <option value="glamping">Глэмпинг</option>
              </select>
            </label>
            <label>
              <span>Город</span>
              <input
                value={signupForm.city}
                onChange={(event) => setSignupForm((current) => ({ ...current, city: event.target.value }))}
                placeholder="Например, Казань"
              />
            </label>
            <label>
              <span>Часовой пояс</span>
              <input value={signupForm.timezone} onChange={(event) => setSignupForm((current) => ({ ...current, timezone: event.target.value }))} />
            </label>
            <label>
              <span>Валюта</span>
              <input value={signupForm.currency} onChange={(event) => setSignupForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} />
            </label>
            <label>
              <span>Адрес</span>
              <input
                value={signupForm.address}
                onChange={(event) => setSignupForm((current) => ({ ...current, address: event.target.value }))}
                placeholder="Город, улица, дом"
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="primary-button" type="submit">
              Создать аккаунт отеля
            </button>
          </form>
        ) : (
          <form className="form-grid" onSubmit={handleLogin}>
            <label>
              <span>Email владельца или ID сотрудника</span>
              <input value={loginForm.identifier} onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))} />
            </label>
            <label>
              <span>Пароль или PIN</span>
              <input type="password" value={loginForm.secret} onChange={(event) => setLoginForm((current) => ({ ...current, secret: event.target.value }))} />
            </label>
            <label>
              <span>Название устройства</span>
              <input
                value={loginForm.deviceLabel}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, deviceLabel: event.target.value }))
                }
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="primary-button" type="submit">
              Войти
            </button>
            <p className="muted">Владелец входит по email и паролю. Сотрудник входит по своему ID и PIN. Название устройства попадёт в журнал входов.</p>
          </form>
        )}
      </section>
    </div>
  );
}
