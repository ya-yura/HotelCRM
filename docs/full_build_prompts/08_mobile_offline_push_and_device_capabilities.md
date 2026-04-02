# 08 Mobile, Offline, Push, And Device Capabilities

Implement the mobility layer that turns this repository into a credible phone-first hotel product.

## Goal

Deliver a dependable mobile experience for owners, front desk staff, and housekeepers, with strong offline continuity and practical device integrations.

## Scope

- installable PWA hardening
- local persistence and sync maturity
- push notification pipeline
- camera and file attachments
- optional native wrapper preparation for device-specific features

## Functional requirements

1. Mature the local data layer for:
   - reservations
   - rooms
   - housekeeping tasks
   - stays
   - payments
   - guests
   - sync queue
   - conflicts
2. Implement deterministic queue flushing and dependency ordering.
3. Add user-visible sync states:
   - synced
   - pending
   - retrying
   - conflict
   - offline
4. Add push or local-notification-ready events for:
   - new reservation
   - arrival due soon
   - unpaid departure
   - urgent room issue
   - failed compliance submission
5. Add photo capture for damage or maintenance evidence.
6. Prepare a wrapper-friendly boundary for features that may need native shells later:
   - push tokens
   - camera permissions
   - file system access
   - home screen shortcuts
   - future widgets

## Product constraints

- the current stack is React PWA; do not rewrite the client
- if native bridging is needed, design it so the web app remains the main product surface
- maintain graceful degradation in browsers without native capabilities

## Acceptance criteria

- a housekeeper can continue task work without network
- an owner can receive meaningful notifications
- sync failures are actionable and visible
- device capabilities are abstracted cleanly enough for future packaging
