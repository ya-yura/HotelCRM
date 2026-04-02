# 02 Auth, Properties, And Staff

Implement secure multi-property auth and staff administration for the hotel product.

## Goal

Turn the current owner-first access model into a production-capable identity and workspace system suitable for shared front desk devices and small property teams.

## Scope

- owner signup and property bootstrap
- staff invitation and activation
- role and permission model
- quick unlock for shared devices
- sensitive-action re-authentication
- property settings and operational preferences

## Functional requirements

1. Support these roles at minimum:
   - owner
   - manager
   - frontdesk
   - housekeeping
   - maintenance
   - accountant
2. Allow the owner to create one or more properties later, but keep the initial UX optimized for a single property.
3. Add staff invitation or owner-created accounts with temporary credentials or PIN setup.
4. Support shared-device mode for front desk and housekeeping devices:
   - full login once
   - short re-entry with PIN afterward
   - timeout and forced relock
5. Require recent re-auth for:
   - refunds
   - room reassignment with financial impact
   - cancellation of paid reservations
   - export of sensitive guest data
   - settings changes
6. Add property profile settings needed by later modules:
   - legal entity and tax fields
   - default check-in and check-out times
   - city, timezone, and address
   - currency and VAT settings
   - notification preferences
   - housekeeping operating windows

## UX requirements

- all critical staff setup must work well on mobile
- an owner should be able to activate a new property and first staff in one short flow
- permissions should be understandable in plain operational language

## Security requirements

- do not store plain passwords or plain PINs
- use secure session handling with rotation and revocation support
- log sign-in, failed sign-in, device registration, permission changes, and lock events

## Acceptance criteria

- owner can fully bootstrap a hotel workspace from scratch
- staff can log in with only the capabilities their role allows
- shared-device mode is practical for reception use
- permission checks are enforced in routes and hidden in UI entry points
