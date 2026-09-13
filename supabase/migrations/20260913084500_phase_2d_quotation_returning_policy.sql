-- Avoid a same-table lookup in the quotation SELECT policy. During INSERT ...
-- RETURNING the newly inserted row is not visible to a stable self-query yet,
-- which prevents otherwise-authorized atomic draft creation from returning its id.

drop policy if exists "authorized staff reads quotations" on public.quotations;
create policy "authorized staff reads quotations"
on public.quotations
for select
to authenticated
using (
  private.has_role(array['admin'::public.app_role, 'accounts'::public.app_role])
  or (
    private.has_role(array['sales'::public.app_role])
    and (owner_id = (select auth.uid()) or created_by = (select auth.uid()))
  )
  or (
    private.has_role(array['site_team'::public.app_role])
    and exists (
      select 1
      from public.site_visits v
      where v.id = site_visit_id
        and v.assigned_to = (select auth.uid())
    )
  )
);
