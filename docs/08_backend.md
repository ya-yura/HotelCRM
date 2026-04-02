# 08 Backend

Sources: `03_domain.md`, `06_architecture.md`

## 1. Stack

- Runtime: Node.js 22+
- Language: TypeScript
- API framework: Fastify
- Database: PostgreSQL
- ORM/querying: Prisma for schema and migrations, targeted SQL for hot queries if needed
- Validation: Zod
- Auth/session: JWT access tokens with refresh rotation or secure session tokens
- Jobs: pg-boss or lightweight database-backed job queue
- Testing: Vitest + integration tests with test database

## 2. Backend module structure

- `auth`
- `users`
- `properties`
- `guests`
- `reservations`
- `stays`
- `rooms`
- `housekeeping`
- `payments`
- `sync`
- `audit`
- `ai`

## 3. DB structure

- One PostgreSQL database
- Shared schema with `property_id` on tenant-owned tables
- Strong indexes on:
  - `(property_id, check_in_date, check_out_date)` for reservations
  - `(property_id, room_id, status)` for stays and housekeeping
  - `(property_id, full_name)` and `(property_id, phone)` for guest search
  - `(property_id, sync_status, last_attempt_at)` for sync work

## 4. Multi-tenant model

- Single database, shared tables, row-level tenant scoping by `property_id`
- Every request resolves current property from authenticated session
- All service methods require property context explicitly
- No cross-property joins in application logic

## 5. Auth

- Role-based access: owner, front_desk, housekeeping, accountant
- PIN-based quick unlock allowed for shared front desk device after initial secure login
- Sensitive actions require recent re-auth on shared devices:
  - refunds
  - cancellation with payment impact
  - settings changes
  - manual conflict overwrite

## 6. Jobs

- Sync reconciliation retries
- Daily property summary generation
- Anomaly scan
- Stale draft cleanup
- Optional export generation

Jobs must be idempotent and property-scoped.

## 7. Audit log

- Write audit entry in same transaction as critical mutation
- Include actor, entity, action, before, after, reason, device id, request id
- Critical audited actions:
  - reservation cancel
  - check-in / check-out
  - room reassignment
  - payment capture / refund / void
  - manual room block
  - sync conflict resolution

## 8. API transaction boundaries

- Reservation create/update: transaction over reservation, assignment, audit
- Check-in: transaction over reservation, stay, room projection, payment entries if included, audit
- Check-out: transaction over stay close, room dirty mark, housekeeping task create, payments, audit
- Payment correction/refund: transaction over payment ledger and audit

## 9. Pragmatic non-goals

- No event-sourcing for whole system in V1
- No separate read model service
- No Kafka or distributed workflow engine
- No custom rules engine
