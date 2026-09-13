-- Universal Pergola Phase 2E: controlled project execution, handover, and private files.
-- Existing quotation values remain immutable commercial snapshots; operational state lives here.

alter type public.stage_status add value if not exists 'skipped' after 'blocked';
alter type public.task_kind add value if not exists 'project_task';

create type public.project_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.handover_status as enum ('pending', 'ready', 'completed', 'issues_outstanding');

alter table public.project_stage_templates
  add column default_weight numeric(8,3) not null default 1,
  add column is_terminal boolean not null default false,
  add constraint project_stage_templates_weight_positive check (default_weight > 0),
  add constraint project_stage_templates_text_lengths check (
    char_length(name) between 1 and 120
    and char_length(coalesce(description, '')) <= 2000
  );

update public.project_stage_templates
set is_terminal = (key = 'completed');

alter table public.projects
  add column project_owner_id uuid references public.profiles(id) on delete set null,
  add column priority public.project_priority not null default 'normal',
  add column summary text,
  add column installation_date date,
  add column actual_completion_date date,
  add column handover_status public.handover_status not null default 'pending',
  add column handover_notes text,
  add column handover_contact text,
  add column handover_confirmed_at timestamptz,
  add column handover_confirmed_by uuid references public.profiles(id) on delete set null,
  add column started_by uuid references public.profiles(id) on delete set null,
  add column completed_by uuid references public.profiles(id) on delete set null,
  add column completion_note text,
  add column reopened_at timestamptz,
  add column reopened_by uuid references public.profiles(id) on delete set null,
  add constraint projects_phase_2e_text_lengths check (
    char_length(coalesce(summary, '')) <= 4000
    and char_length(coalesce(notes, '')) <= 12000
    and char_length(coalesce(handover_notes, '')) <= 8000
    and char_length(coalesce(handover_contact, '')) <= 200
    and char_length(coalesce(completion_note, '')) <= 4000
  ),
  add constraint projects_phase_2e_dates_valid check (
    expected_completion_date is null or start_date is null or expected_completion_date >= start_date
  );

alter table public.project_stages
  add column stage_key text,
  add column description text,
  add column target_date date,
  add column assigned_to uuid references public.profiles(id) on delete set null,
  add column weight numeric(8,3) not null default 1,
  add column progress smallint not null default 0,
  add column is_terminal boolean not null default false,
  add constraint project_stages_weight_positive check (weight > 0),
  add constraint project_stages_progress_valid check (progress between 0 and 100),
  add constraint project_stages_text_lengths check (
    char_length(name) between 1 and 120
    and char_length(coalesce(description, '')) <= 2000
    and char_length(coalesce(notes, '')) <= 8000
  );

update public.project_stages ps
set stage_key = coalesce(
  t.key,
  lower(regexp_replace(regexp_replace(ps.name, '[^a-zA-Z0-9]+', '_', 'g'), '(^_|_$)', '', 'g'))
),
description = coalesce(ps.description, t.description),
weight = coalesce(t.default_weight, 1),
is_terminal = coalesce(t.is_terminal, false)
from public.project_stage_templates t
where t.id = ps.template_id;

update public.project_stages
set stage_key = coalesce(nullif(stage_key, ''), 'stage_' || replace(id::text, '-', ''))
where stage_key is null or stage_key = '';

alter table public.project_stages alter column stage_key set not null;
create unique index project_stages_project_key_idx on public.project_stages(project_id, stage_key);
create index project_stages_current_idx on public.project_stages(project_id, sort_order)
  where status not in ('completed');
create index project_stages_assignee_idx on public.project_stages(assigned_to, status)
  where assigned_to is not null;

alter table public.project_assignments
  add constraint project_assignments_role_valid check (
    assignment_role in ('project_owner', 'sales', 'site_team', 'installer', 'team_member')
  );
create unique index project_assignments_one_owner_idx
  on public.project_assignments(project_id) where assignment_role = 'project_owner';

alter table public.tasks
  add column project_stage_id uuid references public.project_stages(id) on delete set null;
create index tasks_project_stage_idx on public.tasks(project_id, project_stage_id, status, due_at)
  where project_id is not null and archived_at is null;

alter table public.project_updates
  add constraint project_updates_type_valid check (
    update_type in ('general', 'progress', 'issue', 'delay', 'customer_decision', 'technical_note')
  ),
  add constraint project_updates_note_required check (char_length(trim(coalesce(note, ''))) between 1 and 8000);

alter table public.project_files
  add column mime_type text,
  add column file_size bigint,
  add column upload_status text not null default 'ready',
  add constraint project_files_category_valid check (
    file_type in ('drawing', 'approval', 'manufacturing', 'installation', 'completion', 'handover', 'other')
  ),
  add constraint project_files_mime_valid check (
    mime_type is null or mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  ),
  add constraint project_files_size_valid check (file_size is null or file_size between 1 and 20971520),
  add constraint project_files_upload_status_valid check (upload_status in ('pending', 'ready')),
  add constraint project_files_text_lengths check (
    char_length(file_name) between 1 and 255
    and char_length(coalesce(caption, '')) <= 1000
  );
create index project_files_stage_idx on public.project_files(project_id, stage_id, created_at desc);

create index projects_owner_status_idx on public.projects(project_owner_id, status, expected_completion_date)
  where archived_at is null;
create index projects_sales_status_idx on public.projects(assigned_salesperson, status, updated_at desc)
  where archived_at is null;
create index projects_installation_idx on public.projects(installation_date, status)
  where installation_date is not null and archived_at is null;

create or replace function private.can_access_project(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case private.current_user_role()
    when 'admin' then true
    when 'accounts' then true
    when 'sales' then exists (
      select 1 from public.projects p
      where p.id = target
        and (
          p.assigned_salesperson = (select auth.uid())
          or exists (
            select 1 from public.project_assignments a
            where a.project_id = p.id and a.user_id = (select auth.uid())
          )
        )
    )
    when 'site_team' then exists (
      select 1 from public.project_assignments a
      where a.project_id = target and a.user_id = (select auth.uid())
    )
    else false
  end
$$;

create or replace function private.can_operate_project(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(array['admin'::public.app_role])
    or (
      private.has_role(array['site_team'::public.app_role])
      and exists (
        select 1 from public.project_assignments a
        where a.project_id = target
          and a.user_id = (select auth.uid())
          and a.assignment_role in ('site_team', 'installer', 'team_member')
      )
    )
$$;

create or replace function private.can_access_project_files(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case private.current_user_role()
    when 'admin' then true
    when 'sales' then private.can_access_project(target)
    when 'site_team' then private.can_access_project(target)
    else false
  end
$$;

revoke all on function private.can_operate_project(uuid) from public, anon;
revoke all on function private.can_access_project_files(uuid) from public, anon;
grant execute on function private.can_operate_project(uuid), private.can_access_project_files(uuid) to authenticated;

create or replace function private.initialize_project_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare first_stage uuid;
begin
  insert into public.project_stages (
    project_id, template_id, stage_key, name, description, sort_order,
    weight, is_terminal, status, created_by
  )
  select new.id, t.id, t.key, t.name, t.description, t.sort_order,
    t.default_weight, t.is_terminal, 'not_started'::public.stage_status, new.created_by
  from public.project_stage_templates t
  where t.is_active and t.archived_at is null
  order by t.sort_order, t.created_at;

  select ps.id into first_stage
  from public.project_stages ps
  where ps.project_id = new.id
  order by ps.sort_order, ps.created_at
  limit 1;

  update public.projects set current_stage_id = first_stage where id = new.id;

  if new.assigned_salesperson is not null then
    insert into public.project_assignments(project_id, user_id, assignment_role, created_by)
    values (new.id, new.assigned_salesperson, 'sales', new.created_by)
    on conflict (project_id, user_id, assignment_role) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.initialize_project_workspace() from public, anon, authenticated;
drop trigger if exists projects_initialize_workspace on public.projects;
create trigger projects_initialize_workspace
after insert on public.projects
for each row execute function private.initialize_project_workspace();

-- Backfill any projects created before the Phase 2E snapshot trigger existed.
insert into public.project_stages (
  project_id, template_id, stage_key, name, description, sort_order,
  weight, is_terminal, status, created_by
)
select p.id, t.id, t.key, t.name, t.description, t.sort_order,
  t.default_weight, t.is_terminal, 'not_started'::public.stage_status, p.created_by
from public.projects p
cross join public.project_stage_templates t
where t.is_active and t.archived_at is null
  and not exists (select 1 from public.project_stages ps where ps.project_id = p.id)
on conflict (project_id, stage_key) do nothing;

update public.projects p
set current_stage_id = (
  select ps.id from public.project_stages ps
  where ps.project_id = p.id order by ps.sort_order, ps.created_at limit 1
)
where p.current_stage_id is null;

insert into public.project_assignments(project_id, user_id, assignment_role, created_by)
select p.id, p.assigned_salesperson, 'sales', p.created_by
from public.projects p
where p.assigned_salesperson is not null
on conflict (project_id, user_id, assignment_role) do nothing;

create or replace function private.refresh_project_stage_rollup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target_project uuid; next_stage uuid; derived_progress smallint;
begin
  target_project := coalesce(new.project_id, old.project_id);
  select ps.id into next_stage
  from public.project_stages ps
  where ps.project_id = target_project
    and ps.status::text not in ('completed', 'skipped')
  order by ps.sort_order, ps.created_at
  limit 1;

  select coalesce(round(
    100 * sum(case when ps.status::text in ('completed', 'skipped') then ps.weight else 0 end)
    / nullif(sum(ps.weight), 0)
  ), 0)::smallint into derived_progress
  from public.project_stages ps where ps.project_id = target_project;

  update public.projects
  set current_stage_id = next_stage, progress = derived_progress
  where id = target_project;
  return coalesce(new, old);
end;
$$;

revoke all on function private.refresh_project_stage_rollup() from public, anon, authenticated;
drop trigger if exists project_stages_refresh_rollup on public.project_stages;
create trigger project_stages_refresh_rollup
after insert or update of status, weight or delete on public.project_stages
for each row execute function private.refresh_project_stage_rollup();

create or replace function private.guard_project_task()
returns trigger
language plpgsql
set search_path = ''
as $$
declare project_customer uuid; caller_role public.app_role;
begin
  if new.project_id is null then
    if new.project_stage_id is not null then raise exception 'A project stage requires a project'; end if;
    return new;
  end if;

  if new.kind::text <> 'project_task' then raise exception 'Project tasks must use the project task kind'; end if;
  select p.customer_id into project_customer from public.projects p where p.id = new.project_id;
  if project_customer is null then raise exception 'Project not found'; end if;
  if new.customer_id is not null and new.customer_id <> project_customer then raise exception 'Task customer must match project customer'; end if;
  new.customer_id := project_customer;
  if new.project_stage_id is not null and not exists (
    select 1 from public.project_stages ps where ps.id = new.project_stage_id and ps.project_id = new.project_id
  ) then raise exception 'Task stage must belong to the same project'; end if;
  if new.assigned_to is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id
      and (p.project_owner_id = new.assigned_to or p.assigned_salesperson = new.assigned_to)
    union all
    select 1 from public.project_assignments a
      where a.project_id = new.project_id and a.user_id = new.assigned_to
  ) then raise exception 'Task assignee must participate in the project'; end if;

  if (select auth.uid()) is null then return new; end if;
  caller_role := private.current_user_role();
  if caller_role = 'admin' then return new; end if;
  if caller_role <> 'site_team' or not private.can_operate_project(new.project_id) then
    raise exception 'Only Management or assigned Site Team can manage project tasks';
  end if;
  if tg_op = 'INSERT' and new.assigned_to is distinct from (select auth.uid()) then
    raise exception 'Site Team can only create tasks assigned to themselves';
  end if;
  if tg_op = 'UPDATE' and (
    new.project_id is distinct from old.project_id
    or new.project_stage_id is distinct from old.project_stage_id
    or new.assigned_to is distinct from old.assigned_to
    or new.created_by is distinct from old.created_by
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.priority is distinct from old.priority
    or new.due_at is distinct from old.due_at
  ) then raise exception 'Site Team can update task execution state only'; end if;
  return new;
end;
$$;

revoke all on function private.guard_project_task() from public, anon, authenticated;
drop trigger if exists tasks_guard_project_task on public.tasks;
create trigger tasks_guard_project_task
before insert or update on public.tasks
for each row execute function private.guard_project_task();

create or replace function public.configure_project_stage_template(
  p_template_id uuid,
  p_name text,
  p_description text,
  p_sort_order integer,
  p_is_active boolean,
  p_default_weight numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role(array['admin'::public.app_role]) then raise exception 'Only Management can configure project stages'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 120
     or char_length(coalesce(p_description, '')) > 2000
     or p_sort_order not between 0 and 10000
     or p_default_weight <= 0 or p_default_weight > 100 then
    raise exception 'Invalid stage template values';
  end if;
  update public.project_stage_templates
  set name = trim(p_name), description = nullif(trim(coalesce(p_description, '')), ''),
    sort_order = p_sort_order, is_active = p_is_active, default_weight = p_default_weight
  where id = p_template_id;
  if not found then raise exception 'Stage template not found'; end if;
  if not exists (select 1 from public.project_stage_templates where is_active and archived_at is null) then
    raise exception 'At least one active project stage is required';
  end if;
  if not exists (select 1 from public.project_stage_templates where is_active and is_terminal and archived_at is null) then
    raise exception 'The terminal completion stage must remain active';
  end if;
end;
$$;

create or replace function public.set_project_assignment(
  p_project_id uuid,
  p_user_id uuid,
  p_assignment_role text,
  p_enabled boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare staff_role public.app_role;
begin
  if not private.has_role(array['admin'::public.app_role]) then raise exception 'Only Management can assign project staff'; end if;
  if p_assignment_role not in ('project_owner', 'sales', 'site_team', 'installer', 'team_member') then raise exception 'Invalid project assignment role'; end if;
  if not exists (select 1 from public.projects where id = p_project_id and archived_at is null) then raise exception 'Project not found'; end if;
  select role into staff_role from public.profiles where id = p_user_id and status = 'active';
  if staff_role is null then raise exception 'Choose an active staff member'; end if;
  if p_assignment_role = 'project_owner' and staff_role <> 'admin' then raise exception 'The project owner must be Management'; end if;
  if p_assignment_role = 'sales' and staff_role not in ('admin', 'sales') then raise exception 'Sales assignments require Management or Sales staff'; end if;
  if p_assignment_role in ('site_team', 'installer') and staff_role not in ('admin', 'site_team') then raise exception 'Execution assignments require Management or Site Team staff'; end if;

  if p_enabled then
    if p_assignment_role = 'project_owner' then
      delete from public.project_assignments where project_id = p_project_id and assignment_role = 'project_owner' and user_id <> p_user_id;
    end if;
    insert into public.project_assignments(project_id, user_id, assignment_role, created_by)
    values (p_project_id, p_user_id, p_assignment_role, (select auth.uid()))
    on conflict (project_id, user_id, assignment_role) do nothing;
  else
    delete from public.project_assignments
    where project_id = p_project_id and user_id = p_user_id and assignment_role = p_assignment_role;
  end if;

  if p_assignment_role = 'project_owner' then
    update public.projects
    set project_owner_id = case when p_enabled then p_user_id else null end
    where id = p_project_id;
  elsif p_assignment_role = 'sales' and p_enabled then
    update public.projects set assigned_salesperson = p_user_id where id = p_project_id;
  end if;
end;
$$;

create or replace function public.update_project_details(
  p_project_id uuid,
  p_status text,
  p_priority text,
  p_start_date date,
  p_target_date date,
  p_installation_date date,
  p_summary text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare current_status public.project_status;
begin
  if not private.has_role(array['admin'::public.app_role]) then raise exception 'Only Management can update project planning'; end if;
  if p_status not in ('planned', 'active', 'on_hold', 'cancelled') then raise exception 'Use the controlled completion workflow'; end if;
  if p_priority not in ('low', 'normal', 'high', 'urgent') then raise exception 'Invalid project priority'; end if;
  if p_target_date is not null and p_start_date is not null and p_target_date < p_start_date then raise exception 'Target completion cannot precede the start date'; end if;
  select status into current_status from public.projects where id = p_project_id for update;
  if current_status is null then raise exception 'Project not found'; end if;
  if current_status = 'completed' then raise exception 'Reopen the completed project before editing it'; end if;
  update public.projects
  set status = p_status::public.project_status,
    priority = p_priority::public.project_priority,
    start_date = case when p_status = 'active' then coalesce(p_start_date, start_date, current_date) else p_start_date end,
    started_by = case when p_status = 'active' and start_date is null then (select auth.uid()) else started_by end,
    expected_completion_date = p_target_date,
    installation_date = p_installation_date,
    summary = nullif(trim(coalesce(p_summary, '')), ''),
    notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_project_id;
end;
$$;

create or replace function public.update_project_stage_details(
  p_stage_id uuid,
  p_assigned_to uuid,
  p_target_date date,
  p_progress smallint,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target_project uuid; current_status text;
begin
  if not private.has_role(array['admin'::public.app_role]) then raise exception 'Only Management can plan project stages'; end if;
  if p_progress not between 0 and 99 then raise exception 'In-progress stage progress must be between 0 and 99'; end if;
  select project_id, status::text into target_project, current_status from public.project_stages where id = p_stage_id;
  if target_project is null then raise exception 'Project stage not found'; end if;
  if p_assigned_to is not null and not exists (
    select 1 from public.project_assignments where project_id = target_project and user_id = p_assigned_to
  ) then raise exception 'Stage assignee must participate in the project'; end if;
  update public.project_stages
  set assigned_to = p_assigned_to, target_date = p_target_date,
    progress = case when current_status in ('completed', 'skipped') then 100 else p_progress end,
    notes = nullif(trim(coalesce(p_notes, '')), ''), updated_by = (select auth.uid())
  where id = p_stage_id;
end;
$$;

create or replace function public.transition_project_stage(p_stage_id uuid, p_action text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare stage_row public.project_stages%rowtype; project_row public.projects%rowtype; target_status text; next_stage uuid; caller_role public.app_role;
begin
  select * into stage_row from public.project_stages where id = p_stage_id for update;
  if not found then raise exception 'Project stage not found'; end if;
  select * into project_row from public.projects where id = stage_row.project_id for update;
  caller_role := private.current_user_role();
  if caller_role = 'admin' then null;
  elsif caller_role = 'site_team' and private.can_operate_project(stage_row.project_id)
    and stage_row.stage_key in ('manufacturing', 'installation', 'handover') then null;
  else raise exception 'You cannot change this project stage';
  end if;
  if project_row.status in ('completed', 'cancelled') then raise exception 'Completed or cancelled projects cannot change stages'; end if;
  if p_action not in ('start', 'complete', 'block', 'resume', 'skip', 'reopen') then raise exception 'Invalid stage action'; end if;

  target_status := case p_action
    when 'start' then 'in_progress'
    when 'complete' then 'completed'
    when 'block' then 'blocked'
    when 'resume' then 'in_progress'
    when 'skip' then 'skipped'
    when 'reopen' then 'in_progress'
  end;
  if p_action = 'start' and stage_row.status::text <> 'not_started' then raise exception 'Only pending stages can be started'; end if;
  if p_action = 'complete' and stage_row.status::text <> 'in_progress' then raise exception 'Only in-progress stages can be completed'; end if;
  if p_action = 'block' and stage_row.status::text <> 'in_progress' then raise exception 'Only in-progress stages can be blocked'; end if;
  if p_action = 'resume' and stage_row.status::text <> 'blocked' then raise exception 'Only blocked stages can be resumed'; end if;
  if p_action in ('skip', 'reopen') and caller_role <> 'admin' then raise exception 'Only Management can skip or reopen a stage'; end if;
  if p_action = 'skip' and stage_row.status::text not in ('not_started', 'blocked') then raise exception 'Only pending or blocked stages can be skipped'; end if;
  if p_action = 'reopen' and stage_row.status::text not in ('completed', 'skipped') then raise exception 'Only completed or skipped stages can be reopened'; end if;
  if p_action in ('start', 'reopen') and exists (
    select 1 from public.project_stages earlier
    where earlier.project_id = stage_row.project_id and earlier.sort_order < stage_row.sort_order
      and earlier.status::text not in ('completed', 'skipped')
  ) then raise exception 'Complete or skip earlier stages first'; end if;
  if p_action = 'complete' and stage_row.stage_key = 'handover' and project_row.handover_status <> 'completed' then
    raise exception 'Complete the handover record before completing the handover stage';
  end if;

  update public.project_stages
  set status = target_status::public.stage_status,
    started_at = case when target_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
    completed_at = case when target_status in ('completed', 'skipped') then now() else null end,
    progress = case when target_status in ('completed', 'skipped') then 100 when p_action = 'reopen' then least(progress, 95) else progress end,
    notes = coalesce(nullif(trim(coalesce(p_note, '')), ''), notes),
    updated_by = (select auth.uid())
  where id = p_stage_id;

  if project_row.status = 'planned' and target_status = 'in_progress' then
    update public.projects set status = 'active', start_date = coalesce(start_date, current_date), started_by = coalesce(started_by, (select auth.uid())) where id = stage_row.project_id;
  end if;

  if target_status in ('completed', 'skipped') then
    select id into next_stage from public.project_stages
    where project_id = stage_row.project_id and sort_order > stage_row.sort_order and status::text = 'not_started'
    order by sort_order, created_at limit 1;
    if next_stage is not null then
      update public.project_stages
      set status = 'in_progress', started_at = now(), updated_by = (select auth.uid())
      where id = next_stage;
    end if;
  end if;
end;
$$;

create or replace function public.update_project_handover(
  p_project_id uuid,
  p_status text,
  p_handover_date date,
  p_contact text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare old_status public.handover_status; caller_role public.app_role;
begin
  caller_role := private.current_user_role();
  if caller_role <> 'admin' and not (caller_role = 'site_team' and private.can_operate_project(p_project_id)) then
    raise exception 'You cannot update this handover';
  end if;
  if p_status not in ('pending', 'ready', 'completed', 'issues_outstanding') then raise exception 'Invalid handover status'; end if;
  select handover_status into old_status from public.projects where id = p_project_id and status not in ('completed', 'cancelled') for update;
  if old_status is null then raise exception 'Active project not found'; end if;
  if old_status = 'completed' and p_status <> 'completed' and caller_role <> 'admin' then raise exception 'Only Management can reopen a completed handover'; end if;
  if p_status = 'completed' and p_handover_date is null then raise exception 'A handover date is required'; end if;
  update public.projects
  set handover_status = p_status::public.handover_status,
    handover_date = p_handover_date,
    handover_contact = nullif(trim(coalesce(p_contact, '')), ''),
    handover_notes = nullif(trim(coalesce(p_notes, '')), ''),
    handover_confirmed_at = case when p_status = 'completed' then coalesce(handover_confirmed_at, now()) else null end,
    handover_confirmed_by = case when p_status = 'completed' then coalesce(handover_confirmed_by, (select auth.uid())) else null end
  where id = p_project_id;
end;
$$;

create or replace function public.complete_project(p_project_id uuid, p_completion_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare final_stage uuid;
begin
  if not private.has_role(array['admin'::public.app_role]) then raise exception 'Only Management can complete projects'; end if;
  if not exists (select 1 from public.projects where id = p_project_id and status not in ('completed', 'cancelled') and handover_status = 'completed' for update) then
    raise exception 'Complete handover before completing the project';
  end if;
  if exists (
    select 1 from public.project_stages where project_id = p_project_id and not is_terminal and status::text not in ('completed', 'skipped')
  ) then raise exception 'All delivery stages must be complete or skipped'; end if;
  select id into final_stage from public.project_stages where project_id = p_project_id and is_terminal order by sort_order desc limit 1;
  if final_stage is not null then
    update public.project_stages set status = 'completed', started_at = coalesce(started_at, now()), completed_at = now(), progress = 100, updated_by = (select auth.uid()) where id = final_stage;
  end if;
  update public.projects
  set status = 'completed', progress = 100, completed_at = now(), actual_completion_date = current_date,
    completed_by = (select auth.uid()), completion_note = nullif(trim(coalesce(p_completion_note, '')), ''), current_stage_id = final_stage
  where id = p_project_id;
end;
$$;

create or replace function public.reopen_project(p_project_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare final_stage uuid;
begin
  if not private.has_role(array['admin'::public.app_role]) then raise exception 'Only Management can reopen projects'; end if;
  if char_length(trim(coalesce(p_note, ''))) < 3 then raise exception 'A reopening note is required'; end if;
  if not exists (select 1 from public.projects where id = p_project_id and status = 'completed' for update) then raise exception 'Completed project not found'; end if;
  select id into final_stage from public.project_stages where project_id = p_project_id and is_terminal order by sort_order desc limit 1;
  if final_stage is not null then
    update public.project_stages set status = 'in_progress', completed_at = null, progress = 0, notes = trim(p_note), updated_by = (select auth.uid()) where id = final_stage;
  end if;
  update public.projects
  set status = 'active', completed_at = null, actual_completion_date = null, completed_by = null,
    completion_note = null, reopened_at = now(), reopened_by = (select auth.uid()), current_stage_id = final_stage
  where id = p_project_id;
end;
$$;

create or replace function public.finalize_project_file(p_file_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare file_row public.project_files%rowtype;
begin
  select * into file_row from public.project_files where id = p_file_id for update;
  if not found then raise exception 'Project file reservation not found'; end if;
  if file_row.created_by <> (select auth.uid()) and not private.has_role(array['admin'::public.app_role]) then raise exception 'You cannot finalize this file'; end if;
  if not private.can_operate_project(file_row.project_id) then raise exception 'You cannot upload to this project'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'project-files' and name = file_row.storage_path) then raise exception 'Stored object not found'; end if;
  update public.project_files set upload_status = 'ready' where id = p_file_id;
end;
$$;

do $$
declare fn regprocedure;
begin
  foreach fn in array array[
    'public.configure_project_stage_template(uuid,text,text,integer,boolean,numeric)'::regprocedure,
    'public.set_project_assignment(uuid,uuid,text,boolean)'::regprocedure,
    'public.update_project_details(uuid,text,text,date,date,date,text,text)'::regprocedure,
    'public.update_project_stage_details(uuid,uuid,date,smallint,text)'::regprocedure,
    'public.transition_project_stage(uuid,text,text)'::regprocedure,
    'public.update_project_handover(uuid,text,date,text,text)'::regprocedure,
    'public.complete_project(uuid,text)'::regprocedure,
    'public.reopen_project(uuid,text)'::regprocedure,
    'public.finalize_project_file(uuid)'::regprocedure
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

-- Human-readable project activity is written against the project entity so its RLS boundary is reusable.
create or replace function private.log_project_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare event_name text;
begin
  if tg_op = 'INSERT' then
    insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'project.created', 'projects', new.id, jsonb_build_object('number', new.project_number, 'status', new.status));
    return new;
  end if;
  if new.status is distinct from old.status then
    event_name := case
      when new.status = 'active' and old.status = 'completed' then 'project.reopened'
      when new.status = 'active' then 'project.started'
      when new.status = 'completed' then 'project.completed'
      else 'project.status_changed'
    end;
    insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
    values ((select auth.uid()), event_name, 'projects', new.id, jsonb_build_object('status', new.status, 'previous_status', old.status, 'number', new.project_number));
  end if;
  if new.installation_date is distinct from old.installation_date then
    insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
    values ((select auth.uid()), 'installation.scheduled', 'projects', new.id, jsonb_build_object('date', new.installation_date));
  end if;
  if new.handover_status is distinct from old.handover_status then
    event_name := case new.handover_status
      when 'ready' then 'handover.ready'
      when 'completed' then 'handover.completed'
      when 'issues_outstanding' then 'handover.issues_outstanding'
      else 'handover.updated'
    end;
    insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
    values ((select auth.uid()), event_name, 'projects', new.id, jsonb_build_object('status', new.handover_status, 'date', new.handover_date));
  end if;
  return new;
end;
$$;

create or replace function private.log_project_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare event_name text;
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then return new; end if;
  event_name := case
    when new.status::text = 'completed' then 'stage.completed'
    when new.status::text = 'blocked' then 'stage.blocked'
    when new.status::text = 'skipped' then 'stage.skipped'
    when new.status::text = 'in_progress' and old.status::text = 'blocked' then 'stage.resumed'
    when new.status::text = 'in_progress' and old.status::text in ('completed', 'skipped') then 'stage.reopened'
    else 'stage.started'
  end;
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), event_name, 'projects', new.project_id,
    jsonb_build_object('stage_id', new.id, 'stage', new.name, 'stage_key', new.stage_key, 'status', new.status));
  return new;
end;
$$;

create or replace function private.log_project_child_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare row_data jsonb; project uuid; event_name text;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  project := (row_data ->> 'project_id')::uuid;
  if tg_table_name = 'project_assignments' then
    event_name := case when tg_op = 'DELETE' then 'staff.unassigned' when tg_op = 'UPDATE' then 'assignment.changed' else 'staff.assigned' end;
  elsif tg_table_name = 'project_updates' then event_name := 'project.update_added';
  elsif tg_table_name = 'project_files' then
    if tg_op = 'UPDATE' and new.upload_status = 'ready' and old.upload_status <> 'ready' then event_name := 'file.uploaded';
    elsif tg_op = 'DELETE' and old.upload_status = 'ready' then event_name := 'file.deleted';
    else return case when tg_op = 'DELETE' then old else new end;
    end if;
  elsif tg_table_name = 'tasks' then
    if tg_op = 'INSERT' then event_name := 'task.created';
    elsif new.status = 'completed' and old.status <> 'completed' then event_name := 'task.completed';
    else return new;
    end if;
  end if;
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), event_name, 'projects', project,
    jsonb_strip_nulls(jsonb_build_object(
      'role', row_data ->> 'assignment_role', 'user_id', row_data ->> 'user_id',
      'type', row_data ->> 'update_type', 'stage_id', row_data ->> 'stage_id',
      'file_name', row_data ->> 'file_name', 'category', row_data ->> 'file_type',
      'task_id', row_data ->> 'id', 'title', row_data ->> 'title'
    )));
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.log_project_change() from public, anon, authenticated;
revoke all on function private.log_project_stage_change() from public, anon, authenticated;
revoke all on function private.log_project_child_change() from public, anon, authenticated;

drop trigger if exists projects_activity on public.projects;
drop trigger if exists project_stages_activity on public.project_stages;
drop trigger if exists project_updates_activity on public.project_updates;
drop trigger if exists projects_phase_2e_activity on public.projects;
create trigger projects_phase_2e_activity after insert or update on public.projects
for each row execute function private.log_project_change();
create trigger project_stages_phase_2e_activity after update on public.project_stages
for each row execute function private.log_project_stage_change();
create trigger project_assignments_phase_2e_activity after insert or update or delete on public.project_assignments
for each row execute function private.log_project_child_change();
create trigger project_updates_phase_2e_activity after insert on public.project_updates
for each row execute function private.log_project_child_change();
create trigger project_files_phase_2e_activity after update or delete on public.project_files
for each row execute function private.log_project_child_change();
create trigger project_tasks_phase_2e_activity after insert or update on public.tasks
for each row when (new.project_id is not null and new.kind::text = 'project_task') execute function private.log_project_child_change();

-- Replace broad Phase 1 project policies with explicit Phase 2E boundaries.
drop policy if exists "staff reads stage templates" on public.project_stage_templates;
drop policy if exists "admin manages stage templates" on public.project_stage_templates;
create policy "staff reads active stage templates" on public.project_stage_templates for select to authenticated
using (private.current_user_role() is not null);

drop policy if exists "staff reads related projects" on public.projects;
drop policy if exists "sales manages projects" on public.projects;
create policy "staff reads authorized projects" on public.projects for select to authenticated
using (private.can_access_project(id));
create policy "management creates projects" on public.projects for insert to authenticated
with check (private.has_role(array['admin'::public.app_role]) and created_by = (select auth.uid()));

drop policy if exists "staff reads project assignments" on public.project_assignments;
drop policy if exists "sales manages project assignments" on public.project_assignments;
create policy "staff reads authorized project assignments" on public.project_assignments for select to authenticated
using (private.can_access_project(project_id));

drop policy if exists "staff reads project stages" on public.project_stages;
drop policy if exists "delivery team updates stages" on public.project_stages;
drop policy if exists "sales creates project stages" on public.project_stages;
drop policy if exists "admin deletes project stages" on public.project_stages;
create policy "staff reads authorized project stages" on public.project_stages for select to authenticated
using (private.can_access_project(project_id));

drop policy if exists "staff reads project updates" on public.project_updates;
drop policy if exists "delivery team creates project updates" on public.project_updates;
drop policy if exists "authors update project updates" on public.project_updates;
create policy "staff reads authorized project updates" on public.project_updates for select to authenticated
using (private.can_access_project(project_id));
create policy "authorized staff adds project updates" on public.project_updates for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.can_access_project(project_id)
  and (
    private.has_role(array['admin'::public.app_role])
    or private.can_operate_project(project_id)
    or (private.has_role(array['sales'::public.app_role]) and update_type in ('general', 'customer_decision'))
  )
  and (stage_id is null or exists (select 1 from public.project_stages ps where ps.id = stage_id and ps.project_id = project_id))
);

drop policy if exists "staff reads project files" on public.project_files;
drop policy if exists "delivery team creates project files" on public.project_files;
drop policy if exists "file owners update project files" on public.project_files;
drop policy if exists "file owners delete project files" on public.project_files;
create policy "participants read ready project files" on public.project_files for select to authenticated
using (private.can_access_project_files(project_id) and (upload_status = 'ready' or created_by = (select auth.uid())));
create policy "delivery team reserves project files" on public.project_files for insert to authenticated
with check (
  created_by = (select auth.uid()) and upload_status = 'pending' and private.can_operate_project(project_id)
  and storage_path = project_id::text || '/' || id::text || case mime_type
    when 'application/pdf' then '.pdf' when 'image/jpeg' then '.jpg'
    when 'image/png' then '.png' when 'image/webp' then '.webp' else '.invalid' end
  and (stage_id is null or exists (select 1 from public.project_stages ps where ps.id = stage_id and ps.project_id = project_id))
);
create policy "file owners delete project file metadata" on public.project_files for delete to authenticated
using (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role]));

drop policy if exists "active staff reads authorized activity logs" on public.activity_logs;
create policy "active staff reads scoped activity logs" on public.activity_logs for select to authenticated
using (
  private.current_user_role() is not null
  and case
    when entity_type = 'quotations' and entity_id is not null then private.can_read_quotation(entity_id)
    when entity_type = 'projects' and entity_id is not null then private.can_access_project(entity_id)
    else true
  end
);

-- Explicit grants complement RLS. Controlled workflow tables mutate only through audited RPCs.
revoke all on public.project_stage_templates, public.projects, public.project_assignments, public.project_stages,
  public.project_updates, public.project_files from anon;
revoke insert, update, delete on public.project_stage_templates, public.project_assignments, public.project_stages from authenticated;
revoke update, delete on public.projects from authenticated;
revoke update, delete on public.project_updates from authenticated;
revoke update on public.project_files from authenticated;
grant select on public.project_stage_templates, public.projects, public.project_assignments, public.project_stages,
  public.project_updates, public.project_files to authenticated;
grant insert on public.projects, public.project_updates, public.project_files to authenticated;
grant delete on public.project_files to authenticated;

-- Private project bucket: registry-backed paths only, no public reads or orphan uploads.
update storage.buckets
set public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'project-files';

drop policy if exists "project team views files" on storage.objects;
drop policy if exists "project team uploads files" on storage.objects;
drop policy if exists "project file owners update" on storage.objects;
drop policy if exists "project file owners delete" on storage.objects;

create policy "authorized participants read registered project files"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-files'
  and exists (
    select 1 from public.project_files pf
    where pf.storage_path = name and pf.upload_status = 'ready'
      and private.can_access_project_files(pf.project_id)
  )
);
create policy "delivery team uploads reserved project files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-files'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1 from public.project_files pf
    where pf.storage_path = name and pf.upload_status = 'pending'
      and pf.created_by = (select auth.uid()) and private.can_operate_project(pf.project_id)
  )
);
create policy "project file owners update registered objects"
on storage.objects for update to authenticated
using (
  bucket_id = 'project-files' and owner_id = (select auth.uid()::text)
  and exists (select 1 from public.project_files pf where pf.storage_path = name and pf.created_by = (select auth.uid()))
)
with check (
  bucket_id = 'project-files' and owner_id = (select auth.uid()::text)
  and exists (select 1 from public.project_files pf where pf.storage_path = name and pf.created_by = (select auth.uid()))
);
create policy "owners or management delete registered project files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-files'
  and exists (
    select 1 from public.project_files pf
    where pf.storage_path = name
      and (pf.created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role]))
  )
);

comment on column public.projects.progress is 'Derived from completed or skipped project-stage weight; manual stage progress does not inflate it.';
comment on column public.project_stages.stage_key is 'Snapshot of the template key at project creation; later template edits do not rewrite project history.';
comment on table public.project_files is 'Private Storage registry. Insert pending metadata before API upload, then finalize to ready.';
