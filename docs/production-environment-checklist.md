# Production environment checklist

Updated: 14 September 2026. This document records configuration names and separation rules only; it must never contain secret values.

## Environment decision

The hosted Supabase project `Pergola` (`jwyjuhtektmtqffnillj`) is the **UAT/QA database**. It contains synthetic Phase 2H records, prior QA remnants, and non-real UAT accounts. It must not be relabeled or reused as Production.

Production should use a separately authorized Supabase project and a separate Vercel Production environment. Preview deployments may point only to the UAT project. The Production project must begin from the committed migration history, followed by controlled master-data import and separately provisioned real staff accounts.

| Concern | Local development | Preview / UAT | Future Production |
|---|---|---|---|
| Supabase | Local stack or hosted UAT when explicitly testing | `jwyjuhtektmtqffnillj` | Separate project; not yet created or selected |
| Vercel | Not applicable | Separate Preview variables and clearly labeled URL | Production variables only after cutover authorization |
| Domain | `localhost` | Generated Preview/UAT hostname | Client-approved production domain |
| Data | Disposable QA or labeled `[UAT]` records | Synthetic UAT only | Approved real catalogue and operational data |
| Users | Developer/QA accounts | Non-real UAT role accounts | Named staff users, securely invited and verified |

## Required variables

Set these independently for Preview and Production; never copy a secret value into documentation, source code, screenshots, or issue trackers.

| Variable | Browser-visible? | Preview / UAT source | Production source |
|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | UAT project API settings | Production project API settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | UAT publishable key | Production publishable key |
| `NEXT_PUBLIC_APP_URL` | Yes | Exact HTTPS Preview/UAT origin | Exact approved HTTPS production origin |

No Supabase secret/service-role key is required by the deployed application. Administrative acceptance scripts accept `SUPABASE_SECRET_KEY` only from the operator's process environment and must not be run in a browser or bundled into the app.

## Verified controls

- `.env*` is ignored, with only `.env.example` tracked.
- `.qa-runtime/` and `output/pdf/` are ignored; UAT passwords and proof artifacts remain local.
- The application source reads only the Supabase URL and publishable key.
- No `.vercel` project link is present and no Preview/Production deployment was made in Phase 2H.
- Current Storage buckets are private; public catalogue access is policy-scoped to published assets.
- Git contains no UAT credential file or generated screenshot/PDF.

## Before a Preview/UAT deployment

- [ ] Approve a clearly labeled non-production Vercel project or Preview target.
- [ ] Set the three variables above in Preview scope only.
- [ ] Add the exact Preview callback/redirect origin to Supabase Auth.
- [ ] Set Auth site URL to the selected Preview/UAT URL only after the URL exists.
- [ ] Confirm UAT credentials are shared through an approved password manager and rotated after UAT.
- [ ] Run the Phase 2H automated gate and Chrome smoke tests against that URL.

## Before Production cutover

- [ ] Obtain explicit authorization to create/select the Production Supabase project.
- [ ] Apply migrations in order through `20260914120000`; do not copy the UAT database wholesale.
- [ ] Set Production Auth site URL and an exact redirect allow list; remove localhost and Preview origins from Production.
- [ ] Disable open sign-up unless the client explicitly requires self-service registration.
- [ ] Set an approved minimum password length/complexity and enable leaked-password protection on a supported plan.
- [ ] Configure and verify production SMTP, sender identity, rate limits, and recovery flow.
- [ ] Configure Production-only Vercel variables and confirm Preview cannot read them.
- [ ] Verify no service/secret key is exposed through `NEXT_PUBLIC_*`, client bundles, logs, or browser network responses.
- [ ] Complete backup, restore, smoke-test, and rollback rehearsals before DNS changes.
