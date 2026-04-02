import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type {
  AzPriceRule,
  AzRoom,
  AzRoomCreate
} from "@hotel-crm/shared/features/azhotel_core";
import {
  createAzRoomRequest,
  loadAzRoomRequest,
  updateAzRoomRequest
} from "../../lib/api";
import { deriveOnboardingState, withGuideMode } from "../../lib/onboarding";
import { useAuth } from "../../state/authStore";
import { useHotelStore } from "../../state/hotelStore";
import { azRoomStatusLabel, createDefaultAzRoomForm } from "./roomLabels";

function createRule() {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    title: "",
    daysOfWeek: [],
    multiplier: 1
  } satisfies AzPriceRule;
}

export function RoomFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { session, users } = useAuth();
  const { rooms, reservations, stays, payments } = useHotelStore();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<AzRoomCreate>(createDefaultAzRoomForm());
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(isEdit);
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

  useEffect(() => {
    if (!id) {
      return;
    }

    setIsLoading(true);
    void loadAzRoomRequest(id)
      .then((room) =>
        setForm({
          type: room.type,
          number: room.number,
          priceRules: room.priceRules,
          status: room.status
        })
      )
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить номер")
      )
      .finally(() => setIsLoading(false));
  }, [id]);

  function updateRule(ruleId: string, patch: Partial<AzPriceRule>) {
    setForm((current) => ({
      ...current,
      priceRules: current.priceRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule
      )
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      if (id) {
        await updateAzRoomRequest(id, form);
        navigate(isGuideMode ? withGuideMode("/shahmatka/rooms") : "/shahmatka/rooms");
      } else {
        await createAzRoomRequest(form);
        if (isGuideMode && onboarding.isOwner) {
          navigate(withGuideMode("/shahmatka/users"), {
            state: { onboardingNotice: "Номер добавлен. Теперь добавим хотя бы одного сотрудника." }
          });
          return;
        }
        navigate(isGuideMode ? withGuideMode("/shahmatka/rooms") : "/shahmatka/rooms");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить номер");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Шахматка · Номера</p>
        <h2>{isEdit ? "Редактирование номера" : "Новый номер"}</h2>
        <p className="muted">
          Форма работает в отдельном контуре Шахматки и не трогает существующие экраны управления номерами.
        </p>
        {onboarding.isOwner && isGuideMode && !isEdit ? (
          <div className="panel inset-panel guide-panel">
            <p className="eyebrow">Шаг 1 из 4</p>
            <h3>Добавьте первый рабочий номер</h3>
            <p className="muted">
              Достаточно одного номера и одной цены, чтобы пройти первый полный сценарий от брони до выезда.
            </p>
          </div>
        ) : null}
      </section>

      {isLoading ? (
        <section className="panel">
          <p className="muted">Загружаем данные номера...</p>
        </section>
      ) : (
        <section className="panel">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              <span>Номер</span>
              <input
                value={form.number}
                onChange={(event) =>
                  setForm((current) => ({ ...current, number: event.target.value }))
                }
                placeholder="101"
              />
            </label>

            <label>
              <span>Тип номера</span>
              <input
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, type: event.target.value }))
                }
                placeholder="standard"
              />
            </label>

            <label>
              <span>Статус</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as AzRoom["status"]
                  }))
                }
              >
                <option value="available">{azRoomStatusLabel("available")}</option>
                <option value="occupied">{azRoomStatusLabel("occupied")}</option>
                <option value="clean">{azRoomStatusLabel("clean")}</option>
                <option value="dirty">{azRoomStatusLabel("dirty")}</option>
              </select>
            </label>

            <div className="panel inset-panel">
              <p className="eyebrow">Правила цены</p>
              <div className="screen compact-stack">
                {form.priceRules.map((rule) => (
                  <div className="panel inset-panel" key={rule.id}>
                    <label>
                      <span>Название правила</span>
                      <input
                        value={rule.title}
                        onChange={(event) => updateRule(rule.id, { title: event.target.value })}
                        placeholder="Будний день"
                      />
                    </label>
                    <label>
                      <span>Множитель</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        value={rule.multiplier}
                        onChange={(event) =>
                          updateRule(rule.id, { multiplier: Number(event.target.value) || 1 })
                        }
                      />
                    </label>
                    <label>
                      <span>Фиксированная цена</span>
                      <input
                        type="number"
                        min="0"
                        value={rule.fixedPrice ?? ""}
                        onChange={(event) =>
                          updateRule(rule.id, {
                            fixedPrice:
                              event.target.value === ""
                                ? undefined
                                : Number(event.target.value)
                          })
                        }
                      />
                    </label>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          priceRules: current.priceRules.filter((item) => item.id !== rule.id)
                        }))
                      }
                      disabled={form.priceRules.length === 1}
                    >
                      Удалить правило
                    </button>
                  </div>
                ))}
              </div>
              <div className="status-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      priceRules: [...current.priceRules, createRule()]
                    }))
                  }
                >
                  Добавить правило цены
                </button>
              </div>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <div className="status-actions">
              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Сохраняем..." : "Сохранить"}
              </button>
              <Link className="secondary-link" to={isGuideMode ? withGuideMode("/shahmatka/rooms") : "/shahmatka/rooms"}>
                Назад к списку
              </Link>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

