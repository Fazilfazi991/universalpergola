# Phase 2H release-readiness record

Recorded: 14 September 2026.

| Field | Value |
|---|---|
| Verified baseline | `30e90505bf80dbefcbaa87574c4d4dab1436643d` |
| Candidate release | The commit containing this record; exact immutable SHA is reported by `git rev-parse HEAD` in the Phase 2H handoff |
| Migration head | `20260914120000_phase_2h_site_visit_update_policy.sql` |
| Intended current target | Hosted UAT Supabase project `jwyjuhtektmtqffnillj`; localhost application |
| Intended later Production target | Separate Supabase project and Vercel Production environment after explicit authorization |
| Application rollback SHA | `30e90505bf80dbefcbaa87574c4d4dab1436643d` |
| Database rollback limitation | Forward migrations and operational writes are not safely reversed by Git rollback; restore/forward repair requires an approved backup and runbook |
| Storage consideration | Database backups do not contain bucket object contents; independent object backup/restore and registry reconciliation are required |
| Preview/UAT URL | Not created in Phase 2H |
| Production deployment | Not performed |

## Candidate contents

- Additive consolidation of the two `site_visits` UPDATE policies into one behavior-equivalent role-aware policy.
- Reproducible, credential-safe UAT seeding and technical acceptance scripts.
- Chrome three-viewport route/role/performance verification.
- Current UAT quotation/payment receipt proof generation.
- Environment, UAT, backup/recovery, Production and issue-register documentation.

## Release decision

The candidate is suitable for real stakeholder UAT. It is **not approved for Production** until all P1 items in `UAT_ISSUES.md` are closed and the controlled cutover checklist is signed.
