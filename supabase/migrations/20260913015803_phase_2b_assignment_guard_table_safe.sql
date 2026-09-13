-- Access task-only fields only when the trigger is executing for a task row.

create or replace function private.validate_crm_assignee()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  assignee_valid boolean;
  expected_customer uuid;
begin
  if new.assigned_to is not null then
    select exists (
      select 1 from public.profiles p
      where p.id = new.assigned_to
        and p.status = 'active'::public.profile_status
        and p.role = any(array['admin'::public.app_role, 'sales'::public.app_role])
    ) into assignee_valid;
    if not assignee_valid then
      raise exception 'CRM work can only be assigned to active Management or Sales staff';
    end if;
  end if;

  if tg_table_name = 'tasks' then
    if new.kind = 'enquiry_follow_up'::public.task_kind then
      if new.enquiry_id is null then
        raise exception 'An enquiry follow-up must be linked to an enquiry';
      end if;
      select e.customer_id into expected_customer from public.enquiries e where e.id = new.enquiry_id;
      if not found or new.customer_id is distinct from expected_customer then
        raise exception 'The follow-up customer must match the enquiry customer';
      end if;
      if private.current_user_role() = 'sales'::public.app_role
         and new.assigned_to is distinct from (select auth.uid()) then
        raise exception 'Sales staff can only assign new follow-ups to themselves';
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.validate_crm_assignee() from public, anon, authenticated;
