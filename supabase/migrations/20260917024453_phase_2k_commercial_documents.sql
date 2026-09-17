-- Phase 2K: commercial documents hub, shared client/job references, and invoices.
-- Additive only. Existing quotation, project, payment, and receipt numbering remains unchanged.

create type public.invoice_status as enum (
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'cancelled'
);

create sequence if not exists private.client_reference_seq;
create sequence if not exists private.invoice_number_seq;

alter table public.quotations
  add column client_reference text,
  add column client_reference_sequence bigint,
  add column client_reference_location_token text,
  add column client_reference_date date;

alter table public.projects
  add column client_reference text,
  add column client_reference_sequence bigint,
  add column client_reference_location_token text,
  add column client_reference_date date;

alter table public.quotations
  add constraint quotations_client_reference_format check (
    client_reference is null or client_reference ~ '^[0-9]{3,}-UP-[A-Za-z0-9]+-[0-9]{2}-[0-9]{4}$'
  ),
  add constraint quotations_client_reference_complete check (
    (client_reference is null and client_reference_sequence is null and client_reference_location_token is null and client_reference_date is null)
    or
    (client_reference is not null and client_reference_sequence is not null and client_reference_location_token is not null and client_reference_date is not null)
  );

alter table public.projects
  add constraint projects_client_reference_format check (
    client_reference is null or client_reference ~ '^[0-9]{3,}-UP-[A-Za-z0-9]+-[0-9]{2}-[0-9]{4}$'
  ),
  add constraint projects_client_reference_complete check (
    (client_reference is null and client_reference_sequence is null and client_reference_location_token is null and client_reference_date is null)
    or
    (client_reference is not null and client_reference_sequence is not null and client_reference_location_token is not null and client_reference_date is not null)
  );

create unique index quotations_client_reference_unique
  on public.quotations(client_reference)
  where client_reference is not null and revised_from_id is null;
create index quotations_client_reference_lookup
  on public.quotations(client_reference)
  where client_reference is not null;
create unique index projects_client_reference_unique
  on public.projects(client_reference)
  where client_reference is not null;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  project_id uuid not null references public.projects(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  quotation_id uuid references public.quotations(id) on delete set null,
  client_reference text not null,
  client_reference_sequence bigint not null,
  client_reference_location_token text not null,
  client_reference_date date not null,
  quotation_number_snapshot text,
  quotation_revision_snapshot integer,
  customer_name_snapshot text not null,
  customer_company_snapshot text,
  customer_phone_snapshot text,
  customer_email_snapshot text,
  site_address_snapshot text,
  issue_date date not null default current_date,
  due_date date,
  currency char(3) not null default 'AED',
  subtotal numeric(14,2) not null default 0,
  discount_type text not null default 'fixed',
  discount_value numeric(14,4) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 5,
  vat_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  terms text,
  status public.invoice_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz,
  issued_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancellation_reason text,
  pdf_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint invoices_number_format check (invoice_number ~ '^UP-I-[0-9]{4}-[0-9]{6,}$'),
  constraint invoices_client_reference_format check (client_reference ~ '^[0-9]{3,}-UP-[A-Za-z0-9]+-[0-9]{2}-[0-9]{4}$'),
  constraint invoices_currency_valid check (currency ~ '^[A-Z]{3}$'),
  constraint invoices_dates_valid check (due_date is null or due_date >= issue_date),
  constraint invoices_discount_type_valid check (discount_type in ('fixed', 'percentage')),
  constraint invoices_discount_value_valid check (
    discount_value >= 0 and (discount_type <> 'percentage' or discount_value <= 100)
  ),
  constraint invoices_amounts_non_negative check (
    subtotal >= 0 and discount_amount >= 0 and vat_amount >= 0 and total >= 0
  ),
  constraint invoices_vat_valid check (vat_rate >= 0 and vat_rate <= 100),
  constraint invoices_text_lengths check (
    char_length(customer_name_snapshot) between 1 and 200
    and char_length(coalesce(customer_company_snapshot, '')) <= 200
    and char_length(coalesce(customer_phone_snapshot, '')) <= 50
    and char_length(coalesce(customer_email_snapshot, '')) <= 320
    and char_length(coalesce(site_address_snapshot, '')) <= 2000
    and char_length(coalesce(notes, '')) <= 8000
    and char_length(coalesce(terms, '')) <= 12000
    and char_length(coalesce(cancellation_reason, '')) <= 2000
  )
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  quotation_item_id uuid references public.quotation_items(id) on delete set null,
  item_name text not null,
  description text not null default '',
  quantity numeric(12,3) not null default 1,
  unit text not null default 'item',
  unit_price numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  taxable boolean not null default true,
  line_subtotal numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_items_name_valid check (char_length(item_name) between 1 and 200),
  constraint invoice_items_unit_valid check (char_length(unit) between 1 and 40),
  constraint invoice_items_amounts_valid check (
    quantity > 0 and unit_price >= 0 and discount_amount >= 0
    and line_subtotal >= 0 and line_total >= 0
  ),
  constraint invoice_items_discount_valid check (discount_amount <= round(quantity * unit_price, 2)),
  constraint invoice_items_text_lengths check (char_length(description) <= 8000)
);

create index invoices_project_date_idx
  on public.invoices(project_id, issue_date desc)
  where archived_at is null;
create index invoices_customer_date_idx
  on public.invoices(customer_id, issue_date desc)
  where archived_at is null;
create index invoices_status_date_idx
  on public.invoices(status, issue_date desc)
  where archived_at is null;
create index invoices_reference_idx
  on public.invoices(client_reference);
create index invoice_items_order_idx
  on public.invoice_items(invoice_id, sort_order, created_at);

create or replace function private.normalize_client_reference_location(source text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  candidate text;
  token text;
begin
  candidate := btrim(split_part(coalesce(source, ''), ',', 1));
  candidate := regexp_replace(candidate, '^Al\s+', '', 'i');
  select string_agg(initcap(part), '' order by ordinal)
  into token
  from unnest(regexp_split_to_array(candidate, '[^A-Za-z0-9]+')) with ordinality as word(part, ordinal)
  where part <> '';
  if token is null or token = '' then token := 'Location'; end if;
  return left(token, 48);
end;
$$;

create or replace function private.format_client_reference(
  reference_sequence bigint,
  location_token text,
  reference_date date
)
returns text
language sql
immutable
set search_path = ''
as $$
  select format(
    '%s-UP-%s-%s-%s',
    lpad(reference_sequence::text, 3, '0'),
    location_token,
    to_char(reference_date, 'DD'),
    to_char(reference_date, 'YYYY')
  )
$$;

create or replace function private.assign_project_client_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_quote public.quotations%rowtype;
begin
  if new.client_reference is not null then
    if (select auth.uid()) is not null then
      raise exception 'Client references are generated by the database';
    end if;
    return new;
  end if;

  if new.quotation_id is not null then
    select * into source_quote from public.quotations where id = new.quotation_id;
  end if;

  if source_quote.client_reference is not null then
    new.client_reference := source_quote.client_reference;
    new.client_reference_sequence := source_quote.client_reference_sequence;
    new.client_reference_location_token := source_quote.client_reference_location_token;
    new.client_reference_date := source_quote.client_reference_date;
  else
    new.client_reference_sequence := nextval('private.client_reference_seq');
    new.client_reference_location_token := private.normalize_client_reference_location(
      coalesce(new.site_address, source_quote.site_address_snapshot)
    );
    new.client_reference_date := coalesce(new.start_date, current_date);
    new.client_reference := private.format_client_reference(
      new.client_reference_sequence,
      new.client_reference_location_token,
      new.client_reference_date
    );
    if new.quotation_id is not null then
      update public.quotations
      set client_reference = new.client_reference,
          client_reference_sequence = new.client_reference_sequence,
          client_reference_location_token = new.client_reference_location_token,
          client_reference_date = new.client_reference_date
      where revision_group_id = (
        select revision_group_id from public.quotations where id = new.quotation_id
      );
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.inherit_quotation_client_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare parent public.quotations%rowtype;
begin
  if new.revised_from_id is not null and new.client_reference is null then
    select * into parent from public.quotations where id = new.revised_from_id;
    new.client_reference := parent.client_reference;
    new.client_reference_sequence := parent.client_reference_sequence;
    new.client_reference_location_token := parent.client_reference_location_token;
    new.client_reference_date := parent.client_reference_date;
  end if;
  return new;
end;
$$;

drop trigger if exists quotations_inherit_client_reference on public.quotations;
create trigger quotations_inherit_client_reference
before insert on public.quotations
for each row execute function private.inherit_quotation_client_reference();

drop trigger if exists projects_assign_client_reference on public.projects;
create trigger projects_assign_client_reference
before insert on public.projects
for each row execute function private.assign_project_client_reference();

-- Backfill existing UAT projects in a stable order. The sequence is never rewound.
do $$
declare
  row_data record;
  seq_value bigint;
  location_value text;
  date_value date;
  reference_value text;
begin
  for row_data in
    select id, quotation_id, site_address, start_date, created_at
    from public.projects
    where client_reference is null
    order by created_at, id
  loop
    seq_value := nextval('private.client_reference_seq');
    location_value := private.normalize_client_reference_location(row_data.site_address);
    date_value := coalesce(row_data.start_date, row_data.created_at::date);
    reference_value := private.format_client_reference(seq_value, location_value, date_value);
    update public.projects
    set client_reference = reference_value,
        client_reference_sequence = seq_value,
        client_reference_location_token = location_value,
        client_reference_date = date_value
    where id = row_data.id;
    update public.quotations
    set client_reference = reference_value,
        client_reference_sequence = seq_value,
        client_reference_location_token = location_value,
        client_reference_date = date_value
    where revision_group_id = (
      select revision_group_id from public.quotations where id = row_data.quotation_id
    );
  end loop;
end;
$$;

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

  sequence_value := coalesce(project_row.client_reference_sequence, nextval('private.client_reference_seq'));
  location_value := private.normalize_client_reference_location(
    coalesce(nullif(btrim(p_location_token), ''), project_row.client_reference_location_token, project_row.site_address)
  );
  date_value := coalesce(p_reference_date, project_row.client_reference_date, project_row.start_date, project_row.created_at::date);
  reference_value := private.format_client_reference(sequence_value, location_value, date_value);
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

create or replace function private.assign_invoice_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invoice_number is null or btrim(new.invoice_number) = '' or new.invoice_number = 'AUTO' then
    new.invoice_number := format(
      'UP-I-%s-%s',
      extract(year from coalesce(new.issue_date, current_date))::integer,
      lpad(nextval('private.invoice_number_seq')::text, 6, '0')
    );
  elsif (select auth.uid()) is not null then
    raise exception 'Invoice numbers are generated by the database';
  end if;
  return new;
end;
$$;

create or replace function private.calculate_invoice_item_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.line_subtotal := round(new.quantity * new.unit_price, 2);
  new.line_total := round(greatest(new.line_subtotal - new.discount_amount, 0), 2);
  return new;
end;
$$;

create or replace function private.calculate_invoice_totals()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  calculated_subtotal numeric(14,2);
  taxable_subtotal numeric(14,2);
  calculated_discount numeric(14,2);
  taxable_discount numeric(14,2);
begin
  select
    coalesce(round(sum(i.line_total), 2), 0),
    coalesce(round(sum(i.line_total) filter (where i.taxable), 2), 0)
  into calculated_subtotal, taxable_subtotal
  from public.invoice_items i where i.invoice_id = new.id;

  calculated_discount := case new.discount_type
    when 'percentage' then round(calculated_subtotal * new.discount_value / 100, 2)
    else round(new.discount_value, 2)
  end;
  calculated_discount := least(calculated_discount, calculated_subtotal);
  taxable_discount := case when calculated_subtotal > 0
    then round(calculated_discount * taxable_subtotal / calculated_subtotal, 2)
    else 0 end;

  new.subtotal := calculated_subtotal;
  new.discount_amount := calculated_discount;
  new.vat_amount := round(greatest(taxable_subtotal - taxable_discount, 0) * new.vat_rate / 100, 2);
  new.total := round(calculated_subtotal - calculated_discount + new.vat_amount, 2);
  return new;
end;
$$;

create or replace function private.refresh_invoice_after_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target_id uuid;
begin
  target_id := case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;
  update public.invoices set updated_at = now() where id = target_id;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.guard_invoice_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft'::public.invoice_status and (
    new.project_id is distinct from old.project_id
    or new.customer_id is distinct from old.customer_id
    or new.quotation_id is distinct from old.quotation_id
    or new.client_reference is distinct from old.client_reference
    or new.issue_date is distinct from old.issue_date
    or new.due_date is distinct from old.due_date
    or new.currency is distinct from old.currency
    or new.customer_name_snapshot is distinct from old.customer_name_snapshot
    or new.customer_company_snapshot is distinct from old.customer_company_snapshot
    or new.customer_phone_snapshot is distinct from old.customer_phone_snapshot
    or new.customer_email_snapshot is distinct from old.customer_email_snapshot
    or new.site_address_snapshot is distinct from old.site_address_snapshot
    or new.discount_type is distinct from old.discount_type
    or new.discount_value is distinct from old.discount_value
    or new.vat_rate is distinct from old.vat_rate
    or new.notes is distinct from old.notes
    or new.terms is distinct from old.terms
  ) then
    raise exception 'Issued invoice commercial data is immutable';
  end if;
  if old.status = 'cancelled'::public.invoice_status and new.status is distinct from old.status then
    raise exception 'Cancelled invoices cannot be reopened';
  end if;
  return new;
end;
$$;

create or replace function private.guard_invoice_item_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare target_id uuid; target_status public.invoice_status;
begin
  target_id := case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;
  select status into target_status from public.invoices where id = target_id;
  if target_status <> 'draft'::public.invoice_status then
    raise exception 'Issued invoice items are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists invoices_assign_identity on public.invoices;
create trigger invoices_assign_identity before insert on public.invoices
for each row execute function private.assign_invoice_identity();
drop trigger if exists a_invoices_guard on public.invoices;
create trigger a_invoices_guard before update on public.invoices
for each row execute function private.guard_invoice_change();
drop trigger if exists b_invoices_calculate_totals on public.invoices;
create trigger b_invoices_calculate_totals before insert or update on public.invoices
for each row execute function private.calculate_invoice_totals();
drop trigger if exists a_invoice_items_guard on public.invoice_items;
create trigger a_invoice_items_guard before insert or update or delete on public.invoice_items
for each row execute function private.guard_invoice_item_change();
drop trigger if exists b_invoice_items_calculate_total on public.invoice_items;
create trigger b_invoice_items_calculate_total before insert or update on public.invoice_items
for each row execute function private.calculate_invoice_item_total();
drop trigger if exists invoice_items_refresh_total on public.invoice_items;
create trigger invoice_items_refresh_total after insert or update or delete on public.invoice_items
for each row execute function private.refresh_invoice_after_item();
drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices
for each row execute function private.set_updated_at();
drop trigger if exists invoice_items_updated_at on public.invoice_items;
create trigger invoice_items_updated_at before update on public.invoice_items
for each row execute function private.set_updated_at();

create or replace function private.can_read_invoice(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(array['admin'::public.app_role, 'accounts'::public.app_role])
    and exists (select 1 from public.invoices i where i.id = target and i.archived_at is null)
$$;

create or replace function private.can_manage_invoice(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(array['admin'::public.app_role, 'accounts'::public.app_role])
    and exists (select 1 from public.invoices i where i.id = target and i.archived_at is null)
$$;

create or replace function public.create_invoice_from_project(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_row public.projects%rowtype;
  quote_row public.quotations%rowtype;
  customer_row public.customers%rowtype;
  invoice_id uuid;
begin
  if not private.has_role(array['admin'::public.app_role, 'accounts'::public.app_role]) then
    raise exception 'Invoice access is limited to Management and Accounts';
  end if;
  select * into project_row from public.projects
  where id = p_project_id and archived_at is null for update;
  if not found then raise exception 'Project was not found'; end if;
  if project_row.quotation_id is null then raise exception 'An approved quotation is required'; end if;
  select * into quote_row from public.quotations
  where id = project_row.quotation_id and status = 'approved'::public.quotation_status
    and is_current and archived_at is null;
  if not found then raise exception 'The project must have a current approved quotation'; end if;
  select * into customer_row from public.customers where id = project_row.customer_id;

  if project_row.client_reference is null then
    perform public.generate_project_client_reference(project_row.id, null, null);
    select * into project_row from public.projects where id = p_project_id;
  end if;

  insert into public.invoices (
    invoice_number, project_id, customer_id, quotation_id,
    client_reference, client_reference_sequence, client_reference_location_token, client_reference_date,
    quotation_number_snapshot, quotation_revision_snapshot,
    customer_name_snapshot, customer_company_snapshot, customer_phone_snapshot, customer_email_snapshot,
    site_address_snapshot, issue_date, due_date, currency,
    discount_type, discount_value, vat_rate, notes, terms, created_by
  ) values (
    'AUTO', project_row.id, project_row.customer_id, quote_row.id,
    project_row.client_reference, project_row.client_reference_sequence,
    project_row.client_reference_location_token, project_row.client_reference_date,
    quote_row.quotation_number, quote_row.revision_number,
    quote_row.customer_name_snapshot, quote_row.customer_company_snapshot,
    quote_row.customer_phone_snapshot, quote_row.customer_email_snapshot,
    coalesce(project_row.site_address, quote_row.site_address_snapshot),
    current_date, current_date + 14, quote_row.currency,
    quote_row.discount_type, quote_row.discount_value, quote_row.vat_rate,
    quote_row.customer_notes, quote_row.terms, (select auth.uid())
  ) returning id into invoice_id;

  insert into public.invoice_items (
    invoice_id, quotation_item_id, item_name, description, quantity, unit,
    unit_price, discount_amount, taxable, sort_order, created_by
  )
  select invoice_id, qi.id, qi.item_name, qi.description, qi.quantity, qi.unit,
    qi.unit_price, qi.discount_amount, qi.taxable, qi.sort_order, (select auth.uid())
  from public.quotation_items qi
  where qi.quotation_id = quote_row.id
  order by qi.sort_order, qi.created_at;

  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values (
    (select auth.uid()), 'invoice.created', 'invoices', invoice_id,
    jsonb_build_object('project_id', project_row.id, 'quotation_id', quote_row.id, 'reference', project_row.client_reference)
  );
  return invoice_id;
end;
$$;

create or replace function public.save_invoice_draft(p_invoice_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice_row public.invoices%rowtype;
  item_data jsonb;
begin
  if not private.has_role(array['admin'::public.app_role, 'accounts'::public.app_role]) then
    raise exception 'Invoice access is limited to Management and Accounts';
  end if;
  select * into invoice_row from public.invoices
  where id = p_invoice_id and archived_at is null for update;
  if not found then raise exception 'Invoice was not found'; end if;
  if invoice_row.status <> 'draft'::public.invoice_status then
    raise exception 'Only draft invoices can be edited';
  end if;

  update public.invoices set
    issue_date = (p_payload ->> 'issue_date')::date,
    due_date = nullif(p_payload ->> 'due_date', '')::date,
    discount_type = p_payload ->> 'discount_type',
    discount_value = (p_payload ->> 'discount_value')::numeric,
    vat_rate = (p_payload ->> 'vat_rate')::numeric,
    notes = nullif(btrim(p_payload ->> 'notes'), ''),
    terms = nullif(btrim(p_payload ->> 'terms'), '')
  where id = p_invoice_id;

  delete from public.invoice_items where invoice_id = p_invoice_id;
  for item_data in select value from jsonb_array_elements(p_payload -> 'items')
  loop
    insert into public.invoice_items (
      invoice_id, item_name, description, quantity, unit, unit_price,
      discount_amount, taxable, sort_order, created_by
    ) values (
      p_invoice_id,
      btrim(item_data ->> 'item_name'),
      coalesce(item_data ->> 'description', ''),
      (item_data ->> 'quantity')::numeric,
      btrim(item_data ->> 'unit'),
      (item_data ->> 'unit_price')::numeric,
      coalesce((item_data ->> 'discount_amount')::numeric, 0),
      coalesce((item_data ->> 'taxable')::boolean, true),
      coalesce((item_data ->> 'sort_order')::integer, 0),
      (select auth.uid())
    );
  end loop;
  if not exists (select 1 from public.invoice_items where invoice_id = p_invoice_id) then
    raise exception 'An invoice requires at least one line item';
  end if;

  update public.invoices set updated_at = now() where id = p_invoice_id;
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'invoice.updated', 'invoices', p_invoice_id, jsonb_build_object('item_count', jsonb_array_length(p_payload -> 'items')));
  return p_invoice_id;
end;
$$;

create or replace function public.transition_invoice(
  p_invoice_id uuid,
  p_action text,
  p_reason text default null
)
returns public.invoice_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice_row public.invoices%rowtype;
  next_status public.invoice_status;
begin
  if not private.has_role(array['admin'::public.app_role, 'accounts'::public.app_role]) then
    raise exception 'Invoice access is limited to Management and Accounts';
  end if;
  select * into invoice_row from public.invoices
  where id = p_invoice_id and archived_at is null for update;
  if not found then raise exception 'Invoice was not found'; end if;

  if p_action = 'issue' then
    if invoice_row.status <> 'draft'::public.invoice_status then raise exception 'Only draft invoices can be issued'; end if;
    if invoice_row.total <= 0 then raise exception 'Invoice total must be greater than zero'; end if;
    if not exists (select 1 from public.invoice_items where invoice_id = p_invoice_id) then raise exception 'Invoice requires at least one item'; end if;
    next_status := 'issued'::public.invoice_status;
    update public.invoices set status = next_status, issued_at = now(), issued_by = (select auth.uid()) where id = p_invoice_id;
  elsif p_action = 'cancel' then
    if invoice_row.status = 'cancelled'::public.invoice_status then raise exception 'Invoice is already cancelled'; end if;
    if btrim(coalesce(p_reason, '')) = '' then raise exception 'Cancellation reason is required'; end if;
    next_status := 'cancelled'::public.invoice_status;
    update public.invoices set status = next_status, cancelled_at = now(), cancelled_by = (select auth.uid()), cancellation_reason = left(btrim(p_reason), 2000) where id = p_invoice_id;
  else
    raise exception 'Unsupported invoice action';
  end if;

  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values (
    (select auth.uid()), 'invoice.' || p_action || case when p_action = 'issue' then 'd' else 'led' end,
    'invoices', p_invoice_id, jsonb_build_object('status', next_status, 'reason', nullif(btrim(coalesce(p_reason, '')), ''))
  );
  return next_status;
end;
$$;

create or replace function public.record_invoice_pdf_generation(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role(array['admin'::public.app_role, 'accounts'::public.app_role]) then
    raise exception 'Invoice access is limited to Management and Accounts';
  end if;
  update public.invoices set pdf_generated_at = now()
  where id = p_invoice_id and archived_at is null;
  if not found then raise exception 'Invoice was not found'; end if;
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'invoice.pdf_generated', 'invoices', p_invoice_id, '{}'::jsonb);
end;
$$;

create or replace function private.sync_project_invoice_payment_status(target_project uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice_row public.invoices%rowtype;
  invoice_count integer;
  received_total numeric(14,2);
  next_status public.invoice_status;
begin
  select count(*) into invoice_count from public.invoices
  where project_id = target_project and status in ('issued', 'partially_paid', 'paid') and archived_at is null;
  if invoice_count <> 1 then return; end if;
  select * into invoice_row from public.invoices
  where project_id = target_project and status in ('issued', 'partially_paid', 'paid') and archived_at is null
  for update;
  select coalesce(sum(amount_received), 0) into received_total
  from public.payments
  where project_id = target_project and archived_at is null and voided_at is null;
  next_status := case
    when received_total >= invoice_row.total and invoice_row.total > 0 then 'paid'::public.invoice_status
    when received_total > 0 then 'partially_paid'::public.invoice_status
    else 'issued'::public.invoice_status
  end;
  if next_status is distinct from invoice_row.status then
    update public.invoices set status = next_status where id = invoice_row.id;
    insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
    values (
      (select auth.uid()), 'invoice.payment_status_updated', 'invoices', invoice_row.id,
      jsonb_build_object('status', next_status, 'received', received_total, 'total', invoice_row.total)
    );
  end if;
end;
$$;

create or replace function private.sync_invoice_status_after_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_project_invoice_payment_status(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists payments_sync_invoice_status on public.payments;
create trigger payments_sync_invoice_status
after insert or update of amount_received, voided_at, archived_at or delete on public.payments
for each row execute function private.sync_invoice_status_after_payment();

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy "finance staff reads invoices" on public.invoices
for select to authenticated using (private.can_read_invoice(id));
create policy "finance staff reads invoice items" on public.invoice_items
for select to authenticated using (private.can_read_invoice(invoice_id));

drop policy if exists "active staff reads scoped activity logs" on public.activity_logs;
create policy "active staff reads scoped activity logs" on public.activity_logs
for select to authenticated
using (
  private.current_user_role() is not null
  and case
    when entity_type = 'quotations' and entity_id is not null then private.can_read_quotation(entity_id)
    when entity_type = 'projects' and entity_id is not null then private.can_access_project(entity_id)
    when entity_type = 'invoices' and entity_id is not null then private.can_read_invoice(entity_id)
    else true
  end
);

revoke all on table public.invoices from public, anon, authenticated;
revoke all on table public.invoice_items from public, anon, authenticated;
grant select on table public.invoices, public.invoice_items to authenticated;

revoke all on sequence private.client_reference_seq from public, anon, authenticated;
revoke all on sequence private.invoice_number_seq from public, anon, authenticated;
revoke all on function private.normalize_client_reference_location(text) from public, anon, authenticated;
revoke all on function private.format_client_reference(bigint, text, date) from public, anon, authenticated;
revoke all on function private.assign_project_client_reference() from public, anon, authenticated;
revoke all on function private.inherit_quotation_client_reference() from public, anon, authenticated;
revoke all on function private.assign_invoice_identity() from public, anon, authenticated;
revoke all on function private.calculate_invoice_item_total() from public, anon, authenticated;
revoke all on function private.calculate_invoice_totals() from public, anon, authenticated;
revoke all on function private.refresh_invoice_after_item() from public, anon, authenticated;
revoke all on function private.guard_invoice_change() from public, anon, authenticated;
revoke all on function private.guard_invoice_item_change() from public, anon, authenticated;
revoke all on function private.can_read_invoice(uuid) from public, anon;
revoke all on function private.can_manage_invoice(uuid) from public, anon;
revoke all on function private.sync_project_invoice_payment_status(uuid) from public, anon, authenticated;
revoke all on function private.sync_invoice_status_after_payment() from public, anon, authenticated;
grant execute on function private.can_read_invoice(uuid), private.can_manage_invoice(uuid) to authenticated;

revoke all on function public.generate_project_client_reference(uuid, text, date) from public, anon;
revoke all on function public.create_invoice_from_project(uuid) from public, anon;
revoke all on function public.save_invoice_draft(uuid, jsonb) from public, anon;
revoke all on function public.transition_invoice(uuid, text, text) from public, anon;
revoke all on function public.record_invoice_pdf_generation(uuid) from public, anon;
grant execute on function public.generate_project_client_reference(uuid, text, date) to authenticated;
grant execute on function public.create_invoice_from_project(uuid) to authenticated;
grant execute on function public.save_invoice_draft(uuid, jsonb) to authenticated;
grant execute on function public.transition_invoice(uuid, text, text) to authenticated;
grant execute on function public.record_invoice_pdf_generation(uuid) to authenticated;

comment on column public.projects.client_reference is 'Shared client/job reference: sequence-UP-location-day-year.';
comment on column public.invoices.client_reference is 'Immutable invoice snapshot of the shared client/job reference.';
comment on table public.invoices is 'Lightweight commercial invoice snapshots. Payments remain authoritative for money received.';
