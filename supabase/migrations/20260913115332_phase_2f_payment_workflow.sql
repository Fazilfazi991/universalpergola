-- Phase 2F: authoritative payment plans, receipts, voids, and private proof files.

create type public.payment_plan_status as enum ('draft', 'active', 'completed', 'cancelled');
create type public.payment_milestone_type as enum ('percentage', 'fixed');

create sequence if not exists private.payment_receipt_number_seq;

alter table public.projects
  add column payment_plan_status public.payment_plan_status not null default 'draft',
  add column payment_plan_activated_at timestamptz,
  add column payment_plan_activated_by uuid references public.profiles(id) on delete set null,
  add column payment_plan_cancelled_at timestamptz,
  add column payment_plan_cancelled_by uuid references public.profiles(id) on delete set null,
  add column payment_plan_cancellation_reason text;

alter table public.payment_milestones
  add column milestone_type public.payment_milestone_type not null default 'fixed',
  add column percentage numeric(7,4),
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references public.profiles(id) on delete set null,
  add column cancellation_reason text;

alter table public.payments
  add column receipt_number text,
  add column voided_at timestamptz,
  add column voided_by uuid references public.profiles(id) on delete set null,
  add column void_reason text;

update public.payments
set receipt_number = 'UP-R-' || to_char(received_date, 'YYYY') || '-' || lpad(nextval('private.payment_receipt_number_seq')::text, 6, '0')
where receipt_number is null;

alter table public.payments alter column receipt_number set not null;
create unique index payments_receipt_number_idx on public.payments(receipt_number);
create index payment_milestones_project_order_idx on public.payment_milestones(project_id, sort_order, created_at)
  where archived_at is null;
create index payments_milestone_live_idx on public.payments(milestone_id, received_date, created_at)
  where archived_at is null and voided_at is null;
create index payments_received_live_idx on public.payments(received_date desc, project_id)
  where archived_at is null and voided_at is null;

alter table public.payment_milestones
  drop constraint if exists payment_milestones_amount_valid,
  add constraint payment_milestones_amount_valid check (amount_due > 0),
  add constraint payment_milestones_definition_valid check (
    (milestone_type = 'percentage' and percentage > 0 and percentage <= 100)
    or (milestone_type = 'fixed' and percentage is null)
  ),
  add constraint payment_milestones_text_lengths check (
    char_length(trim(name)) between 1 and 160
    and char_length(coalesce(notes, '')) <= 2000
    and char_length(coalesce(cancellation_reason, '')) <= 1000
  );

alter table public.payments
  add constraint payments_method_valid check (
    payment_method in ('bank_transfer', 'cash', 'card', 'cheque', 'other')
  ),
  add constraint payments_text_lengths check (
    char_length(coalesce(reference_number, '')) <= 160
    and char_length(coalesce(notes, '')) <= 2000
    and char_length(coalesce(void_reason, '')) <= 1000
  ),
  add constraint payments_void_complete check (
    (voided_at is null and voided_by is null and void_reason is null)
    or (voided_at is not null and voided_by is not null and char_length(trim(void_reason)) >= 3)
  );

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  upload_status text not null default 'pending',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint payment_proofs_mime_valid check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  constraint payment_proofs_size_valid check (file_size between 1 and 10485760),
  constraint payment_proofs_upload_status_valid check (upload_status in ('pending', 'ready')),
  constraint payment_proofs_name_valid check (char_length(trim(file_name)) between 1 and 255)
);
create index payment_proofs_payment_idx on public.payment_proofs(payment_id, created_at desc)
  where archived_at is null;
alter table public.payment_proofs enable row level security;

create or replace function private.assign_payment_receipt_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.receipt_number is null or trim(new.receipt_number) = '' then
    new.receipt_number := 'UP-R-' || to_char(coalesce(new.received_date, current_date), 'YYYY') || '-' ||
      lpad(nextval('private.payment_receipt_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create or replace function private.guard_project_finance_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.quotation_id is distinct from old.quotation_id
    or new.project_value is distinct from old.project_value
    or new.currency is distinct from old.currency
    or new.customer_id is distinct from old.customer_id
  ) then
    raise exception 'The approved quotation financial snapshot is immutable';
  end if;
  if tg_op = 'INSERT' and new.quotation_id is not null and (select auth.uid()) is not null then
    if not private.has_role(array['admin'::public.app_role]) then raise exception 'Only Management can convert quotations to projects'; end if;
    if not exists (
      select 1 from public.quotations q where q.id = new.quotation_id and q.status::text = 'approved'
        and q.is_current and q.archived_at is null and q.customer_id = new.customer_id
        and q.total = new.project_value and q.currency = new.currency
    ) then raise exception 'Project financials must match the current approved quotation'; end if;
  end if;
  return new;
end;
$$;

create or replace function private.refresh_project_payment_state(target_project uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payment_milestones m
  set status = case
    when m.cancelled_at is not null then 'cancelled'::public.payment_status
    when coalesce(p.received, 0) >= m.amount_due then 'paid'::public.payment_status
    when coalesce(p.received, 0) > 0 then 'partially_paid'::public.payment_status
    when m.due_date < current_date then 'overdue'::public.payment_status
    else 'pending'::public.payment_status
  end
  from (
    select m2.id, coalesce(sum(pay.amount_received) filter (where pay.voided_at is null and pay.archived_at is null), 0) received
    from public.payment_milestones m2
    left join public.payments pay on pay.milestone_id = m2.id
    where m2.project_id = target_project and m2.archived_at is null
    group by m2.id
  ) p
  where m.id = p.id;

  update public.projects project
  set payment_plan_status = case
    when project.payment_plan_status = 'cancelled' then 'cancelled'::public.payment_plan_status
    when project.payment_plan_status in ('active', 'completed') and not exists (
      select 1 from public.payment_milestones m where m.project_id = target_project
        and m.archived_at is null and m.cancelled_at is null and m.status <> 'paid'
    ) and exists (
      select 1 from public.payment_milestones m where m.project_id = target_project
        and m.archived_at is null and m.cancelled_at is null
    ) then 'completed'::public.payment_plan_status
    when project.payment_plan_status = 'completed' then 'active'::public.payment_plan_status
    else project.payment_plan_status
  end
  where project.id = target_project;
end;
$$;

create or replace function private.guard_payment_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then raise exception 'Receipts cannot be deleted; void the receipt instead'; end if;
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id or new.receipt_number is distinct from old.receipt_number
    or new.project_id is distinct from old.project_id or new.customer_id is distinct from old.customer_id
    or new.milestone_id is distinct from old.milestone_id or new.amount_received is distinct from old.amount_received
    or new.received_date is distinct from old.received_date or new.payment_method is distinct from old.payment_method
    or new.reference_number is distinct from old.reference_number or new.notes is distinct from old.notes
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at
  ) then raise exception 'Posted receipt details are immutable'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger payments_assign_receipt before insert on public.payments
for each row execute function private.assign_payment_receipt_number();
create trigger payments_guard before update or delete on public.payments
for each row execute function private.guard_payment_change();
drop trigger if exists a_projects_quotation_guard on public.projects;
create trigger a_projects_finance_source_guard before insert or update on public.projects
for each row execute function private.guard_project_finance_source();

create or replace function public.save_payment_milestone(
  p_project_id uuid, p_milestone_id uuid, p_name text, p_type text,
  p_percentage numeric, p_fixed_amount numeric, p_due_date date, p_notes text, p_sort_order integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
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
    insert into public.payment_milestones(project_id, name, milestone_type, percentage, amount_due, due_date, notes, sort_order, created_by)
    values (p_project_id, trim(p_name), p_type::public.payment_milestone_type,
      case when p_type = 'percentage' then round(p_percentage, 4) else null end, calculated,
      p_due_date, nullif(trim(coalesce(p_notes, '')), ''), greatest(coalesce(p_sort_order, 0), 0), (select auth.uid()))
    returning id into result_id;
  else
    update public.payment_milestones set name = trim(p_name), milestone_type = p_type::public.payment_milestone_type,
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

create or replace function public.cancel_payment_milestone(p_milestone_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare project_id_value uuid;
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Only Management or Accounts can configure payment plans'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A cancellation reason is required'; end if;
  select m.project_id into project_id_value from public.payment_milestones m join public.projects p on p.id = m.project_id
  where m.id = p_milestone_id and m.archived_at is null and m.cancelled_at is null and p.payment_plan_status = 'draft' for update of m, p;
  if not found then raise exception 'Only a draft milestone can be cancelled'; end if;
  update public.payment_milestones set cancelled_at = now(), cancelled_by = (select auth.uid()), cancellation_reason = trim(p_reason), status = 'cancelled'
  where id = p_milestone_id;
end;
$$;

create or replace function public.activate_payment_plan(p_project_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare project_row public.projects%rowtype; planned numeric(14,2); count_value integer;
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Only Management or Accounts can activate payment plans'; end if;
  select * into project_row from public.projects where id = p_project_id and archived_at is null for update;
  if not found or project_row.payment_plan_status <> 'draft' then raise exception 'Draft payment plan not found'; end if;
  select coalesce(sum(amount_due), 0), count(*) into planned, count_value from public.payment_milestones
  where project_id = p_project_id and archived_at is null and cancelled_at is null;
  if count_value = 0 then raise exception 'Add at least one milestone before activation'; end if;
  if planned <> project_row.project_value then raise exception 'Milestones total % but project value is %', planned, project_row.project_value; end if;
  update public.projects set payment_plan_status = 'active', payment_plan_activated_at = now(),
    payment_plan_activated_by = (select auth.uid()), payment_plan_cancelled_at = null,
    payment_plan_cancelled_by = null, payment_plan_cancellation_reason = null where id = p_project_id;
  perform private.refresh_project_payment_state(p_project_id);
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'payment_plan.activated', 'projects', p_project_id,
    jsonb_build_object('planned', planned, 'milestones', count_value, 'currency', project_row.currency));
end;
$$;

create or replace function public.cancel_payment_plan(p_project_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Only Management or Accounts can cancel payment plans'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A cancellation reason is required'; end if;
  if exists (select 1 from public.payments where project_id = p_project_id and voided_at is null and archived_at is null) then raise exception 'A plan with live receipts cannot be cancelled'; end if;
  update public.projects set payment_plan_status = 'cancelled', payment_plan_cancelled_at = now(),
    payment_plan_cancelled_by = (select auth.uid()), payment_plan_cancellation_reason = trim(p_reason)
  where id = p_project_id and payment_plan_status in ('draft','active');
  if not found then raise exception 'Cancellable payment plan not found'; end if;
  update public.payment_milestones set status = 'cancelled', cancelled_at = coalesce(cancelled_at, now()),
    cancelled_by = coalesce(cancelled_by, (select auth.uid())), cancellation_reason = coalesce(cancellation_reason, trim(p_reason))
  where project_id = p_project_id and archived_at is null and cancelled_at is null;
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'payment_plan.cancelled', 'projects', p_project_id, jsonb_build_object('reason', trim(p_reason)));
end;
$$;

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
  if p_method not in ('bank_transfer','cash','card','cheque','other') then raise exception 'Choose a valid payment method'; end if;
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

create or replace function public.void_payment(p_payment_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare payment_row public.payments%rowtype;
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Only Management or Accounts can void receipts'; end if;
  if char_length(trim(coalesce(p_reason,''))) < 3 then raise exception 'A void reason is required'; end if;
  select * into payment_row from public.payments where id = p_payment_id and archived_at is null for update;
  if not found then raise exception 'Receipt not found'; end if;
  if payment_row.voided_at is not null then raise exception 'Receipt is already void'; end if;
  update public.payments set voided_at = now(), voided_by = (select auth.uid()), void_reason = trim(p_reason) where id = p_payment_id;
  perform private.refresh_project_payment_state(payment_row.project_id);
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'payment.voided', 'projects', payment_row.project_id,
    jsonb_build_object('payment_id', payment_row.id, 'receipt_number', payment_row.receipt_number,
      'amount', payment_row.amount_received, 'reason', trim(p_reason)));
end;
$$;

create or replace function public.get_project_finance_summary(p_project_id uuid)
returns table(project_value numeric, currency text, planned numeric, received numeric, outstanding numeric,
  overdue numeric, next_due_date date, next_due_amount numeric, paid_percent numeric, plan_status text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if private.current_user_role() in ('admin','accounts') then null;
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

create or replace function public.finalize_payment_proof(p_proof_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare proof_row public.payment_proofs%rowtype;
begin
  if not private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) then raise exception 'Only Management or Accounts can manage payment proofs'; end if;
  select * into proof_row from public.payment_proofs where id = p_proof_id and archived_at is null for update;
  if not found then raise exception 'Payment proof reservation not found'; end if;
  if proof_row.created_by <> (select auth.uid()) then raise exception 'You cannot finalize this payment proof'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = proof_row.storage_path) then raise exception 'Stored proof not found'; end if;
  update public.payment_proofs set upload_status = 'ready' where id = p_proof_id;
end;
$$;

create or replace function private.log_payment_milestone_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare event_name text;
begin
  if tg_op = 'INSERT' then event_name := 'payment_milestone.created';
  elsif new.cancelled_at is not null and old.cancelled_at is null then event_name := 'payment_milestone.cancelled';
  else event_name := 'payment_milestone.updated'; end if;
  insert into public.activity_logs(actor_id,event_type,entity_type,entity_id,metadata)
  values ((select auth.uid()),event_name,'projects',new.project_id,
    jsonb_build_object('milestone_id',new.id,'milestone',new.name,'amount',new.amount_due,'due_date',new.due_date));
  return new;
end;
$$;
create trigger payment_milestones_activity after insert or update on public.payment_milestones
for each row execute function private.log_payment_milestone_change();

drop policy if exists "commercial team reads milestones" on public.payment_milestones;
drop policy if exists "accounts manages milestones" on public.payment_milestones;
drop policy if exists "commercial team reads payments" on public.payments;
drop policy if exists "accounts manages payments" on public.payments;
create policy "finance team reads milestones" on public.payment_milestones for select to authenticated
using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "finance team reads payments" on public.payments for select to authenticated
using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "finance team reads ready payment proofs" on public.payment_proofs for select to authenticated
using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) and (upload_status = 'ready' or created_by = (select auth.uid())));
create policy "finance team reserves payment proofs" on public.payment_proofs for insert to authenticated
with check (
  private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) and created_by = (select auth.uid())
  and upload_status = 'pending'
  and storage_path = payment_id::text || '/' || id::text || case mime_type
    when 'application/pdf' then '.pdf' when 'image/jpeg' then '.jpg' when 'image/png' then '.png'
    when 'image/webp' then '.webp' else '.invalid' end
  and exists (select 1 from public.payments p where p.id = payment_id and p.voided_at is null)
);

revoke all on public.payment_milestones, public.payments, public.payment_proofs from anon;
revoke insert, update, delete on public.payment_milestones, public.payments from authenticated;
grant select on public.payment_milestones, public.payments to authenticated;
grant select, insert on public.payment_proofs to authenticated;
revoke update, delete on public.payment_proofs from authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs','payment-proofs',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "finance team reads registered payment proofs" on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs' and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])
  and exists (select 1 from public.payment_proofs proof where proof.storage_path = name and proof.upload_status = 'ready' and proof.archived_at is null)
);
create policy "finance team uploads reserved payment proofs" on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs' and owner_id = (select auth.uid()::text)
  and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])
  and exists (select 1 from public.payment_proofs proof where proof.storage_path = name and proof.upload_status = 'pending'
    and proof.created_by = (select auth.uid()) and proof.archived_at is null)
);

do $$
declare fn regprocedure;
begin
  foreach fn in array array[
    'public.save_payment_milestone(uuid,uuid,text,text,numeric,numeric,date,text,integer)'::regprocedure,
    'public.cancel_payment_milestone(uuid,text)'::regprocedure,
    'public.activate_payment_plan(uuid)'::regprocedure,
    'public.cancel_payment_plan(uuid,text)'::regprocedure,
    'public.record_payment(uuid,uuid,numeric,date,text,text,text)'::regprocedure,
    'public.void_payment(uuid,text)'::regprocedure,
    'public.get_project_finance_summary(uuid)'::regprocedure,
    'public.finalize_payment_proof(uuid)'::regprocedure
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

revoke all on function private.assign_payment_receipt_number() from public, anon, authenticated;
revoke all on function private.guard_project_finance_source() from public, anon, authenticated;
revoke all on function private.refresh_project_payment_state(uuid) from public, anon, authenticated;
revoke all on function private.guard_payment_change() from public, anon, authenticated;
revoke all on function private.log_payment_milestone_change() from public, anon, authenticated;

comment on table public.payment_proofs is 'Private registry: reserve pending metadata, upload the exact path, then finalize to ready.';
comment on column public.payments.receipt_number is 'Concurrency-safe immutable receipt identifier assigned by Postgres.';
comment on column public.payment_milestones.amount_due is 'Authoritative amount; percentage milestones are calculated from the protected project quotation value in Postgres.';
