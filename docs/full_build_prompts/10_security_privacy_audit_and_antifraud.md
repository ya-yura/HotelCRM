# 10 Security, Privacy, Audit, And Antifraud

Implement the production trust layer for the hotel CRM.

## Goal

Protect guest data, reduce abuse risk, and make all sensitive actions traceable without making daily work painful.

## Scope

- API protection
- PII handling
- session hardening
- audit log expansion
- abuse and anomaly controls
- backup and recovery requirements

## Functional requirements

1. Add request protection suitable for internet-facing hotel software:
   - rate limiting
   - repeated-failure throttling
   - lockout or cooldown strategy
   - request correlation IDs
2. Harden sessions:
   - refresh rotation or equivalent secure renewal
   - device revocation
   - logout-all sessions
   - recent-auth markers for sensitive actions
3. Add field-level privacy handling for guest PII:
   - masked displays by role
   - encryption-ready storage boundaries
   - restricted export access
4. Expand audit coverage for:
   - guest merge
   - compliance data edits
   - payment changes
   - role changes
   - room blocks
   - conflict overrides
5. Add backup and restore documentation and automated checks.
6. Add anomaly signals for:
   - repeated refund attempts
   - excessive failed logins
   - abnormal cancellation bursts
   - repeated sync conflicts by the same actor or device

## Product constraints

- keep security understandable for SMB operators
- minimize unnecessary prompts during routine flows
- never expose raw PII in logs

## Acceptance criteria

- critical actions are auditable end to end
- sensitive data exposure is meaningfully reduced by role
- the system has a defined recovery posture for data loss scenarios
- the main API has basic hardening against trivial abuse and brute force attempts
