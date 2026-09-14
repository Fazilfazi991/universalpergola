-- Record explicit testimonial consent as its own human-readable project event.

create or replace function private.log_feedback_testimonial_permission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.permission_to_publish_testimonial
    and (tg_op = 'INSERT' or not coalesce(old.permission_to_publish_testimonial, false)) then
    insert into public.activity_logs(actor_id,event_type,entity_type,entity_id,metadata)
    values ((select auth.uid()),'feedback.testimonial_permission_recorded','projects',new.project_id,
      jsonb_build_object('feedback_id',new.id));
  end if;
  return new;
end;
$$;

create trigger feedback_testimonial_permission_activity
after insert or update of permission_to_publish_testimonial on public.feedback
for each row execute function private.log_feedback_testimonial_permission();

revoke all on function private.log_feedback_testimonial_permission() from public, anon, authenticated;
