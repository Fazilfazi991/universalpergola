# Universal Pergola: Production infrastructure preparation

Read-only assessment, 4 November 2026. Baseline: `Fazilfazi991/universalpergola`, `uat/phase-2j`, `ad81a9a4eb2a70146953870a1591742a33f81c54`. **Preparation only: no resource creation, Production deployment, DNS change, environment-variable edit, UAT cleanup, or staff provisioning.**

## Current state and isolation

| Target | Active Vercel deployment | Git SHA | Supabase target |
| --- | --- | --- | --- |
| Production | `dpl_BAqGxK5exJTS2zzRKU6VtRAeqVuQ` (READY) | `main` at `f349061a13ea8387d53d4d87f81e6fbc793dba3e` | `jwyjuhtektmtqffnillj` |
| Preview | `dpl_ALCVjhoPXCgi21dq3NDZvkB5vGZ8` (READY) | `uat/phase-2j` at `ad81a9a4eb2a70146953870a1591742a33f81c54` | `jwyjuhtektmtqffnillj` |

The Vercel project `universalpergola` is Git-linked to `Fazilfazi991/universalpergola`. Production and Preview currently share one Supabase URL and publishable key. `NEXT_PUBLIC_APP_URL` has a common Production/Preview value plus a UAT-branch Preview override. The deployed `main` SHA still uses email/password login. The newer UAT username login requires `SUPABASE_USERNAME_LOOKUP_SECRET`, which is scoped only to the UAT Preview branch; a future Production release of that code requires a separate server-only value and matching private database hash. The last UAT-branch documentation push produced a Preview deployment and left the Production deployment unchanged. Verify the configured Production Git branch in Vercel before any future code push or cutover.

The correct Supabase organization in the signed-in Pergola dashboard is **Pergola** (`vlnviszmbwuzhrihirjr`), on the **Free** plan, with one project (`jwyjuhtektmtqffnillj`, `us-west-1`, Postgres 17). The connected Supabase plugin shows an unrelated Hamdee organization, so it must not be used for Pergola provisioning. The existing project remains UAT regardless of the dashboard's `main PRODUCTION` branch label.

Hosted UAT Auth settings observed read-only: public signup **on**, email confirmation **on**, anonymous sign-in **off**, secure password change **off**, server-enforced current-password requirement **off**, leaked-password protection **off**, Site URL `http://localhost:3000`, no additional redirect URLs, and default email delivery without custom SMTP. These settings are evidence about the shared **UAT** project, not a Production configuration. Do not modify them during preparation.

## Proposed Production project and cost approval

**Recommended:** create an owner-controlled organization named `Pergola Production` with a project named `Universal Pergola Production`, on **Pro** with **Micro** compute initially. This leaves the current Pergola Free UAT organization and its records untouched. Monitor real workload and upgrade compute if needed. The alternative is upgrading the existing Pergola organization to Pro and adding a separate Production project there; that shares billing and organization access but still isolates database, Auth, and Storage.

Choose the specific **Mumbai (`ap-south-1`)** region provisionally for UAE users, subject to measured latency, owner approval, and a data-residency decision. Supabase does not list a UAE region; Mumbai does **not** establish UAE data residency. Compare Singapore and European regions if organizational or legal requirements demand it. [Available regions](https://supabase.com/docs/guides/platform/regions).

| Scenario (USD, approximate monthly baseline) | Calculation | Owner decision |
| --- | --- | --- |
| Separate Production Pro organization, one Micro project | $25 plan + $10 compute − $10 organization compute credit = **$25/month** | Recommended starting point |
| Existing Pergola organization upgraded to Pro, UAT + Production on Micro | $25 plan + $20 compute − $10 credit = **$35/month** | Alternative; UAT no longer Free |
| Separate Production Pro organization, Small compute + 7-day PITR | $25 plan + $15 compute − $10 credit + ~$100 PITR = **~$130/month** | Only if owner approves lower RPO/PITR |

Pro includes seven days of daily database backups and leaked-password protection. PITR is a paid add-on requiring at least Small compute. Daily backups may lose up to a day of transactions; choose RPO/RTO before approving PITR. Prices exclude usage overages, external SMTP, offsite Storage backups, taxes, and any other add-ons. Confirm the checkout estimate and billing owner before provisioning. [Pricing](https://supabase.com/pricing), [backup and PITR details](https://supabase.com/docs/guides/platform/backups), [password security](https://supabase.com/docs/guides/auth/password-security).

## Migration and data readiness

- Repository has **53 immutable, timestamped SQL migrations**, first `20260912181228`, last `20261104010200`. The UAT `supabase_migrations.schema_migrations` table has the same count, bounds, and ordered version-list MD5 `b4fd54df9a065409cf4b2d50f3e9ae13`. This proves version-list parity only; it does not prove unchanged remote SQL or clean replay.
- Static review found the requested schema areas across migrations: catalogue, CRM, site visits/photos, quotations, invoices and receipt reads, projects/stages, finance, expenses, wages, assets, tasks/reminders, feedback/reporting, profiles/usernames, Investor access, shared references, RLS, and private Storage. UAT reports 32/32 public tables with RLS enabled, 211 public policies, and 6/6 Storage buckets private. These counts do not replace direct-role authorization tests.
- A clean isolated replay is **blocked**: the local Docker engine is stopped, and no isolated Pergola cloud project is approved. Supabase's 2026 [Data API exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) also warrants checking grants and API reachability for every table created by later migrations. Do not rewrite historical migrations or manually recreate tables. Review drift with CLI/advisors on the approved isolated target before applying them.
- `supabase/seed.sql` is intentionally empty. Prepare a signed-off whitelist for company configuration, approved categories/products/images, branding, document templates, default stages, and business settings. Exclude all UAT customers, enquiries, quotations, invoices, receipts, payments, projects, machinery, expenses, reminders, activity history, and QA credentials. Never reset UAT numbering. Verify clean-project `nextval` numbering and parallel-create uniqueness.

## Auth, staff, and authorization

- Configure Production with public signup off, approved strong-password policy, leaked-password checks on Pro, exact HTTPS Site URL and redirect allow list, custom SMTP and verified sender, password recovery, session and rate-limit settings, dashboard MFA, and app MFA if required. Do not copy UAT Auth configuration or users. [Production security checklist](https://supabase.com/docs/guides/security/production-checklist).
- Provision a fresh `SUPABASE_USERNAME_LOOKUP_SECRET` in Vercel **Production only** and its matching digest in the new project's `private.username_lookup_settings`. Keep it out of `NEXT_PUBLIC_*`, Git, logs, and screenshots. Preview retains its separate UAT secret and hash.
- After owner approval and real email addresses are supplied, provision only ELTHO (`eltho`, Admin) and MYRIAM (`myriam`, Investor), with secure initial credential setup. Do not copy UAT passwords. They may self-edit display name, username, and password through the existing profile flow; the form has no role field.
- The login action uses Supabase Auth for password verification. The profile action edits only the current profile's name/username. The Investor trigger and restrictive RLS/Storage policies deny Investor business mutations; prior hosted UAT QA covered wrong-current-password rejection, duplicate username, Investor write denial, and Admin access. An Admin has intentional direct API role-management authority, including over their own profile; this is outside the self-service form.
- **Successful password-change acceptance remains BLOCKED.** No isolated Auth environment exists. On an approved isolated project or working local Supabase, use a disposable user to verify username login, correct current password, global sign-out, new-password login, old-password rejection, username persistence, role invariance, Investor escalation denial, and cleanup. Do not change ELTHO or MYRIAM UAT passwords. The action requests global sign-out but does not inspect its error; live session behavior must be tested before launch.

## Recovery and future Vercel configuration

1. Decide owner-approved database RPO/RTO. On Pro, confirm daily backup availability and rehearse restore into a separate project. Enable PITR only if its cost and a tighter RPO are approved. Mark recovery verified only after a real restore and data-integrity check.
2. Export and securely retain private Storage objects **separately** from database backups, with manifest/checksums and access controls. Rehearse object restore, authorized download, and rejection of unauthorized access. Database backups contain only Storage metadata. [Database backups](https://supabase.com/docs/guides/platform/backups).
3. Record the tested Git rollback SHA and Vercel deployment rollback procedure, with a restore decision tree and owner-approved RTO. A Vercel rollback does not roll back database state.
4. After project and cost approval, prepare Vercel Production-scoped `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, and server-only `SUPABASE_USERNAME_LOOKUP_SECRET`. Keep Preview-scoped UAT equivalents separate. Replace the shared Production/Preview Supabase variables only during an explicitly approved deployment window, then redeploy each target and verify the actual connection. Do not change variables or deploy as part of this preparation. [Vercel environment variables](https://vercel.com/docs/environment-variables).

## Approval gate and release decision

Owner approval is required for (1) organization ownership and billing method, (2) Production project creation and Pro subscription, (3) region and data-residency choice, (4) daily-backup versus PITR RPO/RTO and recurring cost, (5) SMTP and offsite Storage-backup providers/cost, (6) approved master-data whitelist and real staff email addresses, and later (7) Production variable changes, deployment, smoke test, and live cutover. These are distinct decisions; approval to prepare is not approval to provision or cut over.

**Production NO-GO.** The current live target still shares UAT; Production Auth is unconfigured; clean migration replay, backup/restore, and successful password-change acceptance are unverified. Stop before paid resources, Production variable changes, live deployment, DNS, or real Production users.
