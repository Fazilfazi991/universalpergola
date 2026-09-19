# Public demo setup

The public portfolio demo uses the production dashboard components with a synthetic, in-memory data layer. It is intentionally separate from the authenticated Supabase workflow.

## Run locally

1. Copy `.env.demo.example` to `.env.local`.
2. Start the app with `npm run dev`.
3. Open `http://localhost:3000/dashboard`.

No Supabase URL, key, account, or database is required when `NEXT_PUBLIC_DEMO_MODE=true`.

## Safety boundary

Demo mode returns the synthetic Alex Morgan Management/Admin profile and short-circuits the Supabase server, browser client, and proxy. Production auth, permissions, queries, and mutations remain unchanged when the flag is absent or false.

The demo data is fictional and resets on refresh. Production-sensitive writes, uploads, payment actions, approvals, publishing, archiving, and external delivery should remain disabled or be presented as unavailable before public deployment.

## Deployment

Use a separate Vercel project or isolated deployment with only `NEXT_PUBLIC_DEMO_MODE=true`. Do not add production Supabase variables to that deployment. Keep the production Universal Pergola project on its normal environment and authentication path.
