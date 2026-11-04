-- The role value is added by the preceding migration.
alter table public.profiles add column username text;
update public.profiles
set username = 'u' || left(replace(id::text, '-', ''), 31)
where username is null;
alter table public.profiles alter column username set default ('u' || left(replace(gen_random_uuid()::text, '-', ''), 31));
alter table public.profiles alter column username set not null;
alter table public.profiles add constraint profiles_username_format
  check (username ~ '^[a-z][a-z0-9_]{2,31}$' and username = lower(username));
create unique index profiles_username_ci_key on public.profiles (lower(username));

-- Purchase bills have no lifecycle column in Phase 2J; archive verified
-- fixture bills along with their parent expenses while preserving their files.
alter table public.purchase_bills add column archived_at timestamptz;
create index purchase_bills_visible_idx on public.purchase_bills(created_at desc) where archived_at is null;

create or replace function private.can_access_customer(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case private.current_user_role()
    when 'admin' then true
    when 'investor' then true
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
    when 'investor' then true
    when 'sales' then true
    when 'accounts' then true
    when 'site_team' then exists (select 1 from public.project_assignments a where a.project_id = target and a.user_id = (select auth.uid()))
    else false end
$$;

create or replace function private.can_access_site_visit(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case private.current_user_role()
    when 'admin' then true
    when 'sales' then true
    when 'investor' then true
    when 'site_team' then exists (
      select 1 from public.site_visits v
      where v.id = target and v.assigned_to = (select auth.uid()) and v.archived_at is null
    )
    else false end
$$;

create or replace function private.can_read_quotation(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case private.current_user_role()
    when 'admin' then true
    when 'accounts' then true
    when 'investor' then true
    when 'sales' then exists (
      select 1 from public.quotations q
      where q.id = target and (q.owner_id = (select auth.uid()) or q.created_by = (select auth.uid()))
    )
    when 'site_team' then exists (
      select 1 from public.quotations q join public.site_visits v on v.id = q.site_visit_id
      where q.id = target and v.assigned_to = (select auth.uid())
    )
    else false end
$$;

create or replace function private.can_read_invoice(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role(array['admin'::public.app_role, 'accounts'::public.app_role, 'investor'::public.app_role])
    and exists (select 1 from public.invoices i where i.id = target and i.archived_at is null)
$$;

-- A self-service investor profile edit may change only the two presented fields.
create or replace function private.protect_profile_privileges()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    if (new.role is distinct from old.role or new.status is distinct from old.status)
       and not private.has_role(array['admin'::public.app_role]) then
      raise exception 'Only administrators can change roles or account status';
    end if;
    if private.current_user_role() = 'investor'::public.app_role
       and (to_jsonb(new) - array['full_name','username','updated_at'])
           is distinct from (to_jsonb(old) - array['full_name','username','updated_at']) then
      raise exception 'Investor profile edits are limited to display name and username';
    end if;
  end if;
  return new;
end;
$$;

-- Server Actions use this secret-gated lookup; the secret is provisioned outside
-- migrations and never sent to the browser. Supabase Auth still verifies passwords.
create table private.username_lookup_settings (
  singleton boolean primary key default true check (singleton),
  secret_hash bytea not null
);
create table private.username_lookup_attempts (
  scope_hash text not null,
  time_bucket bigint not null,
  attempts integer not null default 0,
  primary key (scope_hash, time_bucket)
);
alter table private.username_lookup_settings enable row level security;
alter table private.username_lookup_attempts enable row level security;
revoke all on private.username_lookup_settings, private.username_lookup_attempts from public, anon, authenticated;

create function public.resolve_login_username(p_username text, p_ip_hash text, p_secret text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  secret_digest bytea;
  bucket bigint := floor(extract(epoch from now()) / 900)::bigint;
  scope text;
  n integer;
  result_email text;
begin
  select secret_hash into secret_digest from private.username_lookup_settings where singleton;
  if secret_digest is null or p_secret is null
     or extensions.digest(p_secret, 'sha256') <> secret_digest then
    raise exception 'Login lookup is unavailable';
  end if;
  if p_username !~ '^[a-zA-Z][a-zA-Z0-9_]{2,31}$' or p_ip_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  foreach scope in array array[
    'ip:' || p_ip_hash,
    'user:' || encode(extensions.digest(lower(p_username), 'sha256'), 'hex')
  ] loop
    insert into private.username_lookup_attempts(scope_hash, time_bucket, attempts)
    values (scope, bucket, 1)
    on conflict (scope_hash, time_bucket) do update
      set attempts = private.username_lookup_attempts.attempts + 1
    returning attempts into n;
    -- Return normally so the attempt counter is committed. Raising here
    -- would roll back the increment and make the limit ineffective.
    if n > (case when left(scope, 3) = 'ip:' then 20 else 10 end) then
      return null;
    end if;
  end loop;
  select u.email into result_email
  from public.profiles p join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
    and p.status = 'active'::public.profile_status
  limit 1;
  return result_email;
end;
$$;
revoke all on function public.resolve_login_username(text,text,text) from public;
grant execute on function public.resolve_login_username(text,text,text) to anon, authenticated;

-- All present and future policies on these tables are constrained by a
-- restrictive investor write gate. A trigger also covers SECURITY DEFINER RPCs.
create function private.deny_investor_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if private.current_user_role() = 'investor'::public.app_role then
    raise exception 'Investor access is read-only';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'product_categories','products','product_images','customers','enquiries',
    'enquiry_activities','site_visits','site_visit_measurements','site_visit_photos',
    'site_visit_activities','quotations','quotation_items','invoices','invoice_items',
    'projects','project_assignments','project_stage_templates','project_stages',
    'project_updates','project_files','payment_milestones','payments','payment_proofs',
    'internal_expenses','labour_wages','assets','tasks','notifications','feedback',
    'purchase_bills','activity_logs'
  ] loop
    execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (not private.has_role(array[''investor''::public.app_role]))', 'investor_denies_insert', table_name);
    execute format('create policy %I on public.%I as restrictive for update to authenticated using (not private.has_role(array[''investor''::public.app_role])) with check (not private.has_role(array[''investor''::public.app_role]))', 'investor_denies_update', table_name);
    execute format('create policy %I on public.%I as restrictive for delete to authenticated using (not private.has_role(array[''investor''::public.app_role]))', 'investor_denies_delete', table_name);
    if table_name <> 'activity_logs' then
      execute format('create trigger investor_write_guard before insert or update or delete on public.%I for each row execute function private.deny_investor_mutation()', table_name);
    end if;
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'customers','enquiries','enquiry_activities','site_visits','site_visit_measurements',
    'site_visit_photos','site_visit_activities','quotations','quotation_items',
    'invoices','invoice_items','projects','project_assignments','project_stages',
    'project_updates','project_files','payment_milestones','payments','payment_proofs',
    'internal_expenses','labour_wages','assets','tasks','feedback','purchase_bills'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.has_role(array[''investor''::public.app_role]))', 'investor_reads_business', table_name);
  end loop;
end $$;

create policy "investor reads active site photos" on storage.objects for select to authenticated
using (bucket_id = 'site-visit-photos' and private.has_role(array['investor'::public.app_role])
  and exists (select 1 from public.site_visit_photos photo join public.site_visits visit on visit.id = photo.site_visit_id
    where photo.storage_path = storage.objects.name and visit.archived_at is null));
create policy "investor reads active project files" on storage.objects for select to authenticated
using (bucket_id = 'project-files' and private.has_role(array['investor'::public.app_role])
  and exists (select 1 from public.project_files file join public.projects project on project.id = file.project_id
    where file.storage_path = storage.objects.name and file.upload_status = 'ready' and project.archived_at is null));
create policy "investor reads ready payment proofs" on storage.objects for select to authenticated
using (bucket_id = 'payment-proofs' and private.has_role(array['investor'::public.app_role])
  and exists (select 1 from public.payment_proofs proof join public.payments payment on payment.id = proof.payment_id
    where proof.storage_path = storage.objects.name and proof.upload_status = 'ready' and proof.archived_at is null and payment.archived_at is null));
create policy "investor reads active internal documents" on storage.objects for select to authenticated
using (bucket_id = 'internal-documents' and private.has_role(array['investor'::public.app_role])
  and (exists(select 1 from public.purchase_bills bill where bill.storage_path = storage.objects.name and bill.archived_at is null)
    or exists(select 1 from public.assets asset where asset.image_path = storage.objects.name and asset.archived_at is null)));
create policy "investor reads category images" on storage.objects for select to authenticated
using (bucket_id = 'category-images' and private.has_role(array['investor'::public.app_role])
  and exists(select 1 from public.product_categories category where category.image_storage_path = storage.objects.name and category.archived_at is null));
create policy "investor denies uploads" on storage.objects as restrictive for insert to authenticated
with check (not private.has_role(array['investor'::public.app_role]));
create policy "investor denies object updates" on storage.objects as restrictive for update to authenticated
using (not private.has_role(array['investor'::public.app_role]))
with check (not private.has_role(array['investor'::public.app_role]));
create policy "investor denies object deletes" on storage.objects as restrictive for delete to authenticated
using (not private.has_role(array['investor'::public.app_role]));
