# 00 Context

## 1. Product vision

Build a mobile-first PWA for small hotels with 5 to 40 rooms that lets staff run the property from one screen flow per task: take booking, check guest in, record payment, track cleaning, and close the day.

The system must replace paper, WhatsApp notes, spreadsheets, and memory with a single operational source of truth that still works when internet is unstable.

The product is not a "hotel platform". It is an operations console for small teams with low digital maturity and very little time for training.

## 2. Target users

### Primary users

- Owner-operator who manages bookings, cash, and exceptions personally
- Front desk admin who handles calls, walk-ins, arrivals, room changes, and payments
- Housekeeping lead who needs a clear cleaning queue and room readiness status

### Secondary users

- Accountant or back-office staff who check revenue, payment records, and audit history
- Remote owner who wants daily status and anomaly alerts without entering full admin mode

## 3. Core problem

Small hotels lose money and create guest-facing mistakes because booking data, room status, payment status, and cleaning status are fragmented across people and tools.

Typical failures:

- double booking because one channel update was missed
- room marked clean verbally but still blocked in reality
- guest checked in before payment/deposit issue was visible
- staff forget late checkout, extra guest, or maintenance block
- owner cannot trust today's occupancy or cash figure

The core problem is not lack of features. It is lack of one reliable operational state for "what is true right now".

## 4. Success criteria

### Operational metrics

- Create reservation in under 60 seconds on mobile
- Check in a guest in under 90 seconds
- Complete common "today operations" actions in under 15 seconds
- Reduce room-status mistakes to fewer than 1 operational conflict per 200 stays
- Reduce payment-status ambiguity to zero unresolved stays at end of day

### Business metrics

- Staff can learn basic daily workflow in under 2 hours
- Property can run daily operations with 1 primary device and intermittent internet
- Owner can review occupancy, arrivals, departures, unpaid stays, and blocked rooms in under 3 minutes
- Pilot property keeps using the system after 30 days without parallel spreadsheet fallback

## 5. Constraints

- Users may have old Android phones and low-end laptops
- Internet may drop for minutes or hours
- Staff may have weak process discipline and weak typing accuracy
- Training time is minimal; UI must teach by structure
- Many bookings arrive by phone, messengers, or simple OTA exports, not rich integrations
- Cash payments are common
- Multiple users may share one device or one shift handoff
- Property rarely has internal IT support
- Data loss or ambiguous sync is unacceptable for reservations and payments
- The team cannot maintain heavy enterprise infrastructure or complex setup

## 6. Non-goals

- No full enterprise PMS scope for chains, restaurants, spa, or conference operations
- No complex revenue management engine
- No accounting ERP replacement
- No marketing CRM, loyalty system, or campaign suite
- No custom workflow builder in V1
- No attempt to automate final operational decisions without human confirmation
