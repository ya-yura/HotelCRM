# 05 User Flows

Sources: `01_product.md`, `04_states.md`

## 1. Create reservation

- Trigger: phone call, walk-in, message, OTA import, or copied text
- Main path:
  1. Open quick reservation form or paste raw booking text
  2. Search existing guest by name/phone/date
  3. Confirm dates, guest count, room type, source, and price
  4. Run conflict check
  5. Save as confirmed or pending confirmation
- Errors:
  - overlapping room availability
  - missing guest contact
  - invalid dates
  - duplicate reservation suspicion
- Recovery:
  - suggest alternative rooms/dates
  - save draft if details are incomplete
  - merge with existing guest if duplicate suspected
- Must complete in 15 sec: opening quick form from dashboard and running guest search

## 2. Check-in

- Trigger: guest arrival or pre-arrival desk processing
- Main path:
  1. Open today's arrivals or search reservation
  2. Verify guest and stay details
  3. Confirm assigned room is ready
  4. Record payment/deposit if required
  5. Mark checked in and create active stay
- Errors:
  - room dirty or blocked
  - reservation unpaid beyond allowed threshold
  - no room assigned
  - sync unavailable during payment recording
- Recovery:
  - reassign room
  - manager override with reason
  - save payment locally pending sync
  - convert walk-in to live reservation first
- Must complete in 15 sec: open arrival card, validate readiness, and enter check-in flow

## 3. Check-out

- Trigger: guest departure or early close request
- Main path:
  1. Open occupied room or in-house guest record
  2. Review balance and charges
  3. Capture final payment if needed
  4. Confirm checkout
  5. System closes stay and marks room dirty
- Errors:
  - unpaid balance
  - disputed payment
  - guest extension request during checkout
  - device offline before receipt sync
- Recovery:
  - partial payment with balance exception reason
  - reopen checkout review before final submit
  - extend stay if availability allows
  - print/share local receipt note once synced later
- Must complete in 15 sec: open occupied stay and see balance due

## 4. Housekeeping

- Trigger: checkout, manual dirty mark, inspection failure, or supervisor assignment
- Main path:
  1. Open room cleaning queue
  2. Start task for room
  3. Mark cleaned
  4. Supervisor inspects if required
  5. Room becomes available
- Errors:
  - room reoccupied unexpectedly
  - task duplicated
  - cleaner marks complete but issue remains
- Recovery:
  - reopen task
  - mark inspection failed and return room to dirty
  - add maintenance note and block room
- Must complete in 15 sec: open queue and update one room status

## 5. Payment

- Trigger: deposit, check-in, mid-stay, checkout, refund
- Main path:
  1. Open reservation or stay financial summary
  2. Choose amount and method
  3. Record payment
  4. Update balance and derived payment status
- Errors:
  - duplicate entry
  - failed terminal/card processor
  - wrong currency or amount
- Recovery:
  - void pending payment
  - add corrective entry with audit note
  - retry sync with idempotency key
- Must complete in 15 sec: record cash payment from reservation screen

## 6. Search

- Trigger: incoming call, guest at desk, owner question, shift handoff
- Main path:
  1. Enter partial query
  2. Search guests, reservations, rooms, phone fragments, and dates
  3. Open best match
- Errors:
  - multiple similar guests
  - typo-heavy input
  - stale local index
- Recovery:
  - show grouped results with context
  - allow broadened search by date and phone
  - refresh local index in background
- Must complete in 15 sec: return first useful result for a common partial query

## 7. Today operations

- Trigger: shift start, manager check, rush hour monitoring
- Main path:
  1. Open dashboard
  2. Review arrivals, departures, occupied rooms, dirty rooms, unpaid stays, blocked rooms
  3. Tap any card to filtered task list
  4. Resolve critical items
- Errors:
  - counts mismatch due to sync lag
  - dashboard stale after offline edits
- Recovery:
  - show local timestamp and pending sync count
  - allow manual refresh and explain source of counts
- Must complete in 15 sec: open dashboard and enter any priority queue
