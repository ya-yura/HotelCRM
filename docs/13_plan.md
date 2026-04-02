# 13 Development Plan

Sources: all docs in `/docs`

## Sprint 1

- bootstrap monorepo/app structure
- auth shell
- local database setup
- core design tokens and navigation shell

## Sprint 2

- implement domain schema and migrations
- room and guest base CRUD
- today dashboard local projections

## Sprint 3

- reservation create/edit flow
- conflict detection v1
- guest search and merge basics

## Sprint 4

- check-in flow
- room assignment validation
- stay model and audit logging

## Sprint 5

- checkout flow
- housekeeping queue
- room readiness lifecycle

## Sprint 6

- payment ledger and balance derivation
- cash/card capture flows
- unpaid stay controls

## Sprint 7

- offline sync queue
- retry logic
- conflict handling UI

## Sprint 8

- dashboard refinement
- search optimization
- performance pass for low-end mobile devices

## Sprint 9

- AI booking parser
- daily assistant summary
- safe AI observability and fallback handling
- admin routine recommendation inbox

## Sprint 10

- anomaly detection
- occupancy optimization hints for room assignment and stay extensions
- pilot-specific reports
- permissions hardening and shared-device safeguards

## Sprint 11

- end-to-end test stabilization
- audit/export completeness
- security and resilience review

## Sprint 12

- pilot rollout
- staff training materials
- issue triage from live usage

## Development order

1. domain and local-first foundations
2. reservations and room truth
3. check-in/check-out
4. payments
5. sync reliability
6. AI assistive features

## Dependencies

- sync depends on stable entity IDs and local schema
- check-in depends on reservation, room, and payment foundations
- housekeeping depends on checkout lifecycle
- AI depends on reliable domain projections

## MVP milestone

End of Sprint 8:

- one property can create reservations, check guests in/out, track room readiness, record payments, and operate through intermittent internet

## Pilot plan

- pilot with one 5 to 20 room property first
- run parallel shadow mode for first week
- compare occupancy, arrivals, departures, and payment totals daily
- collect false-conflict and false-alert incidents
- enable AI parser only after manual correction rate is acceptable
