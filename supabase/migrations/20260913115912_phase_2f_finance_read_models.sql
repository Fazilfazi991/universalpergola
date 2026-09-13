-- Phase 2F read models keep every displayed balance authoritative in Postgres.

create view private.milestone_finance_calculations as
select m.id, m.project_id, m.name, m.milestone_type, m.percentage, m.amount_due, m.due_date,
  m.status, m.sort_order, m.notes, m.cancelled_at, m.cancellation_reason,
  m.created_at,
  coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0)::numeric(14,2) received,
  greatest(m.amount_due - coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0), 0)::numeric(14,2) outstanding
from public.payment_milestones m
left join public.payments p on p.milestone_id = m.id
where m.archived_at is null
group by m.id;

create view private.project_finance_calculations as
select project.id, project.project_number, project.customer_id, customer.name customer_name,
  project.project_value, project.currency::text currency, project.payment_plan_status,
  coalesce(sum(m.amount_due) filter (where m.cancelled_at is null), 0)::numeric(14,2) planned,
  coalesce(sum(m.received) filter (where m.cancelled_at is null), 0)::numeric(14,2) received,
  greatest(project.project_value - coalesce(sum(m.received) filter (where m.cancelled_at is null), 0), 0)::numeric(14,2) outstanding,
  coalesce(sum(m.outstanding) filter (where m.cancelled_at is null and m.due_date < current_date), 0)::numeric(14,2) overdue,
  min(m.due_date) filter (where m.cancelled_at is null and m.outstanding > 0) next_due_date,
  case when project.project_value > 0 then
    round(least(coalesce(sum(m.received) filter (where m.cancelled_at is null), 0) / project.project_value * 100, 100), 2)
    else 0 end paid_percent
from public.projects project
join public.customers customer on customer.id = project.customer_id
left join private.milestone_finance_calculations m on m.project_id = project.id
where project.archived_at is null
group by project.id, customer.name;

create or replace function public.get_finance_project_summaries()
returns table(
  project_id uuid, project_number text, customer_id uuid, customer_name text, project_value numeric,
  currency text, plan_status text, planned numeric, received numeric, outstanding numeric,
  overdue numeric, next_due_date date, paid_percent numeric
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Finance dashboard access is restricted'; end if;
  return query select f.id, f.project_number, f.customer_id, f.customer_name, f.project_value, f.currency,
    f.payment_plan_status::text, f.planned, f.received, f.outstanding, f.overdue, f.next_due_date, f.paid_percent
  from private.project_finance_calculations f order by f.overdue desc, f.next_due_date asc nulls last, f.project_number;
end;
$$;

create or replace function public.get_payment_milestone_summaries(p_project_id uuid)
returns table(
  milestone_id uuid, name text, milestone_type text, percentage numeric, amount_due numeric, due_date date,
  status text, sort_order integer, notes text, cancelled_at timestamptz, cancellation_reason text,
  received numeric, outstanding numeric
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if private.current_user_role() in ('admin','accounts') then null;
  elsif private.current_user_role() = 'sales' and private.can_access_project(p_project_id) then null;
  else raise exception 'You cannot view this project payment plan'; end if;
  return query select m.id, m.name, m.milestone_type::text, m.percentage, m.amount_due, m.due_date,
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
  if private.current_user_role() in ('admin','accounts') then null;
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
returns table(project_value numeric, received numeric, outstanding numeric, overdue numeric,
  active_plans bigint, overdue_projects bigint, due_soon bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Finance dashboard access is restricted'; end if;
  return query select coalesce(sum(f.project_value),0)::numeric(14,2), coalesce(sum(f.received),0)::numeric(14,2),
    coalesce(sum(f.outstanding),0)::numeric(14,2), coalesce(sum(f.overdue),0)::numeric(14,2),
    count(*) filter (where f.payment_plan_status = 'active'), count(*) filter (where f.overdue > 0),
    count(*) filter (where f.next_due_date between current_date and current_date + 7)
  from private.project_finance_calculations f;
end;
$$;

do $$
declare fn regprocedure;
begin
  foreach fn in array array[
    'public.get_finance_project_summaries()'::regprocedure,
    'public.get_payment_milestone_summaries(uuid)'::regprocedure,
    'public.get_customer_finance_summary(uuid)'::regprocedure,
    'public.get_finance_dashboard_summary()'::regprocedure
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

revoke all on private.milestone_finance_calculations, private.project_finance_calculations from public, anon, authenticated;
