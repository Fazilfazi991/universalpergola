-- Remove the unused assignment flagged by plpgsql_check while retaining both row locks.
create or replace function public.cancel_payment_milestone(p_milestone_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Only Management or Accounts can configure payment plans'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A cancellation reason is required'; end if;
  perform 1 from public.payment_milestones m join public.projects p on p.id = m.project_id
  where m.id = p_milestone_id and m.archived_at is null and m.cancelled_at is null and p.payment_plan_status = 'draft'
  for update of m, p;
  if not found then raise exception 'Only a draft milestone can be cancelled'; end if;
  update public.payment_milestones set cancelled_at = now(), cancelled_by = (select auth.uid()),
    cancellation_reason = trim(p_reason), status = 'cancelled' where id = p_milestone_id;
end;
$$;
revoke all on function public.cancel_payment_milestone(uuid,text) from public, anon;
grant execute on function public.cancel_payment_milestone(uuid,text) to authenticated;
