-- Explicit child removal should be logged, but a cascading visit deletion must
-- not attempt to create a new activity against the parent being removed.
create or replace function private.log_site_measurement_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare visit_id uuid;
declare measurement_label text;
begin
  if tg_op = 'DELETE' then visit_id := old.site_visit_id; measurement_label := old.label;
  else visit_id := new.site_visit_id; measurement_label := new.label; end if;
  if exists (select 1 from public.site_visits v where v.id = visit_id) then
    insert into public.site_visit_activities(site_visit_id, activity_type, note, created_by)
    values (visit_id, case tg_op when 'INSERT' then 'measurement_added' when 'UPDATE' then 'measurement_updated' else 'measurement_removed' end, measurement_label, (select auth.uid()));
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.log_site_photo_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare visit_id uuid;
declare photo_note text;
begin
  if tg_op = 'DELETE' then visit_id := old.site_visit_id; photo_note := coalesce(old.caption, old.photo_type, 'Site photo');
  else visit_id := new.site_visit_id; photo_note := coalesce(new.caption, new.photo_type, 'Site photo'); end if;
  if exists (select 1 from public.site_visits v where v.id = visit_id) then
    insert into public.site_visit_activities(site_visit_id, activity_type, note, created_by)
    values (visit_id, case when tg_op = 'INSERT' then 'photo_uploaded' else 'photo_removed' end, photo_note, (select auth.uid()));
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.log_site_measurement_change(), private.log_site_photo_change() from public, anon, authenticated;
