import { useEffect, useState } from "react";
import type { AISearchResult, BookingParseResult } from "@hotel-crm/shared/ai";
import {
  draftGuestMessageRequest,
  parseBookingTextRequest,
  searchWithAIRequest
} from "../lib/api";
import { useHotelStore } from "../state/hotelStore";

export function SearchPage() {
  const { searchRecords } = useHotelStore();
  const [query, setQuery] = useState("");
  const [rawBookingText, setRawBookingText] = useState(
    "Семья Ивановых, заезд 26-го, выезд 29-го, нужен семейный номер, приедут после обеда"
  );
  const [searchResults, setSearchResults] = useState<AISearchResult[]>([]);
  const [parsedBooking, setParsedBooking] = useState<BookingParseResult | null>(null);
  const [messageDraft, setMessageDraft] = useState<{ message: string; confidence: number } | null>(
    null
  );
  const localResults = searchRecords(query);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      void searchWithAIRequest(query)
        .then((results) => setSearchResults(results))
        .catch(() => setSearchResults([]));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  async function handleParseBooking() {
    const result = await parseBookingTextRequest(rawBookingText);
    setParsedBooking(result);
    const draft = await draftGuestMessageRequest(
      result.guestName,
      result.needsReview ? "confirmation" : "arrival"
    );
    setMessageDraft(draft);
  }

  return (
    <div className="screen">
      <section className="panel">
        <p className="eyebrow">Поиск и ИИ</p>
        <h2>Поиск по системе и помощь с неструктурированными сообщениями</h2>
        <p className="muted">
          Обычный поиск остаётся основой, а ИИ помогает разобрать человеческие фразы и вставленный текст брони.
        </p>
      </section>

      <section className="panel">
        <label className="form-grid">
          <span>Поиск обычными словами</span>
          <input
            placeholder="семья со вчерашнего дня в 203"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      <section className="screen">
        {[...searchResults, ...localResults.filter((local) => !searchResults.some((remote) => remote.id === local.id))].map((result) => (
          <article className="panel" key={result.id}>
            <p className="eyebrow">{result.entityType}</p>
            <h3>{result.title}</h3>
            <p className="muted">{result.subtitle}</p>
            <p className="muted">Почему найдено: {result.reason}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <p className="eyebrow">Разбор брони</p>
        <label className="form-grid">
          <span>Вставьте сообщение гостя или текст из OTA</span>
          <textarea
            className="text-area"
            value={rawBookingText}
            onChange={(event) => setRawBookingText(event.target.value)}
          />
        </label>
        <div className="status-actions">
          <button className="primary-button" type="button" onClick={() => void handleParseBooking()}>
            Разобрать текст
          </button>
        </div>

        {parsedBooking ? (
          <>
            <h3>{parsedBooking.guestName}</h3>
            <p className="muted">
              {parsedBooking.checkInDate} - {parsedBooking.checkOutDate} • предполагаемый тип номера {parsedBooking.roomTypeHint}
            </p>
            <p className="muted">
              Уверенность {Math.round(parsedBooking.confidence * 100)}% •{" "}
              {parsedBooking.needsReview ? "Нужна проверка человеком" : "Можно подтверждать"}
            </p>
          </>
        ) : null}

        {messageDraft ? (
          <article className="panel">
            <p className="eyebrow">Черновик сообщения гостю</p>
            <p className="muted">{messageDraft.message}</p>
            <p className="muted">Уверенность {Math.round(messageDraft.confidence * 100)}%</p>
          </article>
        ) : null}
      </section>
    </div>
  );
}
