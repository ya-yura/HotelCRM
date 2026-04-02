# Docs Workflow

This folder is the architecture contract for the hotel CRM.

## Execution order

1. `00_context.md`
2. `01_product.md`
3. `02_principles.md`
4. `03_domain.md`
5. `04_states.md`
6. `05_flows.md`
7. `07_ai.md`
8. `06_architecture.md`
9. `08_backend.md`
10. `09_api.md`
11. `10_frontend.md`
12. `11_design_system.md`
13. `12_modules.md`
14. `13_plan.md`
15. `14_execution.md`
16. `15_audit.md`

## Cursor operating rule

Before changing architecture, backend, frontend, AI behavior, or state logic:

- read the relevant source docs
- preserve previously defined invariants
- prefer extending the model over replacing it
- do not introduce flows that break mobile-first or offline-first constraints

## Recovery prompt

If implementation starts drifting, use this control prompt:

`Read all files in /docs. Verify that the current solution matches them. If it does not, fix the implementation and restore architectural consistency.`

## Full build prompt pack

For the production implementation phase, use the prompt pack in `/docs/full_build_prompts`.
