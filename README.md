# Universal Pergola

Production foundation for Universal Pergola's synchronized public product catalogue and protected staff operations dashboard.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Supabase PostgreSQL, Auth, Storage, and Row Level Security
- Server Components for reads, Server Actions for mutations, Vercel-ready runtime

All package versions are pinned and `package-lock.json` is committed for repeatable installs.

## Local setup

Requirements: Node.js 20.9+ and Docker Desktop for the local Supabase stack.

```bash
npm ci
copy .env.example .env.local
npm run db:start
npm run db:reset
npm run dev
```

After `npm run db:start`, replace the values in `.env.local` with the local API URL and publishable key printed by the Supabase CLI. Open `http://localhost:3000`.

The app deliberately builds without Supabase credentials. In that state, the catalogue shows a guided empty state and protected dashboard requests redirect to a setup notice on `/login`.

## Hosted Supabase setup

1. Create a Supabase project; no project has been created or linked by this repository.
2. Link the CLI: `npx --yes supabase@2.117.0 link --project-ref <project-ref>`.
3. Review the migration, then apply it with `npx --yes supabase@2.117.0 db push`.
4. Add the project URL and **publishable** key to `.env.local` and Vercel.
5. Create the first user from Supabase Auth, then promote that profile in the SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'management@example.com';
```

Never add a service-role or secret key to a `NEXT_PUBLIC_` variable. This Phase 1 application does not require a service-role key.

## Authentication and permissions

- Supabase Auth uses secure SSR cookies through `@supabase/ssr`.
- Next.js `proxy.ts` refreshes sessions and blocks anonymous dashboard requests.
- The server DAL validates the user with `auth.getUser()`, then requires an active `profiles` row.
- Module permissions are checked server-side.
- Database RLS and explicit grants enforce the actual row access. Hiding navigation is only a convenience.
- Self-service sign-up is disabled; staff accounts should be invited or created by management.

## Database

The CLI-generated migration at `supabase/migrations/20260912181228_initial_foundation.sql` creates:

`profiles`, `product_categories`, `products`, `product_images`, `customers`, `enquiries`, `enquiry_activities`, `site_visits`, `site_visit_photos`, `quotations`, `quotation_items`, `project_stage_templates`, `projects`, `project_assignments`, `project_stages`, `project_updates`, `project_files`, `payment_milestones`, `payments`, `tasks`, `feedback`, `notifications`, and `activity_logs`.

It also adds UUID keys, constraints, operational indexes, timestamps, archive fields, update triggers, structured activity logging, explicit API grants, RLS policies, and four Storage buckets. No demo customer or financial data is seeded.

Generate database types after the local stack is running:

```bash
npm run db:types
```

## Storage paths

Private Storage policies expect the related record UUID as the first folder segment. See `docs/ARCHITECTURE.md` before implementing uploads.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
# or all three
npm run check
```

## Routes

Public: `/`, `/products`, `/products/[slug]`, `/categories/[slug]`, `/enquire`, `/login`.

Protected: `/dashboard` plus products, categories, enquiries, customers, site visits, quotations, projects, payments, tasks, feedback, reports, users, and settings modules.

Phase 1 intentionally stops at the secure foundation and guided placeholders. Detailed CRUD screens belong to Phase 2.

## Design and implementation notes

- [Architecture](docs/ARCHITECTURE.md)
- [Assumptions requiring confirmation](docs/ASSUMPTIONS.md)
