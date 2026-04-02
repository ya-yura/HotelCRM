# 03 Guests, Reservations, And Front Desk

Implement the guest CRM, reservation engine, and fast front desk workflows that make this product meaningfully better for small Russian properties.

## Product outcome

A receptionist must be able to create or find a booking, take payment, check in a guest, reassign rooms, extend stay, and check out without losing context between screens.

## Scope

- guest profiles and guest merge
- reservation lifecycle completion
- visual booking board or chessboard maturity
- fast front desk actions
- hostels and glamping edge cases
- document-ready guest card data

## Guest module requirements

1. Add guest profiles with:
   - full name
   - phone
   - email
   - date of birth
   - document fields needed for check-in and compliance
   - notes and preferences
   - stay history
   - merge history
2. Implement duplicate detection by phone, normalized name, and document combinations.
3. Allow safe guest merge with audit trail and conflict checks.

## Reservation requirements

1. Support statuses from inquiry through cancel and no-show.
2. Support:
   - manual booking
   - walk-in
   - extension
   - split stay
   - merged reservations
   - partial payments
   - deposits
   - room hold and maintenance block collision checks
3. Improve the booking board for fast room/date decisions.
4. Make the reservation detail page a true operational hub:
   - guest
   - room
   - dates
   - source
   - folio summary
   - audit timeline
   - quick actions

## Front desk requirements

1. Implement streamlined check-in:
   - verify room readiness
   - collect or confirm guest data
   - settle required payment or deposit
   - create stay record
2. Implement streamlined check-out:
   - review folio
   - settle balance
   - generate housekeeping task automatically
   - capture incidentals if needed
3. Add quick actions:
   - confirm
   - cancel
   - reassign room
   - move dates
   - late checkout
   - early check-in
   - add service
   - resend payment link

## Segment-specific requirements

- hostel mode: beds, shared rooms, partial occupancy
- glamping mode: units with extras such as heating or private facilities flags
- guest house mode: very simple flows with minimal setup burden

## Acceptance criteria

- receptionist can complete the most common arrival and departure tasks from one operational path
- duplicate guests can be resolved without data loss
- booking board helps avoid overbooking and room confusion
- all reservation mutations remain auditable and sync-safe
