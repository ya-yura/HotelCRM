# 12 Commercial Readiness And Profitability

Implement the product surfaces and internal capabilities that support the chosen SMB go-to-market strategy.

## Goal

Ensure the app is not only functional but commercially viable for the target segment.

## Scope

- onboarding that reduces time to first value
- packaging-ready feature boundaries
- adoption metrics
- support tooling
- pricing-aligned product design

## Functional requirements

1. Improve onboarding so a new owner can:
   - create property
   - add rooms
   - add staff
   - take first booking
   - understand payment setup
   - understand compliance readiness
2. Add activation checkpoints and nudges that match the commercial strategy:
   - first reservation created
   - first payment taken
   - first housekeeping cycle completed
   - first report viewed
3. Add internal metrics or event logging for:
   - activation funnel
   - feature adoption
   - booking source mix
   - churn-risk signals
4. Create plan-ready feature boundaries for future packaging such as:
   - base
   - pro
   - compliance add-on
   - fiscalization add-on
   - advanced analytics
5. Add support and diagnostics views that help onboarding and customer success without exposing unsafe internals.

## Product strategy requirements

- avoid dark patterns and hidden commission logic
- keep the UI honest about what is included and what still needs provider configuration
- optimize for low-support, low-training rollout in small teams

## Acceptance criteria

- first-time setup clearly guides the owner to operational value
- product telemetry can show whether a property is activated or at risk
- package boundaries exist in code and UX without fragmenting the core experience
