-- Keep the invoice creation RPC warning-free without changing its behaviour.
create or replace function public.create_invoice_from_project(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_row public.projects%rowtype;
  quote_row public.quotations%rowtype;
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
  where id = project_row.quotation_id
    and status = 'approved'::public.quotation_status
    and is_current
    and archived_at is null;
  if not found then raise exception 'The project must have a current approved quotation'; end if;

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
    jsonb_build_object(
      'project_id', project_row.id,
      'quotation_id', quote_row.id,
      'reference', project_row.client_reference
    )
  );

  return invoice_id;
end;
$$;

revoke all on function public.create_invoice_from_project(uuid) from public, anon;
grant execute on function public.create_invoice_from_project(uuid) to authenticated;
