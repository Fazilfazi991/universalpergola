-- Operational Accounts reporting and complete finance activity vocabulary.

create or replace view private.milestone_finance_calculations as
select m.id, m.project_id, m.name, m.milestone_type, m.percentage, m.amount_due, m.due_date,
  case
    when m.cancelled_at is not null then 'cancelled'::public.payment_status
    when coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0) >= m.amount_due then 'paid'::public.payment_status
    when coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0) > 0 then 'partially_paid'::public.payment_status
    when m.due_date < current_date then 'overdue'::public.payment_status
    else 'pending'::public.payment_status
  end status,
  m.sort_order, m.notes, m.cancelled_at, m.cancellation_reason, m.created_at,
  coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0)::numeric(14,2) received,
  greatest(m.amount_due - coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0), 0)::numeric(14,2) outstanding
from public.payment_milestones m
left join public.payments p on p.milestone_id = m.id
where m.archived_at is null
group by m.id;

drop function public.get_finance_dashboard_summary();
create function public.get_finance_dashboard_summary()
returns table(project_value numeric, received numeric, received_this_month numeric, received_today numeric,
  outstanding numeric, overdue numeric, active_plans bigint, overdue_projects bigint, due_soon bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Finance dashboard access is restricted'; end if;
  return query
  with receipt_totals as (
    select
      coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null and date_trunc('month', p.received_date::timestamp) = date_trunc('month', current_date::timestamp)),0)::numeric(14,2) month_total,
      coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null and p.received_date = current_date),0)::numeric(14,2) today_total
    from public.payments p
  )
  select coalesce(sum(f.project_value),0)::numeric(14,2), coalesce(sum(f.received),0)::numeric(14,2),
    r.month_total, r.today_total, coalesce(sum(f.outstanding),0)::numeric(14,2),
    coalesce(sum(f.overdue),0)::numeric(14,2), count(*) filter (where f.payment_plan_status = 'active'),
    count(*) filter (where f.overdue > 0), count(*) filter (where f.next_due_date between current_date and current_date + 7)
  from private.project_finance_calculations f cross join receipt_totals r
  group by r.month_total, r.today_total;
end;
$$;

create or replace function public.get_finance_milestone_queue()
returns table(
  milestone_id uuid, project_id uuid, project_number text, customer_id uuid, customer_name text,
  milestone_name text, amount_due numeric, received numeric, outstanding numeric, due_date date,
  status text, currency text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Finance queue access is restricted'; end if;
  return query
  select m.id, f.id, f.project_number, f.customer_id, f.customer_name, m.name,
    m.amount_due, m.received, m.outstanding, m.due_date, m.status::text, f.currency
  from private.milestone_finance_calculations m
  join private.project_finance_calculations f on f.id = m.project_id
  where m.cancelled_at is null
  order by case m.status when 'overdue' then 0 when 'pending' then 1 when 'partially_paid' then 2 else 3 end,
    m.due_date asc nulls last, f.project_number, m.sort_order;
end;
$$;

create or replace function private.log_payment_posting_state()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare milestone_row public.payment_milestones%rowtype; valid_received numeric(14,2); event_name text;
begin
  select * into milestone_row from public.payment_milestones where id = new.milestone_id;
  select coalesce(sum(amount_received),0) into valid_received from public.payments
  where milestone_id = new.milestone_id and voided_at is null and archived_at is null;
  event_name := case when valid_received >= milestone_row.amount_due then 'payment_milestone.paid' else 'payment.partial_received' end;
  insert into public.activity_logs(actor_id,event_type,entity_type,entity_id,metadata)
  values ((select auth.uid()),event_name,'projects',new.project_id,
    jsonb_build_object('payment_id',new.id,'receipt_number',new.receipt_number,'milestone_id',milestone_row.id,
      'milestone',milestone_row.name,'amount',new.amount_received,'received_total',valid_received));
  return new;
end;
$$;
drop trigger if exists payments_posting_state_activity on public.payments;
create trigger payments_posting_state_activity after insert on public.payments
for each row execute function private.log_payment_posting_state();

create or replace function private.log_payment_plan_completion()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.payment_plan_status = 'completed' and old.payment_plan_status <> 'completed' then
    insert into public.activity_logs(actor_id,event_type,entity_type,entity_id,metadata)
    values ((select auth.uid()),'payment_plan.completed','projects',new.id,
      jsonb_build_object('project_number',new.project_number,'project_value',new.project_value,'currency',new.currency));
  end if;
  return new;
end;
$$;
drop trigger if exists projects_payment_plan_completion_activity on public.projects;
create trigger projects_payment_plan_completion_activity after update of payment_plan_status on public.projects
for each row execute function private.log_payment_plan_completion();

create or replace function public.finalize_payment_proof(p_proof_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare proof_row public.payment_proofs%rowtype; payment_row public.payments%rowtype;
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Only Management or Accounts can manage payment proofs'; end if;
  select * into proof_row from public.payment_proofs where id = p_proof_id and archived_at is null for update;
  if not found then raise exception 'Payment proof reservation not found'; end if;
  if proof_row.created_by <> (select auth.uid()) then raise exception 'You cannot finalize this payment proof'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = proof_row.storage_path) then raise exception 'Stored proof not found'; end if;
  update public.payment_proofs set upload_status = 'ready' where id = p_proof_id;
  select * into payment_row from public.payments where id = proof_row.payment_id;
  insert into public.activity_logs(actor_id,event_type,entity_type,entity_id,metadata)
  values ((select auth.uid()),'payment.proof_uploaded','projects',payment_row.project_id,
    jsonb_build_object('payment_id',payment_row.id,'receipt_number',payment_row.receipt_number,
      'proof_id',proof_row.id,'file_name',proof_row.file_name));
end;
$$;

revoke all on function public.get_finance_dashboard_summary() from public, anon;
revoke all on function public.get_finance_milestone_queue() from public, anon;
revoke all on function public.finalize_payment_proof(uuid) from public, anon;
grant execute on function public.get_finance_dashboard_summary(), public.get_finance_milestone_queue(),
  public.finalize_payment_proof(uuid) to authenticated;
revoke all on function private.log_payment_posting_state() from public, anon, authenticated;
revoke all on function private.log_payment_plan_completion() from public, anon, authenticated;
