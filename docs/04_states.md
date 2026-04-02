# 04 State Machines

Source: `03_domain.md`

## 1. Reservation state machine

### States

- draft
- pending_confirmation
- confirmed
- checked_in
- checked_out
- cancelled
- no_show

### Events and transitions

- `create_reservation`: none -> draft
- `request_confirmation`: draft -> pending_confirmation
- `confirm_reservation`: draft|pending_confirmation -> confirmed
- `edit_reservation`: stays in current pre-stay state if validation passes
- `check_in_guest`: confirmed -> checked_in
- `complete_checkout`: checked_in -> checked_out
- `cancel_reservation`: draft|pending_confirmation|confirmed -> cancelled
- `mark_no_show`: confirmed -> no_show
- `reopen_after_error`: pending_confirmation <- draft only by manual recovery before confirmation

### Forbidden transitions

- checked_out -> checked_in
- cancelled -> confirmed without cloning/new booking
- no_show -> checked_in directly
- draft -> checked_out

### Edge cases

- late arrival after no-show cutoff may require manager override from confirmed, not from no_show
- room reassignment during checked_in is allowed if target room is valid and move is audited
- stay extension from checked_in requires conflict-free availability

### Invariants

- checked_in requires active stay and assigned room
- checked_out requires closed stay
- cancelled and no_show cannot hold active stay

## 2. Room state machine

### States

- available
- reserved
- occupied
- dirty
- cleaning
- inspected
- blocked_maintenance
- out_of_service

### Events and transitions

- `assign_future_reservation`: available|inspected -> reserved
- `guest_check_in`: reserved|available -> occupied
- `guest_check_out`: occupied -> dirty
- `start_cleaning`: dirty -> cleaning
- `finish_cleaning`: cleaning -> inspected
- `approve_room`: inspected -> available
- `mark_dirty_manual`: available|reserved -> dirty
- `block_room`: available|reserved|dirty|inspected -> blocked_maintenance
- `return_to_service`: blocked_maintenance|out_of_service -> dirty|available depending on readiness

### Forbidden transitions

- occupied -> available without checkout
- blocked_maintenance -> occupied
- dirty -> occupied

### Edge cases

- same-day turnaround can move occupied -> dirty -> cleaning -> inspected -> occupied within hours
- reserved is a forward-looking state and may be derived; direct writes must remain consistent with reservation assignment windows

### Invariants

- occupied room cannot have active maintenance block
- blocked or out-of-service room cannot be offered for assignment
- dirty or cleaning room is not guest-ready

## 3. Housekeeping state machine

### States

- queued
- in_progress
- completed
- cancelled

### Events and transitions

- `create_task`: none -> queued
- `start_task`: queued -> in_progress
- `complete_task`: in_progress -> completed
- `cancel_task`: queued|in_progress -> cancelled
- `requeue_task`: cancelled -> queued by supervisor

### Forbidden transitions

- completed -> in_progress
- queued -> completed without explicit completion record

### Edge cases

- room may be re-dirtied after completed if guest re-enters or inspection fails
- multiple task types can exist over time, but only one active cleaning task per room

### Invariants

- completed housekeeping requires room state at least `inspected` or ready-confirmed path
- active occupied room should not receive standard checkout cleaning task

## 4. Payment state machine

### States

- pending
- captured
- failed
- refunded
- voided

### Events and transitions

- `create_payment_intent`: none -> pending
- `capture_payment`: pending -> captured
- `payment_failure`: pending -> failed
- `void_payment`: pending -> voided
- `refund_payment`: captured -> refunded

### Forbidden transitions

- refunded -> captured
- failed -> captured on same record; create new intent instead
- voided -> captured

### Edge cases

- offline cash record can be created directly as captured with local receipt note
- partial refund does not change original captured record; model with refund payment entry or partial amount fields in V2

### Invariants

- reservation payment status is derived from captured and refunded totals
- checkout may be blocked if non-authorized balance remains and no override reason is recorded

## 5. Sync state machine

### States

- local_only
- queued
- syncing
- synced
- failed_retryable
- failed_conflict
- failed_terminal

### Events and transitions

- `local_save`: none -> local_only
- `enqueue_sync`: local_only -> queued
- `start_sync`: queued -> syncing
- `sync_success`: syncing -> synced
- `retryable_error`: syncing -> failed_retryable
- `conflict_detected`: syncing -> failed_conflict
- `user_resolve_conflict`: failed_conflict -> queued
- `schedule_retry`: failed_retryable -> queued
- `terminal_reject`: syncing -> failed_terminal

### Forbidden transitions

- synced -> syncing without new local mutation
- failed_terminal -> queued without manual correction

### Edge cases

- network drop after server commit but before client acknowledgment needs idempotency key reconciliation
- out-of-order sync events must be rejected when version is stale

### Invariants

- no local mutation is discarded silently
- conflict state must retain both local and server versions for comparison
- user-visible critical records keep working locally even when sync is failing
