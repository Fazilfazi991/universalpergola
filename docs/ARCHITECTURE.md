# Architecture

Universal Pergola is one Next.js application backed by one Supabase project. The public catalogue and staff dashboard read the same normalized PostgreSQL schema.

## Request boundaries

- Public catalogue reads are Server Components and query only rows allowed by anonymous RLS policies (`is_published = true`, active, not archived).
- `src/proxy.ts` refreshes Supabase Auth cookies and performs an optimistic redirect for dashboard routes.
- `src/lib/auth/dal.ts` performs the authoritative server-side identity and active-profile check with `auth.getUser()` and loads only the profile fields needed by the UI.
- Every future Server Action and Route Handler must call the DAL authorization helper before mutation. UI visibility is not an authorization boundary.
- PostgreSQL RLS is the final authorization boundary for browser, server, and API access.

## Application structure

- `src/app`: App Router routes and route-level loading/error states.
- `src/components`: reusable brand, public catalogue, dashboard, auth, and UI components.
- `src/lib/auth`: role types, module permissions, and server data-access checks.
- `src/lib/supabase`: browser/server clients, environment handling, and request-session refresh.
- `src/lib/catalogue`: published-only public catalogue queries.
- `supabase/migrations`: versioned schema, RLS, triggers, grants, indexes, and Storage setup.

## Catalogue data and cache contract

- Staff and public pages query Supabase directly from Server Components. There is no duplicate CMS or production fixture fallback.
- Public product queries explicitly require published, non-archived products joined to active, non-archived categories. Anonymous RLS repeats that rule as the final boundary.
- Catalogue result sets are bounded (60 public products, 100 management records) and related category/image metadata is embedded in one query. Storage URLs are signed in one batch to avoid N+1 calls.
- Catalogue routes are currently dynamic because signed media URLs and immediate dashboard-to-catalogue consistency are preferred over shared page caching. Mutations still call `revalidatePath` so the strategy can move to tagged caching without changing action contracts.
- Missing Supabase configuration produces an explicit setup state. Development fixtures exist only under the development-only `/dev/phase2a` visual QA route.

## Upload path contract

Storage policy checks depend on these object-key prefixes:

- bucket `product-images`, object key `<product-id>/<uuid>.<ext>`
- bucket `category-images`, object key `<category-id>/<uuid>.<ext>`
- bucket `site-visit-photos`, object key `<site-visit-id>/<uuid>.<ext>`
- bucket `project-files`, object key `<project-id>/<uuid>.<ext>`
- bucket `payment-proofs`, object key `<project-id>/<uuid>.<ext>`

Generate filenames server-side or from a cryptographically random UUID. Never use the original client filename as the storage key.

Product and category media buckets are private. Anonymous signed-URL creation succeeds only for an object referenced by a visible catalogue row. Draft, archived, orphaned, and unrelated objects remain unreadable. Upload code accepts JPEG, PNG, and WebP up to 10 MB; bucket configuration provides an additional 15 MB ceiling.

## Catalogue mutations

All category, product, and media Server Actions call `requireManagement()` before parsing or accessing Supabase. Application validation uses Zod, while database uniqueness/check constraints and RLS remain authoritative. Sales retains catalogue read access; Site Team and Accounts do not receive product-module access.

Category and product triggers record explicit activity events for create/update, activation, publication, unpublication, and archive transitions without storing descriptions, prices, files, or secrets.

## Role model

`profiles.role` is database-controlled. New Auth users receive the conservative `sales` default; only management may change role or status. RLS helper functions live in the non-exposed `private` schema and return only authorization booleans or the current user's role.
