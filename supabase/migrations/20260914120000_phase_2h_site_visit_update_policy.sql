-- Consolidate equivalent role-disjoint UPDATE policies to avoid duplicate
-- permissive-policy evaluation while preserving the Phase 2C access model.

drop policy if exists "management updates site visits" on public.site_visits;
drop policy if exists "site team updates assigned visits" on public.site_visits;

create policy "authorized staff update site visits"
on public.site_visits
for update
to authenticated
using (
  private.has_role(array['admin'::public.app_role])
  or (
    private.has_role(array['site_team'::public.app_role])
    and assigned_to = (select auth.uid())
  )
)
with check (
  private.has_role(array['admin'::public.app_role])
  or (
    private.has_role(array['site_team'::public.app_role])
    and assigned_to = (select auth.uid())
  )
);
