# 02 Principles

Sources: `00_context.md`, `01_product.md`

## 1. One Operational Truth

- Meaning: reservation, room, housekeeping, and payment state must reconcile into one current truth
- Why: fragmented truth creates double booking and payment mistakes
- Impact: strong domain model, transactional updates, visible status summary
- Good example: check-in screen shows room readiness, reservation validity, and payment requirement together
- Bad example: room is marked occupied in one screen but still available in another

## 2. Mobile First, Not Mobile Later

- Meaning: primary workflows are designed for narrow screens and one-hand use
- Why: many users operate from phones on the move
- Impact: short forms, large tap targets, bottom actions, minimal tables
- Good example: check-in can be completed from a single vertical flow
- Bad example: desktop table is shrunk onto a phone with horizontal scroll

## 3. Offline Is a Normal State

- Meaning: loss of internet is expected, not exceptional
- Why: properties may have unstable connectivity
- Impact: local database, sync queue, explicit pending states, retry logic
- Good example: reservation save completes locally and shows sync pending
- Bad example: whole screen becomes unusable until network returns

## 4. Fastest Safe Path Wins

- Meaning: frequent tasks should require the fewest safe steps
- Why: staff are busy and often multitasking
- Impact: flow optimization, defaults, scanned summaries before confirmation
- Good example: returning guest check-in requires only verify, assign, collect
- Bad example: six-screen wizard for a standard arrival

## 5. Low Cognitive Load

- Meaning: UI should reduce remembering, comparing, and interpreting
- Why: low-skill users and shift handoffs create mental overload
- Impact: task grouping, plain language labels, status chips, guided actions
- Good example: "2 unpaid arrivals today" card opens filtered list
- Bad example: user must infer urgency from raw timestamps only

## 6. Statuses Must Be Actionable

- Meaning: every status must change behavior or decision-making
- Why: decorative statuses add noise
- Impact: strict state machines, small status vocabulary
- Good example: "Dirty" means room cannot be assigned
- Bad example: "Reviewed" exists but changes nothing

## 7. Prevent Before You Warn

- Meaning: block impossible actions instead of showing passive warnings after the fact
- Why: users miss warnings under pressure
- Impact: invariants, hard validations, guarded transitions
- Good example: system refuses assignment to occupied or blocked room
- Bad example: system allows it and shows a red toast after save

## 8. Human Confirmation for Irreversible Steps

- Meaning: destructive or money-related actions need explicit confirmation
- Why: corrections are costly
- Impact: confirm dialogs, audit logs, permission checks
- Good example: refund or stay cancellation requires a reason
- Bad example: accidental tap marks stay checked out immediately

## 9. Visible Today Over Deep Navigation

- Meaning: today's urgent operations should be reachable from the first screen
- Why: daily operations dominate usage
- Impact: home dashboard, quick filters, pinned actions
- Good example: arrivals, departures, dirty rooms, unpaid stays on dashboard
- Bad example: staff must dig through menus to find today's departures

## 10. Search Must Tolerate Messy Reality

- Meaning: search should work with partial names, wrong spellings, dates, room numbers, and phone fragments
- Why: user input is often incomplete or inaccurate
- Impact: indexed local search, fuzzy matching, disambiguation UI
- Good example: "ivan 24" finds Ivanov arriving on the 24th
- Bad example: exact full-name match only

## 11. Every Critical Change Leaves a Trace

- Meaning: key actions must be auditable
- Why: disputes and mistakes need reconstruction
- Impact: audit log, actor, timestamp, device, before/after delta
- Good example: room reassignment records who changed it and why
- Bad example: overwritten payment amount with no history

## 12. Sync Must Explain Itself

- Meaning: pending, failed, and conflicted sync states must be understandable
- Why: silent sync problems destroy trust
- Impact: queue UI, retry reasons, conflict resolution flow
- Good example: "Payment saved locally, server sync failed, retrying in 2 min"
- Bad example: small disconnected icon with no detail

## 13. Data Entry Should Be Assisted

- Meaning: the system should parse, suggest, and autofill wherever safe
- Why: manual typing is slow and error-prone
- Impact: AI parser, defaults, templates, inferred fields with confirmation
- Good example: pasted booking message becomes structured draft reservation
- Bad example: user retypes everything from scratch

## 14. AI Can Suggest, Not Decide

- Meaning: AI output supports staff but cannot finalize critical operations alone
- Why: hotel operations need deterministic truth
- Impact: human review gates, confidence thresholds, rule-based guards
- Good example: AI suggests room assignment candidates for review
- Bad example: AI silently changes booking dates

## 15. Conflict Resolution Must Be Localized

- Meaning: resolve the smallest conflicting object and show concrete choices
- Why: broad sync errors confuse users
- Impact: entity-level versions, merge policies, conflict dialogs
- Good example: only one reservation needs decision after simultaneous edit
- Bad example: full-database sync failure banner

## 16. Defaults Should Reflect Real Hotel Practice

- Meaning: common operations should come preconfigured sensibly
- Why: small teams do not tune complex settings
- Impact: default payment policies, room lifecycle presets, role templates
- Good example: checkout automatically marks room dirty
- Bad example: admin must manually model every housekeeping state from zero

## 17. Recovery Paths Matter as Much as Happy Paths

- Meaning: each flow must define how staff recover from mistakes and interruptions
- Why: hospitality work is interrupt-driven
- Impact: drafts, resumable forms, reversal actions, exception screens
- Good example: interrupted booking draft is recoverable after a call
- Bad example: unsaved form is lost on navigation

## 18. Important Numbers Must Match User Expectations

- Meaning: occupancy, arrivals, unpaid totals, and available rooms must be explainable
- Why: owners stop trusting systems when counts disagree with reality
- Impact: derived metrics tied to domain rules, definitions in reports
- Good example: "Available today" excludes dirty, occupied, and maintenance rooms
- Bad example: raw room count shown without state rules

## 19. Permissions Should Protect Risk, Not Create Friction

- Meaning: permissions focus on money, destructive actions, and configuration
- Why: over-restricting daily work slows operations
- Impact: role-based permission design with simple levels
- Good example: housekeeping can update cleaning status but not refund payments
- Bad example: front desk cannot edit guest phone number without admin

## 20. Performance Is a Feature

- Meaning: the app must feel immediate on old hardware
- Why: delay looks like failure to low-confidence users
- Impact: local-first reads, optimized lists, lightweight bundles
- Good example: dashboard opens instantly from cached local data
- Bad example: spinner before every list view

## 21. Empty States Must Teach the Workflow

- Meaning: empty screens should show what happens next
- Why: many users learn by doing
- Impact: onboarding copy, suggested first actions, examples
- Good example: empty reservations screen offers "Create first walk-in booking"
- Bad example: blank table with no explanation

## 22. Shared Devices Need Safe Handoffs

- Meaning: the system should tolerate shift changes and device sharing
- Why: many hotels do not provide one personal device per staff member
- Impact: fast logout, activity attribution, session reminders
- Good example: quick re-auth for privileged actions on shared tablet
- Bad example: all actions recorded under one permanent shared login

## 23. Error Language Must Be Operational

- Meaning: errors should explain what happened and what to do next
- Why: generic failures increase panic
- Impact: domain-specific error messages and recovery hints
- Good example: "Room 203 cannot be assigned because it is Dirty. Choose another room or mark cleaning complete."
- Bad example: "Validation failed"

## 24. Architecture Must Stay Small-Team Maintainable

- Meaning: choose simple components that a small product team can operate
- Why: overengineering increases failure surface
- Impact: pragmatic stack, clear module boundaries, minimal service sprawl
- Good example: modular monolith with background jobs
- Bad example: many microservices for a 40-room hotel product
