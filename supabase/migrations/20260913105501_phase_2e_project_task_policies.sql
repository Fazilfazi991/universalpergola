-- Extend the consolidated task policies from Phase 2C for operational project tasks.
-- The project trigger remains the authoritative field/assignment guard; RLS limits
-- the caller to Management or Site Team members who operate the project.
drop policy if exists "staff creates permitted tasks" on public.tasks;
create policy "staff creates permitted tasks" on public.tasks for insert to authenticated with check (
  private.current_user_role() is not null
  and created_by = (select auth.uid())
  and (
    (
      kind::text = 'enquiry_follow_up'
      and enquiry_id is not null
      and private.has_role(array['admin'::public.app_role, 'sales'::public.app_role])
      and private.can_access_enquiry(enquiry_id)
    )
    or (
      kind::text = 'site_visit_follow_up'
      and site_visit_id is not null
      and (
        private.has_role(array['admin'::public.app_role])
        or (
          private.has_role(array['site_team'::public.app_role])
          and private.can_access_site_visit(site_visit_id)
        )
      )
    )
    or (
      kind::text = 'project_task'
      and project_id is not null
      and (
        private.has_role(array['admin'::public.app_role])
        or (
          private.has_role(array['site_team'::public.app_role])
          and private.can_operate_project(project_id)
        )
      )
    )
    or (
      kind::text = 'general'
      and (enquiry_id is null or private.can_access_enquiry(enquiry_id))
      and (site_visit_id is null or private.can_access_site_visit(site_visit_id))
      and (project_id is null or private.can_access_project(project_id))
    )
  )
);

drop policy if exists "staff updates permitted tasks" on public.tasks;
create policy "staff updates permitted tasks" on public.tasks for update to authenticated
using (
  assigned_to = (select auth.uid())
  or created_by = (select auth.uid())
  or private.has_role(array['admin'::public.app_role])
)
with check (
  (
    assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
    or private.has_role(array['admin'::public.app_role])
  )
  and (enquiry_id is null or private.can_access_enquiry(enquiry_id))
  and (site_visit_id is null or private.can_access_site_visit(site_visit_id))
  and (project_id is null or private.can_access_project(project_id))
);
