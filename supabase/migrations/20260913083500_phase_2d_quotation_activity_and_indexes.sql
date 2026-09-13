-- Phase 2D follow-up: explicit lifecycle timeline events and supporting FK indexes.

create index if not exists quotations_enquiry_idx on public.quotations(enquiry_id)
  where enquiry_id is not null;
create index if not exists quotations_site_visit_idx on public.quotations(site_visit_id)
  where site_visit_id is not null;
create index if not exists quotations_revised_from_idx on public.quotations(revised_from_id)
  where revised_from_id is not null;
create index if not exists quotations_approved_by_idx on public.quotations(approved_by)
  where approved_by is not null;
create index if not exists quotations_rejected_by_idx on public.quotations(rejected_by)
  where rejected_by is not null;
create index if not exists quotations_sent_by_idx on public.quotations(sent_by)
  where sent_by is not null;
create index if not exists quotation_items_product_idx on public.quotation_items(product_id)
  where product_id is not null;
create index if not exists quotation_items_source_measurement_idx
  on public.quotation_items(source_measurement_id)
  where source_measurement_id is not null;
create index if not exists projects_enquiry_idx on public.projects(enquiry_id)
  where enquiry_id is not null;

create or replace function private.log_quotation_revision_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    'quotation.revision_created',
    'quotations',
    new.id,
    jsonb_build_object(
      'quotation_number', new.quotation_number,
      'revision', new.revision_number,
      'revised_from_id', new.revised_from_id
    )
  );
  return new;
end;
$$;

create or replace function private.log_quotation_project_conversion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    'quotation.project_converted',
    'quotations',
    new.quotation_id,
    jsonb_build_object(
      'project_id', new.id,
      'project_number', new.project_number,
      'quotation_number', new.source_quotation_number,
      'revision', new.source_quotation_revision
    )
  );
  return new;
end;
$$;

drop trigger if exists quotation_revision_created_activity on public.quotations;
create trigger quotation_revision_created_activity
after insert on public.quotations
for each row
when (new.revised_from_id is not null)
execute function private.log_quotation_revision_created();

drop trigger if exists quotation_project_conversion_activity on public.projects;
create trigger quotation_project_conversion_activity
after insert on public.projects
for each row
when (new.quotation_id is not null)
execute function private.log_quotation_project_conversion();

revoke all on function private.log_quotation_revision_created() from public, anon, authenticated;
revoke all on function private.log_quotation_project_conversion() from public, anon, authenticated;
