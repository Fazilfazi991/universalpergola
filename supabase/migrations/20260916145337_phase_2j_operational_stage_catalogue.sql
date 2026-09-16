create or replace function private.refresh_project_stage_rollup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_project uuid; next_stage uuid; derived_progress smallint;
begin
  target_project := coalesce(new.project_id, old.project_id);
  select ps.id into next_stage from public.project_stages ps where ps.project_id=target_project and ps.status::text not in ('completed','skipped') order by ps.sort_order, ps.created_at limit 1;
  select least(100, greatest(0, coalesce(round(sum(ps.weight * case when ps.status::text in ('completed','skipped') then 100 else ps.progress end) / nullif(sum(ps.weight),0)),0)))::smallint into derived_progress from public.project_stages ps where ps.project_id=target_project;
  update public.projects set current_stage_id=next_stage, progress=derived_progress where id=target_project;
  return coalesce(new,old);
end; $$;

insert into public.project_stage_templates(key, name, description, sort_order, is_active, default_weight, is_terminal)
values
 ('purchase', 'Purchase', 'Confirm approved materials and purchase orders.', 100, true, 1, false),
 ('material_delivery', 'Material Delivery', 'Receive and verify materials at the workshop or site.', 110, true, 1, false),
 ('cutting', 'Cutting', 'Cut and prepare components to the approved measurements.', 120, true, 1, false),
 ('fabrication_welding', 'Fabrication / Welding', 'Fabricate and weld the pergola frame.', 130, true, 1, false),
 ('coating', 'Coating', 'Complete surface preparation and coating.', 140, true, 1, false),
 ('installation', 'Installation', 'Install the system on site.', 150, true, 1, false),
 ('delivery_handover', 'Delivery / Handover', 'Complete delivery, snagging, and customer handover.', 160, true, 1, false)
on conflict (key) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order, is_active=true;

insert into public.project_stages(project_id, template_id, stage_key, name, description, sort_order, weight, is_terminal, status, created_by)
select p.id, t.id, t.key, t.name, t.description, t.sort_order, t.default_weight, t.is_terminal, 'not_started'::public.stage_status, p.created_by
from public.projects p cross join public.project_stage_templates t
where t.key in ('purchase','material_delivery','cutting','fabrication_welding','coating','delivery_handover')
  and not exists (select 1 from public.project_stages ps where ps.project_id=p.id and ps.stage_key=t.key);

create or replace function public.transition_project_stage(p_stage_id uuid, p_action text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare stage_row public.project_stages%rowtype; project_row public.projects%rowtype; target_status text; caller_role public.app_role;
begin
  select * into stage_row from public.project_stages where id=p_stage_id for update; if not found then raise exception 'Project stage not found'; end if;
  select * into project_row from public.projects where id=stage_row.project_id for update;
  caller_role := private.current_user_role();
  if caller_role='admin' then null;
  elsif caller_role='site_team' and private.can_operate_project(stage_row.project_id) and stage_row.stage_key in ('manufacturing','installation','handover','purchase','material_delivery','cutting','fabrication_welding','coating','delivery_handover') then null;
  else raise exception 'You cannot change this project stage'; end if;
  if project_row.status in ('completed','cancelled') then raise exception 'Completed or cancelled projects cannot change stages'; end if;
  if p_action not in ('start','complete','block','resume','skip','reopen') then raise exception 'Invalid stage action'; end if;
  target_status := case p_action when 'start' then 'in_progress' when 'complete' then 'completed' when 'block' then 'blocked' when 'resume' then 'in_progress' when 'skip' then 'skipped' when 'reopen' then 'in_progress' end;
  if p_action='start' and stage_row.status::text <> 'not_started' then raise exception 'Only pending stages can be started'; end if;
  if p_action='complete' and stage_row.status::text <> 'in_progress' then raise exception 'Only in-progress stages can be completed'; end if;
  if p_action='block' and stage_row.status::text <> 'in_progress' then raise exception 'Only in-progress stages can be blocked'; end if;
  if p_action='resume' and stage_row.status::text <> 'blocked' then raise exception 'Only blocked stages can be resumed'; end if;
  if p_action in ('skip','reopen') and caller_role <> 'admin' then raise exception 'Only Management can skip or reopen a stage'; end if;
  if p_action='skip' and stage_row.status::text not in ('not_started','blocked') then raise exception 'Only pending or blocked stages can be skipped'; end if;
  if p_action='reopen' and stage_row.status::text not in ('completed','skipped') then raise exception 'Only completed or skipped stages can be reopened'; end if;
  if p_action in ('start','reopen') and exists(select 1 from public.project_stages earlier where earlier.project_id=stage_row.project_id and earlier.sort_order<stage_row.sort_order and earlier.status::text not in ('completed','skipped')) then raise exception 'Complete or skip earlier stages first'; end if;
  update public.project_stages set status=target_status::public.stage_status, progress=case when target_status in ('completed','skipped') then 100 else progress end, started_at=case when target_status='in_progress' and started_at is null then now() else started_at end, completed_at=case when target_status in ('completed','skipped') then now() else null end, notes=coalesce(nullif(trim(p_note),''),notes), updated_by=(select auth.uid()) where id=p_stage_id;
end; $$;
revoke all on function public.transition_project_stage(uuid,text,text) from public, anon;
grant execute on function public.transition_project_stage(uuid,text,text) to authenticated;
