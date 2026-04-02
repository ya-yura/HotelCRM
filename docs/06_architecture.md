# 06 Architecture

Sources: `03_domain.md`, `04_states.md`, `07_ai.md`

## 1. Frontend architecture

- PWA built with TypeScript and React
- Route groups: auth, dashboard, reservations, rooms, housekeeping, payments, settings
- Local-first data layer backed by IndexedDB
- Query layer reads from local projections first and syncs in background
- Domain services in frontend enforce state-machine-aware commands before local write
- UI split into mobile-first task screens, not data-heavy admin pages

## 2. Backend architecture

- Modular monolith API with clear modules: auth, reservations, rooms, housekeeping, payments, sync, AI
- PostgreSQL as source of record
- Background job runner inside same deploy unit for sync processing, summaries, and AI tasks
- Object storage only if attachments or exports are added later
- No microservices in initial architecture

## 3. Offline-first model

- Client writes every mutation to local database immediately
- Each mutation creates a sync event with idempotency key and version
- UI shows local success plus sync status
- Reads come from local materialized tables for speed
- On reconnect, queue flushes in order by entity and dependency

## 4. Sync queue

- Queue item contains entity type, entity id, operation, payload delta, local version, timestamp, device id
- Dependency ordering:
  1. guest
  2. reservation
  3. stay
  4. payment
  5. housekeeping task
  6. room status projection
- Retryable failures use exponential backoff
- Conflict failures create explicit conflict records for user resolution

## 5. Data flow

1. User action triggers frontend command
2. Command validates current local state machine and invariants
3. Local transaction updates entity tables and derived views
4. Sync event is created
5. UI refreshes from local state instantly
6. Background sync posts event to backend
7. Backend validates version and business rules
8. Backend commits canonical state and emits server version
9. Client marks sync success or conflict

## 6. Sequence flows

### Reservation create

1. User submits reservation draft
2. Local conflict engine checks room/date availability against local snapshot
3. Local reservation saved with version 1 and sync queued
4. Backend revalidates against canonical data
5. If accepted, response returns canonical version
6. If conflict found, local record becomes `failed_conflict` and requires user decision

### Check-in

1. User opens arrival
2. Frontend aggregates reservation, room, payment summary, and housekeeping status
3. Check-in command validates room ready and reservation confirmed
4. Local stay created, reservation moves to checked_in, room moves to occupied
5. Sync queue posts transaction bundle
6. Backend commits atomically or rejects with precise domain error

### Check-out

1. User confirms financial summary
2. Final payment entries saved
3. Checkout command closes stay and sets room dirty
4. Housekeeping task created automatically
5. Sync sends full transaction bundle

## 7. Error handling

- Domain errors return actionable codes such as `ROOM_NOT_READY`, `RESERVATION_VERSION_CONFLICT`, `BALANCE_DUE_BLOCK`
- UI errors always include next step
- Critical local writes use transactional rollback if any invariant fails
- Backend never accepts partial transactional business operations for check-in/check-out bundles

## 8. Conflict resolution

- Use optimistic concurrency via entity versions
- Default strategy:
  - append-only entities like payments: accept if idempotent key is new
  - editable entities like reservation: reject stale version and surface field diff
  - derived room status conflicts: recompute from authoritative events
- Conflict UI shows:
  - local change
  - server change
  - recommended action
- User can retry, overwrite with permission, or discard local draft

## 9. Reliability notes

- Keep server API stateless per request
- Every critical command is idempotent
- Background jobs can be retried safely
- Audit logs are written in same transaction as the business mutation
