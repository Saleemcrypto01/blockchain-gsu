DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['audit_logs','blockchain_records','notifications','profiles','project_versions','projects','reviews','student_profiles','submissions','supervisor_assignments','supervisor_profiles','system_settings','user_roles']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_role_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_supervisor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;