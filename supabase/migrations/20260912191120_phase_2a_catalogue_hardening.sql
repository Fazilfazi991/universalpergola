-- Universal Pergola: Phase 2A catalogue hardening.
-- This migration is intentionally additive so the Phase 1 foundation remains auditable.

alter table public.product_categories
  add column long_description text,
  add column image_storage_path text unique,
  add column image_alt_text text,
  add column seo_title text,
  add column seo_description text,
  add constraint product_categories_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

alter table public.products
  add constraint products_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create index product_categories_management_idx
  on public.product_categories (is_active, sort_order, name)
  where archived_at is null;

create index products_management_idx
  on public.products (category_id, is_published, is_featured, updated_at desc)
  where archived_at is null;

-- A public product must always belong to an active, non-archived category.
drop policy if exists "public reads published products" on public.products;
create policy "public reads published products"
on public.products for select to anon
using (
  is_published
  and archived_at is null
  and exists (
    select 1
    from public.product_categories c
    where c.id = category_id
      and c.is_active
      and c.archived_at is null
  )
);

drop policy if exists "public reads published product images" on public.product_images;
create policy "public reads published product images"
on public.product_images for select to anon
using (
  exists (
    select 1
    from public.products p
    join public.product_categories c on c.id = p.category_id
    where p.id = product_id
      and p.is_published
      and p.archived_at is null
      and c.is_active
      and c.archived_at is null
  )
);

-- Catalogue actions use explicit event names so publication changes are auditable.
create or replace function private.log_catalogue_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  row_data jsonb;
  entity uuid;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  entity := nullif(row_data ->> 'id', '')::uuid;

  if tg_table_name = 'product_categories' then
    if tg_op = 'INSERT' then
      event_name := 'category.created';
    elsif tg_op = 'DELETE' then
      event_name := 'category.deleted';
    elsif new.archived_at is distinct from old.archived_at and new.archived_at is not null then
      event_name := 'category.archived';
    elsif new.is_active is distinct from old.is_active then
      event_name := case when new.is_active then 'category.activated' else 'category.deactivated' end;
    else
      event_name := 'category.updated';
    end if;
  else
    if tg_op = 'INSERT' then
      event_name := 'product.created';
    elsif tg_op = 'DELETE' then
      event_name := 'product.deleted';
    elsif new.archived_at is distinct from old.archived_at and new.archived_at is not null then
      event_name := 'product.archived';
    elsif new.is_published is distinct from old.is_published then
      event_name := case when new.is_published then 'product.published' else 'product.unpublished' end;
    else
      event_name := 'product.updated';
    end if;
  end if;

  insert into public.activity_logs (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  ) values (
    (select auth.uid()),
    event_name,
    tg_table_name,
    entity,
    jsonb_strip_nulls(jsonb_build_object(
      'name', row_data ->> 'name',
      'slug', row_data ->> 'slug',
      'is_active', row_data ->> 'is_active',
      'is_published', row_data ->> 'is_published'
    ))
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.log_catalogue_change() from public, anon, authenticated;

create trigger product_categories_activity
after insert or update or delete on public.product_categories
for each row execute function private.log_catalogue_change();

create trigger products_activity
after insert or update or delete on public.products
for each row execute function private.log_catalogue_change();

-- Product and category media are private buckets. Read access is granted only
-- when the object is referenced by public catalogue data or the user is admin.
update storage.buckets
set public = false,
    file_size_limit = 15728640,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'product-images';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'category-images',
  'category-images',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public views product assets" on storage.objects;
drop policy if exists "admin uploads product assets" on storage.objects;
drop policy if exists "admin updates product assets" on storage.objects;
drop policy if exists "admin deletes product assets" on storage.objects;

create policy "catalogue views published product assets"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.product_images i
    join public.products p on p.id = i.product_id
    join public.product_categories c on c.id = p.category_id
    where i.storage_path = storage.objects.name
      and p.is_published
      and p.archived_at is null
      and c.is_active
      and c.archived_at is null
  )
);

create policy "admin views all product assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'product-images'
  and private.has_role(array['admin'::public.app_role])
);

create policy "admin uploads product assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and private.has_role(array['admin'::public.app_role])
  and (storage.foldername(storage.objects.name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and lower(storage.objects.name) ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpe?g|png|webp)$'
  and exists (
    select 1 from public.products p
    where p.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

create policy "admin updates product assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and private.has_role(array['admin'::public.app_role])
)
with check (
  bucket_id = 'product-images'
  and private.has_role(array['admin'::public.app_role])
  and lower(storage.objects.name) ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpe?g|png|webp)$'
);

create policy "admin deletes product assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and private.has_role(array['admin'::public.app_role])
);

create policy "catalogue views active category assets"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'category-images'
  and exists (
    select 1
    from public.product_categories c
    where c.image_storage_path = storage.objects.name
      and c.is_active
      and c.archived_at is null
  )
);

create policy "admin views all category assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'category-images'
  and private.has_role(array['admin'::public.app_role])
);

create policy "admin uploads category assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'category-images'
  and private.has_role(array['admin'::public.app_role])
  and (storage.foldername(storage.objects.name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and lower(storage.objects.name) ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpe?g|png|webp)$'
  and exists (
    select 1 from public.product_categories c
    where c.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

create policy "admin updates category assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'category-images'
  and private.has_role(array['admin'::public.app_role])
)
with check (
  bucket_id = 'category-images'
  and private.has_role(array['admin'::public.app_role])
  and lower(storage.objects.name) ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpe?g|png|webp)$'
);

create policy "admin deletes category assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'category-images'
  and private.has_role(array['admin'::public.app_role])
);
