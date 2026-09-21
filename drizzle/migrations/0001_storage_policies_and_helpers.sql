-- Storage RLS for project documents. Object path: <project_id>/<filename>
CREATE POLICY "docs student upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-documents'
  AND public.is_project_owner(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "docs read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-documents'
  AND (
    public.is_project_owner(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.is_project_supervisor(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.has_role(auth.uid(),'admin')
  )
);

CREATE POLICY "docs admin delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-documents' AND public.has_role(auth.uid(),'admin'));

-- Aggregate stats helper for admin dashboard
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'students', (SELECT count(*) FROM public.user_roles WHERE role='student'),
    'supervisors', (SELECT count(*) FROM public.user_roles WHERE role='supervisor'),
    'projects', (SELECT count(*) FROM public.projects),
    'departments', (SELECT count(DISTINCT department) FROM public.projects WHERE department <> ''),
    'submissions', (SELECT count(*) FROM public.submissions),
    'anchored', (SELECT count(*) FROM public.blockchain_records WHERE status='confirmed')
  ) INTO result;
  RETURN result;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
