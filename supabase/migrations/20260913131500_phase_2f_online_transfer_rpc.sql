-- Keep RPC validation aligned with the extensible receipt method constraint.

create or replace function public.record_payment(
  p_project_id uuid, p_milestone_id uuid, p_amount numeric, p_received_date date,
  p_method text, p_reference text, p_notes text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare project_row public.projects%rowtype; milestone_row public.payment_milestones%rowtype;
  received numeric(14,2); result_id uuid; result_number text;
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Only Management or Accounts can record payments'; end if;
  if p_amount is null or round(p_amount,2) <= 0 then raise exception 'Payment amount must be greater than zero'; end if;
  if p_received_date is null or p_received_date > current_date then raise exception 'Received date cannot be in the future'; end if;
  if p_method not in ('bank_transfer','online_transfer','cash','card','cheque','other') then raise exception 'Choose a valid payment method'; end if;
  select * into project_row from public.projects where id = p_project_id and archived_at is null for update;
  if not found or project_row.payment_plan_status not in ('active','completed') then raise exception 'Activate the payment plan before recording receipts'; end if;
  select * into milestone_row from public.payment_milestones where id = p_milestone_id and project_id = p_project_id
    and archived_at is null and cancelled_at is null for update;
  if not found then raise exception 'Active milestone not found'; end if;
  select coalesce(sum(amount_received),0) into received from public.payments where milestone_id = p_milestone_id
    and archived_at is null and voided_at is null;
  if round(p_amount,2) > milestone_row.amount_due - received then raise exception 'Payment exceeds the milestone outstanding balance'; end if;
  insert into public.payments(project_id, customer_id, milestone_id, amount_received, received_date,
    payment_method, reference_number, notes, created_by)
  values (p_project_id, project_row.customer_id, p_milestone_id, round(p_amount,2), p_received_date,
    p_method, nullif(trim(coalesce(p_reference,'')),''), nullif(trim(coalesce(p_notes,'')),''), (select auth.uid()))
  returning id, receipt_number into result_id, result_number;
  perform private.refresh_project_payment_state(p_project_id);
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'payment.received', 'projects', p_project_id,
    jsonb_build_object('payment_id', result_id, 'receipt_number', result_number, 'milestone', milestone_row.name,
      'amount', round(p_amount,2), 'currency', project_row.currency));
  return result_id;
end;
$$;

revoke all on function public.record_payment(uuid, uuid, numeric, date, text, text, text) from public, anon;
grant execute on function public.record_payment(uuid, uuid, numeric, date, text, text, text) to authenticated;
