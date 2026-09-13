-- Allow a legitimate uploader to roll back a private Storage object when the
-- subsequent database metadata insert fails. Read access remains restricted to
-- registered photo rows, so orphan objects are never exposed.
drop policy if exists "visit operators delete registered site photos" on storage.objects;

create policy "visit operators delete scoped site photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'site-visit-photos'
  and (
    private.has_role(array['admin'::public.app_role])
    or (
      owner_id = (select auth.uid()::text)
      and private.has_role(array['site_team'::public.app_role])
      and exists (
        select 1
        from public.site_visits v
        where v.id::text = (storage.foldername(storage.objects.name))[1]
          and v.assigned_to = (select auth.uid())
      )
    )
  )
);
