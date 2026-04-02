# 11 QA, Seed, Release, And Rollout

Implement the delivery and quality layer required to ship this product reliably.

## Goal

Make the repository easy to validate, demo, and release while keeping confidence high as modules grow.

## Scope

- test strategy
- seed data and demo environments
- smoke and regression flows
- release checklist
- rollout guardrails

## Functional requirements

1. Add a realistic seed dataset for:
   - regional hostel
   - boutique hotel
   - glamping site
2. Cover the most important end-to-end flows with automated tests:
   - signup and property bootstrap
   - reservation create and modify
   - check-in
   - folio posting
   - payment and refund guardrails
   - checkout and housekeeping generation
   - offline mutation queue and conflict path
3. Add integration tests for critical API commands.
4. Add lightweight UI smoke coverage for mobile-first pages.
5. Create a release checklist including:
   - migrations
   - seed and fixture checks
   - env var validation
   - backup verification
   - rollback notes
6. Add demo scripts or fixtures so sales or discovery sessions can show realistic hotel workflows quickly.

## Acceptance criteria

- a new developer can validate the core business flows without manual guesswork
- the most dangerous regressions are covered by automation
- the repo has an explicit release gate instead of ad hoc shipping
- demo data reflects the target market in Russia rather than a generic SaaS sample
