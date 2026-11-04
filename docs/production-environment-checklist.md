# Production isolation and Auth readiness

Verified 4 November 2026 against `uat/phase-2j` at `0e880154b4dc2c87ba2ff82aca0fd7ec2099b849`. This file contains configuration names and project references only, never credentials or environment-variable values.

## Current deployment mapping

Vercel project: `universalpergola` (`prj_4uZueMJS6BhyAZEXmS4kwcHBqarF`), team `faziils-projects`.

| Target | Active deployment | Git branch / SHA | Supabase project | Status |
| --- | --- | --- | --- | --- |
| Production | `dpl_BAqGxK5exJTS2zzRKU6VtRAeqVuQ` | `main` / `f349061a13ea8387d53d4d87f81e6fbc793dba3e` | `jwyjuhtektmtqffnillj` | READY; isolation blocker |
| UAT Preview | `dpl_4gt2QtPC8SsbGuUv9YhHUmFtbaGA` | `uat/phase-2j` / `0e880154b4dc2c87ba2ff82aca0fd7ec2099b849` | `jwyjuhtektmtqffnillj` | READY; shared with Production |

`jwyjuhtektmtqffnillj` is the existing UAT database. Vercel Production and Preview connect to that **same** project. Production traffic and UAT tests can therefore share Auth users, business rows, Storage objects, and numbering state. A separate Production Supabase project is mandatory before launch. No connection or deployment was changed during this audit.

| Vercel variable | Current target scope | Readiness |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | One variable shared by Production and all Preview | Incorrect for isolation; both resolve to `jwyjuhtektmtqffnillj` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | One variable shared by Production and all Preview | Incorrect for isolation; replace with target-specific keys at cutover |
| `NEXT_PUBLIC_APP_URL` | One shared Production/Preview variable, plus `uat/phase-2j` Preview override | Branch override exists; verify exact origins for each target |
| `SUPABASE_USERNAME_LOOKUP_SECRET` | Preview, restricted to `uat/phase-2j` | Production lacks this variable; username login requires it and will report sign-in unavailable until independently provisioned with a matching database secret hash |

Vercel variable changes apply to **new deployments**. When authorized, set separate Production and Preview values, deploy each target, and confirm the actual mapping before DNS or traffic changes. See [Vercel environment variables](https://vercel.com/docs/environment-variables) and [environment management](https://vercel.com/docs/environment-variables/manage-across-environments).

## Separate Production Supabase project plan

1. Obtain explicit approval for a new project and any paid plan. Choose region after checking user latency and data-residency requirements. Mumbai (`ap-south-1`) is a provisional geographic candidate for UAE users from the [listed Supabase regions](https://supabase.com/docs/guides/platform/regions), not a confirmed residency or latency decision. Supabase does not currently list a UAE region.
2. Select a plan with approved backup retention and, if required, PITR. Managed database backups exclude Storage file contents: back up and restore database **and** private Storage objects separately, then rehearse restore to an isolated project. Record RPO/RTO and an offsite copy. See [Database Backups](https://supabase.com/docs/guides/platform/backups).
3. Create a clean project with its own URL and publishable key. Apply all 53 committed migrations in timestamp order after review. The repo's `supabase/seed.sql` is intentionally empty. Do not copy UAT wholesale, run remote `db reset`, or manually reset UAT numbering sequences. Confirm schema, extensions, functions, RLS, grants, triggers, Storage buckets/policies, and sequence generation.
4. Import only approved master data: product categories/products and their approved images, company details, stage templates, and document configuration. Use a reviewed row/object whitelist and provenance record. **Exclude** dummy customers, UAT enquiries/quotations/invoices/receipts/payments/expenses/assets, test activity logs, and QA Auth accounts. Preserve database-generated, concurrency-safe quotation, project, client, and invoice numbering; verify uniqueness under parallel inserts on the clean project.
5. Configure Production Auth independently: disable public signup unless approved; choose password length/complexity, email confirmation and recovery policy, exact Production site/redirect URLs, custom SMTP, rate limits, dashboard MFA, and app MFA if required. Configure the username lookup secret in Vercel Production **and** its matching hash in the new project's private settings through secure provisioning. Never store it in Git or expose it to the browser. See the [Supabase production security checklist](https://supabase.com/docs/guides/security/production-checklist), [SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp), and [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
6. Provision only approved named Production staff as fresh Auth users with active profiles and least-privilege roles. Do not bulk-copy UAT Auth users or password hashes. Confirm each user's login, profile, authorization, and recovery flow. Keep ELTHO and MYRIAM on UAT unchanged.
7. Configure Vercel Production-only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, and server-only `SUPABASE_USERNAME_LOOKUP_SECRET`. Keep Preview pointed to UAT with branch-specific overrides as needed. The application requires no service-role key. Check that no secret appears in a `NEXT_PUBLIC_*` variable, client bundle, log, or screenshot.
8. Rehearse RLS/Storage direct-client bypass tests, restore, and rollback on isolated projects. Run Production smoke tests only after an authorized deployment. Obtain explicit launch approval before DNS or traffic changes.

## Auth implementation review

- Username is lowercase and unique via `profiles_username_ci_key`; profile editing validates format and handles duplicate-key errors. The profile form displays email and role read-only. `updateProfileAction` accepts only display name and username and updates the current profile ID; username changes do not transfer ownership.
- `resolve_login_username` uses a private secret hash and counters for IP and username in 15-minute buckets (20 and 10 attempts respectively). The login action returns a generic invalid-credentials message and Supabase Auth verifies passwords. Cloud rate-limit and enumeration behavior still needs periodic validation.
- `changePasswordAction` validates a 12-character minimum and confirmation, verifies the current password through Supabase Auth, updates the password through Supabase Auth, requests global sign-out, and redirects to sign-in. The action does not inspect the sign-out error. Successful update, session revocation, new-password login, and old-password rejection are **not yet acceptance-tested**.
- The profile trigger blocks role/status changes by non-admin users and restricts Investor edits to display name and username. Restrictive RLS policies and table triggers block Investor business writes; Storage write policies also deny Investor uploads/updates/deletes. Prior hosted QA verified Investor denial and Admin access. The profile UI has no role edit, but an Admin's direct API access can change roles under the intentional Admin management policy, including their own; a blanket claim that Admin is technically unable to change their own role would be false. Require a product decision before imposing a stricter Admin self-role rule.
- Supabase Auth owns password storage and private credentials. The self-service profile action has no path to another user's password or Auth metadata. Direct Auth/admin bypass testing belongs in an isolated environment.
- `supabase/config.toml` is a local-stack template, **not evidence of hosted settings**. It has local signups off, minimum password length 8, email confirmation and secure-password-change flags off, and local SMTP only. Production Auth settings require separate verification and hardening.

## Isolated password-change acceptance

**BLOCKED — isolated Auth test environment unavailable.** The connected Supabase accounts expose no isolated Pergola project. Docker Desktop is installed locally, but its engine is unavailable and this session cannot start its service, so local Supabase cannot run. No disposable user was created for this test on the shared UAT/Production project. Do not mark successful password change, new-password login, old-password rejection, or session invalidation as passed.

Once an isolated project or working local stack is available: apply migrations; create an active disposable profile with a strong original password; sign in by username; change password with the correct current password; verify sign-out/session behavior; sign in with the new password; reject the old password; confirm username and role remain correct; revoke sessions and delete the test account. Keep passwords out of logs and Git. Earlier hosted QA covered wrong-current-password rejection, username editing, duplicate username rejection, and Investor restrictions only.

## Release gate

Production is **NO-GO** until the separate project exists, target-specific Vercel values are deployed and verified, backup/restore is rehearsed, Production Auth and RLS/Storage controls are validated, successful password-change acceptance passes in isolation, approved staff are provisioned, Production smoke tests pass, and launch approval is explicit. Do not merge `main`, deploy Production, change DNS, or cut over as part of this readiness review.
