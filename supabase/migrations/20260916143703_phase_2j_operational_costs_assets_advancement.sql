-- Phase 2J: internal operating costs, private bills/assets, and weighted advancement.
-- Customer payment tables and quotation balances remain unchanged.

create type public.internal_expense_scope as enum ('project', 'workshop');
create type public.asset_status as enum ('planned', 'active', 'maintenance', 'retired', 'archived');
create type public.wage_status as enum ('pending', 'paid', 'partially_paid');

create table public.internal_expenses (
  id uuid primary key default gen_random_uuid(),
  scope public.internal_expense_scope not null,
  project_id uuid references public.projects(id) on delete restrict,
  category text not null,
  description text not null,
  vendor text,
  expense_date date not null default current_date,
  amount numeric(14,2) not null,
  currency char(3) not null default 'AED',
  payment_method text,
  reference text,
  notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint internal_expenses_scope_link check ((scope = 'project' and project_id is not null) or (scope = 'workshop' and project_id is null)),
  constraint internal_expenses_amount_valid check (amount >= 0),
  constraint internal_expenses_text_valid check (char_length(trim(description)) between 1 and 500 and char_length(coalesce(category,'')) between 1 and 80)
);
create index internal_expenses_project_idx on public.internal_expenses(project_id, expense_date desc) where archived_at is null;
create index internal_expenses_scope_idx on public.internal_expenses(scope, expense_date desc) where archived_at is null;

create table public.labour_wages (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null,
  work_date date not null default current_date,
  project_id uuid references public.projects(id) on delete restrict,
  work_description text not null,
  hours numeric(8,2),
  amount numeric(14,2) not null,
  currency char(3) not null default 'AED',
  status public.wage_status not null default 'pending',
  notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint labour_wages_amount_valid check (amount >= 0 and (hours is null or hours >= 0)),
  constraint labour_wages_text_valid check (char_length(trim(worker_name)) between 1 and 160 and char_length(trim(work_description)) between 1 and 500)
);
create index labour_wages_project_idx on public.labour_wages(project_id, work_date desc) where archived_at is null;

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  asset_code text not null unique,
  category text not null,
  brand text,
  model text,
  serial_number text,
  status public.asset_status not null default 'planned',
  purchase_date date,
  planned_purchase_date date,
  purchase_cost numeric(14,2),
  estimated_cost numeric(14,2),
  currency char(3) not null default 'AED',
  supplier text,
  location text,
  notes text,
  image_path text,
  image_mime_type text,
  image_size bigint,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint assets_cost_valid check ((purchase_cost is null or purchase_cost >= 0) and (estimated_cost is null or estimated_cost >= 0)),
  constraint assets_image_valid check (image_mime_type is null or image_mime_type in ('image/jpeg','image/png','image/webp'))
);
create index assets_status_idx on public.assets(status, created_at desc) where archived_at is null;

create table public.purchase_bills (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.internal_expenses(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete cascade,
  vendor text,
  bill_number text,
  bill_date date,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint purchase_bills_target_required check (expense_id is not null or asset_id is not null),
  constraint purchase_bills_file_valid check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp') and file_size between 1 and 20971520 and char_length(file_name) between 1 and 255),
  constraint purchase_bills_path_valid check (storage_path = id::text || '/' || regexp_replace(file_name, '[^a-zA-Z0-9._-]', '_', 'g'))
);
create index purchase_bills_expense_idx on public.purchase_bills(expense_id) where expense_id is not null;
create index purchase_bills_asset_idx on public.purchase_bills(asset_id) where asset_id is not null;

create or replace function private.log_phase_2j_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare event_name text; target_project uuid;
begin
  target_project := case when tg_table_name = 'internal_expenses' then coalesce(new.project_id, old.project_id) when tg_table_name = 'labour_wages' then coalesce(new.project_id, old.project_id) else null end;
  event_name := case tg_table_name when 'internal_expenses' then 'expense.' || lower(tg_op) when 'labour_wages' then 'wage.' || lower(tg_op) when 'purchase_bills' then 'bill.' || lower(tg_op) when 'assets' then 'asset.' || lower(tg_op) end;
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), event_name, tg_table_name, coalesce(new.id, old.id), jsonb_strip_nulls(jsonb_build_object('project_id', target_project, 'scope', coalesce(new.scope::text, old.scope::text), 'name', coalesce(new.name, old.name), 'amount', coalesce(new.amount, old.amount), 'status', coalesce(new.status::text, old.status::text))));
  return coalesce(new, old);
end; $$;
revoke all on function private.log_phase_2j_change() from public, anon, authenticated;
create trigger internal_expenses_phase_2j_activity after insert or update or delete on public.internal_expenses for each row execute function private.log_phase_2j_change();
create trigger labour_wages_phase_2j_activity after insert or update or delete on public.labour_wages for each row execute function private.log_phase_2j_change();
create trigger purchase_bills_phase_2j_activity after insert or update or delete on public.purchase_bills for each row execute function private.log_phase_2j_change();
create trigger assets_phase_2j_activity after insert or update or delete on public.assets for each row execute function private.log_phase_2j_change();

alter table public.internal_expenses enable row level security;
alter table public.labour_wages enable row level security;
alter table public.purchase_bills enable row level security;
alter table public.assets enable row level security;
create policy "finance staff reads internal expenses" on public.internal_expenses for select to authenticated using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "finance staff manages internal expenses" on public.internal_expenses for all to authenticated using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) and recorded_by = (select auth.uid()));
create policy "finance staff reads labour wages" on public.labour_wages for select to authenticated using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "finance staff manages labour wages" on public.labour_wages for all to authenticated using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) and recorded_by = (select auth.uid()));
create policy "finance staff reads purchase bills" on public.purchase_bills for select to authenticated using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "finance staff manages purchase bills" on public.purchase_bills for all to authenticated using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) and uploaded_by = (select auth.uid()));
create policy "finance staff reads assets" on public.assets for select to authenticated using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "finance staff manages assets" on public.assets for all to authenticated using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) and recorded_by = (select auth.uid()));
revoke all on public.internal_expenses, public.labour_wages, public.purchase_bills, public.assets from anon;
grant select, insert, update, delete on public.internal_expenses, public.labour_wages, public.purchase_bills, public.assets to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('internal-documents','internal-documents',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=20971520, allowed_mime_types=excluded.allowed_mime_types;
create policy "finance staff reads private internal documents" on storage.objects for select to authenticated using (bucket_id='internal-documents' and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) and (exists(select 1 from public.purchase_bills b where b.storage_path=name) or exists(select 1 from public.assets a where a.image_path=name)));
create policy "finance staff uploads registered internal documents" on storage.objects for insert to authenticated with check (bucket_id='internal-documents' and owner_id=(select auth.uid()::text) and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]) and (exists(select 1 from public.purchase_bills b where b.storage_path=name and b.uploaded_by=(select auth.uid())) or exists(select 1 from public.assets a where a.image_path=name and a.recorded_by=(select auth.uid()))));
create policy "finance staff deletes private internal documents" on storage.objects for delete to authenticated using (bucket_id='internal-documents' and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));

create or replace function public.get_project_cost_summary(p_project_id uuid)
returns table(approved_value numeric, currency text, customer_received numeric, customer_outstanding numeric, material_expense numeric, labour_cost numeric, other_project_expenses numeric, total_internal_cost numeric)
language sql stable security definer set search_path = '' as $$
  select p.project_value, p.currency::text,
    coalesce((select sum(amount_received) from public.payments py where py.project_id=p.id and py.voided_at is null and py.archived_at is null),0),
    greatest(p.project_value - coalesce((select sum(amount_received) from public.payments py where py.project_id=p.id and py.voided_at is null and py.archived_at is null),0),0),
    coalesce((select sum(amount) from public.internal_expenses e where e.project_id=p.id and e.scope='project' and lower(e.category)='material' and e.archived_at is null),0),
    coalesce((select sum(amount) from public.labour_wages w where w.project_id=p.id and w.archived_at is null),0),
    coalesce((select sum(amount) from public.internal_expenses e where e.project_id=p.id and e.scope='project' and lower(e.category)<>'material' and e.archived_at is null),0),
    coalesce((select sum(amount) from public.internal_expenses e where e.project_id=p.id and e.scope='project' and e.archived_at is null),0) + coalesce((select sum(amount) from public.labour_wages w where w.project_id=p.id and w.archived_at is null),0)
  from public.projects p where p.id=p_project_id and private.can_access_project(p.id);
$$;
revoke all on function public.get_project_cost_summary(uuid) from public, anon;
grant execute on function public.get_project_cost_summary(uuid) to authenticated;

-- Weighted advancement now includes partial stage observations without changing the Phase 2E snapshot rows.
create or replace function private.refresh_project_stage_rollup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_project uuid; next_stage uuid; derived_progress smallint;
begin
  target_project := coalesce(new.project_id, old.project_id);
  select ps.id into next_stage from public.project_stages ps where ps.project_id=target_project and ps.status::text not in ('completed','skipped') order by ps.sort_order, ps.created_at limit 1;
  select least(100, greatest(0, coalesce(round(sum(ps.weight * case when ps.status::text in ('completed','skipped') then 100 else ps.progress end) / nullif(sum(ps.weight),0)),0)))::smallint into derived_progress from public.project_stages ps where ps.project_id=target_project;
  update public.projects set current_stage_id=next_stage, progress=derived_progress where id=target_project;
  return coalesce(new,old);
end; $$;
comment on column public.projects.progress is 'Derived from weighted stage completion and partial advancement observations.';
