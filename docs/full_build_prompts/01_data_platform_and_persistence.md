# 01 Data Platform And Persistence

Implement the production data foundation for the current hotel CRM monorepo.

## Goal

Replace scaffold-grade persistence and local assumptions with a production-ready data platform that still preserves offline-first behavior and simple operations.

## Scope

- move durable server persistence toward PostgreSQL as the canonical store
- introduce schema and migrations
- keep a clean repository layer so current services can evolve without route churn
- preserve property-scoped tenancy
- support attachments and generated documents with a storage abstraction
- prepare the sync pipeline for higher mutation volume

## Required implementation outcomes

1. Add database access infrastructure for PostgreSQL and migration workflow.
2. Model the core entities needed for the whole product:
   - properties
   - users and staff memberships
   - guests
   - reservations
   - stay records
   - rooms and room types
   - housekeeping tasks
   - maintenance incidents
   - folio items and payments
   - sync events and sync conflicts
   - audit log
   - notification deliveries
   - compliance submissions
3. Introduce versioned entities for optimistic concurrency.
4. Ensure every tenant-owned table has `property_id` and the necessary indexes.
5. Implement a repository pattern or service boundary that isolates storage concerns from route handlers.
6. Add background job storage support for retries, summary generation, and compliance jobs.
7. Provide seed data for at least:
   - small hotel
   - hostel
   - glamping property

## Constraints

- do not abandon the current Fastify code structure unless a clear modular improvement is needed
- keep shared schemas in `packages/shared`
- keep local dev setup easy for one developer on Windows
- write migrations that are safe to re-run in local environments

## Acceptance criteria

- a fresh developer can boot the stack against PostgreSQL with documented steps
- the app can restart without losing reservations, rooms, payments, users, or housekeeping state
- core queries are indexed for property, date range, room, guest phone, and status
- the persistence layer can support future PII encryption and compliance logging

## Deliverables

- database config and migration files
- updated backend services and repositories
- updated seed/bootstrap flow
- docs that explain local setup and production expectations
