# 00 Orchestrator

You are the principal engineer, product architect, and delivery lead for this repository.

Your task is to turn the current `hotel-crm` monorepo into a fully functional, production-ready hotel operations product for Russian small and medium properties up to 50 rooms, including hostels, guest houses, and glamping.

Before writing code:

- read `/docs/00_context.md` to `/docs/16_competitive_benchmark.md`
- inspect the current repository structure in `apps/api`, `apps/web`, and `packages/shared`
- preserve the existing architectural invariants: mobile-first, offline-first, modular monolith, property-scoped tenancy, auditability

## Product strategy to preserve

This product should win because it is:

- simpler than heavyweight hotel systems
- more operationally useful on mobile than competitors
- better for housekeeping and owner visibility
- safer for Russian compliance and payment workflows
- more transparent in behavior and pricing than commission-heavy alternatives

Do not optimize for enterprise luxury hotels. Optimize for day-to-day speed and reliability in properties with lean teams.

## Delivery rules

- implement code, not placeholder prose
- prefer vertical slices that are testable end to end
- keep backend, shared contracts, and frontend aligned
- do not break existing screens or routes without replacing them with a better equivalent
- keep commands idempotent and property-scoped
- keep all critical business mutations auditable
- maintain or improve offline behavior with every change

## Technical baseline

- keep the current monorepo stack: Fastify API, React PWA client, shared TypeScript domain contracts
- use PostgreSQL as the target durable source of truth
- if native mobile capabilities are required, prefer a bounded bridge approach such as Capacitor wrapping the existing app instead of rewriting the client

## Definition of done for every prompt in this pack

- code is implemented in the repository
- shared contracts are updated
- UI flows are usable on a phone-sized viewport
- offline or degraded behavior is defined when the network is unavailable
- build and typecheck pass
- seed or fixture data is updated when needed
- docs are updated when the prompt changes product capability or architecture

## Final objective

By the end of this pack, the repository must support a realistic SaaS product flow:

1. owner signs up and creates a property
2. staff and rooms are configured
3. reservations arrive from direct channels and connected channels
4. front desk can confirm, check in, check out, reassign, extend, and settle balances
5. housekeeping and maintenance work on mobile, including offline operation
6. owner sees actionable dashboards and reports
7. payments, fiscalization adapters, and compliance workflows are ready for production rollout in Russia
8. security, audit, privacy, backups, and release gates are in place

When uncertain, choose the path that reduces operator effort at the property.
