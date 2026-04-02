# 01 Product

Source: `00_context.md`

## 1. Jobs-to-be-done

1. When a guest calls or writes, staff need to create or confirm a booking fast so the room is secured before the guest disappears.
2. When a shift starts, staff need to see today's arrivals, departures, unpaid stays, and dirty rooms so they know what needs attention first.
3. When a guest arrives, staff need to confirm identity, assign a ready room, and capture payment/deposit without missing blocking issues.
4. When a guest leaves, staff need to close charges, release the room, and trigger cleaning with no ambiguity about room state.
5. When housekeeping works, staff need a simple room queue so they know what to clean now and what can wait.
6. When the owner checks the business, they need a trustworthy picture of occupancy, revenue, and problems without digging through raw records.
7. When internet is unstable, staff need the system to keep working and sync safely later.

## 2. User roles

- Owner: sees full hotel state, money, audit, reports, settings
- Front desk: manages reservations, check-in, check-out, guest search, payments
- Housekeeping: sees room list, cleaning tasks, room readiness, maintenance flags
- Accountant/back office: sees payments, folios, audit trail, exports

## 3. Pain points

- Reservation details arrive in messy text and get copied manually
- Staff forget to update room state after checkout or cleaning
- Payment status is tracked separately from stay status
- Search is weak when guest names are misspelled or incomplete
- Shift handoff depends on memory or paper
- WhatsApp/phone updates are not visible to the next person
- Owners do not trust "today" numbers because statuses drift apart

## 4. Critical scenarios

- Last available room booked by phone while OTA update is delayed
- Guest arrives early and the assigned room is not ready
- Guest wants to extend stay while future reservation exists
- Partial payment accepted, but full balance remains before checkout
- Internet drops during check-in or payment capture
- Cleaner marks room ready on one device while front desk is assigning it on another
- Staff search for a guest with wrong spelling and duplicate records appear

## 5. Top-10 use cases

1. Create reservation from phone call or message
2. View "today operations" dashboard
3. Check guest in
4. Record payment or deposit
5. Check guest out
6. Mark room dirty / in cleaning / ready
7. Search guest, reservation, or room instantly
8. Extend or move reservation
9. Block room for maintenance
10. Review unpaid stays and anomalies before shift end

## 6. MVP scope

- Reservation CRUD with conflict detection
- Room inventory and room status management
- Check-in and check-out workflows
- Payment tracking with paid / partial / unpaid states
- Today dashboard for arrivals, departures, dirty rooms, overdue actions
- Housekeeping task flow
- Offline-first local operation with sync queue
- Audit log for critical changes
- Basic AI booking parser and daily assistant summaries

## 7. V2 scope

- OTA/channel import adapters
- Pricing hints and occupancy-based recommendations
- Guest communication drafts and templates
- Better reporting and exports
- Multi-user conflict assistance
- Maintenance workflow

## 8. V3 scope

- Multi-property management
- Deeper analytics and forecasting
- Smarter anomaly detection across seasonality
- Advanced permission model and device policies

## 9. Product risks

- Overcomplicated flows will kill adoption faster than missing features
- Weak sync/conflict design can destroy trust permanently
- AI outputs may look confident while being wrong
- Too many statuses create staff confusion
- If mobile performance is poor on low-end devices, staff will return to paper
- If the system requires strict process discipline, small hotels will bypass it
