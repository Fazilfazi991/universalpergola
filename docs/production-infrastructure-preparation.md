# Universal Pergola: Free-tier Production preparation

Read-only plan, 4 November 2026. Repository `Fazilfazi991/universalpergola`; baseline `uat/phase-2j` at `606653b4e702e752dd89591103faecf9192dc8e2`. **Supabase Free only.** No project, user, secret, backup destination, Vercel setting, deployment, DNS record, or business record was created or changed for this plan.

## Available slot and proposed configuration

The signed-in Supabase dashboard shows only the **Pergola** organization (`vlnviszmbwuzhrihirjr`), Free plan, with one active project: **Pergola** (`jwyjuhtektmtqffnillj`, `us-west-1`, Nano/Postgres 17). This project remains UAT. The new-project form is available under this organization. Supabase's [Free pricing](https://supabase.com/pricing) allows **two active projects**, so **one Free slot remains**. Connected Supabase plugin accounts expose a different, unrelated Hamdee organization and must not be used for Pergola provisioning.

| Proposed setting | Value / decision |
| --- | --- |
| Organization | Existing `Pergola` (`vlnviszmbwuzhrihirjr`), subject to owner confirmation |
| Project name | `Universal Pergola Production` |
| Plan and expected Supabase charge | **Free, $0/month** while within Free limits; no upgrade or paid add-on |
| Region | Specific **South Asia (Mumbai), `ap-south-1`**, visible in the creation form; owner must approve latency and residency implications |
| Project reference | **Not yet assigned**; Supabase generates it during creation, so it cannot be confirmed beforehand |
| Database/Auth/Storage | Dedicated to Production; never clone or repurpose UAT |
| Data API | Enable for `supabase-js`; decide explicit table grants versus automatic exposure after clean migration testing |

Mumbai is a location candidate for UAE users, **not UAE data residency**. Supabase lists no UAE region. [Regions](https://supabase.com/docs/guides/platform/regions). The Free project itself has no additional Supabase plan charge; any external SMTP, offsite backup storage, hardware, or other service cost requires a separate zero-cost choice or owner approval. Do not submit the creation form until the owner approves the exact organization, name, Free plan, and region; recheck the form for any charge or terms before submission. The target ref and connection values can only be recorded **after** creation.

Free limits include **500 MB database, 1 GB file storage, 5 GB egress, 50,000 monthly active users, and two active projects**; Free projects may pause after one week of inactivity. Monitor usage and availability. The Free plan has **no managed automatic database backups** and **no leaked-password protection**. Do not label either control enabled. [Pricing](https://supabase.com/pricing), [Free backup FAQ](https://supabase.com/kb/faqs/platform/free-plan-backups), [password security](https://supabase.com/docs/guides/auth/password-security).

## Current hosting and separation

| Vercel target | Current deployment | Supabase target |
| --- | --- | --- |
| Production | `dpl_BAqGxK5exJTS2zzRKU6VtRAeqVuQ`, READY, `main` at `f349061a13ea8387d53d4d87f81e6fbc793dba3e` | Existing UAT `jwyjuhtektmtqffnillj` |
| UAT Preview | `dpl_C9xCeVBCcbUqtfE5saz8cHrPCVuV`, READY, `uat/phase-2j` at `606653b4e702e752dd89591103faecf9192dc8e2` | Existing UAT `jwyjuhtektmtqffnillj` |

The active targets still share the UAT Supabase URL and publishable key. The currently deployed `main` uses email/password login; the UAT branch adds username login. Its `SUPABASE_USERNAME_LOOKUP_SECRET` exists only in the UAT Preview scope. **After separate approval**, create distinct Production/Preview values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, and server-only `SUPABASE_USERNAME_LOOKUP_SECRET`. The Production lookup secret needs a matching digest in the new project's private table. Never put the secret under `NEXT_PUBLIC_*`. Do not update Production variables, aliases, or DNS in this preparation phase. Vercel Pro is already subscribed; reuse the existing project. [Vercel environment variables](https://vercel.com/docs/environment-variables).

The previous documentation-only push to `uat/phase-2j` produced a Preview deployment while Production remained at `f349061…`. Reconfirm the Git Production branch and both deployment targets before any later code push or cutover.

## Migrations, data, and permissions

- All **53 committed** migration version identifiers match the UAT migration-history table (first `20260912181228`, last `20261104010200`; ordered-version MD5 `b4fd54df9a065409cf4b2d50f3e9ae13`). This checks version-list parity only. It does not prove identical SQL or a clean replay.
- Static review covers catalogue, CRM, site visits/photos, quotations, invoices/receipt functions, projects/stages, payments, expenses, wages, assets, tasks/reminders, feedback/reports, usernames, Investor RLS, shared references, triggers, indexes, grants, and Storage. UAT reports **32/32** public tables with RLS and **6/6** Storage buckets private. Preserve all historical migrations and the empty `supabase/seed.sql`.
- Once the Free candidate is approved and created, replay migrations in timestamp order on its clean database. Check all tables, functions, indexes, triggers, extensions, RLS, grants, bucket policies, API access, and concurrency-safe numbering. The creation form currently defaults to **automatically exposing new tables**; make an explicit security decision after checking the grants in all migrations, given Supabase's [Data API exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically). Run migration drift and security advisors. Clean replay is **not yet verified** because local Docker is unavailable and the Production candidate is not authorized.
- Production starts with no dummy business data. Import only owner-approved categories, products/images, stage templates, company details, branding, document configuration, and settings, using a reviewed whitelist. Do not copy UAT customers, enquiries, quotations, invoices, receipts, payments, projects, machinery, expenses, assets, reminders, activities, or Auth accounts. Do not reset UAT sequences.

## Auth and acceptance

Configure the new Free project with public signup disabled, a strong minimum password length and complexity, email confirmation/recovery, exact HTTPS Site URL and redirect allow list, session/rate-limit settings, and a vetted SMTP sender within the approved budget. Supabase's [default email service](https://supabase.com/docs/guides/auth/auth-smtp) is not suitable for Production and normally sends only to organization team addresses; recovery and invitations remain **blocked** until custom SMTP or an approved equivalent is tested. Supabase Free **cannot enable leaked-password protection**. The current shared UAT project has public signup on, Site URL `http://localhost:3000`, no custom SMTP, and leaked-password protection off; none of those UAT settings was changed.

After approval and receipt of approved work email addresses, create **fresh** Production Auth users: ELTHO (`eltho`, Admin/full access) and MYRIAM (`myriam`, Investor/read-only). Do not copy UAT users or passwords. Both may edit their own display name, username, and password through the profile flow; neither can grant themselves a role through that form. Admin direct role-management authority remains as designed. Confirm Investor can view permitted modules but cannot create/update/delete business records, approve quotations, post payments, upload private files, change stages, or alter permissions. Re-test direct API/RLS and Storage, not just UI.

Successful password change → sign-out → new-password login → old-password rejection is **BLOCKED** until an isolated environment exists. With owner approval, use the empty Production candidate or another approved isolated environment and a disposable account. Verify username login, correct-current-password check, session behavior, username persistence, role protection, and cleanup. Do not use ELTHO/MYRIAM credentials. Prior UAT QA covered wrong-current-password rejection and Investor access; it did not complete this successful-password path.

## Mandatory Free-plan recovery runbook

1. Owner chooses **RPO/RTO**, backup frequency, retention, encrypted offsite destination, operator, and monitoring. Free has no managed automatic backups. A scheduled **independent** runner must export the database; do not store the sole backup on the live project or in Git. Provisioning the runner/destination is a separate approved step.
2. Export PostgreSQL roles, schema, and data with a pinned Supabase CLI/compatible PostgreSQL tool following the [official CLI backup/restore procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Include `supabase_migrations` history, checksums, project configuration, Auth configuration, and a protected inventory of environment-variable names/scopes. Keep actual database, SMTP, and lookup secrets in an approved encrypted password vault with a recovery/rotation procedure, never in Git or backup logs. Encrypt and copy the dump offsite; verify the copy and retention job.
3. Export **every private Storage object separately**, plus bucket/object metadata, paths, content types, checksums, and a manifest. Database dumps alone do not contain object bytes. Retain and encrypt object backups alongside the matching database snapshot; verify counts and checksum matches. [Storage downloads](https://supabase.com/docs/guides/storage/management/download-objects), [database backups](https://supabase.com/docs/guides/platform/backups).
4. Rehearse restoration on an isolated target: restore roles/schema/data/migration history and objects; verify row counts, Auth sign-in, file downloads, RLS/Storage denial, references, and numbering. With UAT plus Production occupying both Free slots, a third Free cloud restore project is unavailable in this organization; use a working local Supabase stack or an owner-approved safe rehearsal on the empty candidate **before** real data/users are provisioned. Do not mark recovery PASS until a real restore succeeds.
5. Record the known-good Git SHA and Vercel rollback procedure. Application rollback does not reverse database writes. Keep restore and rollback decisions coordinated.

## Release gate and owner authorization

Before cutover, smoke-test Admin and Investor logins, Investor write denial, profile and password changes, catalogue, CRM, quotations, invoices/receipts, projects, payments, expenses, assets, reminders, and private files against the isolated Production candidate. Run tests, typecheck, lint, build, migration, RLS, Storage, and Auth acceptance. Verify Free quota headroom and pause behavior.

**Production NO-GO.** Owner approval is required for: (1) the existing Pergola organization and remaining Free slot, project name, and Mumbai region; (2) acceptance of Free limits, pause risk, no managed backups, and no leaked-password protection; (3) backup destination/cadence/RPO/RTO and any external service; (4) approved master data and real staff email addresses; and later (5) Production variable changes, deployment, smoke testing, and cutover. The project ref is generated only at creation. No approval to create or cut over is implied by this preparation.
