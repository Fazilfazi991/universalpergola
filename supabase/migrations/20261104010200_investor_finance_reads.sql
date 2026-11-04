-- Extend existing read-only finance RPCs to the Investor role without changing calculations.

create or replace function public.get_finance_project_summaries()
returns table(
  project_id uuid, project_number text, customer_id uuid, customer_name text, project_value numeric,
  currency text, plan_status text, planned numeric, received numeric, outstanding numeric,
  overdue numeric, next_due_date date, paid_percent numeric
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role,'investor'::public.app_role]) then raise exception 'Finance dashboard access is restricted'; end if;
  return query select f.id, f.project_number, f.customer_id, f.customer_name, f.project_value, f.currency,
    f.payment_plan_status::text, f.planned, f.received, f.outstanding, f.overdue, f.next_due_date, f.paid_percent
  from private.project_finance_calculations f order by f.overdue desc, f.next_due_date asc nulls last, f.project_number;
end;
$$;

create or replace function public.get_payment_milestone_summaries(p_project_id uuid)
returns table(
  milestone_id uuid, name text, description text, milestone_type text, percentage numeric, amount_due numeric,
  due_date date, status text, sort_order integer, notes text, cancelled_at timestamptz,
  cancellation_reason text, received numeric, outstanding numeric
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if private.current_user_role() in ('admin','accounts','investor') then null;
  elsif private.current_user_role() = 'sales' and private.can_access_project(p_project_id) then null;
  else raise exception 'You cannot view this project payment plan'; end if;
  return query select m.id, m.name, m.description, m.milestone_type::text, m.percentage, m.amount_due, m.due_date,
    m.status::text, m.sort_order, m.notes, m.cancelled_at, m.cancellation_reason, m.received, m.outstanding
  from private.milestone_finance_calculations m where m.project_id = p_project_id
  order by m.sort_order, m.created_at nulls last, m.id;
end;
$$;

create or replace function public.get_customer_finance_summary(p_customer_id uuid)
returns table(project_value numeric, received numeric, outstanding numeric, overdue numeric, project_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if private.current_user_role() in ('admin','accounts','investor') then null;
  elsif private.current_user_role() = 'sales' and exists (
    select 1 from public.customers c where c.id = p_customer_id and c.assigned_to = (select auth.uid())
  ) then null;
  else raise exception 'You cannot view this customer finance summary'; end if;
  return query select coalesce(sum(f.project_value),0)::numeric(14,2), coalesce(sum(f.received),0)::numeric(14,2),
    coalesce(sum(f.outstanding),0)::numeric(14,2), coalesce(sum(f.overdue),0)::numeric(14,2), count(*)
  from private.project_finance_calculations f where f.customer_id = p_customer_id;
end;
$$;

create or replace function public.get_finance_dashboard_summary()
returns table(project_value numeric, received numeric, received_this_month numeric, received_today numeric,
  outstanding numeric, overdue numeric, active_plans bigint, overdue_projects bigint, due_soon bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role,'investor'::public.app_role]) then raise exception 'Finance dashboard access is restricted'; end if;
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
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role,'investor'::public.app_role]) then raise exception 'Finance queue access is restricted'; end if;
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

create or replace function public.get_project_finance_summary(p_project_id uuid)
returns table(project_value numeric, currency text, planned numeric, received numeric, outstanding numeric,
  overdue numeric, next_due_date date, next_due_amount numeric, paid_percent numeric, plan_status text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if private.current_user_role() in ('admin','accounts','investor') then null;
  elsif private.current_user_role() = 'sales' and private.can_access_project(p_project_id) then null;
  else raise exception 'You cannot view this project finance summary'; end if;
  return query
  with milestone_totals as (
    select m.id, m.amount_due, m.due_date,
      coalesce(sum(pay.amount_received) filter (where pay.voided_at is null and pay.archived_at is null),0)::numeric(14,2) paid
    from public.payment_milestones m left join public.payments pay on pay.milestone_id = m.id
    where m.project_id = p_project_id and m.archived_at is null and m.cancelled_at is null group by m.id
  ), totals as (
    select coalesce(sum(amount_due),0)::numeric(14,2) planned,
      coalesce(sum(paid),0)::numeric(14,2) received,
      coalesce(sum(greatest(amount_due-paid,0)) filter (where due_date < current_date),0)::numeric(14,2) overdue
    from milestone_totals
  ), next_due as (
    select due_date, greatest(amount_due-paid,0)::numeric(14,2) amount from milestone_totals
    where amount_due > paid order by due_date asc nulls last, id limit 1
  )
  select p.project_value, p.currency::text, t.planned, t.received,
    greatest(p.project_value-t.received,0)::numeric(14,2), t.overdue, n.due_date, coalesce(n.amount,0),
    case when p.project_value > 0 then round(least(t.received/p.project_value*100,100),2) else 0 end,
    p.payment_plan_status::text
  from public.projects p cross join totals t left join next_due n on true where p.id = p_project_id and p.archived_at is null;
end;
$$;
