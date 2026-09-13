-- Atomic draft persistence keeps header, commercial snapshots and items consistent.

create or replace function public.save_quotation_draft(p_quotation_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid;
  user_id uuid := (select auth.uid());
  role_name public.app_role := private.current_user_role();
  customer_row public.customers%rowtype;
  quote_row public.quotations%rowtype;
  owner_value uuid;
  enquiry_value uuid := nullif(p_payload ->> 'enquiry_id', '')::uuid;
  visit_value uuid := nullif(p_payload ->> 'site_visit_id', '')::uuid;
  item_data jsonb;
  product_value uuid;
  measurement_value uuid;
  product_name text;
  product_code text;
begin
  if user_id is null or role_name not in ('admin'::public.app_role, 'sales'::public.app_role) then
    raise exception 'Only Management or Sales can save quotations';
  end if;
  if jsonb_typeof(p_payload -> 'items') <> 'array' or jsonb_array_length(p_payload -> 'items') < 1 then
    raise exception 'A quotation requires at least one line item';
  end if;

  select * into customer_row from public.customers
  where id = (p_payload ->> 'customer_id')::uuid and archived_at is null;
  if not found then raise exception 'Customer was not found'; end if;

  if enquiry_value is not null and not exists (
    select 1 from public.enquiries e where e.id = enquiry_value and e.customer_id = customer_row.id and e.archived_at is null
  ) then raise exception 'The enquiry does not belong to this customer'; end if;

  if visit_value is not null and not exists (
    select 1 from public.site_visits v
    where v.id = visit_value and v.customer_id = customer_row.id and v.archived_at is null
      and (enquiry_value is null or v.enquiry_id = enquiry_value)
  ) then raise exception 'The site visit does not match the selected customer and enquiry'; end if;

  owner_value := case when role_name = 'sales'::public.app_role then user_id
    else coalesce(nullif(p_payload ->> 'owner_id', '')::uuid, user_id) end;
  if not exists (
    select 1 from public.profiles p where p.id = owner_value and p.status = 'active'::public.profile_status
      and p.role in ('admin'::public.app_role, 'sales'::public.app_role)
  ) then raise exception 'Quotation owner must be active Management or Sales staff'; end if;

  if p_quotation_id is null then
    insert into public.quotations (
      quotation_number, customer_id, enquiry_id, site_visit_id, status, currency,
      validity_date, terms, owner_id, issue_date, customer_name_snapshot,
      customer_company_snapshot, customer_phone_snapshot, customer_email_snapshot,
      site_address_snapshot, introduction, internal_notes, customer_notes,
      discount_type, discount_value, vat_rate, created_by
    ) values (
      'AUTO', customer_row.id, enquiry_value, visit_value, 'draft', p_payload ->> 'currency',
      nullif(p_payload ->> 'validity_date', '')::date, nullif(p_payload ->> 'terms', ''), owner_value,
      (p_payload ->> 'issue_date')::date,
      coalesce(nullif(p_payload ->> 'customer_name_snapshot', ''), customer_row.name),
      coalesce(nullif(p_payload ->> 'customer_company_snapshot', ''), customer_row.company_name),
      coalesce(nullif(p_payload ->> 'customer_phone_snapshot', ''), customer_row.phone),
      coalesce(nullif(p_payload ->> 'customer_email_snapshot', ''), customer_row.email),
      coalesce(nullif(p_payload ->> 'site_address_snapshot', ''), customer_row.address),
      nullif(p_payload ->> 'introduction', ''), nullif(p_payload ->> 'internal_notes', ''),
      nullif(p_payload ->> 'customer_notes', ''), p_payload ->> 'discount_type',
      (p_payload ->> 'discount_value')::numeric, (p_payload ->> 'vat_rate')::numeric, user_id
    ) returning id into target_id;
  else
    select * into quote_row from public.quotations where id = p_quotation_id and archived_at is null for update;
    if not found or not private.can_manage_quotation(p_quotation_id) then
      raise exception 'Quotation is not available for editing';
    end if;
    if quote_row.status::text not in ('draft', 'ready') then
      raise exception 'Issued quotations must be revised instead of edited';
    end if;
    target_id := quote_row.id;
    update public.quotations set
      customer_id = customer_row.id,
      enquiry_id = enquiry_value,
      site_visit_id = visit_value,
      currency = p_payload ->> 'currency',
      validity_date = nullif(p_payload ->> 'validity_date', '')::date,
      terms = nullif(p_payload ->> 'terms', ''),
      owner_id = owner_value,
      issue_date = (p_payload ->> 'issue_date')::date,
      customer_name_snapshot = coalesce(nullif(p_payload ->> 'customer_name_snapshot', ''), customer_row.name),
      customer_company_snapshot = coalesce(nullif(p_payload ->> 'customer_company_snapshot', ''), customer_row.company_name),
      customer_phone_snapshot = coalesce(nullif(p_payload ->> 'customer_phone_snapshot', ''), customer_row.phone),
      customer_email_snapshot = coalesce(nullif(p_payload ->> 'customer_email_snapshot', ''), customer_row.email),
      site_address_snapshot = coalesce(nullif(p_payload ->> 'site_address_snapshot', ''), customer_row.address),
      introduction = nullif(p_payload ->> 'introduction', ''),
      internal_notes = nullif(p_payload ->> 'internal_notes', ''),
      customer_notes = nullif(p_payload ->> 'customer_notes', ''),
      discount_type = p_payload ->> 'discount_type',
      discount_value = (p_payload ->> 'discount_value')::numeric,
      vat_rate = (p_payload ->> 'vat_rate')::numeric
    where id = target_id;
    delete from public.quotation_items where quotation_id = target_id;
  end if;

  for item_data in select value from jsonb_array_elements(p_payload -> 'items') loop
    product_value := nullif(item_data ->> 'product_id', '')::uuid;
    measurement_value := nullif(item_data ->> 'source_measurement_id', '')::uuid;
    product_name := null;
    product_code := null;
    if product_value is not null then
      select p.name, p.product_code into product_name, product_code
      from public.products p where p.id = product_value and p.archived_at is null;
      if not found then raise exception 'A selected product is unavailable'; end if;
    end if;
    if measurement_value is not null and (
      visit_value is null or not exists (
        select 1 from public.site_visit_measurements m
        where m.id = measurement_value and m.site_visit_id = visit_value
      )
    ) then raise exception 'A selected measurement does not belong to this site visit'; end if;

    insert into public.quotation_items (
      quotation_id, product_id, product_name_snapshot, product_code_snapshot,
      item_name, description, quantity, unit, width, height, length,
      dimensions_details, unit_price, discount_amount, taxable, sort_order,
      source_measurement_id, created_by
    ) values (
      target_id, product_value, product_name, product_code,
      item_data ->> 'item_name', item_data ->> 'description',
      (item_data ->> 'quantity')::numeric, item_data ->> 'unit',
      nullif(item_data ->> 'width', '')::numeric,
      nullif(item_data ->> 'height', '')::numeric,
      nullif(item_data ->> 'length', '')::numeric,
      nullif(item_data ->> 'dimensions_details', ''),
      (item_data ->> 'unit_price')::numeric,
      (item_data ->> 'discount_amount')::numeric,
      coalesce((item_data ->> 'taxable')::boolean, true),
      (item_data ->> 'sort_order')::integer,
      measurement_value, user_id
    );
  end loop;

  return target_id;
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
  ) then raise exception 'Issued quotation commercial data is immutable; create a revision'; end if;

  if new.status is distinct from old.status then
    if not (
      (old.status::text = 'draft' and new.status::text in ('ready', 'cancelled')) or
      (old.status::text = 'ready' and new.status::text in ('draft', 'sent', 'cancelled')) or
      (old.status::text = 'sent' and new.status::text in ('revised', 'approved', 'rejected', 'expired'))
    ) then raise exception 'Invalid quotation status transition'; end if;

    if new.status::text = 'ready' and (
      new.validity_date is null or not exists (select 1 from public.quotation_items i where i.quotation_id = old.id)
    ) then raise exception 'Ready quotations require a validity date and at least one item'; end if;
    if new.status::text = 'sent' and old.validity_date < current_date then
      raise exception 'Expired quotations cannot be sent';
    end if;
    if new.status::text in ('approved', 'rejected') and role_name <> 'admin'::public.app_role then
      raise exception 'Only Management can approve or reject quotations';
    end if;
    if new.status::text = 'approved' and (not old.is_current or old.validity_date < current_date) then
      raise exception 'Only a current, unexpired quotation can be approved';
    end if;

    if new.status::text = 'ready' then new.ready_at := now(); end if;
    if new.status::text = 'sent' then new.sent_at := now(); new.sent_by := (select auth.uid()); end if;
    if new.status::text = 'approved' then new.approved_at := now(); new.approved_by := (select auth.uid()); end if;
    if new.status::text = 'revised' then new.is_current := false; end if;
    if new.status::text = 'rejected' then new.rejected_at := now(); new.rejected_by := (select auth.uid()); end if;
    if new.status::text = 'cancelled' then new.cancelled_at := now(); end if;
  end if;
  return new;
end;
$$;

revoke all on function public.save_quotation_draft(uuid, jsonb) from public, anon;
grant execute on function public.save_quotation_draft(uuid, jsonb) to authenticated;
revoke all on function private.guard_quotation_change() from public, anon, authenticated;
