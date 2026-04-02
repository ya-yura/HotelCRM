# 16 Competitive Benchmark

## Target reference

Primary benchmark: AzHotel

Sources:

- https://azhotel.net/
- https://play.google.com/store/apps/details?id=azhotel.satech.net

## Confirmed AzHotel strengths

Based on the public website and app store listing, AzHotel positions itself around these practical capabilities:

- booking management with an intuitive booking schedule
- room management with room type and room setup
- secondary accounts and decentralized permissions
- check-in, adding services, check-out, and cleaning
- graph-based business statistics
- cross-device sync and mobile-first operation
- support for small and medium hotels, motels, and homestays
- channel-manager positioning in the broader product messaging

## Where our current product is already competitive

- owner signup and hotel workspace bootstrap
- multi-user roles with owner, front desk, housekeeping, accountant
- room readiness lifecycle
- reservation flow with confirm, check-in, check-out, reassign
- payment tracking with balance blocking at checkout
- service posting to folio during stay, including charges that affect checkout safety
- sync queue, retry, and conflict inbox
- mobile-first operational shell
- AI assistant, booking parsing, and occupancy hints
- booking board / first chessboard view
- owner activation checklist and setup flow

## Where we are still behind AzHotel

### Functional gaps

- richer visual statistics and longer-period analytics
- explicit channel manager / OTA inventory workflow
- guest directory and guest merge as first-class module
- maintenance workflow beyond simple room blocking
- invoice/export/reporting completeness

### Product maturity gaps

- our booking board is useful but still simpler than a mature full schedule view
- our statistics are present but still lightweight
- our auth is scaffold-grade, not production-grade identity/security
- our persistence is durable but still JSON-backed instead of real database-backed

## Product parity rule

We should treat these as minimum parity targets for the next phase:

1. Stronger booking board / chessboard
2. Better owner statistics
3. Guest module
4. Staff management beyond basic create flow
5. Database-backed production persistence
6. OTA / channel-manager workflows

## PM conclusion

We no longer have only a prototype. We now have a real owner-first hotel workspace with onboarding, operations, room truth, folio services, payments, sync, AI, and staff setup. To become "not worse than AzHotel" in functional breadth, the next must-have gaps are a stronger chessboard, better analytics, and fuller guest/reporting depth.
