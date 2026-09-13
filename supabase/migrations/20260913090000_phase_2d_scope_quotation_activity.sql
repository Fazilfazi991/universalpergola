-- Quotation activity carries commercial metadata and must follow the same
-- assignment boundary as its quotation rather than the Phase 1 global staff view.

drop policy if exists "active staff reads activity logs" on public.activity_logs;
create policy "active staff reads authorized activity logs"
on public.activity_logs
for select
to authenticated
using (
  private.current_user_role() is not null
  and (
    entity_type <> 'quotations'
    or entity_id is null
    or private.can_read_quotation(entity_id)
  )
);
