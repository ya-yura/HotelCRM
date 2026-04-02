# 12 Modules

Sources: all docs in `/docs`

## 1. Reservations module

- Includes: guest lookup, reservation CRUD, conflict checks, room assignment, check-in/check-out entry points
- Dependencies: guests, rooms, payments, audit, sync
- Complexity: high
- Risks: overlapping stays, room-state drift, duplicate guests

## 2. Rooms module

- Includes: room inventory, status projection, maintenance blocks, readiness logic
- Dependencies: reservations, housekeeping, sync
- Complexity: medium
- Risks: derived status inconsistency, manual override abuse

## 3. Housekeeping module

- Includes: cleaning task queue, start/complete flow, inspection, maintenance escalation
- Dependencies: rooms, stays, sync
- Complexity: medium
- Risks: duplicate tasks, false-ready room status

## 4. Payments module

- Includes: payment ledger, balances, capture/refund/void, payment status derivation
- Dependencies: reservations, stays, audit, sync
- Complexity: high
- Risks: duplicate entries, offline idempotency, refund correctness

## 5. AI module

- Includes: booking parser, daily assistant, anomaly alerts, search assist, message drafts, occupancy optimization hints, admin routine automation
- Dependencies: reservations, dashboard projections, search index
- Complexity: medium
- Risks: hallucinated details, poor confidence handling, privacy concerns, over-optimizing room density against human realities

## 6. Sync module

- Includes: local queue, retry engine, version checks, conflict resolution inbox
- Dependencies: all state-changing modules
- Complexity: very high
- Risks: trust collapse if conflicts are opaque, data divergence across devices
