create or replace function private.log_follow_up_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind <> 'enquiry_follow_up'::public.task_kind or new.enquiry_id is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    insert into public.enquiry_activities(enquiry_id, activity_type, note, next_action_at, created_by)
    values (new.enquiry_id, 'follow_up_created', new.title, new.due_at, (select auth.uid()));
  elsif new.status = 'completed'::public.task_status and old.status <> 'completed'::public.task_status then
    insert into public.enquiry_activities(enquiry_id, activity_type, note, next_action_at, created_by)
    values (new.enquiry_id, 'follow_up_completed', new.title, new.due_at, (select auth.uid()));
  elsif new.status = 'cancelled'::public.task_status and old.status <> 'cancelled'::public.task_status then
    insert into public.enquiry_activities(enquiry_id, activity_type, note, next_action_at, created_by)
    values (new.enquiry_id, 'follow_up_cancelled', new.title, new.due_at, (select auth.uid()));
  elsif new.due_at is distinct from old.due_at then
    insert into public.enquiry_activities(enquiry_id, activity_type, note, next_action_at, created_by)
    values (new.enquiry_id, 'follow_up_rescheduled', new.title, new.due_at, (select auth.uid()));
  end if;
  return new;
end;
$$;
