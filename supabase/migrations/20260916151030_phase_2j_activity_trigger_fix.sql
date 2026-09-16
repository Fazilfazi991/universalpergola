create or replace function private.log_phase_2j_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare event_name text; target_project uuid; row_data jsonb;
begin
  row_data := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_project := case when tg_table_name in ('internal_expenses','labour_wages') then nullif(row_data->>'project_id','')::uuid else null end;
  event_name := case tg_table_name when 'internal_expenses' then 'expense.'||lower(tg_op) when 'labour_wages' then 'wage.'||lower(tg_op) when 'purchase_bills' then 'bill.'||lower(tg_op) when 'assets' then 'asset.'||lower(tg_op) end;
  insert into public.activity_logs(actor_id,event_type,entity_type,entity_id,metadata)
  values ((select auth.uid()),event_name,tg_table_name,(row_data->>'id')::uuid,jsonb_strip_nulls(jsonb_build_object('project_id',target_project,'scope',row_data->>'scope','name',coalesce(row_data->>'name',row_data->>'description',row_data->>'file_name',row_data->>'worker_name'),'amount',row_data->>'amount','status',row_data->>'status')));
  return case when tg_op='DELETE' then old else new end;
end; $$;
revoke all on function private.log_phase_2j_change() from public, anon, authenticated;
