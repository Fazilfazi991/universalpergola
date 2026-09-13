-- Phase 2D: structured quotation lifecycle, immutable revisions and project handoff.
-- Existing Phase 1 tables are extended in place; historical migrations remain untouched.

alter type public.quotation_status add value if not exists 'ready' after 'draft';
alter type public.quotation_status add value if not exists 'cancelled' after 'expired';

create sequence if not exists private.quotation_number_seq;
create sequence if not exists private.project_number_seq;

alter table public.quotations
  add column owner_id uuid references public.profiles(id) on delete set null,
  add column revision_group_id uuid references public.quotations(id) on delete restrict,
  add column revision_number integer not null default 0,
  add column is_current boolean not null default true,
  add column issue_date date not null default current_date,
  add column customer_name_snapshot text,
  add column customer_company_snapshot text,
  add column customer_phone_snapshot text,
  add column customer_email_snapshot text,
  add column site_address_snapshot text,
  add column introduction text,
  add column internal_notes text,
  add column customer_notes text,
  add column discount_type text not null default 'fixed',
  add column discount_value numeric(14,4) not null default 0,
  add column ready_at timestamptz,
  add column sent_by uuid references public.profiles(id) on delete set null,
  add column approved_by uuid references public.profiles(id) on delete set null,
  add column rejected_at timestamptz,
  add column rejected_by uuid references public.profiles(id) on delete set null,
  add column cancelled_at timestamptz,
  add column decision_note text,
  add column pdf_generated_at timestamptz;

update public.quotations q
set owner_id = coalesce(q.owner_id, q.created_by),
    revision_group_id = q.id,
    issue_date = coalesce(q.issue_date, q.created_at::date),
    customer_name_snapshot = coalesce(q.customer_name_snapshot, c.name),
    customer_company_snapshot = coalesce(q.customer_company_snapshot, c.company_name),
    customer_phone_snapshot = coalesce(q.customer_phone_snapshot, c.phone),
    customer_email_snapshot = coalesce(q.customer_email_snapshot, c.email),
    site_address_snapshot = coalesce(
      q.site_address_snapshot,
      (select sv.site_address from public.site_visits sv where sv.id = q.site_visit_id),
      c.address
    ),
    customer_notes = coalesce(q.customer_notes, q.notes)
from public.customers c
where c.id = q.customer_id;

alter table public.quotations
  alter column customer_name_snapshot set not null,
  add constraint quotations_revision_number_valid check (revision_number between 0 and 999),
  add constraint quotations_discount_type_valid check (discount_type in ('fixed', 'percentage')),
  add constraint quotations_discount_value_valid check (
    discount_value >= 0 and (discount_type <> 'percentage' or discount_value <= 100)
  ),
  add constraint quotations_currency_valid check (currency ~ '^[A-Z]{3}$'),
  add constraint quotations_dates_valid check (validity_date is null or validity_date >= issue_date),
  add constraint quotations_snapshot_lengths check (
    char_length(customer_name_snapshot) between 1 and 200
    and char_length(coalesce(customer_company_snapshot, '')) <= 200
    and char_length(coalesce(customer_phone_snapshot, '')) <= 50
    and char_length(coalesce(customer_email_snapshot, '')) <= 320
    and char_length(coalesce(site_address_snapshot, '')) <= 2000
    and char_length(coalesce(introduction, '')) <= 4000
    and char_length(coalesce(internal_notes, '')) <= 8000
    and char_length(coalesce(customer_notes, '')) <= 8000
    and char_length(coalesce(terms, '')) <= 12000
    and char_length(coalesce(decision_note, '')) <= 2000
  );

alter table public.quotation_items
  add column item_name text,
  add column unit text not null default 'item',
  add column width numeric(12,3),
  add column height numeric(12,3),
  add column length numeric(12,3),
  add column taxable boolean not null default true,
  add column source_measurement_id uuid references public.site_visit_measurements(id) on delete set null;

update public.quotation_items
set item_name = coalesce(nullif(product_name_snapshot, ''), nullif(description, ''), 'Quotation item');

alter table public.quotation_items
  alter column item_name set not null,
  add constraint quotation_items_name_valid check (char_length(item_name) between 1 and 200),
  add constraint quotation_items_unit_valid check (char_length(unit) between 1 and 40),
  add constraint quotation_items_dimensions_valid check (
    (width is null or width > 0) and
    (height is null or height > 0) and
    (length is null or length > 0)
  ),
  add constraint quotation_items_discount_not_above_gross check (discount_amount <= round(quantity * unit_price, 2)),
  add constraint quotation_items_text_lengths check (
    char_length(description) <= 8000
    and char_length(coalesce(product_name_snapshot, '')) <= 200
    and char_length(coalesce(product_code_snapshot, '')) <= 100
    and char_length(coalesce(dimensions_details, '')) <= 2000
  );

alter table public.projects
  add column enquiry_id uuid references public.enquiries(id) on delete set null,
  add column source_quotation_number text,
  add column source_quotation_revision integer;

create unique index quotations_one_current_revision_idx
  on public.quotations(revision_group_id) where is_current and archived_at is null;
create unique index quotations_revision_number_idx
  on public.quotations(revision_group_id, revision_number);
create index quotations_owner_status_idx
  on public.quotations(owner_id, status, updated_at desc) where archived_at is null;
create index quotation_items_order_idx on public.quotation_items(quotation_id, sort_order, created_at);
create unique index projects_one_quotation_conversion_idx
  on public.projects(quotation_id) where quotation_id is not null;

select setval(
  'private.quotation_number_seq',
  greatest(coalesce((select max((regexp_match(quotation_number, '(\\d{6})(?:-R\\d+)?$'))[1]::bigint) from public.quotations), 0), 1),
  exists (select 1 from public.quotations)
);

select setval(
  'private.project_number_seq',
  greatest(coalesce((select max((regexp_match(project_number, '(\\d{6})$'))[1]::bigint) from public.projects), 0), 1),
  exists (select 1 from public.projects)
);

create or replace function private.assign_quotation_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent public.quotations%rowtype;
  base_number text;
begin
  if new.revised_from_id is null then
    if new.quotation_number is null or btrim(new.quotation_number) = '' or new.quotation_number = 'AUTO' then
      new.quotation_number := format(
        'UP-Q-%s-%s',
        extract(year from coalesce(new.issue_date, current_date))::integer,
        lpad(nextval('private.quotation_number_seq')::text, 6, '0')
      );
    elsif (select auth.uid()) is not null then
      raise exception 'Quotation numbers are generated by the database';
    end if;
    new.revision_group_id := new.id;
    new.revision_number := 0;
  else
    select * into parent from public.quotations where id = new.revised_from_id for update;
    if not found then raise exception 'Revision parent was not found'; end if;
    base_number := regexp_replace(parent.quotation_number, '-R[0-9]+$', '');
    new.revision_group_id := parent.revision_group_id;
    new.revision_number := parent.revision_number + 1;
    new.quotation_number := format('%s-R%s', base_number, lpad(new.revision_number::text, 2, '0'));
  end if;
  return new;
end;
$$;

create or replace function private.assign_project_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.project_number is null or btrim(new.project_number) = '' or new.project_number = 'AUTO' then
    new.project_number := format(
      'UP-P-%s-%s', extract(year from current_date)::integer,
      lpad(nextval('private.project_number_seq')::text, 6, '0')
    );
  elsif (select auth.uid()) is not null then
    raise exception 'Project numbers are generated by the database';
  end if;
  return new;
end;
$$;

create or replace function private.calculate_quotation_totals()
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
  from public.quotation_items i
  where i.quotation_id = new.id;

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

create or replace function private.calculate_quotation_item_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.discount_amount > round(new.quantity * new.unit_price, 2) then
    raise exception 'Line discount cannot exceed the line gross amount';
  end if;
  new.line_total := round((new.quantity * new.unit_price) - new.discount_amount, 2);
  return new;
end;
$$;

create or replace function private.refresh_quotation_after_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target_id uuid;
begin
  target_id := case when tg_op = 'DELETE' then old.quotation_id else new.quotation_id end;
  update public.quotations set subtotal = subtotal where id = target_id;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.guard_quotation_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare role_name public.app_role;
begin
  if (select auth.uid()) is null then return new; end if;
  role_name := private.current_user_role();

  if role_name = 'sales'::public.app_role and new.owner_id is distinct from old.owner_id then
    raise exception 'Sales users cannot reassign quotations';
  end if;

  if old.status::text in ('sent', 'revised', 'approved', 'rejected', 'expired', 'cancelled') and (
    new.customer_id is distinct from old.customer_id or
    new.enquiry_id is distinct from old.enquiry_id or
    new.site_visit_id is distinct from old.site_visit_id or
    new.currency is distinct from old.currency or
    new.issue_date is distinct from old.issue_date or
    new.validity_date is distinct from old.validity_date or
    new.customer_name_snapshot is distinct from old.customer_name_snapshot or
    new.customer_company_snapshot is distinct from old.customer_company_snapshot or
    new.customer_phone_snapshot is distinct from old.customer_phone_snapshot or
    new.customer_email_snapshot is distinct from old.customer_email_snapshot or
    new.site_address_snapshot is distinct from old.site_address_snapshot or
    new.introduction is distinct from old.introduction or
    new.customer_notes is distinct from old.customer_notes or
    new.terms is distinct from old.terms or
    new.discount_type is distinct from old.discount_type or
    new.discount_value is distinct from old.discount_value or
    new.vat_rate is distinct from old.vat_rate
  ) then
    raise exception 'Issued quotation commercial data is immutable; create a revision';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status::text = 'draft' and new.status::text in ('ready', 'cancelled')) or
      (old.status::text = 'ready' and new.status::text in ('draft', 'sent', 'cancelled')) or
      (old.status::text = 'sent' and new.status::text in ('revised', 'approved', 'rejected', 'expired'))
    ) then raise exception 'Invalid quotation status transition'; end if;

    if new.status::text in ('approved', 'rejected') and role_name <> 'admin'::public.app_role then
      raise exception 'Only Management can approve or reject quotations';
    end if;
    if new.status::text = 'approved' and (not old.is_current or old.validity_date < current_date) then
      raise exception 'Only a current, unexpired quotation can be approved';
    end if;

    if new.status::text = 'ready' then new.ready_at := now(); end if;
    if new.status::text = 'sent' then new.sent_at := now(); new.sent_by := (select auth.uid()); end if;
    if new.status::text = 'approved' then new.approved_at := now(); new.approved_by := (select auth.uid()); end if;
    if new.status::text = 'rejected' then new.rejected_at := now(); new.rejected_by := (select auth.uid()); end if;
    if new.status::text = 'cancelled' then new.cancelled_at := now(); end if;
  end if;
  return new;
end;
$$;

create or replace function private.guard_quotation_item_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare target_id uuid; quote_status text;
begin
  target_id := case when tg_op = 'DELETE' then old.quotation_id else new.quotation_id end;
  select q.status::text into quote_status from public.quotations q where q.id = target_id;
  if quote_status not in ('draft', 'ready') then
    raise exception 'Issued quotation items are immutable; create a revision';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.log_quotation_item_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare row_data jsonb;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    'quotation.item_' || lower(tg_op),
    'quotations',
    (row_data ->> 'quotation_id')::uuid,
    jsonb_build_object('item_id', row_data ->> 'id', 'item_name', row_data ->> 'item_name')
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.log_quotation_pdf_generation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'quotation.pdf_generated', 'quotations', new.id, jsonb_build_object('revision', new.revision_number));
  return new;
end;
$$;

create or replace function private.guard_project_quotation_handoff()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.quotation_id is not null and (select auth.uid()) is not null then
    if not private.has_role(array['admin'::public.app_role]) then
      raise exception 'Only Management can convert quotations to projects';
    end if;
    if not exists (
      select 1 from public.quotations q
      where q.id = new.quotation_id and q.status::text = 'approved' and q.is_current and q.archived_at is null
    ) then raise exception 'Only the current approved quotation can be converted'; end if;
  end if;
  if tg_op = 'UPDATE' and new.quotation_id is distinct from old.quotation_id then
    raise exception 'A project quotation link is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists quotations_assign_identity on public.quotations;
create trigger quotations_assign_identity before insert on public.quotations
for each row execute function private.assign_quotation_identity();
drop trigger if exists a_quotations_guard on public.quotations;
create trigger a_quotations_guard before update on public.quotations
for each row execute function private.guard_quotation_change();
drop trigger if exists b_quotations_calculate_totals on public.quotations;
create trigger b_quotations_calculate_totals before insert or update on public.quotations
for each row execute function private.calculate_quotation_totals();
drop trigger if exists a_quotation_items_guard on public.quotation_items;
create trigger a_quotation_items_guard before insert or update or delete on public.quotation_items
for each row execute function private.guard_quotation_item_change();
drop trigger if exists b_quotation_items_calculate_total on public.quotation_items;
create trigger b_quotation_items_calculate_total before insert or update on public.quotation_items
for each row execute function private.calculate_quotation_item_total();
drop trigger if exists quotation_items_refresh_total on public.quotation_items;
create trigger quotation_items_refresh_total after insert or update or delete on public.quotation_items
for each row execute function private.refresh_quotation_after_item();
drop trigger if exists quotation_items_activity on public.quotation_items;
create trigger quotation_items_activity after insert or update or delete on public.quotation_items
for each row execute function private.log_quotation_item_change();
drop trigger if exists quotation_pdf_activity on public.quotations;
create trigger quotation_pdf_activity after update of pdf_generated_at on public.quotations
for each row when (new.pdf_generated_at is distinct from old.pdf_generated_at)
execute function private.log_quotation_pdf_generation();
drop trigger if exists projects_assign_identity on public.projects;
create trigger projects_assign_identity before insert on public.projects
for each row execute function private.assign_project_identity();
drop trigger if exists a_projects_quotation_guard on public.projects;
create trigger a_projects_quotation_guard before insert or update on public.projects
for each row execute function private.guard_project_quotation_handoff();

create or replace function private.can_read_quotation(target uuid)
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
      select 1 from public.quotations q
      where q.id = target and (q.owner_id = (select auth.uid()) or q.created_by = (select auth.uid()))
    )
    when 'site_team' then exists (
      select 1 from public.quotations q
      join public.site_visits v on v.id = q.site_visit_id
      where q.id = target and v.assigned_to = (select auth.uid())
    )
    else false end
$$;

create or replace function private.can_manage_quotation(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case private.current_user_role()
    when 'admin' then true
    when 'sales' then exists (
      select 1 from public.quotations q where q.id = target and q.owner_id = (select auth.uid())
    )
    else false end
$$;

create or replace function public.create_quotation_revision(p_quotation_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare source_quote public.quotations%rowtype; new_id uuid;
begin
  select * into source_quote from public.quotations
  where id = p_quotation_id and archived_at is null for update;
  if not found or not private.can_manage_quotation(p_quotation_id) then
    raise exception 'Quotation is not available for revision';
  end if;
  if source_quote.status::text <> 'sent' or not source_quote.is_current then
    raise exception 'Only the current sent quotation can be revised';
  end if;

  update public.quotations set status = 'revised', is_current = false where id = source_quote.id;

  insert into public.quotations (
    quotation_number, customer_id, enquiry_id, site_visit_id, revised_from_id,
    status, currency, validity_date, terms, owner_id, revision_group_id,
    issue_date, customer_name_snapshot, customer_company_snapshot,
    customer_phone_snapshot, customer_email_snapshot, site_address_snapshot,
    introduction, internal_notes, customer_notes, discount_type, discount_value,
    vat_rate, created_by
  ) values (
    'AUTO', source_quote.customer_id, source_quote.enquiry_id, source_quote.site_visit_id, source_quote.id,
    'draft', source_quote.currency, source_quote.validity_date, source_quote.terms, source_quote.owner_id, source_quote.revision_group_id,
    current_date, source_quote.customer_name_snapshot, source_quote.customer_company_snapshot,
    source_quote.customer_phone_snapshot, source_quote.customer_email_snapshot, source_quote.site_address_snapshot,
    source_quote.introduction, source_quote.internal_notes, source_quote.customer_notes, source_quote.discount_type, source_quote.discount_value,
    source_quote.vat_rate, (select auth.uid())
  ) returning id into new_id;

  insert into public.quotation_items (
    quotation_id, product_id, product_name_snapshot, product_code_snapshot,
    item_name, description, quantity, unit, width, height, length,
    dimensions_details, unit_price, discount_amount, taxable, sort_order,
    source_measurement_id, created_by
  )
  select new_id, product_id, product_name_snapshot, product_code_snapshot,
    item_name, description, quantity, unit, width, height, length,
    dimensions_details, unit_price, discount_amount, taxable, sort_order,
    source_measurement_id, (select auth.uid())
  from public.quotation_items where quotation_id = source_quote.id order by sort_order, created_at;

  return new_id;
end;
$$;

create or replace function public.convert_approved_quotation_to_project(p_quotation_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare source_quote public.quotations%rowtype; existing_project uuid; new_id uuid;
begin
  if not private.has_role(array['admin'::public.app_role]) then
    raise exception 'Only Management can convert quotations to projects';
  end if;
  select id into existing_project from public.projects where quotation_id = p_quotation_id;
  if existing_project is not null then raise exception 'This quotation has already been converted'; end if;

  select * into source_quote from public.quotations
  where id = p_quotation_id and status::text = 'approved' and is_current and archived_at is null
  for update;
  if not found then raise exception 'Only the current approved quotation can be converted'; end if;

  insert into public.projects (
    project_number, customer_id, quotation_id, enquiry_id, site_visit_id,
    site_address, project_value, currency, assigned_salesperson, status,
    source_quotation_number, source_quotation_revision, notes, created_by
  ) values (
    'AUTO', source_quote.customer_id, source_quote.id, source_quote.enquiry_id, source_quote.site_visit_id,
    source_quote.site_address_snapshot, source_quote.total, source_quote.currency, source_quote.owner_id, 'planned',
    source_quote.quotation_number, source_quote.revision_number,
    'Created from approved quotation ' || source_quote.quotation_number,
    (select auth.uid())
  ) returning id into new_id;
  return new_id;
end;
$$;

revoke all on function private.assign_quotation_identity() from public, anon, authenticated;
revoke all on function private.assign_project_identity() from public, anon, authenticated;
revoke all on function private.calculate_quotation_totals() from public, anon, authenticated;
revoke all on function private.calculate_quotation_item_total() from public, anon, authenticated;
revoke all on function private.refresh_quotation_after_item() from public, anon, authenticated;
revoke all on function private.guard_quotation_change() from public, anon, authenticated;
revoke all on function private.guard_quotation_item_change() from public, anon, authenticated;
revoke all on function private.log_quotation_item_change() from public, anon, authenticated;
revoke all on function private.log_quotation_pdf_generation() from public, anon, authenticated;
revoke all on function private.guard_project_quotation_handoff() from public, anon, authenticated;
revoke all on function private.can_read_quotation(uuid) from public, anon;
revoke all on function private.can_manage_quotation(uuid) from public, anon;
grant execute on function private.can_read_quotation(uuid), private.can_manage_quotation(uuid) to authenticated;

revoke all on function public.create_quotation_revision(uuid) from public, anon;
revoke all on function public.convert_approved_quotation_to_project(uuid) from public, anon;
grant execute on function public.create_quotation_revision(uuid) to authenticated;
grant execute on function public.convert_approved_quotation_to_project(uuid) to authenticated;

drop policy if exists "commercial team reads quotations" on public.quotations;
drop policy if exists "sales manages quotations" on public.quotations;
drop policy if exists "commercial team reads quotation items" on public.quotation_items;
drop policy if exists "sales manages quotation items" on public.quotation_items;

create policy "authorized staff reads quotations" on public.quotations for select to authenticated
using (private.can_read_quotation(id));
create policy "commercial staff creates quotations" on public.quotations for insert to authenticated
with check (
  created_by = (select auth.uid()) and (
    private.has_role(array['admin'::public.app_role]) or
    (private.has_role(array['sales'::public.app_role]) and owner_id = (select auth.uid()))
  )
);
create policy "authorized owners update quotations" on public.quotations for update to authenticated
using (private.can_manage_quotation(id))
with check (private.can_manage_quotation(id));
create policy "management deletes draft quotations" on public.quotations for delete to authenticated
using (private.has_role(array['admin'::public.app_role]) and status::text = 'draft');

create policy "commercial staff reads quotation items" on public.quotation_items for select to authenticated
using (
  private.has_role(array['admin'::public.app_role, 'accounts'::public.app_role]) or
  (private.has_role(array['sales'::public.app_role]) and private.can_read_quotation(quotation_id))
);
create policy "authorized owners create quotation items" on public.quotation_items for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_manage_quotation(quotation_id));
create policy "authorized owners update quotation items" on public.quotation_items for update to authenticated
using (private.can_manage_quotation(quotation_id))
with check (private.can_manage_quotation(quotation_id));
create policy "authorized owners delete quotation items" on public.quotation_items for delete to authenticated
using (private.can_manage_quotation(quotation_id));

comment on column public.quotations.discount_value is 'Fixed AED amount or percentage input. Database triggers calculate discount_amount and VAT authoritatively.';
comment on column public.quotations.is_current is 'Exactly one non-archived revision in each revision group is current.';
comment on column public.quotations.pdf_generated_at is 'Audit timestamp for deterministic on-demand PDF generation; PDFs are not stored.';
