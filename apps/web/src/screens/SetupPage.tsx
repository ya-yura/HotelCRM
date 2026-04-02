import { Link } from "react-router-dom";
import { deriveOnboardingState, withGuideMode } from "../lib/onboarding";
import { useAuth } from "../state/authStore";
import { useHotelStore } from "../state/hotelStore";

export function SetupPage() {
  const { session, users } = useAuth();
  const { rooms, reservations, stays, payments } = useHotelStore();
  const onboarding = deriveOnboardingState({
    session,
    users,
    rooms,
    reservations,
    stays,
    payments
  });

  return (
    <div className="screen">
      <section className="hero-panel">
        <p className="eyebrow">Запуск отеля</p>
        <h2>Настройка {session?.propertyName ?? "объекта"}</h2>
        <p className="muted">
          От пустого аккаунта до рабочего отеля за несколько простых шагов. Всё считается автоматически по реальным данным системы.
        </p>
      </section>

      <section className="grid">
        <article className="card tone-info">
          <p className="card-title">Прогресс запуска</p>
          <strong className="card-value">{onboarding.completedSteps}/{onboarding.totalSteps}</strong>
          <p className="card-detail">
            {onboarding.isComplete ? "Отель готов к ежедневной работе" : "Ключевые шаги уже сделаны"}
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
          <article className="panel" key={step.title}>
            <p className="eyebrow">{step.done ? "Готово" : "Следующий шаг"}</p>
            <h3>{step.title}</h3>
            <p className="muted">{step.detail}</p>
            <Link className="secondary-link" to={withGuideMode(step.cta)}>
              {step.label}
            </Link>
          </article>
        ))}
      </section>

      {!onboarding.isComplete ? (
        <section className="panel">
          <p className="eyebrow">Подсказка</p>
          <h3>Лучше всего запускать отель именно в таком порядке</h3>
          <p className="muted">
            Сначала номерной фонд, затем сотрудники, потом первая бронь и только после этого первый тестовый рабочий день.
            Так меньше шансов запутаться в статусах, правах и назначении номеров.
          </p>
        </section>
      ) : (
        <section className="panel">
          <p className="eyebrow">Готово</p>
          <h3>Базовый запуск завершён</h3>
          <p className="muted">
            Теперь можно вести смену через обзор дня, шахматку, заезды и уборку без дополнительных обходных сценариев.
          </p>
          <div className="status-actions">
            <Link className="secondary-link" to="/shahmatka">
              Открыть Шахматку
            </Link>
            <Link className="secondary-link" to="/today">
              Открыть обзор дня
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
