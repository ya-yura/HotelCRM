# Full Build Prompt Pack

This folder contains the implementation prompt pack for turning the current repository into a production-grade hotel operations platform for Russian small and medium properties up to 50 rooms.

The pack is grounded in:

- `/docs/00_context.md` through `/docs/16_competitive_benchmark.md`
- the current monorepo architecture: Fastify API, React PWA client, shared TypeScript contracts
- the market conclusion that the winning product is a mobile-first, offline-first, regulation-aware hotel system that is simpler to operate than TravelLine, Bnovo, Shelter, and Kontur for small properties

## How to use

1. Read `/docs/README.md`
2. Read `/docs/14_execution.md`
3. Apply prompts in the order listed below
4. After each prompt:
   - implement code, do not just plan
   - keep invariants from `/docs`
   - run build and typecheck
   - update execution status if scope materially changes
5. End with `13_final_system_audit.md`

## Execution order

1. `00_orchestrator.md`
2. `01_data_platform_and_persistence.md`
3. `02_auth_properties_and_staff.md`
4. `03_guests_reservations_and_frontdesk.md`
5. `04_rooms_housekeeping_and_maintenance.md`
6. `05_payments_fiscalization_and_folios.md`
7. `06_distribution_channel_manager_and_direct_sales.md`
8. `07_compliance_mvd_rosstat_and_documents.md`
9. `08_mobile_offline_push_and_device_capabilities.md`
10. `09_owner_dashboard_reports_and_ai_ops.md`
11. `10_security_privacy_audit_and_antifraud.md`
12. `11_qa_seed_release_and_rollout.md`
13. `12_commercial_readiness_and_profitability.md`
14. `13_final_system_audit.md`

## Product target

Build a profitable, dependable, low-friction hotel management product for:

- small hotels in Russia
- hostels
- guest houses
- glamping properties

The product must excel at:

- quick reservation and front desk work
- room and housekeeping operations
- mobile usability for owners and staff
- offline continuity
- payment and folio correctness
- Russian compliance and reporting readiness
- transparent, supportable architecture

## Operating rule

If a prompt conflicts with the already implemented repository shape, prefer extending the current stack rather than rewriting it. Use the existing Fastify + React + shared TypeScript monorepo as the baseline unless the prompt explicitly asks for a bounded bridge or adapter.
