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

## Upload path contract

Storage policy checks depend on these object-key prefixes:

- `product-images/<product-id>/<uuid>.<ext>`
- `site-visit-photos/<site-visit-id>/<uuid>.<ext>`
- `project-files/<project-id>/<uuid>.<ext>`
- `payment-proofs/<project-id>/<uuid>.<ext>`

Generate filenames server-side or from a cryptographically random UUID. Never use the original client filename as the storage key.

## Role model

`profiles.role` is database-controlled. New Auth users receive the conservative `sales` default; only management may change role or status. RLS helper functions live in the non-exposed `private` schema and return only authorization booleans or the current user's role.
