-- Prefer the actual area segment when the stored site address begins with a
-- UAT label or a building/villa identifier. This keeps business references
-- human-readable without changing their already allocated sequence or date.
create or replace function private.normalize_client_reference_location(source text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  clean_source text;
  segments text[];
  candidate text;
  token text;
begin
  clean_source := regexp_replace(btrim(coalesce(source, '')), '^\s*\[[^]]+\]\s*', '', 'i');
  segments := regexp_split_to_array(clean_source, '\s*,\s*');
  candidate := btrim(coalesce(segments[1], ''));

  if candidate ~* '^(villa|plot|unit|house|building|warehouse|shop)\b'
     and coalesce(array_length(segments, 1), 0) > 1 then
    candidate := btrim(segments[2]);
  end if;

  candidate := regexp_replace(candidate, '^Al\s+', '', 'i');

  select string_agg(initcap(part), '' order by ordinal)
  into token
  from unnest(regexp_split_to_array(candidate, '[^A-Za-z0-9]+')) with ordinality as word(part, ordinal)
  where part <> '';

  if token is null or token = '' then token := 'Location'; end if;
  return left(token, 48);
end;
$$;

with normalized as (
  select
    id,
    private.normalize_client_reference_location(site_address) as location_token,
    client_reference_sequence,
    client_reference_date
  from public.projects
  where client_reference_sequence is not null
    and client_reference_date is not null
)
update public.projects as project
set client_reference_location_token = normalized.location_token,
    client_reference = private.format_client_reference(
      normalized.client_reference_sequence,
      normalized.location_token,
      normalized.client_reference_date
    )
from normalized
where project.id = normalized.id;

update public.quotations as quotation
set client_reference = project.client_reference,
    client_reference_sequence = project.client_reference_sequence,
    client_reference_location_token = project.client_reference_location_token,
    client_reference_date = project.client_reference_date
from public.projects as project
where quotation.client_reference_sequence = project.client_reference_sequence;

update public.invoices as invoice
set client_reference = project.client_reference,
    client_reference_sequence = project.client_reference_sequence,
    client_reference_location_token = project.client_reference_location_token,
    client_reference_date = project.client_reference_date
from public.projects as project
where invoice.project_id = project.id
  and invoice.status = 'draft'::public.invoice_status;

revoke all on function private.normalize_client_reference_location(text) from public, anon, authenticated;
