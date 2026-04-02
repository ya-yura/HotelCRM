# 09 API

Sources: `08_backend.md`, `03_domain.md`

## 1. Endpoint groups

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/re-auth`

### Dashboard

- `GET /dashboard/today`
- `GET /dashboard/anomalies`

### Guests

- `GET /guests`
- `POST /guests`
- `GET /guests/:id`
- `PATCH /guests/:id`
- `POST /guests/:id/merge`

### Reservations

- `GET /reservations`
- `POST /reservations`
- `GET /reservations/:id`
- `PATCH /reservations/:id`
- `POST /reservations/:id/confirm`
- `POST /reservations/:id/check-in`
- `POST /reservations/:id/check-out`
- `POST /reservations/:id/cancel`
- `POST /reservations/:id/no-show`
- `POST /reservations/:id/reassign-room`

### Rooms

- `GET /rooms`
- `GET /rooms/:id`
- `PATCH /rooms/:id`
- `POST /rooms/:id/block`
- `POST /rooms/:id/return-to-service`

### Housekeeping

- `GET /housekeeping/tasks`
- `POST /housekeeping/tasks`
- `POST /housekeeping/tasks/:id/start`
- `POST /housekeeping/tasks/:id/complete`
- `POST /housekeeping/tasks/:id/cancel`

### Payments

- `GET /payments`
- `POST /payments`
- `POST /payments/:id/refund`
- `POST /payments/:id/void`

### Sync

- `POST /sync/events/batch`
- `GET /sync/conflicts`
- `POST /sync/conflicts/:id/resolve`

### AI

- `POST /ai/parse-booking`
- `POST /ai/daily-summary`
- `POST /ai/search`
- `POST /ai/message-draft`

## 2. Core schemas

### Reservation create request

- guest_ref or guest payload
- check_in_date
- check_out_date
- adult_count
- child_count
- room_type_id
- assigned_room_id optional
- total_amount
- source
- special_requests optional
- idempotency_key
- client_version

### Check-in request

- reservation_id
- assigned_room_id
- guest_count_confirmed
- payment_entries optional
- override_reason optional
- idempotency_key
- client_version

### Payment request

- reservation_id
- stay_id optional
- method
- amount
- currency
- note optional
- idempotency_key

## 3. Permissions

- owner: full access
- front_desk: reservation, stay, payment capture, room assignment, search, dashboard
- housekeeping: room status and housekeeping tasks only
- accountant: payments, exports, audit read

## 4. Error model

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`
- `403 PERMISSION_DENIED`
- `404 NOT_FOUND`
- `409 VERSION_CONFLICT`
- `409 ROOM_NOT_AVAILABLE`
- `409 ROOM_NOT_READY`
- `409 BALANCE_DUE_BLOCK`
- `422 BUSINESS_RULE_VIOLATION`
- `503 AI_UNAVAILABLE`

Every business error returns:

- `code`
- `message`
- `details`
- `recovery_hint`

## 5. Transactional operations

- `POST /reservations`
- `PATCH /reservations/:id`
- `POST /reservations/:id/check-in`
- `POST /reservations/:id/check-out`
- `POST /payments`
- `POST /sync/conflicts/:id/resolve`

## 6. Idempotent operations

- all POST commands that change business state require `idempotency_key`
- sync batch items include client-generated entity IDs and local version
- repeated successful command returns the same business result when key matches
