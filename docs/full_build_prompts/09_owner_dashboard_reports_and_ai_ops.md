# 09 Owner Dashboard, Reports, And AI Ops

Implement the management visibility layer that gives owners and managers real-time operational control from a phone.

## Goal

Provide dashboards and reports that answer the real questions owners ask every day, while using AI only where it adds practical leverage.

## Scope

- KPI dashboard
- operational alerts
- reporting exports
- AI assistant for summaries and anomalies
- action-oriented management UX

## Functional requirements

1. Add owner and manager dashboard cards for:
   - occupancy today
   - occupancy next 7 and 30 days
   - ADR
   - RevPAR
   - arrivals and departures
   - unpaid stays
   - dirty rooms
   - blocked rooms
   - source mix
   - revenue by day and by source
2. Add reports suitable for small-property operations:
   - occupancy report
   - revenue report
   - payments and debt report
   - housekeeping productivity report
   - booking source report
3. Make the AI layer practical:
   - anomaly alerts
   - missing-payment detection
   - occupancy or pricing hints
   - next-best-action summary for the day
4. Keep every AI suggestion explainable and dismissible.
5. Make reports exportable in common operational formats.

## UX requirements

- dashboard must be fast on mobile
- prioritize operational cards over decorative charts
- charts are helpful only when they lead to action

## Acceptance criteria

- an owner can open the app and understand hotel health in under one minute
- reports reconcile with the reservation, room, and payment truth
- AI suggestions never act autonomously on sensitive data
- dashboard data remains useful even with temporary backend degradation by using local or cached summaries where appropriate
