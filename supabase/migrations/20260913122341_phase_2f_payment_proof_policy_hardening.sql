-- Phase 1 prepared permissive payment-proof policies. The Phase 2F registry
-- replaces them completely because Postgres combines permissive policies with OR.
drop policy if exists "accounts views payment proofs" on storage.objects;
drop policy if exists "accounts uploads payment proofs" on storage.objects;
drop policy if exists "accounts updates payment proofs" on storage.objects;
drop policy if exists "accounts deletes payment proofs" on storage.objects;
