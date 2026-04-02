# 06 Distribution, Channel Manager, And Direct Sales

Implement the distribution layer that keeps inventory and prices coherent while helping small properties reduce dependency on OTA-heavy workflows.

## Goal

Support a pragmatic channel manager foundation and a strong direct booking path suitable for small Russian hotels and glamping operators.

## Scope

- inventory and rate synchronization model
- OTA mapping layer
- direct booking engine foundation
- booking source analytics
- overbooking prevention

## Functional requirements

1. Add source-aware reservations and booking metadata.
2. Implement channel mapping primitives:
   - external channel account
   - room type mapping
   - rate plan mapping
   - inventory sync state
   - message log
3. Add a sync task model that can:
   - push inventory
   - push rate updates
   - ingest bookings
   - ingest cancellations and modifications
4. Create an adapter-first architecture so specific providers can be added without core rewrites.
5. Add a direct booking engine foundation:
   - public availability request
   - quote
   - provisional reservation
   - payment link handoff
   - confirmation
6. Record source attribution for every reservation:
   - direct
   - OTA
   - phone
   - walk-in
   - partner

## Product strategy requirements

- keep the initial set intentionally focused
- do not try to implement every OTA deeply in one pass
- make direct sales, lower commission reliance, and operational clarity a first-class theme

## Acceptance criteria

- inventory changes have a clear outbound sync path
- inbound channel bookings can be ingested into the reservation model
- operators can see where bookings come from and how channels affect revenue
- the architecture is ready for a first real channel provider integration
