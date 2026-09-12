-- Secret/service clients already bypass RLS, but schema/function privileges still
-- apply. Permit trusted administrative provisioning to pass the profile guard.
grant usage on schema private to service_role;
grant execute on function private.has_role(public.app_role[]) to service_role;
