# 05 Payments, Fiscalization, And Folios

Implement a trustworthy financial core for hotel operations in Russia.

## Goal

Give operators a clean folio and payment workflow that supports deposits, partial payments, service charges, refunds, fiscalization adapters, and Russian payment methods without making the UI heavy.

## Scope

- folio architecture
- payment ledger completion
- deposits and prepayments
- refunds and corrections
- payment links and cash desk support
- fiscalization adapter layer for Russian providers

## Functional requirements

1. Model the folio as the source of operational balance truth.
2. Support folio lines for:
   - room charge
   - service charge
   - minibar charge
   - damage charge
   - tax or fee
   - discount
   - payment
   - refund
3. Support payment methods:
   - cash
   - bank card
   - bank transfer
   - SBP payment link
   - online acquiring placeholder for YooKassa and T-Bank
4. Implement:
   - partial payment
   - deposit capture
   - hold balance due at checkout
   - refund with reason
   - correction entry with audit trail
5. Introduce an adapter boundary for:
   - ATOL
   - Shtrih-M
   - YooKassa
   - T-Bank
6. Make the API and UI capable of sending or displaying payment links for remote prepayment.

## Russian product requirements

- make room for fiscal receipt status tracking
- support the difference between operational success and fiscalization acknowledgment
- log every payment-affecting action with actor, reason, and request correlation

## UX requirements

- folio must be understandable by non-finance hotel staff
- no hidden recalculation
- every balance change should explain why it changed

## Acceptance criteria

- checkout is blocked when balance due rules say it must be blocked
- refunds require elevated confirmation and are fully audited
- service and minibar postings appear in the folio and affect balance correctly
- integration boundaries are ready for production provider wiring
