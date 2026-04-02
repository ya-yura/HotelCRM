# 07 Compliance, MVD, Rosstat, And Documents

Implement the Russian compliance and operational document layer required for real-world hotel use.

## Goal

Make compliance feel built into the workflow rather than bolted on as a separate clerical burden.

## Scope

- guest document capture and validation
- migration reporting preparation
- Rosstat-ready reporting support
- printable and downloadable operational documents
- submission tracking and operator feedback

## Functional requirements

1. Extend guest and stay data to support fields required for migration reporting and legal accommodation records.
2. Add validation rules for mandatory fields before check-in completion when the property policy requires them.
3. Implement a compliance submission domain:
   - draft
   - ready
   - submitted
   - failed
   - corrected
4. Add an adapter layer for future transmission via partner integration or official gateways.
5. Generate operational documents:
   - registration card
   - stay confirmation
   - invoice or service summary
   - housekeeping or maintenance print view if needed
6. Add export-ready reporting datasets for accounting and state reporting workflows.

## UX requirements

- show what is missing before submission
- distinguish between guest profile completeness and compliance readiness
- allow staff to fix invalid data quickly on mobile

## Constraints

- do not hardcode undocumented state API behavior
- model provider-agnostic compliance adapters first
- preserve privacy boundaries around document data

## Acceptance criteria

- staff can tell whether a guest record is compliant before or during check-in
- compliance submissions have visible states and retry paths
- generated documents are consistent with folio and reservation truth
- the system is ready for real provider wiring without redesign
