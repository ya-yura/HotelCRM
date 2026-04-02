# 10 Frontend

Sources: `05_flows.md`, `06_architecture.md`

## 1. Page map

- `/login`
- `/today`
- `/reservations`
- `/reservations/new`
- `/reservations/:id`
- `/rooms`
- `/rooms/:id`
- `/housekeeping`
- `/payments`
- `/search`
- `/settings`

## 2. Core screens

### Today dashboard

- arrivals card
- departures card
- in-house card
- dirty rooms card
- unpaid stays card
- blocked rooms card
- sync status banner
- daily assistant summary

### Reservation detail

- guest summary
- stay dates
- room assignment
- payment summary
- status timeline
- actions: confirm, check-in, check-out, cancel, reassign

### Quick reservation

- paste parser input
- guest search/create
- date picker
- occupancy
- room type / room suggestion
- price input
- save action

### Housekeeping queue

- room list grouped by priority/status
- start / complete task actions
- room notes
- maintenance escalation

## 3. Components

- status chip
- room readiness badge
- payment summary card
- arrival/departure list item
- quick action bar
- search result card
- conflict resolution sheet
- offline sync banner
- AI suggestion card

## 4. State management

- Local persistent store for entity tables and sync queue
- Query/cache layer for derived selectors
- Domain action layer for mutations with optimistic local transactions
- UI state kept shallow and screen-local

## 5. Offline UI

- global sync banner with states: synced, pending, failed, conflict
- pending changes indicator on detail screens
- local-save success feedback independent of network
- conflict inbox for records needing manual resolution

## 6. Loading states

- dashboard uses skeleton cards only on first ever load
- subsequent loads use stale-local-data first
- actions use inline button progress, not full-screen spinners
- failed AI modules degrade to hidden assistant card plus manual tools

## 7. Mobile-first rules

- bottom action bar for primary tasks
- sticky summary header on detail pages
- forms broken into short vertical sections
- list cards instead of wide tables on phones
- one-thumb reachable primary controls
