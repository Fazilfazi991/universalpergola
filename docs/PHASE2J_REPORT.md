# Phase 2J client-UAT readiness report

Recorded: 16 September 2026. Environment: linked Supabase UAT project `jwyjuhtektmtqffnillj`. Production was not deployed or provisioned.

## Delivered

- Accounts workspace with separate project expenses, workshop/common expenses, labour wages, and private purchase-bill upload (PDF/JPEG/PNG/WebP, including mobile camera/file picker input).
- `/dashboard/assets` register for active, maintenance, retired, archived, and planned machinery purchases.
- Project cost summary that keeps approved quotation value and customer payment balances authoritative while adding material, labour, other expense, and total internal cost views.
- Weighted project advancement using the existing Phase 2E project-stage snapshot rows, plus configurable Purchase, Material Delivery, Cutting, Fabrication/Welding, Coating, Installation, and Delivery/Handover templates.
- Activity logging for expenses, wages, bills, assets, stage advancement, and existing project operations.
- Private `internal-documents` Storage bucket with registry-backed access. Anonymous access is denied; finance access is limited to Management/Admin and Accounts. Sales and Site Team policies were not broadened.

## Verification

- Management/Admin partner UAT login (`admin1@pergola.com`) reached Dashboard, Accounts, Assets, Projects, and project cost/advancement surfaces in local Chrome at desktop and responsive layouts.
- Existing UAT Management, Sales, Site Team, and Accounts identities remain test-only and unchanged.
- `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`: PASS.
- `supabase migration list --linked`: local/remote parity through `20260916151030`.
- `supabase db push --linked`: PASS. `supabase db lint --linked`: no schema errors.
- Database advisors retain pre-existing SECURITY DEFINER/auth warnings; no new Phase 2J multiple-permissive-policy warnings remain.

## Launch staffing

Production launch still requires exactly two real Management/Admin partner accounts. ELTHO and MYRIAM are planning labels only; names and work emails are pending. No Production users or resources were created.

## Remaining client input

Supply the two real names/work emails, approve the operational stage weights/categories, confirm Production Supabase/Vercel separation and Auth/SMTP policy, and complete stakeholder UAT sign-off before any Production provisioning or deployment.
