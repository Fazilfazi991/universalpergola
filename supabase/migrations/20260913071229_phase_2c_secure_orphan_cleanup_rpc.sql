create or replace function public.delete_unregistered_site_visit_photo(p_storage_path text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  visit_id uuid;
  removed_count integer := 0;
begin
  if (select auth.uid()) is null
     or p_storage_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$' then
    return false;
  end if;
  visit_id := split_part(p_storage_path, '/', 1)::uuid;
  if not exists (
    select 1 from public.site_visits v
    where v.id = visit_id
      and (
        private.has_role(array['admin'::public.app_role])
        or (private.has_role(array['site_team'::public.app_role]) and v.assigned_to = (select auth.uid()))
      )
  ) or exists (select 1 from public.site_visit_photos p where p.storage_path = p_storage_path) then
    return false;
  end if;
  delete from storage.objects o
  where o.bucket_id = 'site-visit-photos'
    and o.name = p_storage_path
    and o.owner_id = (select auth.uid()::text);
  get diagnostics removed_count = row_count;
  return removed_count = 1;
end;
$$;

revoke all on function public.delete_unregistered_site_visit_photo(text) from public, anon;
grant execute on function public.delete_unregistered_site_visit_photo(text) to authenticated;

comment on function public.delete_unregistered_site_visit_photo(text) is 'Deletes only the caller-owned private site photo object when no registered photo row exists.';
