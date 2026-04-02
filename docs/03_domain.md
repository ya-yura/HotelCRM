# 03 Domain Model

Sources: `01_product.md`, `02_principles.md`

## 1. Core entities

### Property

- id
- name
- timezone
- currency
- address
- check_in_time
- check_out_time
- active

### User

- id
- property_id
- role
- name
- phone
- pin_or_password_hash
- active

### RoomType

- id
- property_id
- name
- capacity
- base_rate
- active

### Room

- id
- property_id
- room_type_id
- number
- floor
- capacity
- status
- housekeeping_status
- maintenance_status
- notes
- active

### Guest

- id
- property_id
- full_name
- phone
- email
- id_document_ref
- notes
- blacklisted_flag
- merged_into_guest_id

### Reservation

- id
- property_id
- code
- source
- guest_id
- primary_room_type_id
- assigned_room_id
- check_in_date
- check_out_date
- adult_count
- child_count
- status
- payment_status
- total_amount
- balance_due
- arrival_time_note
- special_requests
- created_by_user_id
- updated_by_user_id
- version

### Stay

- id
- reservation_id
- actual_check_in_at
- actual_check_out_at
- assigned_room_id
- status
- guest_count_confirmed
- deposit_amount
- notes

### Payment

- id
- property_id
- reservation_id
- stay_id
- type
- method
- currency
- amount
- status
- received_at
- external_ref
- note
- created_by_user_id

### HousekeepingTask

- id
- property_id
- room_id
- reservation_id
- task_type
- priority
- status
- created_at
- started_at
- completed_at
- assigned_to_user_id
- note

### RoomBlock

- id
- property_id
- room_id
- reason
- starts_at
- ends_at
- status
- created_by_user_id

### SyncEvent

- id
- property_id
- entity_type
- entity_id
- operation
- payload
- local_version
- server_version
- sync_status
- last_attempt_at
- error_code
- error_message

### AuditLog

- id
- property_id
- actor_user_id
- entity_type
- entity_id
- action
- before_json
- after_json
- reason
- created_at
- device_id

## 2. Key relationships

- Property has many Users, Rooms, RoomTypes, Guests, Reservations, Payments, HousekeepingTasks
- Guest has many Reservations
- Reservation belongs to one Guest and may reference one assigned Room
- Reservation may create one active Stay at check-in
- Stay belongs to one Reservation and one Room
- Room has many HousekeepingTasks and RoomBlocks
- Payments belong to Reservation and optionally Stay

## 3. Reservation statuses

- draft
- pending_confirmation
- confirmed
- checked_in
- checked_out
- cancelled
- no_show

## 4. Room operational statuses

- available
- reserved
- occupied
- dirty
- cleaning
- inspected
- blocked_maintenance
- out_of_service

`reserved` is a derived operational projection for rooms assigned to future confirmed arrivals. Base room record still stores the canonical housekeeping and maintenance states.

## 5. Housekeeping statuses

- not_required
- dirty
- queued
- in_progress
- cleaned
- inspected

## 6. Payment statuses

- unpaid
- partially_paid
- paid
- refunded
- voided

## 7. Lifecycle summary

### Reservation lifecycle

`draft -> pending_confirmation -> confirmed -> checked_in -> checked_out`

Alternative exits:

- `draft|pending_confirmation|confirmed -> cancelled`
- `confirmed -> no_show`

### Room lifecycle

- available -> reserved -> occupied -> dirty -> cleaning -> inspected -> available
- any usable state -> blocked_maintenance -> available
- occupied cannot jump directly to available without checkout

### Housekeeping task lifecycle

- queued -> in_progress -> completed
- queued|in_progress -> cancelled

### Payment lifecycle

- pending -> captured
- pending -> failed
- captured -> refunded
- pending -> voided

## 8. ER model in text

- A `Guest` can hold multiple `Reservation` records over time.
- A `Reservation` may exist before room assignment; once assigned, it references one `Room`.
- A `Reservation` creates at most one active `Stay`, but historical redesign should allow multiple stay segments later if room split logic is added.
- A `Room` can have many future assigned reservations over non-overlapping date ranges.
- A `RoomBlock` overlaps time ranges and makes a room ineligible for assignment.
- `Payment` records aggregate into reservation-level `payment_status` and `balance_due`.
- `HousekeepingTask` is created by checkout, manual dirty mark, or supervisor action and affects room readiness.

## 9. Business rules

1. A room cannot be assigned to overlapping active reservations for intersecting nights.
2. A checked-in reservation must have an assigned room.
3. Checkout automatically ends the stay and marks room dirty unless manually overridden for a special case.
4. A room in `dirty`, `cleaning`, `blocked_maintenance`, or `out_of_service` cannot be assigned for check-in.
5. Payment status is derived from ledger totals, not manually edited directly.
6. Reservation date changes must rerun conflict checks before save.
7. Cancelling a reservation with captured payments requires explicit refund or retention handling.
8. Guest merge must preserve reservation and payment history.
9. Audit log is mandatory for room reassignment, cancellations, payment changes, manual overrides, and sync conflict resolutions.

## 10. Data integrity rules

- All entity records use immutable IDs generated client-side for offline safety
- Reservation `version` increments on each mutation for optimistic concurrency
- `check_out_date` must be after `check_in_date`
- Payment amount cannot be zero for captured payments
- Only one active stay per reservation
- Only one active housekeeping task of the same task type per room
- `balance_due = total_amount - captured_payments + refunds`
- Deleted business records should be soft-deleted or status-closed, not hard deleted

## 11. Known error zones

- Double booking from concurrent offline edits
- Duplicate guest creation from fuzzy search mismatch
- Room assigned while housekeeping status changed on another device
- Payment captured offline but server sync delayed
- Reservation extension overlaps hidden future booking
- Manual override bypasses derived room availability logic
