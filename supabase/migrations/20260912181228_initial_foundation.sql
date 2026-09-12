-- Universal Pergola: Phase 1 foundation
-- Reviewable, reproducible schema for catalogue, CRM, delivery, finance and access control.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon;

create type public.app_role as enum ('admin', 'sales', 'site_team', 'accounts');
create type public.profile_status as enum ('active', 'inactive');
create type public.pricing_mode as enum ('hidden', 'starting_price', 'fixed_price', 'price_on_request');
create type public.enquiry_type as enum ('catalogue', 'general', 'manual');
create type public.lead_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.enquiry_status as enum ('new', 'contacted', 'follow_up', 'site_visit_required', 'quotation', 'approved', 'lost');
create type public.site_visit_status as enum ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled');
create type public.quotation_status as enum ('draft', 'sent', 'revised', 'approved', 'rejected', 'expired');
create type public.project_status as enum ('planned', 'active', 'on_hold', 'completed', 'cancelled');
create type public.stage_status as enum ('not_started', 'in_progress', 'blocked', 'completed');
create type public.payment_status as enum ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled');
create type public.task_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.task_status as enum ('open', 'in_progress', 'blocked', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  avatar_path text,
  role public.app_role not null default 'sales',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  product_code text unique,
  short_description text,
  full_description text,
  specifications jsonb not null default '{}'::jsonb,
  material text,
  colour_information text,
  dimensions_information text,
  pricing_mode public.pricing_mode not null default 'price_on_request',
  price numeric(14,2),
  currency char(3) not null default 'AED',
  is_featured boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint products_price_non_negative check (price is null or price >= 0),
  constraint products_price_consistency check (pricing_mode in ('hidden', 'price_on_request') or price is not null)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index product_images_one_primary_idx on public.product_images(product_id) where is_primary;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  whatsapp_number text,
  email text,
  company_name text,
  address text,
  area text,
  emirate text,
  notes text,
  source text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  enquiry_type public.enquiry_type not null default 'manual',
  subject text,
  message text,
  source text,
  priority public.lead_priority not null default 'normal',
  status public.enquiry_status not null default 'new',
  assigned_to uuid references public.profiles(id) on delete set null,
  follow_up_at timestamptz,
  lost_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.enquiry_activities (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  activity_type text not null,
  note text,
  occurred_at timestamptz not null default now(),
  next_action_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz not null,
  site_address text not null,
  location_url text,
  status public.site_visit_status not null default 'scheduled',
  measurements jsonb not null default '{}'::jsonb,
  notes text,
  follow_up_required boolean not null default false,
  next_action text,
  next_action_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.site_visit_photos (
  id uuid primary key default gen_random_uuid(),
  site_visit_id uuid not null references public.site_visits(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  taken_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  site_visit_id uuid references public.site_visits(id) on delete set null,
  revised_from_id uuid references public.quotations(id) on delete set null,
  status public.quotation_status not null default 'draft',
  currency char(3) not null default 'AED',
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 5,
  vat_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  validity_date date,
  terms text,
  notes text,
  sent_at timestamptz,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint quotations_amounts_non_negative check (subtotal >= 0 and discount_amount >= 0 and vat_amount >= 0 and total >= 0),
  constraint quotations_vat_valid check (vat_rate >= 0 and vat_rate <= 100)
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text,
  product_code_snapshot text,
  description text not null,
  quantity numeric(12,3) not null default 1,
  dimensions_details text,
  unit_price numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotation_items_amounts_valid check (quantity > 0 and unit_price >= 0 and discount_amount >= 0 and line_total >= 0)
);

create table public.project_stage_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  project_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  quotation_id uuid references public.quotations(id) on delete set null,
  site_visit_id uuid references public.site_visits(id) on delete set null,
  site_address text,
  project_value numeric(14,2) not null default 0,
  currency char(3) not null default 'AED',
  assigned_salesperson uuid references public.profiles(id) on delete set null,
  status public.project_status not null default 'planned',
  progress smallint not null default 0,
  start_date date,
  expected_completion_date date,
  completed_at timestamptz,
  handover_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint projects_value_non_negative check (project_value >= 0),
  constraint projects_progress_valid check (progress between 0 and 100)
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role text not null default 'site_team',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, user_id, assignment_role)
);

create table public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  template_id uuid references public.project_stage_templates(id) on delete set null,
  name text not null,
  status public.stage_status not null default 'not_started',
  sort_order integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, sort_order)
);
alter table public.projects add column current_stage_id uuid references public.project_stages(id) on delete set null;

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.project_stages(id) on delete set null,
  update_type text not null default 'progress',
  progress smallint,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_updates_progress_valid check (progress is null or progress between 0 and 100)
);

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.project_stages(id) on delete set null,
  file_type text not null default 'document',
  storage_path text not null unique,
  file_name text not null,
  caption text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  amount_due numeric(14,2) not null,
  due_date date,
  status public.payment_status not null default 'pending',
  sort_order integer not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint payment_milestones_amount_valid check (amount_due >= 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  milestone_id uuid references public.payment_milestones(id) on delete set null,
  amount_received numeric(14,2) not null,
  received_date date not null,
  payment_method text,
  reference_number text,
  proof_storage_path text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint payments_amount_valid check (amount_received > 0)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  customer_id uuid references public.customers(id) on delete cascade,
  enquiry_id uuid references public.enquiries(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  site_visit_id uuid references public.site_visits(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'open',
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  handover_date date,
  completion_status text not null default 'completed',
  customer_rating smallint,
  customer_comments text,
  internal_notes text,
  public_token uuid not null default gen_random_uuid() unique,
  submitted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_rating_valid check (customer_rating is null or customer_rating between 1 and 5)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for common lists, assignments, due work and timelines.
create index products_catalogue_idx on public.products(is_published, sort_order) where archived_at is null;
create index products_category_idx on public.products(category_id);
create index customers_assigned_idx on public.customers(assigned_to) where archived_at is null;
create index customers_phone_idx on public.customers(phone);
create index enquiries_assigned_status_idx on public.enquiries(assigned_to, status) where archived_at is null;
create index enquiries_follow_up_idx on public.enquiries(follow_up_at) where follow_up_at is not null and archived_at is null;
create index enquiry_activities_timeline_idx on public.enquiry_activities(enquiry_id, occurred_at desc);
create index site_visits_schedule_idx on public.site_visits(assigned_to, scheduled_at) where archived_at is null;
create index quotations_customer_idx on public.quotations(customer_id, created_at desc) where archived_at is null;
create index quotations_status_idx on public.quotations(status) where archived_at is null;
create index projects_customer_idx on public.projects(customer_id, created_at desc) where archived_at is null;
create index projects_status_idx on public.projects(status, expected_completion_date) where archived_at is null;
create index project_assignments_user_idx on public.project_assignments(user_id, project_id);
create index project_updates_timeline_idx on public.project_updates(project_id, created_at desc);
create index payment_milestones_due_idx on public.payment_milestones(status, due_date) where archived_at is null;
create index payments_project_idx on public.payments(project_id, received_date desc) where archived_at is null;
create index tasks_assigned_due_idx on public.tasks(assigned_to, status, due_at) where archived_at is null;
create index notifications_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create index activity_logs_entity_idx on public.activity_logs(entity_type, entity_id, created_at desc);
create index activity_logs_actor_idx on public.activity_logs(actor_id, created_at desc);

insert into public.project_stage_templates (key, name, sort_order)
values ('design', 'Design', 10), ('planning_approval', 'Planning & Approval', 20), ('manufacturing', 'Manufacturing', 30), ('installation', 'Installation', 40), ('handover', 'Handover', 50), ('completed', 'Completed', 60)
on conflict (key) do nothing;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

create or replace function private.current_user_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active'::public.profile_status
$$;

create or replace function private.has_role(allowed public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and coalesce(private.current_user_role() = any(allowed), false)
$$;

create or replace function private.can_access_customer(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case private.current_user_role()
    when 'admin' then true
    when 'sales' then true
    when 'site_team' then exists (
      select 1 from public.site_visits v where v.customer_id = target and v.assigned_to = (select auth.uid())
      union all
      select 1 from public.projects p join public.project_assignments a on a.project_id = p.id where p.customer_id = target and a.user_id = (select auth.uid())
    )
    when 'accounts' then exists (select 1 from public.projects p where p.customer_id = target)
    else false end
$$;

create or replace function private.can_access_project(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case private.current_user_role()
    when 'admin' then true
    when 'sales' then true
    when 'accounts' then true
    when 'site_team' then exists (select 1 from public.project_assignments a where a.project_id = target and a.user_id = (select auth.uid()))
    else false end
$$;

create or replace function private.can_access_enquiry(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.enquiries e where e.id = target and private.can_access_customer(e.customer_id))
$$;

create or replace function private.protect_profile_privileges()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and (select auth.uid()) is not null
     and not private.has_role(array['admin'::public.app_role]) then
    raise exception 'Only administrators can change roles or account status';
  end if;
  return new;
end;
$$;

create or replace function private.log_business_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; previous_data jsonb; entity uuid;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  previous_data := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  entity := nullif(row_data ->> 'id', '')::uuid;
  insert into public.activity_logs(actor_id, event_type, entity_type, entity_id, metadata)
  values ((select auth.uid()), tg_table_name || '.' || lower(tg_op), tg_table_name, entity,
    jsonb_strip_nulls(jsonb_build_object('status', row_data ->> 'status', 'previous_status', previous_data ->> 'status', 'number', coalesce(row_data ->> 'project_number', row_data ->> 'quotation_number'))));
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.log_business_change() from public, anon, authenticated;
revoke all on function private.current_user_role() from public, anon;
revoke all on function private.has_role(public.app_role[]) from public, anon;
revoke all on function private.can_access_customer(uuid) from public, anon;
revoke all on function private.can_access_project(uuid) from public, anon;
revoke all on function private.can_access_enquiry(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_user_role(), private.has_role(public.app_role[]), private.can_access_customer(uuid), private.can_access_project(uuid), private.can_access_enquiry(uuid) to authenticated;

create trigger on_auth_user_created after insert or update of email on auth.users for each row execute function private.handle_new_user();
create trigger profiles_protect_privileges before update on public.profiles for each row execute function private.protect_profile_privileges();

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','product_categories','products','product_images','customers','enquiries','enquiry_activities','site_visits','site_visit_photos','quotations','quotation_items','project_stage_templates','projects','project_assignments','project_stages','project_updates','project_files','payment_milestones','payments','tasks','feedback','notifications']
  loop execute format('create trigger %I_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name); end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['enquiries','site_visits','quotations','projects','project_stages','project_updates','payments','tasks','feedback']
  loop execute format('create trigger %I_activity after insert or update or delete on public.%I for each row execute function private.log_business_change()', table_name, table_name); end loop;
end $$;

insert into public.profiles (id, full_name, email)
select id, coalesce(raw_user_meta_data ->> 'full_name', ''), coalesce(email, '') from auth.users
on conflict (id) do nothing;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','product_categories','products','product_images','customers','enquiries','enquiry_activities','site_visits','site_visit_photos','quotations','quotation_items','project_stage_templates','projects','project_assignments','project_stages','project_updates','project_files','payment_milestones','payments','tasks','feedback','notifications','activity_logs']
  loop execute format('alter table public.%I enable row level security', table_name); end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.product_categories, public.products, public.product_images to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Profiles and catalogue
create policy "profiles read self or admin" on public.profiles for select to authenticated using (id = (select auth.uid()) or private.has_role(array['admin'::public.app_role]));
create policy "profiles update self or admin" on public.profiles for update to authenticated using (id = (select auth.uid()) or private.has_role(array['admin'::public.app_role])) with check (id = (select auth.uid()) or private.has_role(array['admin'::public.app_role]));
create policy "public reads active categories" on public.product_categories for select to anon using (is_active and archived_at is null);
create policy "staff reads categories" on public.product_categories for select to authenticated using (private.current_user_role() is not null);
create policy "admin manages categories" on public.product_categories for all to authenticated using (private.has_role(array['admin'::public.app_role])) with check (private.has_role(array['admin'::public.app_role]));
create policy "public reads published products" on public.products for select to anon using (is_published and archived_at is null);
create policy "staff reads products" on public.products for select to authenticated using (private.current_user_role() is not null);
create policy "admin manages products" on public.products for all to authenticated using (private.has_role(array['admin'::public.app_role])) with check (private.has_role(array['admin'::public.app_role]));
create policy "public reads published product images" on public.product_images for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.is_published and p.archived_at is null));
create policy "staff reads product images" on public.product_images for select to authenticated using (private.current_user_role() is not null);
create policy "admin manages product images" on public.product_images for all to authenticated using (private.has_role(array['admin'::public.app_role])) with check (private.has_role(array['admin'::public.app_role]));

-- Customer, lead and site operations
create policy "staff reads related customers" on public.customers for select to authenticated using (private.can_access_customer(id));
create policy "sales manages customers" on public.customers for all to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]));
create policy "staff reads related enquiries" on public.enquiries for select to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]) or private.can_access_customer(customer_id));
create policy "sales manages enquiries" on public.enquiries for all to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]));
create policy "staff reads enquiry activity" on public.enquiry_activities for select to authenticated using (private.can_access_enquiry(enquiry_id));
create policy "sales creates enquiry activity" on public.enquiry_activities for insert to authenticated with check (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]) and created_by = (select auth.uid()));
create policy "authors update enquiry activity" on public.enquiry_activities for update to authenticated using (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role])) with check (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role]));
create policy "sales reads site visits" on public.site_visits for select to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]) or assigned_to = (select auth.uid()));
create policy "sales manages site visits" on public.site_visits for all to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]));
create policy "site team updates assigned visits" on public.site_visits for update to authenticated using (private.has_role(array['site_team'::public.app_role]) and assigned_to = (select auth.uid())) with check (assigned_to = (select auth.uid()));
create policy "staff reads visit photos" on public.site_visit_photos for select to authenticated using (exists (select 1 from public.site_visits v where v.id = site_visit_id and (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]) or v.assigned_to = (select auth.uid()))));
create policy "visit team creates photos" on public.site_visit_photos for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.site_visits v where v.id = site_visit_id and (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]) or v.assigned_to = (select auth.uid()))));
create policy "photo owners manage photos" on public.site_visit_photos for update to authenticated using (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role,'sales'::public.app_role])) with check (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role,'sales'::public.app_role]));
create policy "photo owners delete photos" on public.site_visit_photos for delete to authenticated using (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role,'sales'::public.app_role]));

-- Quotations and configurable project delivery
create policy "commercial team reads quotations" on public.quotations for select to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role,'accounts'::public.app_role]));
create policy "sales manages quotations" on public.quotations for all to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]));
create policy "commercial team reads quotation items" on public.quotation_items for select to authenticated using (exists (select 1 from public.quotations q where q.id = quotation_id));
create policy "sales manages quotation items" on public.quotation_items for all to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]));
create policy "staff reads stage templates" on public.project_stage_templates for select to authenticated using (private.current_user_role() is not null);
create policy "admin manages stage templates" on public.project_stage_templates for all to authenticated using (private.has_role(array['admin'::public.app_role])) with check (private.has_role(array['admin'::public.app_role]));
create policy "staff reads related projects" on public.projects for select to authenticated using (private.can_access_project(id));
create policy "sales manages projects" on public.projects for all to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]));
create policy "staff reads project assignments" on public.project_assignments for select to authenticated using (private.can_access_project(project_id));
create policy "sales manages project assignments" on public.project_assignments for all to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]));
create policy "staff reads project stages" on public.project_stages for select to authenticated using (private.can_access_project(project_id));
create policy "delivery team updates stages" on public.project_stages for update to authenticated using (private.can_access_project(project_id) and private.has_role(array['admin'::public.app_role,'sales'::public.app_role,'site_team'::public.app_role])) with check (private.can_access_project(project_id));
create policy "sales creates project stages" on public.project_stages for insert to authenticated with check (private.has_role(array['admin'::public.app_role,'sales'::public.app_role]));
create policy "admin deletes project stages" on public.project_stages for delete to authenticated using (private.has_role(array['admin'::public.app_role]));
create policy "staff reads project updates" on public.project_updates for select to authenticated using (private.can_access_project(project_id));
create policy "delivery team creates project updates" on public.project_updates for insert to authenticated with check (private.can_access_project(project_id) and created_by = (select auth.uid()));
create policy "authors update project updates" on public.project_updates for update to authenticated using (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role])) with check (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role]));
create policy "staff reads project files" on public.project_files for select to authenticated using (private.can_access_project(project_id));
create policy "delivery team creates project files" on public.project_files for insert to authenticated with check (private.can_access_project(project_id) and created_by = (select auth.uid()));
create policy "file owners update project files" on public.project_files for update to authenticated using (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role])) with check (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role]));
create policy "file owners delete project files" on public.project_files for delete to authenticated using (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role]));

-- Accounts, tasks, completion and accountability
create policy "commercial team reads milestones" on public.payment_milestones for select to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role,'accounts'::public.app_role]));
create policy "accounts manages milestones" on public.payment_milestones for all to authenticated using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "commercial team reads payments" on public.payments for select to authenticated using (private.has_role(array['admin'::public.app_role,'sales'::public.app_role,'accounts'::public.app_role]));
create policy "accounts manages payments" on public.payments for all to authenticated using (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])) with check (private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "staff reads related tasks" on public.tasks for select to authenticated using (assigned_to = (select auth.uid()) or created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role]) or (project_id is not null and private.can_access_project(project_id)));
create policy "staff creates tasks" on public.tasks for insert to authenticated with check (private.current_user_role() is not null and created_by = (select auth.uid()));
create policy "assignees update tasks" on public.tasks for update to authenticated using (assigned_to = (select auth.uid()) or created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role])) with check (assigned_to = (select auth.uid()) or created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role]));
create policy "task owners delete tasks" on public.tasks for delete to authenticated using (created_by = (select auth.uid()) or private.has_role(array['admin'::public.app_role]));
create policy "delivery team reads feedback" on public.feedback for select to authenticated using (private.can_access_project(project_id));
create policy "delivery team manages feedback" on public.feedback for all to authenticated using (private.can_access_project(project_id) and private.has_role(array['admin'::public.app_role,'sales'::public.app_role,'site_team'::public.app_role])) with check (private.can_access_project(project_id));
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "users update own notifications" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own notifications" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
create policy "admin creates notifications" on public.notifications for insert to authenticated with check (private.has_role(array['admin'::public.app_role]));
create policy "active staff reads activity logs" on public.activity_logs for select to authenticated using (private.current_user_role() is not null);

-- Storage buckets. Private buckets require signed URLs and RLS-authorized access.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 15728640, array['image/jpeg','image/png','image/webp']),
  ('site-visit-photos', 'site-visit-photos', false, 20971520, array['image/jpeg','image/png','image/webp','image/heic']),
  ('project-files', 'project-files', false, 26214400, array['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('payment-proofs', 'payment-proofs', false, 15728640, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public views product assets" on storage.objects for select to public using (bucket_id = 'product-images');
create policy "admin uploads product assets" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and private.has_role(array['admin'::public.app_role]));
create policy "admin updates product assets" on storage.objects for update to authenticated using (bucket_id = 'product-images' and private.has_role(array['admin'::public.app_role])) with check (bucket_id = 'product-images' and private.has_role(array['admin'::public.app_role]));
create policy "admin deletes product assets" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and private.has_role(array['admin'::public.app_role]));

create policy "visit team views site photos" on storage.objects for select to authenticated using (bucket_id = 'site-visit-photos' and exists (select 1 from public.site_visits v where v.id::text = (storage.foldername(name))[1] and (v.assigned_to = (select auth.uid()) or private.has_role(array['admin'::public.app_role,'sales'::public.app_role]))));
create policy "visit team uploads site photos" on storage.objects for insert to authenticated with check (bucket_id = 'site-visit-photos' and exists (select 1 from public.site_visits v where v.id::text = (storage.foldername(name))[1] and (v.assigned_to = (select auth.uid()) or private.has_role(array['admin'::public.app_role,'sales'::public.app_role]))));
create policy "visit team updates site photos" on storage.objects for update to authenticated using (bucket_id = 'site-visit-photos' and owner_id = (select auth.uid()::text)) with check (bucket_id = 'site-visit-photos' and owner_id = (select auth.uid()::text));
create policy "visit team deletes site photos" on storage.objects for delete to authenticated using (bucket_id = 'site-visit-photos' and (owner_id = (select auth.uid()::text) or private.has_role(array['admin'::public.app_role])));

create policy "project team views files" on storage.objects for select to authenticated using (bucket_id = 'project-files' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and private.can_access_project(((storage.foldername(name))[1])::uuid));
create policy "project team uploads files" on storage.objects for insert to authenticated with check (bucket_id = 'project-files' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and private.can_access_project(((storage.foldername(name))[1])::uuid));
create policy "project file owners update" on storage.objects for update to authenticated using (bucket_id = 'project-files' and owner_id = (select auth.uid()::text)) with check (bucket_id = 'project-files' and owner_id = (select auth.uid()::text));
create policy "project file owners delete" on storage.objects for delete to authenticated using (bucket_id = 'project-files' and (owner_id = (select auth.uid()::text) or private.has_role(array['admin'::public.app_role])));

create policy "accounts views payment proofs" on storage.objects for select to authenticated using (bucket_id = 'payment-proofs' and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "accounts uploads payment proofs" on storage.objects for insert to authenticated with check (bucket_id = 'payment-proofs' and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "accounts updates payment proofs" on storage.objects for update to authenticated using (bucket_id = 'payment-proofs' and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role])) with check (bucket_id = 'payment-proofs' and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));
create policy "accounts deletes payment proofs" on storage.objects for delete to authenticated using (bucket_id = 'payment-proofs' and private.has_role(array['admin'::public.app_role,'accounts'::public.app_role]));

comment on schema private is 'Non-exposed authorization and trigger functions.';
comment on table public.project_stage_templates is 'Configurable defaults copied into project_stages when a project is created.';
comment on table public.activity_logs is 'Append-only accountability events written by database triggers.';
