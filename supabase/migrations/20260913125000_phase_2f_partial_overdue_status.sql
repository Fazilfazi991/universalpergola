-- A partially paid milestone remains overdue once its due date passes.

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
  greatest(m.amount_due - coalesce(sum(p.amount_received) filter (where p.voided_at is null and p.archived_at is null), 0), 0)::numeric(14,2) outstanding
from public.payment_milestones m
left join public.payments p on p.milestone_id = m.id
where m.archived_at is null
group by m.id;
