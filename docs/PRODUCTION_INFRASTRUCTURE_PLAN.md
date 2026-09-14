# Production infrastructure preparation plan

Recorded: 14 September 2026. This is a non-executing plan; it is not authorization to create resources, deploy, change DNS or provision users.

## Current verified inventory

| Item | Verified state |
|---|---|
| Supabase organization | `Pergola` — `vlnviszmbwuzhrihirjr` |
| Existing Supabase projects | UAT only: `Pergola` — `jwyjuhtektmtqffnillj`, `us-west-1`, ACTIVE_HEALTHY |
| Dedicated Production Supabase | Does not exist / not authorized |
| Migration head | `20260914120000_phase_2h_site_visit_update_policy.sql` |
| Vercel account | Authenticated as `fazilfazi991` |
| Vercel team | `Faziil's projects` — `faziils-projects` |
| Local Vercel link | None (`.vercel` absent) |
| Production Vercel project/deployment | Does not exist in the authorized record |
| Candidate application SHA | `6c8bf86187982b6477129654e6457dbb6601da29` |

## Decisions required before resource creation

| Decision | Approved value | Approver / date | Status |
|---|---|---|---|
| Production project name | — | — | BLOCKED |
| Supabase organization | Confirm `vlnviszmbwuzhrihirjr` or specify another | — | BLOCKED |
| Region / data residency | — | — | BLOCKED |
| Paid plan / backup entitlement | — | — | BLOCKED |
| Required RPO | — | — | BLOCKED |
| Required RTO | — | — | BLOCKED |
| PITR retention | — | — | BLOCKED |
| Storage-object backup destination / retention | — | — | BLOCKED |
| Production hostname | — | — | BLOCKED |
| Vercel account/team/project | — | — | BLOCKED |
| Auth signup policy | Invite/admin only unless explicitly approved otherwise | — | BLOCKED |
| SMTP provider and sender identity | — | — | BLOCKED |
| Password / MFA policy | Leaked-password protection required | — | BLOCKED |
| Maintenance and staff-provisioning window | — | — | BLOCKED |

## Controlled execution sequence after approval

1. Record explicit authorization and the completed decision table above.
2. Create a dedicated empty Production Supabase project; record its reference, region and plan. Never repurpose or clone UAT as the live database.
3. Capture the initial recovery configuration and verify backup/PITR entitlement against the approved RPO/RTO.
4. Apply the complete migration history to the empty Production database and record migration parity, database lint, RLS and security-advisor evidence.
5. Configure private Storage buckets/policies and establish a separate object backup/restore process; database backups alone do not restore Storage objects.
6. Configure exact HTTPS site/redirect URLs, disable open signup unless expressly approved, enforce the approved password/MFA policy, enable leaked-password protection, and configure custom SMTP.
7. Test invite, login, logout, recovery and role enforcement with authorized test identities only.
8. Import only the approved Production catalogue and controlled configuration. Do not copy UAT customers, enquiries, visits, quotations, projects, payments, feedback, test users or test media.
9. Link the approved Vercel project and set scoped Production variables without exposing service-role/database secrets to the browser or Git.
10. Deploy a non-live Production candidate, record the immutable deployment identifier, and run role, workflow, document, performance and recovery smoke tests.
11. Provision named staff only in the approved window. Record identity IDs and role assignments without passwords.
12. Produce the Phase 2I A–T evidence report and stop. DNS/live traffic remains a separately authorized cutover action.

## Production data manifest

The controlled seed record must include source version, owner, approval date, checksum, importer/operator, import time, row counts and reconciliation results. Allowed initial data is limited to approved configuration, project-stage templates created by migrations, approved categories/products and explicitly approved media.

Forbidden seed sources include the Phase 2H UAT database, UAT-labelled records, generated UAT credentials, placeholder catalogue text/prices, test customer information and test documents.

## Required verification evidence

- Dedicated project identifiers and plan screenshot/export.
- Migration list parity and zero unresolved schema errors.
- Auth settings and custom SMTP delivery/recovery evidence.
- RLS, role-boundary, private Storage and RPC regression results.
- Backup creation plus isolated database and Storage restore proof meeting RPO/RTO.
- Approved data manifest with counts and sample reconciliation.
- Non-live deployment ID, environment-variable inventory and route smoke results.
- Fresh quotation/receipt samples generated only after wording approval.
- Rollback rehearsal record and named decision owners.

All secrets remain in approved secret stores. Evidence must redact tokens, passwords, database connection strings and private customer data.
