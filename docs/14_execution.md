# 14 Execution

## Prompt chain status

### Completed

- Prompt 0: context created
- Prompt 1: product and jobs created
- Prompt 2: product constitution created
- Prompt 3: domain model created
- Prompt 4: state machines created
- Prompt 5: user flows created
- Prompt 6: AI system created
- Prompt 7: system architecture created
- Prompt 8: backend design created
- Prompt 9: API design created
- Prompt 10: frontend design created
- Prompt 11: design system created
- Prompt 12: modules implementation plan created
- Prompt 13: development plan created
- Prompt 14: project scaffold started and base code generated
- Prompt 15.1: reservations foundation implemented
- Prompt 15.2: rooms and readiness implemented
- Prompt 15.3: housekeeping queue implemented
- Prompt 15.4: payments ledger implemented
- Prompt 15.5: sync queue and conflict handling implemented
- Prompt 15.6: AI assistant layer implemented
- Prompt Final: ruthless audit completed

### Next implementation order

1. Add background sync worker and fuller conflict reconciliation
2. Move durable JSON persistence to PostgreSQL/Prisma persistence
3. Add guest domain and merge workflow

## Prompt 15.1 scope

- backend reservation service
- reservation API handlers
- shared reservation schemas
- frontend reservations list and quick-create flow
- local command structure for future offline writes

## Prompt 15.2 scope

- room entity contract
- readiness projection
- room status screen
- maintenance block entry points

## Prompt 15.3 scope

- housekeeping task model
- queue screen
- task lifecycle actions
- room turnover integration after checkout

## Prompt 15.4 scope

- ledger model
- payment capture UI
- balance derivation rules
- refund and correction path

## Prompt 15.5 scope

- client sync queue
- API sync endpoint
- version conflict model
- conflict inbox UI

## Prompt 15.6 scope

- booking parser endpoint
- daily assistant card
- anomaly inbox contract
- search-assist request/response layer
- occupancy optimization recommendations for the room matrix
- admin routine inbox and suggested next actions

## Final audit output

- see `/docs/15_audit.md`

## Full product implementation pack

- production build prompts added in `/docs/full_build_prompts`
- use this pack for the next major phase that turns the current product into a fuller SMB-ready hotel platform

## Stage 1 implementation status

- async persistence layer introduced with adapter-based storage selection
- PostgreSQL migration script added
- PostgreSQL schema added in `apps/api/src/db/migrations/0001_initial.sql`
- JSON-to-PostgreSQL seed import script added
- backend stores and API routes converted to async repository access
- local JSON fallback retained for low-friction development

## Post-audit hardening completed

- backend stores now use durable JSON persistence at `apps/api/data/hotel-data.json`
- restart-safe reservation creation verified through live API restart test
- owner-first SaaS auth now supports public owner signup, property bootstrap, and property-scoped sessions
- owner onboarding now includes staff creation, room setup, and activation checklist
- API routes are guarded by role permissions
- frontend navigation and action entry points now respect the active role
- folio services and extra charges are now implemented end-to-end
- live runtime verified that service charges increase folio balance and block checkout until settled
