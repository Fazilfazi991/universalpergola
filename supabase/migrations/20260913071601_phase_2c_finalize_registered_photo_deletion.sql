-- Final photo flow reserves an authorized database row before uploading. This
-- keeps every stored object record-linked without granting read access to
-- unregistered paths. Supabase Storage itself remains responsible for deletes.
drop function if exists public.delete_unregistered_site_visit_photo(text);

drop policy if exists "visit operators delete scoped site photos" on storage.objects;
create policy "visit operators delete registered site photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'site-visit-photos'
  and exists (
    select 1 from public.site_visit_photos p
    where p.storage_path = storage.objects.name
      and (
        private.has_role(array['admin'::public.app_role])
        or (p.created_by = (select auth.uid()) and private.can_access_site_visit(p.site_visit_id))
      )
  )
);
