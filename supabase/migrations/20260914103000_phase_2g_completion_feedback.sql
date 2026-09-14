-- Universal Pergola Phase 2G: completion checklist and secure customer feedback.

create type public.feedback_status as enum ('not_requested', 'requested', 'received', 'reviewed', 'archived');

alter table public.feedback
  add column status public.feedback_status not null default 'not_requested',
  add column source text,
  add column permission_to_publish_testimonial boolean not null default false,
  add column requested_at timestamptz,
  add column requested_by uuid references public.profiles(id) on delete set null,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles(id) on delete set null,
  add column archived_at timestamptz,
  add column archived_by uuid references public.profiles(id) on delete set null,
  add column token_expires_at timestamptz,
  add column token_revoked_at timestamptz,
  add column staff_entered_at timestamptz,
  add constraint feedback_text_lengths check (
    char_length(coalesce(customer_comments, '')) <= 4000
    and char_length(coalesce(internal_notes, '')) <= 8000
    and char_length(coalesce(source, '')) <= 120
  );

update public.feedback
set status = case when submitted_at is not null then 'received'::public.feedback_status else 'not_requested'::public.feedback_status end;

create index feedback_status_updated_idx on public.feedback(status, updated_at desc);
create index feedback_token_active_idx on public.feedback(public_token)
  where token_revoked_at is null;

alter table public.tasks
  add column completion_checklist_key text,
  add column completion_note text,
  add column completed_by uuid references public.profiles(id) on delete set null,
  add constraint tasks_completion_checklist_key_valid check (
    completion_checklist_key is null or completion_checklist_key in (
      'installation_complete', 'site_cleaned', 'final_testing_complete',
      'customer_handover_complete', 'handover_documents_provided',
      'completion_photos_uploaded', 'snag_items_reviewed', 'feedback_requested'
    )
  ),
  add constraint tasks_completion_note_length check (char_length(coalesce(completion_note, '')) <= 2000);

create unique index tasks_project_completion_checklist_unique
  on public.tasks(project_id, completion_checklist_key)
  where completion_checklist_key is not null and archived_at is null;

insert into public.tasks(kind, project_id, title, description, priority, status, created_by, completion_checklist_key)
select 'project_task'::public.task_kind, p.id, item.title, 'Phase 2G completion checklist', 'normal'::public.task_priority,
  'open'::public.task_status, p.created_by, item.key
from public.projects p
cross join (values
  ('installation_complete', 'Installation complete'),
  ('site_cleaned', 'Site cleaned'),
  ('final_testing_complete', 'Final testing complete'),
  ('customer_handover_complete', 'Customer handover complete'),
  ('handover_documents_provided', 'Handover documents provided'),
  ('completion_photos_uploaded', 'Completion photos uploaded'),
  ('snag_items_reviewed', 'Outstanding snag items reviewed'),
  ('feedback_requested', 'Customer feedback requested')
) as item(key, title)
where p.status <> 'cancelled'
on conflict do nothing;

create or replace function private.initialize_project_completion_checklist()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.tasks(kind, project_id, title, description, priority, status, created_by, completion_checklist_key)
  select 'project_task'::public.task_kind, new.id, item.title, 'Phase 2G completion checklist',
    'normal'::public.task_priority, 'open'::public.task_status, new.created_by, item.key
  from (values
    ('installation_complete', 'Installation complete'),
    ('site_cleaned', 'Site cleaned'),
    ('final_testing_complete', 'Final testing complete'),
    ('customer_handover_complete', 'Customer handover complete'),
    ('handover_documents_provided', 'Handover documents provided'),
    ('completion_photos_uploaded', 'Completion photos uploaded'),
    ('snag_items_reviewed', 'Outstanding snag items reviewed'),
    ('feedback_requested', 'Customer feedback requested')
  ) as item(key, title)
  on conflict do nothing;
  return new;
end;
$$;

create trigger projects_initialize_completion_checklist
after insert on public.projects for each row
execute function private.initialize_project_completion_checklist();

create or replace function public.update_completion_checklist(
  p_project_id uuid, p_key text, p_completed boolean, p_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare caller_role public.app_role;
begin
  caller_role := private.current_user_role();
  if caller_role <> 'admin' and not (caller_role = 'site_team' and private.can_operate_project(p_project_id)) then
    raise exception 'You cannot update this completion checklist';
  end if;
  if p_key not in ('installation_complete','site_cleaned','final_testing_complete','customer_handover_complete',
    'handover_documents_provided','completion_photos_uploaded','snag_items_reviewed','feedback_requested') then
    raise exception 'Invalid completion checklist item';
  end if;
  if char_length(coalesce(p_note, '')) > 2000 then raise exception 'Checklist note is too long'; end if;

  update public.tasks
  set status = case when p_completed then 'completed'::public.task_status else 'open'::public.task_status end,
    completed_at = case when p_completed then now() else null end,
    completed_by = case when p_completed then (select auth.uid()) else null end,
    completion_note = nullif(trim(coalesce(p_note, '')), '')
  where project_id = p_project_id and completion_checklist_key = p_key and archived_at is null;
  if not found then raise exception 'Completion checklist item not found'; end if;

  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'completion_checklist.updated', 'projects', p_project_id,
    jsonb_build_object('key', p_key, 'completed', p_completed));
end;
$$;

drop policy if exists "delivery team reads feedback" on public.feedback;
drop policy if exists "delivery team manages feedback" on public.feedback;
create policy "management and assigned sales read feedback" on public.feedback for select to authenticated
using (private.has_role(array['admin'::public.app_role]) or
  (private.has_role(array['sales'::public.app_role]) and private.can_access_project(project_id)));
create policy "management and assigned sales create feedback" on public.feedback for insert to authenticated
with check (private.has_role(array['admin'::public.app_role]) or
  (private.has_role(array['sales'::public.app_role]) and private.can_access_project(project_id)));
create policy "management and assigned sales update feedback" on public.feedback for update to authenticated
using (private.has_role(array['admin'::public.app_role]) or
  (private.has_role(array['sales'::public.app_role]) and private.can_access_project(project_id)))
with check (private.has_role(array['admin'::public.app_role]) or
  (private.has_role(array['sales'::public.app_role]) and private.can_access_project(project_id)));
create policy "management archives feedback" on public.feedback for delete to authenticated
using (private.has_role(array['admin'::public.app_role]));

create or replace function public.request_project_feedback(
  p_project_id uuid, p_expires_at timestamptz default (now() + interval '30 days')
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare row_data public.feedback%rowtype; project_row public.projects%rowtype; new_token uuid;
begin
  if not (private.has_role(array['admin'::public.app_role]) or
    (private.has_role(array['sales'::public.app_role]) and private.can_access_project(p_project_id))) then
    raise exception 'You cannot request feedback for this project';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '90 days' then
    raise exception 'Feedback link expiry must be within the next 90 days';
  end if;
  select * into project_row from public.projects where id = p_project_id and status = 'completed' for update;
  if not found then raise exception 'Feedback can only be requested for a completed project'; end if;
  select * into row_data from public.feedback where project_id = p_project_id for update;
  if found and row_data.submitted_at is not null then raise exception 'Feedback has already been received'; end if;

  if found and row_data.status = 'requested' and row_data.token_revoked_at is null and row_data.token_expires_at > now() then
    return row_data.public_token;
  end if;
  new_token := gen_random_uuid();
  insert into public.feedback(project_id, handover_date, completion_status, status, public_token,
    requested_at, requested_by, token_expires_at, token_revoked_at, created_by)
  values (p_project_id, project_row.handover_date, 'completed', 'requested', new_token,
    now(), (select auth.uid()), p_expires_at, null, (select auth.uid()))
  on conflict (project_id) do update set
    status = 'requested', public_token = excluded.public_token, requested_at = now(),
    requested_by = (select auth.uid()), token_expires_at = excluded.token_expires_at,
    token_revoked_at = null, handover_date = excluded.handover_date
  returning * into row_data;

  update public.tasks set status = 'completed', completed_at = now(), completed_by = (select auth.uid())
  where project_id = p_project_id and completion_checklist_key = 'feedback_requested' and archived_at is null;
  insert into public.activity_logs(actor_id,event_type,entity_type,entity_id,metadata)
  values ((select auth.uid()),'feedback.requested','projects',p_project_id,
    jsonb_build_object('expires_at',p_expires_at));
  return row_data.public_token;
end;
$$;

create or replace function public.revoke_project_feedback_link(p_project_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (private.has_role(array['admin'::public.app_role]) or
    (private.has_role(array['sales'::public.app_role]) and private.can_access_project(p_project_id))) then
    raise exception 'You cannot revoke this feedback link';
  end if;
  update public.feedback set token_revoked_at = now()
  where project_id = p_project_id and submitted_at is null;
end;
$$;

create or replace function public.save_staff_feedback(
  p_project_id uuid, p_rating smallint, p_comment text, p_source text,
  p_permission boolean default false, p_internal_notes text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare project_row public.projects%rowtype; feedback_id uuid;
begin
  if not (private.has_role(array['admin'::public.app_role]) or
    (private.has_role(array['sales'::public.app_role]) and private.can_access_project(p_project_id))) then
    raise exception 'You cannot enter feedback for this project';
  end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if char_length(trim(coalesce(p_comment,''))) > 4000 or char_length(trim(coalesce(p_internal_notes,''))) > 8000 then
    raise exception 'Feedback text is too long';
  end if;
  select * into project_row from public.projects where id = p_project_id and status = 'completed';
  if not found then raise exception 'Feedback can only be recorded for a completed project'; end if;
  insert into public.feedback(project_id,handover_date,completion_status,status,customer_rating,customer_comments,
    source,permission_to_publish_testimonial,internal_notes,submitted_at,staff_entered_at,token_revoked_at,created_by)
  values (p_project_id,project_row.handover_date,'completed','received',p_rating,nullif(trim(coalesce(p_comment,'')),''),
    coalesce(nullif(trim(coalesce(p_source,'')),''),'staff'),p_permission,nullif(trim(coalesce(p_internal_notes,'')),''),
    now(),now(),now(),(select auth.uid()))
  on conflict (project_id) do update set status='received',customer_rating=excluded.customer_rating,
    customer_comments=excluded.customer_comments,source=excluded.source,
    permission_to_publish_testimonial=excluded.permission_to_publish_testimonial,
    internal_notes=excluded.internal_notes,submitted_at=now(),staff_entered_at=now(),token_revoked_at=now()
  returning id into feedback_id;
  insert into public.activity_logs(actor_id,event_type,entity_type,entity_id,metadata)
  values ((select auth.uid()),'feedback.staff_entered','projects',p_project_id,
    jsonb_build_object('rating',p_rating,'testimonial_permission',p_permission));
  return feedback_id;
end;
$$;

create or replace function public.update_feedback_review(
  p_feedback_id uuid, p_status text, p_internal_notes text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare project_ref uuid; event_name text;
begin
  if not private.has_role(array['admin'::public.app_role]) then raise exception 'Only Management can review feedback'; end if;
  if p_status not in ('reviewed','archived') then raise exception 'Invalid feedback review status'; end if;
  if char_length(coalesce(p_internal_notes,'')) > 8000 then raise exception 'Internal notes are too long'; end if;
  update public.feedback set status=p_status::public.feedback_status,
    internal_notes=nullif(trim(coalesce(p_internal_notes,'')),''),
    reviewed_at=case when p_status='reviewed' then now() else reviewed_at end,
    reviewed_by=case when p_status='reviewed' then (select auth.uid()) else reviewed_by end,
    archived_at=case when p_status='archived' then now() else null end,
    archived_by=case when p_status='archived' then (select auth.uid()) else null end
  where id=p_feedback_id and submitted_at is not null returning project_id into project_ref;
  if project_ref is null then raise exception 'Received feedback not found'; end if;
  event_name := case when p_status='reviewed' then 'feedback.reviewed' else 'feedback.archived' end;
  insert into public.activity_logs(actor_id,event_type,entity_type,entity_id,metadata)
  values ((select auth.uid()),event_name,'projects',project_ref,jsonb_build_object('feedback_id',p_feedback_id));
end;
$$;

create or replace function public.get_public_feedback_context(p_token uuid)
returns table(project_reference text, feedback_state text, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.project_number, f.status::text, f.token_expires_at
  from public.feedback f join public.projects p on p.id=f.project_id
  where f.public_token=p_token and f.token_revoked_at is null and p.status='completed'
    and (f.submitted_at is not null or f.token_expires_at >= now())
  limit 1
$$;

create or replace function public.submit_public_feedback(
  p_token uuid, p_rating smallint, p_comment text default null,
  p_permission boolean default false, p_honeypot text default null
)
returns text language plpgsql security definer set search_path = '' as $$
declare feedback_row public.feedback%rowtype;
begin
  if char_length(trim(coalesce(p_honeypot,''))) > 0 then return 'submitted'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if char_length(trim(coalesce(p_comment,''))) > 4000 then raise exception 'Feedback comment is too long'; end if;
  select * into feedback_row from public.feedback
  where public_token=p_token and token_revoked_at is null for update;
  if not found or feedback_row.token_expires_at < now() then raise exception 'Feedback link is invalid or expired'; end if;
  if feedback_row.submitted_at is not null then return 'already_submitted'; end if;
  if feedback_row.status <> 'requested' then raise exception 'Feedback link is not active'; end if;
  if not exists (select 1 from public.projects where id=feedback_row.project_id and status='completed') then
    raise exception 'This project is not eligible for feedback';
  end if;
  update public.feedback set status='received',customer_rating=p_rating,
    customer_comments=nullif(trim(coalesce(p_comment,'')),''),source='public_link',
    permission_to_publish_testimonial=p_permission,submitted_at=now()
  where id=feedback_row.id and submitted_at is null;
  insert into public.activity_logs(actor_id,event_type,entity_type,entity_id,metadata)
  values (null,'feedback.submitted','projects',feedback_row.project_id,
    jsonb_build_object('rating',p_rating,'testimonial_permission',p_permission));
  return 'submitted';
end;
$$;

revoke all on function private.initialize_project_completion_checklist() from public, anon, authenticated;
revoke all on function public.update_completion_checklist(uuid,text,boolean,text) from public, anon;
revoke all on function public.request_project_feedback(uuid,timestamptz) from public, anon;
revoke all on function public.revoke_project_feedback_link(uuid) from public, anon;
revoke all on function public.save_staff_feedback(uuid,smallint,text,text,boolean,text) from public, anon;
revoke all on function public.update_feedback_review(uuid,text,text) from public, anon;
grant execute on function public.update_completion_checklist(uuid,text,boolean,text),
  public.request_project_feedback(uuid,timestamptz), public.revoke_project_feedback_link(uuid),
  public.save_staff_feedback(uuid,smallint,text,text,boolean,text),
  public.update_feedback_review(uuid,text,text) to authenticated;

revoke all on function public.get_public_feedback_context(uuid) from public;
revoke all on function public.submit_public_feedback(uuid,smallint,text,boolean,text) from public;
grant execute on function public.get_public_feedback_context(uuid),
  public.submit_public_feedback(uuid,smallint,text,boolean,text) to anon, authenticated;
