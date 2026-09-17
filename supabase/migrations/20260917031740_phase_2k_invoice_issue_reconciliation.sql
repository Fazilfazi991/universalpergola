-- Reconcile an invoice immediately when it is issued so receipts that pre-date
-- invoice creation are reflected without waiting for the next payment change.
create or replace function private.sync_invoice_status_after_issue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'draft'::public.invoice_status
     and new.status = 'issued'::public.invoice_status then
    perform private.sync_project_invoice_payment_status(new.project_id);
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_sync_status_after_issue on public.invoices;
create trigger invoices_sync_status_after_issue
after update of status on public.invoices
for each row execute function private.sync_invoice_status_after_issue();

revoke all on function private.sync_invoice_status_after_issue() from public, anon, authenticated;
