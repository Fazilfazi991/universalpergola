-- Preserve Phase 2B/2C assignee rules while allowing Phase 2E project tasks
-- to use active project participants. The project-specific trigger performs
-- the stricter membership and role checks after this shared validation.
create or replace function private.validate_crm_assignee()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  assignee_valid boolean;
  expected_customer uuid;
  expected_enquiry uuid;
begin
  if tg_table_name in ('customers', 'enquiries') then
    if new.assigned_to is not null then
      select exists (
        select 1 from public.profiles p
        where p.id = new.assigned_to
          and p.status = 'active'::public.profile_status
          and p.role = any(array['admin'::public.app_role, 'sales'::public.app_role])
      ) into assignee_valid;
      if not assignee_valid then raise exception 'CRM work can only be assigned to active Management or Sales staff'; end if;
    end if;
  elsif tg_table_name = 'tasks' then
    if new.assigned_to is not null then
      select exists (
        select 1 from public.profiles p
        where p.id = new.assigned_to
          and p.status = 'active'::public.profile_status
          and (
            (new.kind::text = 'enquiry_follow_up' and p.role = any(array['admin'::public.app_role, 'sales'::public.app_role]))
            or (new.kind::text = 'site_visit_follow_up' and p.role = any(array['admin'::public.app_role, 'sales'::public.app_role, 'site_team'::public.app_role]))
            or new.kind::text in ('general', 'project_task')
          )
      ) into assignee_valid;
      if not assignee_valid then raise exception 'Choose an active staff member permitted for this task'; end if;
    end if;

    if new.kind::text = 'enquiry_follow_up' then
      if new.enquiry_id is null then raise exception 'An enquiry follow-up must be linked to an enquiry'; end if;
      select e.customer_id into expected_customer from public.enquiries e where e.id = new.enquiry_id;
      if not found or new.customer_id is distinct from expected_customer then raise exception 'The follow-up customer must match the enquiry customer'; end if;
      if private.current_user_role() = 'sales'::public.app_role and new.assigned_to is distinct from (select auth.uid()) then raise exception 'Sales staff can only assign new follow-ups to themselves'; end if;
    elsif new.kind::text = 'site_visit_follow_up' then
      if new.site_visit_id is null then raise exception 'A site follow-up must be linked to a visit'; end if;
      select v.customer_id, v.enquiry_id into expected_customer, expected_enquiry from public.site_visits v where v.id = new.site_visit_id;
      if not found or new.customer_id is distinct from expected_customer or new.enquiry_id is distinct from expected_enquiry then raise exception 'The follow-up links must match the site visit'; end if;
      if private.current_user_role() = 'site_team'::public.app_role and new.assigned_to is distinct from (select auth.uid()) then raise exception 'Site Team can only assign new follow-ups to themselves'; end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_crm_assignee() from public, anon, authenticated;
