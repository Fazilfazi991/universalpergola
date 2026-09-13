-- Complete the milestone narrative fields and the suggested receipt method vocabulary.

alter table public.payment_milestones add column description text;
alter table public.payment_milestones
  add constraint payment_milestones_description_length check (char_length(description) <= 2000);

alter table public.payments drop constraint payments_method_valid;
alter table public.payments add constraint payments_method_valid check (
  payment_method in ('bank_transfer', 'online_transfer', 'cash', 'card', 'cheque', 'other')
);

drop function public.save_payment_milestone(uuid, uuid, text, text, numeric, numeric, date, text, integer);
create function public.save_payment_milestone(
  p_project_id uuid, p_milestone_id uuid, p_name text, p_type text,
  p_percentage numeric, p_fixed_amount numeric, p_due_date date, p_description text,
  p_notes text, p_sort_order integer
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare project_row public.projects%rowtype; result_id uuid; calculated numeric(14,2);
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Only Management or Accounts can configure payment plans'; end if;
  select * into project_row from public.projects where id = p_project_id and archived_at is null for update;
  if not found then raise exception 'Project not found'; end if;
  if project_row.payment_plan_status <> 'draft' then raise exception 'Only draft payment plans can be edited'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 160 then raise exception 'Milestone name is required'; end if;
  if p_type not in ('percentage', 'fixed') then raise exception 'Choose percentage or fixed'; end if;
  calculated := case when p_type = 'percentage' then round(project_row.project_value * p_percentage / 100, 2) else round(p_fixed_amount, 2) end;
  if calculated is null or calculated <= 0 then raise exception 'Milestone amount must be greater than zero'; end if;
  if p_type = 'percentage' and (p_percentage is null or p_percentage <= 0 or p_percentage > 100) then raise exception 'Percentage must be between 0 and 100'; end if;
  if p_milestone_id is null then
    insert into public.payment_milestones(project_id, name, description, milestone_type, percentage, amount_due, due_date, notes, sort_order, created_by)
    values (p_project_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), p_type::public.payment_milestone_type,
      case when p_type = 'percentage' then round(p_percentage, 4) else null end, calculated, p_due_date,
      nullif(trim(coalesce(p_notes, '')), ''), greatest(coalesce(p_sort_order, 0), 0), (select auth.uid()))
    returning id into result_id;
  else
    update public.payment_milestones set name = trim(p_name), description = nullif(trim(coalesce(p_description, '')), ''),
      milestone_type = p_type::public.payment_milestone_type,
      percentage = case when p_type = 'percentage' then round(p_percentage, 4) else null end,
      amount_due = calculated, due_date = p_due_date, notes = nullif(trim(coalesce(p_notes, '')), ''),
      sort_order = greatest(coalesce(p_sort_order, 0), 0)
    where id = p_milestone_id and project_id = p_project_id and archived_at is null and cancelled_at is null
    returning id into result_id;
    if result_id is null then raise exception 'Editable milestone not found'; end if;
  end if;
  return result_id;
end;
$$;

create or replace view private.milestone_finance_calculations as
select m.id, m.project_id, m.name, m.milestone_type, m.percentage, m.amount_due, m.due_date,
  case
    when m.cancelled_at is not null then 'cancelled'::public.payment_status
    when coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0) >= m.amount_due then 'paid'::public.payment_status
    when m.due_date < current_date then 'overdue'::public.payment_status
    when coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0) > 0 then 'partially_paid'::public.payment_status
    else 'pending'::public.payment_status
  end status,
  m.sort_order, m.notes, m.cancelled_at, m.cancellation_reason, m.created_at,
  coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0)::numeric(14,2) received,
  greatest(m.amount_due - coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0), 0)::numeric(14,2) outstanding,
  m.description
from public.payment_milestones m
left join public.payments p on p.milestone_id = m.id
where m.archived_at is null
group by m.id;

drop function public.get_payment_milestone_summaries(uuid);
create function public.get_payment_milestone_summaries(p_project_id uuid)
returns table(
  milestone_id uuid, name text, description text, milestone_type text, percentage numeric, amount_due numeric,
  due_date date, status text, sort_order integer, notes text, cancelled_at timestamptz,
  cancellation_reason text, received numeric, outstanding numeric
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if private.current_user_role() in ('admin','accounts') then null;
  elsif private.current_user_role() = 'sales' and private.can_access_project(p_project_id) then null;
  else raise exception 'You cannot view this project payment plan'; end if;
  return query select m.id, m.name, m.description, m.milestone_type::text, m.percentage, m.amount_due, m.due_date,
    m.status::text, m.sort_order, m.notes, m.cancelled_at, m.cancellation_reason, m.received, m.outstanding
  from private.milestone_finance_calculations m where m.project_id = p_project_id
  order by m.sort_order, m.created_at nulls last, m.id;
end;
$$;

revoke all on function public.save_payment_milestone(uuid, uuid, text, text, numeric, numeric, date, text, text, integer) from public, anon;
revoke all on function public.get_payment_milestone_summaries(uuid) from public, anon;
grant execute on function public.save_payment_milestone(uuid, uuid, text, text, numeric, numeric, date, text, text, integer),
  public.get_payment_milestone_summaries(uuid) to authenticated;
revoke all on private.milestone_finance_calculations from public, anon, authenticated;
