# Phase 2A hosted connection checklist

Use this only after a dedicated Universal Pergola Supabase project exists. Never substitute either unrelated project previously visible to the CLI.

## 1. Confirm and link the target

```powershell
npx --yes supabase@2.117.0 projects list
npx --yes supabase@2.117.0 link --project-ref <confirmed-universal-pergola-ref>
npx --yes supabase@2.117.0 migration list
```

Confirm the project name, organization, region, and empty/intended schema before any write. If the CLI requests a database password, set `SUPABASE_DB_PASSWORD` in the local shell; do not commit it.

## 2. Apply and inspect migrations

```powershell
npx --yes supabase@2.117.0 db push
npx --yes supabase@2.117.0 migration list
npx --yes supabase@2.117.0 db lint --linked --level warning --fail-on error
```

Do not run `db reset` against the hosted project. In Studio, run Database Advisors and verify both migrations are recorded. Confirm all 23 Phase 1 tables, the Phase 2A category columns, indexes, `updated_at` triggers, catalogue activity triggers, private helper functions, grants, RLS flags, and five Storage buckets.

## 3. Configure the application

Add only the project URL and publishable key to `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<confirmed-universal-pergola-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never expose a secret or service-role key through `NEXT_PUBLIC_*`.

## 4. Create initial management access

Keep public signup disabled. Invite or create the first user in Supabase Auth with a one-time password delivered through a secure channel. Copy the Auth user UUID and promote the generated profile from the SQL editor:

```sql
update public.profiles
set role = 'admin', status = 'active'
where id = '<verified-auth-user-uuid>'::uuid;
```

Verify exactly one intended row changed. Sign in, require the password to be changed, and confirm direct access to `/dashboard/categories` and `/dashboard/products`.

## 5. Execute role and Storage acceptance

Create disposable QA users for `admin`, `sales`, `site_team`, and `accounts`. Test through the Data API or Studio RLS Tester as each role, not only through UI visibility.

- Anonymous: reads active categories and published/non-archived products in active categories; cannot read drafts, inactive-category products, operational tables, or draft/orphan media.
- Admin: creates, edits, publishes, unpublishes, archives, reorders, and uploads catalogue media.
- Sales: reads staff catalogue records but cannot mutate categories, products, metadata, or Storage objects.
- Site Team and Accounts: cannot access catalogue management routes or mutate catalogue tables/Storage.
- Storage: rejects invalid MIME types, files over the bucket limit, non-UUID folders, original filenames, unrelated product IDs, and unauthorized writes.

## 6. Run the synchronization scenario

Create a clearly prefixed disposable category, draft product, and image. Verify the draft is absent anonymously; publish and verify list/detail/category pages; edit text and image and verify the same record changes publicly; unpublish and verify it disappears. Archive/remove the disposable records and Storage objects afterward, then confirm the activity log contains the expected explicit events.

## 7. Generate types and rerun application QA

```powershell
npm run db:types
npm run check
```

Run browser QA at 390×844 and at least 1280×720 while signed in as each relevant role. Record the hosted project ref, advisor output, RLS results, Storage evidence, and sync evidence in the Phase 2A acceptance report.
