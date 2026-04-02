# 04 Rooms, Housekeeping, And Maintenance

Implement the operational room layer that makes the app genuinely useful for housekeeping teams and property managers.

## Goal

Provide a mobile-first room operations system with a clear readiness model, housekeeping workflow, maintenance escalation, and minimal training cost.

## Scope

- room inventory and room types
- readiness and occupancy projections
- housekeeping assignments and completion flow
- maintenance incidents and room blocking
- minibar and consumables tracking
- mobile-first task UX

## Functional requirements

1. Mature the room model to support:
   - room types
   - occupancy limits
   - floor or zone
   - amenities
   - out-of-order and out-of-service states
   - glamping-specific unit metadata
2. Define a clear readiness state model:
   - clean
   - dirty
   - inspected
   - occupied
   - maintenance_required
   - blocked
3. Implement housekeeping shifts, assignments, and priorities.
4. Allow one-tap task progress on mobile:
   - start
   - pause
   - complete
   - mark problem
   - request inspection
5. Add damage and defect reporting with photo attachment support.
6. Add minibar or consumables replenishment entries that can feed the folio.
7. Add maintenance tickets:
   - priority
   - room impact
   - assignee
   - resolution notes
   - room block linkage

## UX requirements

- large tap targets and list-first UI for housekeepers
- minimal text entry
- color-coded readiness and urgency
- clear distinction between cleaning work and maintenance work

## Offline requirements

- room task updates must work offline
- photos may queue locally and upload later
- conflict rules must favor server truth for room occupancy but preserve local notes and evidence

## Acceptance criteria

- after checkout, housekeeping work is created automatically
- a manager can see room truth at a glance
- a housekeeper can finish a shift entirely from a phone
- maintenance issues can block inventory from sale until resolved
