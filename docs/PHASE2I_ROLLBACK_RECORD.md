# Phase 2I rollback and release record

Recorded: 14 September 2026.

| Field | Value / status |
|---|---|
| Verified Phase 2H release candidate | `6c8bf86187982b6477129654e6457dbb6601da29` |
| Phase 2I candidate | Commit containing this record; report exact SHA after verification |
| Migration head | `20260914120000_phase_2h_site_visit_update_policy.sql` |
| UAT Supabase reference | `jwyjuhtektmtqffnillj` — UAT only |
| Production Supabase reference | BLOCKED / not created |
| Production Vercel project | BLOCKED / not linked or created |
| Production deployment identifier | NOT DEPLOYED |
| Production hostname / DNS | NOT CONFIGURED / NOT CHANGED |
| Database restore point | BLOCKED / no Production project or approved recovery plan |
| Storage restore point | BLOCKED / no Production project or approved object backup plan |
| Live rollback target | NOT APPLICABLE — no live cutover authorized |

## Rollback principles

- Application rollback means selecting a previously verified immutable deployment/SHA; it does not reverse database writes or migrations.
- Database schema/data recovery uses an approved restore point or tested forward repair. Destructive reverse migrations are not improvised during an incident.
- Storage objects require their own versioned backup and restore process plus registry reconciliation.
- Auth configuration, secrets and DNS changes require timestamped before/after records and named operators.
- If a non-live smoke test fails, keep the candidate isolated, preserve evidence, record the issue, and restore/recreate the isolated environment. Do not route live traffic.

## Cutover hold point

Phase 2I ends before live cutover. A later GO decision must identify the approved application SHA, database restore point, Storage restore point, Vercel deployment, hostname, DNS values, monitoring owner, rollback decision owner and maintenance window. Until then, the exact cutover action is: **take no live action**.
