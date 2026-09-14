# Backup and recovery plan

Updated: 14 September 2026.

## Verified current state

- Supabase CLI reports `pitr_enabled: false`, `walg_enabled: true`, and no listed physical backups for the current UAT project.
- Migration history is aligned locally and remotely through `20260914120000`.
- Git baseline/rollback SHA is `30e90505bf80dbefcbaa87574c4d4dab1436643d`.
- No Vercel project is linked in this checkout, so Vercel rollback has not been rehearsed.
- A database restore and Storage restore have **not** been performed. Backup readiness is therefore not verified for Production.

## Production strategy

1. Select a Supabase plan that provides the approved retention window. Enable PITR if the business recovery-point objective requires it.
2. Confirm daily database backup status and retention in the Production project before importing business data.
3. Schedule logical exports before schema cutovers and other high-risk administrative operations. Encrypt exports, limit access, and test restore into an isolated non-production project.
4. Back up Storage objects separately. Supabase database backups cover object metadata, not the contents of Storage buckets.
5. Retain application source, lockfile and migrations in Git. Tag each approved release and record the deployed SHA.
6. Export/escrow environment-variable names and values in the approved secret manager. Never store values in Git documentation.

## Recovery runbooks

### Application rollback

1. Stop new writes if data compatibility is at risk.
2. Redeploy the last approved Vercel deployment or Git release SHA.
3. Restore the matching environment-variable version.
4. Run login, role-boundary, catalogue, CRM, project, finance and document smoke tests.

### Database recovery

1. Declare the incident window and preserve logs/evidence.
2. Determine whether forward repair, PITR or isolated restore is safest.
3. Restore into an isolated project first whenever possible; verify row counts, foreign keys, payment totals, feedback state and Storage registry consistency.
4. Do not run destructive down migrations on Production. Most migrations in this repository are forward-only and may have transformed immutable operational records.
5. Obtain incident-owner approval before switching application variables to a recovered database.

### Storage recovery

1. Restore bucket objects from the independent object backup using their original paths.
2. Compare object paths with `product_images`, `site_visit_photos`, `project_files` and `payment_proofs` registries.
3. Quarantine orphan objects/registry rows; do not make private buckets public as a recovery shortcut.

### Cutover rollback

Before DNS or Production variable changes, capture the deployed Git SHA, Supabase migration head, backup timestamp, Storage snapshot identifier and environment-variable version. If smoke tests fail, revert traffic/variables to the previous application/database pair and freeze new writes until reconciliation completes.

## Required rehearsal before Production

- [ ] Document business RPO and RTO.
- [ ] Confirm actual automated backup/PITR entitlement and retention.
- [ ] Create an encrypted logical export and independent Storage backup.
- [ ] Restore both into an isolated project and record timestamps/checksums.
- [ ] Run the Phase 2H integrity and browser suites against the restore.
- [ ] Rehearse Vercel rollback and environment-variable recovery.
- [ ] Assign named incident, database, application and communications owners.
