-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('student','supervisor','admin');
CREATE TYPE public.project_status AS ENUM ('draft','submitted','under_review','revision_requested','approved','rejected');
CREATE TYPE public.submission_status AS ENUM ('submitted','under_review','approved','revision_requested','rejected');
CREATE TYPE public.review_decision AS ENUM ('approved','revision_requested','rejected');
CREATE TYPE public.anchor_status AS ENUM ('pending','confirmed','failed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'supervisor' THEN 2 ELSE 3 END LIMIT 1;
$$;

CREATE TABLE public.student_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  matric_number TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL DEFAULT '',
  programme TEXT NOT NULL DEFAULT '',
  academic_session TEXT NOT NULL DEFAULT '',
  level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.supervisor_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id TEXT,
  department TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT 'Dr.',
  specialization TEXT,
  max_students INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_profiles TO authenticated;
GRANT ALL ON public.supervisor_profiles TO service_role;
ALTER TABLE public.supervisor_profiles ENABLE ROW LEVEL SECURITY;

-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  programme TEXT NOT NULL DEFAULT '',
  academic_session TEXT NOT NULL DEFAULT '',
  keywords TEXT,
  status public.project_status NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_student ON public.projects(student_id);
CREATE INDEX idx_projects_supervisor ON public.projects(supervisor_id);
CREATE INDEX idx_projects_status ON public.projects(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.supervisor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assign_project ON public.supervisor_assignments(project_id);
CREATE INDEX idx_assign_supervisor ON public.supervisor_assignments(supervisor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_assignments TO authenticated;
GRANT ALL ON public.supervisor_assignments TO service_role;
ALTER TABLE public.supervisor_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_project_supervisor(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.supervisor_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.supervisor_assignments a
    WHERE a.project_id = _project_id AND a.supervisor_id = _user_id AND a.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.student_id = _user_id);
$$;

-- ============ VERSIONS / SUBMISSIONS ============
CREATE TABLE public.project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  document_hash TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, version_number)
);
CREATE INDEX idx_versions_project ON public.project_versions(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_versions TO authenticated;
GRANT ALL ON public.project_versions TO service_role;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.project_versions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL,
  document_hash TEXT NOT NULL,
  status public.submission_status NOT NULL DEFAULT 'submitted',
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX idx_sub_project ON public.submissions(project_id);
CREATE INDEX idx_sub_student ON public.submissions(student_id);
CREATE INDEX idx_sub_supervisor ON public.submissions(supervisor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision public.review_decision NOT NULL,
  comments TEXT NOT NULL DEFAULT '',
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_submission ON public.reviews(submission_id);
CREATE INDEX idx_reviews_supervisor ON public.reviews(supervisor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============ BLOCKCHAIN ============
CREATE TABLE public.blockchain_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  document_hash TEXT NOT NULL,
  record_key TEXT NOT NULL,
  tx_hash TEXT,
  block_number BIGINT,
  contract_address TEXT,
  network TEXT NOT NULL DEFAULT 'sepolia',
  status public.anchor_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  anchored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chain_submission ON public.blockchain_records(submission_id);
CREATE INDEX idx_chain_project ON public.blockchain_records(project_id);
GRANT SELECT ON public.blockchain_records TO authenticated;
GRANT ALL ON public.blockchain_records TO service_role;
ALTER TABLE public.blockchain_records ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT / NOTIFICATIONS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id, is_read);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

CREATE POLICY "student profile read" ON public.student_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "student profile write" ON public.student_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "supervisor profile read" ON public.supervisor_profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "supervisor profile write" ON public.supervisor_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "projects read" ON public.projects FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_project_supervisor(id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "projects insert own" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND public.has_role(auth.uid(),'student'));
CREATE POLICY "projects update" ON public.projects FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "projects delete own draft" ON public.projects FOR DELETE TO authenticated
  USING ((student_id = auth.uid() AND status = 'draft') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "assignments read" ON public.supervisor_assignments FOR SELECT TO authenticated
  USING (supervisor_id = auth.uid() OR public.is_project_owner(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "assignments admin write" ON public.supervisor_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "versions read" ON public.project_versions FOR SELECT TO authenticated
  USING (public.is_project_owner(project_id, auth.uid()) OR public.is_project_supervisor(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "versions insert own" ON public.project_versions FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_project_owner(project_id, auth.uid()));

CREATE POLICY "submissions read" ON public.submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_project_supervisor(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "reviews read" ON public.reviews FOR SELECT TO authenticated
  USING (supervisor_id = auth.uid() OR public.is_project_owner(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "chain read" ON public.blockchain_records FOR SELECT TO authenticated
  USING (public.is_project_owner(project_id, auth.uid()) OR public.is_project_supervisor(project_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "audit admin read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "notifications own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications own update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "settings read" ON public.system_settings FOR SELECT TO authenticated USING (TRUE);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_student_touch BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_supervisor_touch BEFORE UPDATE ON public.supervisor_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.system_settings(key, value) VALUES
  ('general', '{"institution":"University Final Year Project Repository","max_file_mb":25,"allow_registration":true}'::jsonb),
  ('blockchain', '{"network":"sepolia","auto_anchor":true}'::jsonb);
