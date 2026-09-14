-- Cover Phase 2G audit foreign keys used by review and checklist reporting.

create index if not exists feedback_requested_by_idx
  on public.feedback(requested_by)
  where requested_by is not null;

create index if not exists feedback_reviewed_by_idx
  on public.feedback(reviewed_by)
  where reviewed_by is not null;

create index if not exists feedback_archived_by_idx
  on public.feedback(archived_by)
  where archived_by is not null;

create index if not exists tasks_completed_by_idx
  on public.tasks(completed_by)
  where completed_by is not null;
