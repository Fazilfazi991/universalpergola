-- Archived or abandoned proof reservations never appear in finance reads.
drop policy if exists "finance team reads ready payment proofs" on public.payment_proofs;
create policy "finance team reads live payment proofs"
on public.payment_proofs for select to authenticated
using (
  archived_at is null
  and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])
  and (upload_status = 'ready' or created_by = (select auth.uid()))
);
