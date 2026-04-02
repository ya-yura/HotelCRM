# 13 Final System Audit

Run a final implementation audit across the whole repository after all prior prompts have been completed.

## Goal

Verify that the product now behaves like a coherent hotel operations system rather than a loose collection of modules.

## Audit instructions

Read all files in `/docs` and all files in `/docs/full_build_prompts`.

Inspect the implemented code in:

- `apps/api`
- `apps/web`
- `packages/shared`

Then perform a ruthless audit against these dimensions:

1. Product fit for Russian properties up to 50 rooms
2. Mobile-first usability
3. Offline-first continuity
4. Front desk speed and reservation clarity
5. Housekeeping and maintenance practicality
6. Payment and folio correctness
7. Compliance readiness
8. Security, privacy, and auditability
9. Data durability and recovery posture
10. Commercial readiness and onboarding quality

## Required output

- list the highest-risk product or engineering gaps first
- cite exact files and code areas
- identify missing tests and weak assumptions
- fix what is safely fixable within the repository
- if something should not be fixed blindly, explain the risk and the smallest safe follow-up

## Pass condition

The product should now feel credibly better than a generic prototype for:

- owner oversight
- front desk speed
- housekeeping execution
- Russian SMB hotel operations

If it still does not, keep iterating until the remaining gaps are clearly non-trivial integration or deployment items rather than foundational product holes.
