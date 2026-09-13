-- Phase 2D correctly made the source quotation immutable, but its conversion
-- authorization branch also ran for unrelated project updates. Validate the
-- handoff only on insert so assigned Site Team can execute the project lifecycle.
create or replace function private.guard_project_quotation_handoff()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.quotation_id is distinct from old.quotation_id then
    raise exception 'A project quotation link is immutable';
  end if;

  if tg_op = 'INSERT' and new.quotation_id is not null and (select auth.uid()) is not null then
    if not private.has_role(array['admin'::public.app_role]) then
      raise exception 'Only Management can convert quotations to projects';
    end if;
    if not exists (
      select 1
      from public.quotations q
      where q.id = new.quotation_id
        and q.status::text = 'approved'
        and q.is_current
        and q.archived_at is null
    ) then
      raise exception 'Only the current approved quotation can be converted';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_project_quotation_handoff() from public, anon, authenticated;
