import type {
  ComplianceDataset,
  ComplianceDocument,
  ComplianceIssue,
  ComplianceKind,
  ComplianceProvider,
  ComplianceReadiness,
  ComplianceSubmission
} from "@hotel-crm/shared/compliance";
import type { GuestProfile } from "@hotel-crm/shared/guests";
import type { PropertySummary } from "@hotel-crm/shared/properties";
import type { ReservationSummary } from "@hotel-crm/shared/reservations";
import type { StayMigrationStatus, StayRecord } from "@hotel-crm/shared/stays";
import { getHotelData, updateHotelData } from "./dataStore";
import { resolveComplianceAdapter } from "./complianceAdapters";

type ReservationComplianceContext = {
  property: PropertySummary;
  reservation: ReservationSummary;
  guest: GuestProfile | null;
  stay: StayRecord | null;
  submissions: ComplianceSubmission[];
};

function isForeignCitizen(citizenship?: string | null) {
  return (citizenship ?? "").trim().toUpperCase() !== "" && (citizenship ?? "").trim().toUpperCase() !== "RU";
}

function maskDocumentNumber(value?: string | null) {
  const normalized = (value ?? "").replace(/\s+/g, "");
  if (!normalized) {
    return "";
  }
  if (normalized.length <= 4) {
    return normalized;
  }
  return `${"*".repeat(Math.max(normalized.length - 4, 0))}${normalized.slice(-4)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function getProviderForKind(property: PropertySummary, kind: ComplianceKind): ComplianceProvider {
  if (kind === "mvd") {
    return (property.complianceSettings.mvdProvider as ComplianceProvider) ?? "manual";
  }
  if (kind === "rosstat") {
    return (property.complianceSettings.rosstatProvider as ComplianceProvider) ?? "manual";
  }
  return "manual";
}

async function getReservationComplianceContext(
  propertyId: string,
  reservationId: string
): Promise<ReservationComplianceContext | null> {
  const data = await getHotelData();
  const property = data.properties.find((item) => item.id === propertyId);
  const reservation = data.reservations.find(
    (item) => item.propertyId === propertyId && item.id === reservationId
  );

  if (!property || !reservation) {
    return null;
  }

  const guest = reservation.guestId
    ? data.guests.find(
        (item) =>
          item.propertyId === propertyId &&
          item.id === reservation.guestId &&
          !item.mergedIntoGuestId
      ) ?? null
    : null;
  const stay =
    data.stays.find(
      (item) =>
        item.propertyId === propertyId &&
        item.reservationId === reservationId &&
        item.status === "active"
    ) ?? null;
  const submissions = data.complianceSubmissions
    .filter((item) => item.propertyId === propertyId && item.entityId === reservationId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    property,
    reservation,
    guest,
    stay,
    submissions
  };
}

function buildComplianceIssues(context: ReservationComplianceContext) {
  const issues: ComplianceIssue[] = [];
  const missingFields: string[] = [];
  const requiredDocuments: string[] = [];
  const suggestedActions: string[] = [];
  const profileChecklist = {
    hasIdentity: Boolean(context.guest?.fullName || context.reservation.guestName),
    hasContact: Boolean(
      context.guest?.phone ||
        context.guest?.email ||
        context.reservation.guestPhone ||
        context.reservation.guestEmail
    ),
    hasBirthDate: Boolean(context.guest?.birthDate),
    hasCitizenship: Boolean(context.guest?.citizenship),
    hasAddress: Boolean(context.guest?.residentialAddress),
    hasArrivalPurpose: Boolean(context.guest?.arrivalPurpose),
    hasDocument: Boolean(context.guest?.document?.number),
    hasDocumentIssueData: Boolean(context.guest?.document?.issuedBy && context.guest?.document?.issuedAt)
  };

  const guestProfileComplete =
    profileChecklist.hasIdentity &&
    profileChecklist.hasContact &&
    profileChecklist.hasBirthDate &&
    profileChecklist.hasCitizenship &&
    profileChecklist.hasAddress;

  if (!context.reservation.guestId) {
    missingFields.push("guestId");
    issues.push({
      field: "guestId",
      message: "Бронь не связана с карточкой гостя.",
      severity: "error"
    });
    suggestedActions.push("Сохраните карточку гостя в брони, чтобы создать профиль и историю проживания.");
  }

  if (!profileChecklist.hasContact) {
    issues.push({
      field: "contact",
      message: "Для операционной связи у гостя не заполнен телефон или email.",
      severity: "warning"
    });
    suggestedActions.push("Добавьте телефон или email гостя для предзаездной связи и оплаты.");
  }

  if (!profileChecklist.hasCitizenship) {
    missingFields.push("citizenship");
    issues.push({
      field: "citizenship",
      message: "Не указано гражданство гостя.",
      severity: "error"
    });
    suggestedActions.push("Заполните гражданство в карточке гостя.");
  }

  if (!profileChecklist.hasAddress) {
    issues.push({
      field: "residentialAddress",
      message: "Не указан адрес проживания гостя.",
      severity: "warning"
    });
    suggestedActions.push("Добавьте адрес проживания, чтобы карточка гостя была полной.");
  }

  if (!profileChecklist.hasArrivalPurpose) {
    issues.push({
      field: "arrivalPurpose",
      message: "Не указана цель приезда.",
      severity: "warning"
    });
    suggestedActions.push("Укажите цель поездки, чтобы отчеты по гостям были полными.");
  }

  if (context.property.complianceSettings.requireBirthDateBeforeCheckIn && !profileChecklist.hasBirthDate) {
    missingFields.push("birthDate");
    issues.push({
      field: "birthDate",
      message: "Дата рождения обязательна до завершения check-in.",
      severity: "error"
    });
    suggestedActions.push("Заполните дату рождения гостя перед заселением.");
  }

  if (context.property.complianceSettings.requireDocumentBeforeCheckIn) {
    requiredDocuments.push("Документ, удостоверяющий личность");

    if (!profileChecklist.hasDocument) {
      missingFields.push("document.number");
      issues.push({
        field: "document.number",
        message: "Номер документа обязателен до завершения check-in.",
        severity: "error"
      });
      suggestedActions.push("Введите номер и тип документа в карточке гостя.");
    }

    if (!context.guest?.document?.type) {
      missingFields.push("document.type");
      issues.push({
        field: "document.type",
        message: "Не выбран тип документа.",
        severity: "error"
      });
    }

    if (profileChecklist.hasDocument && !profileChecklist.hasDocumentIssueData) {
      issues.push({
        field: "document.issuedBy",
        message: "Карточка документа заполнена не полностью: нет даты или органа выдачи.",
        severity: "warning"
      });
      suggestedActions.push("Добавьте дату выдачи и орган выдачи документа, чтобы формы печатались без ручных правок.");
    }
  }

  const foreignGuest = isForeignCitizen(context.guest?.citizenship);
  if (foreignGuest && context.property.complianceSettings.requireMigrationCardForForeignGuests) {
    requiredDocuments.push("Миграционная карта");
    if (!context.guest?.migrationCard?.number) {
      missingFields.push("migrationCard.number");
      issues.push({
        field: "migrationCard.number",
        message: "Для иностранного гостя требуется номер миграционной карты.",
        severity: "error"
      });
      suggestedActions.push("Добавьте миграционную карту в карточке гостя до check-in.");
    }
  }

  if (foreignGuest && !context.guest?.visa?.number) {
    issues.push({
      field: "visa.number",
      message: "Для иностранного гостя не заполнена виза. Если виза не требуется, можно оставить поле пустым.",
      severity: "warning"
    });
    suggestedActions.push("При необходимости заполните визу, чтобы пакет документов был полным.");
  }

  return {
    guestProfileComplete,
    complianceReady: missingFields.length === 0,
    missingFields,
    issues,
    requiredDocuments: Array.from(new Set(requiredDocuments)),
    suggestedActions: Array.from(new Set(suggestedActions))
  };
}

function computeStayMigrationStatus(
  guest: GuestProfile | null,
  readiness: ComplianceReadiness,
  submissions: ComplianceSubmission[]
): StayMigrationStatus {
  if (!guest) {
    return readiness.complianceReady ? "ready" : "missing";
  }

  const foreignGuest = isForeignCitizen(guest.citizenship);
  if (!foreignGuest && submissions.length === 0) {
    return readiness.complianceReady ? "ready" : "missing";
  }
  if (submissions.some((item) => item.kind === "mvd" && item.status === "submitted")) {
    return "submitted";
  }
  if (submissions.some((item) => item.kind === "mvd" && item.status === "failed")) {
    return "failed";
  }
  return readiness.complianceReady ? "ready" : "missing";
}

function buildSubmissionPayload(
  context: ReservationComplianceContext,
  readiness: ComplianceReadiness
) {
  return JSON.stringify({
    reservationId: context.reservation.id,
    guestId: context.reservation.guestId ?? "",
    stayId: context.stay?.id ?? "",
    guestName: context.reservation.guestName,
    roomLabel: context.reservation.roomLabel,
    checkInDate: context.reservation.checkInDate,
    checkOutDate: context.reservation.checkOutDate,
    citizenship: context.guest?.citizenship ?? "",
    purposeOfVisit: context.guest?.arrivalPurpose ?? "",
    documentType: context.guest?.document?.type ?? "",
    documentNumberMasked: maskDocumentNumber(context.guest?.document?.number),
    migrationCardMasked: maskDocumentNumber(context.guest?.migrationCard?.number),
    complianceReady: readiness.complianceReady,
    missingFields: readiness.missingFields
  });
}

export async function getReservationComplianceReadiness(propertyId: string, reservationId: string) {
  const context = await getReservationComplianceContext(propertyId, reservationId);
  if (!context) {
    return null;
  }

  const details = buildComplianceIssues(context);
  return {
    entityType: "reservation",
    entityId: reservationId,
    guestProfileComplete: details.guestProfileComplete,
    complianceReady: details.complianceReady,
    missingFields: details.missingFields,
    issues: details.issues,
    requiredDocuments: details.requiredDocuments,
    suggestedActions: details.suggestedActions,
    submissionIds: context.submissions.map((item) => item.id)
  } satisfies ComplianceReadiness;
}

export async function listComplianceSubmissions(propertyId: string, reservationId?: string) {
  return (await getHotelData()).complianceSubmissions
    .filter(
      (item) =>
        item.propertyId === propertyId &&
        (reservationId ? item.entityId === reservationId : true)
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function prepareComplianceSubmissions(
  propertyId: string,
  reservationId: string,
  kinds: ComplianceKind[] = ["mvd", "rosstat"]
) {
  const context = await getReservationComplianceContext(propertyId, reservationId);
  if (!context) {
    return null;
  }

  const readiness = await getReservationComplianceReadiness(propertyId, reservationId);
  if (!readiness) {
    return null;
  }

  const preparedKinds = kinds.filter((kind) => kind !== "internal");
  return updateHotelData(async (data) => {
    const prepared: ComplianceSubmission[] = [];

    for (const kind of preparedKinds) {
      const currentIndex = data.complianceSubmissions.findIndex(
        (item) =>
          item.propertyId === propertyId &&
          item.entityId === reservationId &&
          item.kind === kind
      );

      const current = currentIndex >= 0 ? data.complianceSubmissions[currentIndex] : null;
      const nextStatus =
        current?.status === "submitted"
          ? "submitted"
          : current?.status === "failed" && readiness.complianceReady
            ? "corrected"
            : readiness.complianceReady
              ? "ready"
              : "draft";

      const nextSubmission: ComplianceSubmission = {
        id: current?.id ?? `comp_${kind}_${reservationId}_${Date.now()}`,
        propertyId,
        kind,
        entityType: "reservation",
        entityId: reservationId,
        status: nextStatus,
        payloadJson: buildSubmissionPayload(context, readiness),
        provider: getProviderForKind(context.property, kind),
        createdAt: current?.createdAt ?? new Date().toISOString(),
        submittedAt: current?.status === "submitted" ? current.submittedAt : null,
        errorMessage: nextStatus === "draft" ? "Submission blocked until required fields are fixed." : "",
        lastAttemptAt: current?.lastAttemptAt ?? null,
        attemptCount: current?.attemptCount ?? 0
      };

      if (currentIndex >= 0) {
        data.complianceSubmissions[currentIndex] = nextSubmission;
      } else {
        data.complianceSubmissions.unshift(nextSubmission);
      }

      prepared.push(nextSubmission);
    }

    const stayIndex = data.stays.findIndex(
      (item) =>
        item.propertyId === propertyId &&
        item.reservationId === reservationId &&
        item.status === "active"
    );
    if (stayIndex >= 0) {
      data.stays[stayIndex] = {
        ...data.stays[stayIndex],
        migrationRegistrationStatus: computeStayMigrationStatus(context.guest, readiness, prepared)
      };
    }

    return prepared.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  });
}

export async function submitComplianceSubmission(propertyId: string, submissionId: string) {
  const submission = (await getHotelData()).complianceSubmissions.find(
    (item) => item.propertyId === propertyId && item.id === submissionId
  );
  if (!submission) {
    return null;
  }

  if (submission.status === "draft") {
    return {
      ...submission,
      status: "failed" as const,
      errorMessage: "Submission is still a draft. Fix required fields before sending.",
      lastAttemptAt: new Date().toISOString(),
      attemptCount: submission.attemptCount + 1
    };
  }

  return updateHotelData(async (data) => {
    const index = data.complianceSubmissions.findIndex(
      (item) => item.propertyId === propertyId && item.id === submissionId
    );
    if (index === -1) {
      return null;
    }

    const current = data.complianceSubmissions[index];
    const adapter = resolveComplianceAdapter(current.provider);
    const result = adapter.submit(current);
    const next: ComplianceSubmission = {
      ...current,
      status: result.status,
      submittedAt: result.submittedAt,
      errorMessage: result.errorMessage,
      lastAttemptAt: new Date().toISOString(),
      attemptCount: current.attemptCount + 1
    };
    data.complianceSubmissions[index] = next;

    const stayIndex = data.stays.findIndex(
      (item) =>
        item.propertyId === propertyId &&
        item.reservationId === current.entityId &&
        item.status === "active"
    );
    if (stayIndex >= 0) {
      const reservation = data.reservations.find(
        (item) => item.propertyId === propertyId && item.id === current.entityId
      );
      const guest =
        reservation?.guestId
          ? data.guests.find(
              (item) => item.propertyId === propertyId && item.id === reservation.guestId
            ) ?? null
          : null;
      const readiness = await getReservationComplianceReadiness(propertyId, current.entityId);
      if (readiness) {
        const relatedSubmissions = data.complianceSubmissions.filter(
          (item) => item.propertyId === propertyId && item.entityId === current.entityId
        );
        data.stays[stayIndex] = {
          ...data.stays[stayIndex],
          migrationRegistrationStatus: computeStayMigrationStatus(guest, readiness, relatedSubmissions)
        };
      }
    }

    return next;
  });
}

export async function generateComplianceDocuments(propertyId: string, reservationId: string) {
  const data = await getHotelData();
  const context = await getReservationComplianceContext(propertyId, reservationId);
  if (!context) {
    return null;
  }

  const folio = data.folios.find(
    (item) => item.propertyId === propertyId && item.reservationId === reservationId
  );
  const housekeepingTasks = data.housekeepingTasks.filter(
    (item) => item.propertyId === propertyId && item.roomNumber === context.reservation.roomLabel
  );
  const maintenanceIncidents = data.maintenanceIncidents.filter(
    (item) => item.propertyId === propertyId && item.roomNumber === context.reservation.roomLabel
  );

  const documents: ComplianceDocument[] = [
    {
      kind: "registration_card",
      title: "Регистрационная карта гостя",
      fileName: `registration-card-${reservationId}.html`,
      mimeType: "text/html",
      content: `
        <section>
          <h1>${escapeHtml(context.property.name)}</h1>
          <p>${escapeHtml(context.property.address)}</p>
          <h2>Регистрационная карта</h2>
          <p><strong>Гость:</strong> ${escapeHtml(context.reservation.guestName)}</p>
          <p><strong>Гражданство:</strong> ${escapeHtml(context.guest?.citizenship ?? "-")}</p>
          <p><strong>Дата рождения:</strong> ${escapeHtml(context.guest?.birthDate ?? "-")}</p>
          <p><strong>Документ:</strong> ${escapeHtml(context.guest?.document?.type ?? "-")} ${escapeHtml(context.guest?.document?.series ?? "")} ${escapeHtml(context.guest?.document?.number ?? "-")}</p>
          <p><strong>Адрес:</strong> ${escapeHtml(context.guest?.residentialAddress ?? "-")}</p>
          <p><strong>Цель приезда:</strong> ${escapeHtml(context.guest?.arrivalPurpose ?? "-")}</p>
          <p><strong>Заезд:</strong> ${escapeHtml(context.reservation.checkInDate)}</p>
          <p><strong>Выезд:</strong> ${escapeHtml(context.reservation.checkOutDate)}</p>
          <p><strong>Номер:</strong> ${escapeHtml(context.reservation.roomLabel)}</p>
        </section>
      `.trim()
    },
    {
      kind: "stay_confirmation",
      title: "Подтверждение проживания",
      fileName: `stay-confirmation-${reservationId}.html`,
      mimeType: "text/html",
      content: `
        <section>
          <h1>Подтверждение проживания</h1>
          <p>${escapeHtml(context.property.name)} подтверждает проживание гостя ${escapeHtml(context.reservation.guestName)}.</p>
          <p><strong>Период:</strong> ${escapeHtml(context.reservation.checkInDate)} - ${escapeHtml(context.reservation.checkOutDate)}</p>
          <p><strong>Номер:</strong> ${escapeHtml(context.reservation.roomLabel)}</p>
          <p><strong>Бронь:</strong> ${escapeHtml(context.reservation.id)}</p>
          <p><strong>Статус:</strong> ${escapeHtml(context.reservation.status)}</p>
        </section>
      `.trim()
    },
    {
      kind: "invoice_summary",
      title: "Сводка по folio",
      fileName: `invoice-summary-${reservationId}.html`,
      mimeType: "text/html",
      content: `
        <section>
          <h1>Сводка начислений и оплат</h1>
          <p><strong>Гость:</strong> ${escapeHtml(context.reservation.guestName)}</p>
          <p><strong>Итого:</strong> ${formatMoney(folio?.totalAmount ?? context.reservation.totalAmount ?? 0)} RUB</p>
          <p><strong>Оплачено:</strong> ${formatMoney(folio?.paidAmount ?? context.reservation.paidAmount ?? 0)} RUB</p>
          <p><strong>Долг:</strong> ${formatMoney(folio?.balanceDue ?? context.reservation.balanceDue)} RUB</p>
          <ul>
            ${(folio?.charges ?? [])
              .slice(0, 10)
              .map((charge) => `<li>${escapeHtml(charge.description)}: ${formatMoney(charge.amount)} RUB</li>`)
              .join("")}
          </ul>
        </section>
      `.trim()
    }
  ];

  if (housekeepingTasks.length > 0) {
    documents.push({
      kind: "housekeeping_print",
      title: "Печать задач уборки по проживанию",
      fileName: `housekeeping-${reservationId}.html`,
      mimeType: "text/html",
      content: `
        <section>
          <h1>Housekeeping print</h1>
          <ul>
            ${housekeepingTasks
              .map((task) => `<li>${escapeHtml(task.roomNumber)} - ${escapeHtml(task.taskType)} - ${escapeHtml(task.status)}</li>`)
              .join("")}
          </ul>
        </section>
      `.trim()
    });
  }

  if (maintenanceIncidents.length > 0) {
    documents.push({
      kind: "maintenance_print",
      title: "Печать техинцидентов по номеру",
      fileName: `maintenance-${reservationId}.html`,
      mimeType: "text/html",
      content: `
        <section>
          <h1>Maintenance print</h1>
          <ul>
            ${maintenanceIncidents
              .map((incident) => `<li>${escapeHtml(incident.title)} - ${escapeHtml(incident.status)} - ${escapeHtml(incident.priority)}</li>`)
              .join("")}
          </ul>
        </section>
      `.trim()
    });
  }

  return documents;
}

export async function generateComplianceDatasets(propertyId: string, reservationId: string) {
  const data = await getHotelData();
  const context = await getReservationComplianceContext(propertyId, reservationId);
  if (!context) {
    return null;
  }

  const folio = data.folios.find(
    (item) => item.propertyId === propertyId && item.reservationId === reservationId
  );
  const nights = Math.max(
    Math.ceil(
      (new Date(`${context.reservation.checkOutDate}T00:00:00`).getTime() -
        new Date(`${context.reservation.checkInDate}T00:00:00`).getTime()) /
        86_400_000
    ),
    1
  );
  const now = new Date().toISOString();

  return [
    {
      kind: "mvd",
      generatedAt: now,
      columns: [
        "reservation_id",
        "guest_name",
        "citizenship",
        "document_type",
        "document_number_masked",
        "migration_card_masked",
        "check_in_date",
        "check_out_date",
        "room_label"
      ],
      rows: [
        {
          reservation_id: context.reservation.id,
          guest_name: context.reservation.guestName,
          citizenship: context.guest?.citizenship ?? "",
          document_type: context.guest?.document?.type ?? "",
          document_number_masked: maskDocumentNumber(context.guest?.document?.number),
          migration_card_masked: maskDocumentNumber(context.guest?.migrationCard?.number),
          check_in_date: context.reservation.checkInDate,
          check_out_date: context.reservation.checkOutDate,
          room_label: context.reservation.roomLabel
        }
      ]
    },
    {
      kind: "rosstat",
      generatedAt: now,
      columns: [
        "reservation_id",
        "property_type",
        "city",
        "citizenship",
        "arrival_purpose",
        "nights",
        "room_label",
        "reservation_status"
      ],
      rows: [
        {
          reservation_id: context.reservation.id,
          property_type: context.property.propertyType,
          city: context.property.city,
          citizenship: context.guest?.citizenship ?? "",
          arrival_purpose: context.guest?.arrivalPurpose ?? "",
          nights: String(nights),
          room_label: context.reservation.roomLabel,
          reservation_status: context.reservation.status
        }
      ]
    },
    {
      kind: "accounting",
      generatedAt: now,
      columns: [
        "reservation_id",
        "guest_name",
        "total_amount",
        "paid_amount",
        "balance_due",
        "folio_status"
      ],
      rows: [
        {
          reservation_id: context.reservation.id,
          guest_name: context.reservation.guestName,
          total_amount: String(folio?.totalAmount ?? context.reservation.totalAmount ?? 0),
          paid_amount: String(folio?.paidAmount ?? context.reservation.paidAmount ?? 0),
          balance_due: String(folio?.balanceDue ?? context.reservation.balanceDue),
          folio_status: folio?.status ?? "unpaid"
        }
      ]
    }
  ] satisfies ComplianceDataset[];
}

export { maskDocumentNumber as maskSensitiveDocumentNumber };
