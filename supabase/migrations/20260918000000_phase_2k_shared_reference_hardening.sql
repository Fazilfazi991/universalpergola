-- Keep the project/job reference authoritative and immutable once commercial
-- documents exist. Quotations and invoices remain document-specific records.

create or replace function public.generate_project_client_reference(
  p_project_id uuid,
  p_location_token text default null,
  p_reference_date date default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_row public.projects%rowtype;
  sequence_value bigint;
  location_value text;
  date_value date;
  reference_value text;
  event_name text;
begin
  if not private.has_role(array['admin'::public.app_role]) then
    raise exception 'Only Management can generate or correct client references';
  end if;

  select * into project_row from public.projects
  where id = p_project_id and archived_at is null for update;
  if not found then raise exception 'Project was not found'; end if;

  -- A normal read/ensure call must never rewrite an existing reference.
  if project_row.client_reference is not null
     and p_location_token is null
     and p_reference_date is null then
    return project_row.client_reference;
  end if;

  sequence_value := coalesce(project_row.client_reference_sequence, nextval('private.client_reference_seq'));
  location_value := private.normalize_client_reference_location(
    coalesce(nullif(btrim(p_location_token), ''), project_row.client_reference_location_token, project_row.site_address)
  );
  date_value := coalesce(p_reference_date, project_row.client_reference_date, project_row.start_date, project_row.created_at::date);
  reference_value := private.format_client_reference(sequence_value, location_value, date_value);

  if project_row.client_reference is not null
     and reference_value is distinct from project_row.client_reference
     and (
       exists (select 1 from public.invoices where project_id = project_row.id)
       or exists (
         select 1 from public.quotations
         where revision_group_id = (
           select revision_group_id from public.quotations where id = project_row.quotation_id
         )
       )
     ) then
    raise exception 'Client/job references are immutable after commercial documents exist';
  end if;

  event_name := case when project_row.client_reference is null then 'client_reference.generated' else 'client_reference.corrected' end;
  update public.projects
  set client_reference = reference_value,
      client_reference_sequence = sequence_value,
      client_reference_location_token = location_value,
      client_reference_date = date_value
  where id = project_row.id;

  if project_row.quotation_id is not null then
    update public.quotations
    set client_reference = reference_value,
        client_reference_sequence = sequence_value,
        client_reference_location_token = location_value,
        client_reference_date = date_value
    where revision_group_id = (
      select revision_group_id from public.quotations where id = project_row.quotation_id
    );
  end if;

  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values (
    (select auth.uid()), event_name, 'projects', project_row.id,
    jsonb_build_object('reference', reference_value, 'location_token', location_value, 'reference_date', date_value)
  );
  return reference_value;
end;
$$;

create or replace function private.validate_invoice_client_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare project_row public.projects%rowtype;
begin
  select * into project_row from public.projects where id = new.project_id;
  if not found then raise exception 'Invoice project was not found'; end if;
  if new.client_reference is distinct from project_row.client_reference then
    raise exception 'Invoice must use the project client/job reference';
  end if;
  if new.client_reference_sequence is distinct from project_row.client_reference_sequence
     or new.client_reference_location_token is distinct from project_row.client_reference_location_token
     or new.client_reference_date is distinct from project_row.client_reference_date then
    raise exception 'Invoice client/job reference metadata must match the project';
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_validate_client_reference on public.invoices;
create trigger invoices_validate_client_reference
before insert or update of project_id, client_reference, client_reference_sequence,
  client_reference_location_token, client_reference_date on public.invoices
for each row execute function private.validate_invoice_client_reference();

revoke all on function private.validate_invoice_client_reference() from public, anon, authenticated;
