import { Link, useNavigate } from "react-router-dom";
import { markAzHotelOnboardingSeen } from "../../lib/azhotel";
import { deriveOnboardingState, withGuideMode } from "../../lib/onboarding";
import { useAuth } from "../../state/authStore";
import { useHotelStore } from "../../state/hotelStore";

export function AzHotelWhatsNewPage() {
  const { session, users, hasAnyRole, hasAnyAzAccess } = useAuth();
  const { rooms, reservations, stays, payments } = useHotelStore();
  const navigate = useNavigate();
  const onboarding = deriveOnboardingState({
    session,
    users,
    rooms,
    reservations,
    stays,
    payments
  });

  function handleContinue(nextPath = "/shahmatka") {
    markAzHotelOnboardingSeen(session);
    void navigate(nextPath, { replace: true });
  }

  const ownerHighlights = [
    {
      title: "Проверьте запуск отеля",
      detail: "Система сама показывает, чего ещё не хватает до нормальной ежедневной работы.",
      to: "/setup"
    },
    {
      title: "Откройте шахматку",
      detail: "Там уже можно видеть номера, брони и быстро двигаться по смене.",
      to: "/shahmatka/bookings"
    },
    {
      title: "Добавьте сотрудников",
      detail: "Сразу раздайте доступ администраторам и уборке по ролям.",
      to: "/shahmatka/users"
    }
  ];

  const staffHighlights = [
    ...(hasAnyRole(["frontdesk"]) ? [{ title: "Начать с обзора дня", detail: "Заезды, выезды и срочные задачи на одном экране.", to: "/shahmatka/today" }] : []),
    ...(hasAnyRole(["frontdesk"]) ? [{ title: "Открыть брони", detail: "Шахматка и быстрые действия по гостям без лишних переходов.", to: "/shahmatka/bookings" }] : []),
    ...(hasAnyRole(["housekeeping"]) ? [{ title: "Открыть уборку", detail: "Видны только ваши задачи и грязные номера, которые нужно выпустить.", to: "/shahmatka/housekeeping/tasks" }] : []),
    ...(hasAnyRole(["accountant"]) ? [{ title: "Открыть оплаты", detail: "Работа с долгами и движением по счёту гостей.", to: "/payments" }] : [])
  ];

  const highlights = onboarding.isOwner ? ownerHighlights : staffHighlights;

  return (
    <div className="screen">
      <section className="hero-panel">
        <p className="eyebrow">Первый запуск Шахматки</p>
        <h2>
          {onboarding.isOwner
            ? "Доведём отель до рабочего состояния без лишней суеты."
            : "Покажем только те разделы, которые нужны вам в смене."}
        </h2>
        <p className="muted">
          {onboarding.isOwner
            ? "Шахматка должна быстро привести владельца от пустого аккаунта к первому рабочему дню: номера, сотрудники, бронь и первая живая операция."
            : "Сотруднику не нужен длинный тур. Лучше сразу показать свой рабочий контур и короткий путь к ежедневным действиям."}
        </p>
      </section>

      {onboarding.isOwner ? (
        <>
          <section className="grid">
            <article className="card tone-info">
              <p className="card-title">Прогресс запуска</p>
              <strong className="card-value">
                {onboarding.completedSteps}/{onboarding.totalSteps}
              </strong>
              <p className="card-detail">
                {onboarding.isComplete ? "Базовый запуск завершён" : "Осталось довести запуск до рабочего состояния"}
              </p>
            </article>
            {onboarding.nextStep ? (
              <article className="card tone-success">
                <p className="card-title">Следующий шаг</p>
                <strong className="card-value">{onboarding.nextStep.title}</strong>
                <p className="card-detail">{onboarding.nextStep.detail}</p>
              </article>
            ) : null}
          </section>

          <section className="screen">
            {onboarding.steps.map((step) => (
              <article className="panel" key={step.id}>
                <p className="eyebrow">{step.done ? "Готово" : "Нужно сделать"}</p>
                <h3>{step.title}</h3>
                <p className="muted">{step.detail}</p>
                <Link
                  className="secondary-link"
                  to={withGuideMode(step.cta)}
                  onClick={() => handleContinue(withGuideMode(step.cta))}
                >
                  {step.label}
                </Link>
              </article>
            ))}
          </section>
        </>
      ) : null}

      <section className="panel">
        <p className="eyebrow">{onboarding.isOwner ? "Быстрый старт" : "Ваш рабочий контур"}</p>
        <h3>{onboarding.isOwner ? "С чего лучше начать прямо сейчас" : "Куда идти без лишних экранов"}</h3>
        <div className="quick-actions-grid">
          {highlights.map((item) => (
            <Link
              className="quick-action-card"
              key={item.to}
              to={onboarding.isOwner ? withGuideMode(item.to) : item.to}
              onClick={() => handleContinue(onboarding.isOwner ? withGuideMode(item.to) : item.to)}
            >
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </Link>
          ))}
        </div>
      </section>

      {hasAnyAzAccess(["admin"]) ? (
        <section className="panel">
          <p className="eyebrow">Что появилось в системе</p>
          <div className="screen">
            <article className="panel inset-panel">
              <h3>Одна связанная логика вместо набора экранов</h3>
              <p className="muted">
                Брони, заселение, уборка, отчёты и сотрудники больше не живут отдельно друг от друга.
              </p>
            </article>
            <article className="panel inset-panel">
              <h3>Роли и рабочие маршруты</h3>
              <p className="muted">
                Владелец видит весь запуск, а сотрудник получает только нужный ему контур работы.
              </p>
            </article>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="status-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() =>
              handleContinue(
                onboarding.isOwner && !onboarding.isComplete ? withGuideMode("/setup") : "/shahmatka"
              )
            }
          >
            {onboarding.isOwner && !onboarding.isComplete ? "Продолжить запуск" : "Перейти к работе"}
          </button>
          <Link className="secondary-link" to="/shahmatka" onClick={() => handleContinue("/shahmatka")}>
            Закрыть онбординг
          </Link>
        </div>
      </section>
    </div>
  );
}
