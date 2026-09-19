-- Phase 2L is additive: enquiries need structured attribution fields and the
-- existing task queue needs a lightweight way to identify operational reminders.
alter table public.enquiries
  add column if not exists lead_source text,
  add column if not exists referred_by text,
  add column if not exists lead_source_detail text,
  add constraint enquiries_lead_source_length check (lead_source is null or char_length(lead_source) <= 80),
  add constraint enquiries_referred_by_length check (referred_by is null or char_length(referred_by) <= 160),
  add constraint enquiries_lead_source_detail_length check (lead_source_detail is null or char_length(lead_source_detail) <= 300);

alter table public.tasks
  add column if not exists reminder_type text,
  add constraint tasks_reminder_type_length check (reminder_type is null or char_length(reminder_type) <= 80);

create index if not exists enquiries_lead_source_created_idx
  on public.enquiries(lead_source, created_at desc) where archived_at is null;
create index if not exists tasks_reminder_queue_idx
  on public.tasks(reminder_type, status, due_at) where archived_at is null and reminder_type is not null;

create or replace function private.log_enquiry_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.enquiry_activities(enquiry_id, activity_type, note, created_by)
    values (new.id, 'enquiry_created', 'Enquiry created', (select auth.uid()));
  else
    if new.assigned_to is distinct from old.assigned_to then
      insert into public.enquiry_activities(enquiry_id, activity_type, note, created_by)
      values (new.id, 'salesperson_assigned', 'Salesperson assignment changed', (select auth.uid()));
    end if;
    if new.status is distinct from old.status then
      insert into public.enquiry_activities(enquiry_id, activity_type, note, created_by)
      values (new.id, 'status_changed', 'Status changed from ' || replace(old.status::text, '_', ' ') || ' to ' || replace(new.status::text, '_', ' '), (select auth.uid()));
    end if;
    if new.priority is distinct from old.priority then
      insert into public.enquiry_activities(enquiry_id, activity_type, note, created_by)
      values (new.id, 'priority_changed', 'Priority changed from ' || old.priority::text || ' to ' || new.priority::text, (select auth.uid()));
    end if;
    if new.lead_source is distinct from old.lead_source
       or new.referred_by is distinct from old.referred_by
       or new.lead_source_detail is distinct from old.lead_source_detail then
      insert into public.enquiry_activities(enquiry_id, activity_type, note, created_by)
      values (new.id, 'lead_source_updated', 'Lead source details updated', (select auth.uid()));
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.log_reminder_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.reminder_type is null then return new; end if;
  if tg_op = 'INSERT' then
    insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'reminder.created', 'tasks', new.id, jsonb_strip_nulls(jsonb_build_object('reminder_type', new.reminder_type, 'due_at', new.due_at)));
  elsif new.status = 'completed'::public.task_status and old.status <> 'completed'::public.task_status then
    insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'reminder.completed', 'tasks', new.id, jsonb_build_object('reminder_type', new.reminder_type));
  elsif new.due_at is distinct from old.due_at then
    insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'reminder.rescheduled', 'tasks', new.id, jsonb_strip_nulls(jsonb_build_object('reminder_type', new.reminder_type, 'due_at', new.due_at)));
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_reminder_activity on public.tasks;
create trigger tasks_reminder_activity after insert or update on public.tasks
for each row execute function private.log_reminder_change();

revoke all on function private.log_reminder_change() from public, anon, authenticated;
