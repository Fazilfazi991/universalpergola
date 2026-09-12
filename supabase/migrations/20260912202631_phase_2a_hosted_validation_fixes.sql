-- Hosted validation fixes: align database and Storage constraints with the Phase 2A contract.

alter table public.products
  alter column category_id set not null;

update storage.buckets
set file_size_limit = 10485760
where id in ('product-images', 'category-images');

drop policy if exists "admin manages categories" on public.product_categories;
create policy "admin creates categories"
on public.product_categories for insert to authenticated
with check (private.has_role(array['admin'::public.app_role]));
create policy "admin updates categories"
on public.product_categories for update to authenticated
using (private.has_role(array['admin'::public.app_role]))
with check (private.has_role(array['admin'::public.app_role]));
create policy "admin deletes categories"
on public.product_categories for delete to authenticated
using (private.has_role(array['admin'::public.app_role]));

drop policy if exists "admin manages products" on public.products;
create policy "admin creates products"
on public.products for insert to authenticated
with check (private.has_role(array['admin'::public.app_role]));
create policy "admin updates products"
on public.products for update to authenticated
using (private.has_role(array['admin'::public.app_role]))
with check (private.has_role(array['admin'::public.app_role]));
create policy "admin deletes products"
on public.products for delete to authenticated
using (private.has_role(array['admin'::public.app_role]));

drop policy if exists "admin manages product images" on public.product_images;
create policy "admin creates product images"
on public.product_images for insert to authenticated
with check (private.has_role(array['admin'::public.app_role]));
create policy "admin updates product images"
on public.product_images for update to authenticated
using (private.has_role(array['admin'::public.app_role]))
with check (private.has_role(array['admin'::public.app_role]));
create policy "admin deletes product images"
on public.product_images for delete to authenticated
using (private.has_role(array['admin'::public.app_role]));
