update public.project_stages ps
set status='skipped'::public.stage_status, progress=100, completed_at=coalesce(ps.completed_at, now())
from public.projects p
where ps.project_id=p.id and p.status='completed' and ps.stage_key in ('purchase','material_delivery','cutting','fabrication_welding','coating','delivery_handover') and ps.status='not_started';
