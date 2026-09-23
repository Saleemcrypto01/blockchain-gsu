ALTER TABLE public.project_versions
  ADD COLUMN chapter_number INTEGER;

ALTER TABLE public.project_versions
  ADD CONSTRAINT project_versions_chapter_number_check
  CHECK (chapter_number IS NULL OR chapter_number BETWEEN 1 AND 5);

CREATE INDEX idx_versions_project_chapter
  ON public.project_versions(project_id, chapter_number, version_number DESC);