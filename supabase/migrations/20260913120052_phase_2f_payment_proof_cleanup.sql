-- Pending proof reservations may be abandoned safely without deleting receipt history.
create or replace function public.release_payment_proof(p_proof_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.payment_proofs
  set archived_at = now()
  where id = p_proof_id and upload_status = 'pending' and archived_at is null
    and created_by = (select auth.uid());
  if not found then raise exception 'Releasable payment proof reservation not found'; end if;
end;
$$;
revoke all on function public.release_payment_proof(uuid) from public, anon;
grant execute on function public.release_payment_proof(uuid) to authenticated;

create policy "finance team removes own pending payment proof objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-proofs' and owner_id = (select auth.uid()::text)
  and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])
  and exists (
    select 1 from public.payment_proofs proof where proof.storage_path = name
      and proof.upload_status = 'pending' and proof.created_by = (select auth.uid())
  )
);
