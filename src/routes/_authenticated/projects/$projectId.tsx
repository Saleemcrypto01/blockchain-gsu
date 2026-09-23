import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BookMarked, Download, Upload } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/DashboardLayout";
import { ErrorState, LoadingState, UnauthorizedState } from "@/components/app/PageStates";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { getDocumentUrl } from "@/lib/fyp.functions";
import { sha256File } from "@/lib/hash";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  component: ProjectDetailsPage,
});

type Project = Tables<"projects">;
type Version = Tables<"project_versions">;
const chapters = [1, 2, 3, 4, 5] as const;

function ProjectDetailsPage() {
  const { role, user } = useAuth();
  const { projectId } = Route.useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingChapter, setUploadingChapter] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [{ data: projectData, error: projectError }, { data: versionData, error: versionError }] =
      await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
        supabase
          .from("project_versions")
          .select("*")
          .eq("project_id", projectId)
          .order("version_number", { ascending: false }),
      ]);

    if (projectError || versionError) {
      setError(projectError?.message ?? versionError?.message ?? "Could not load project");
      setLoading(false);
      return;
    }

    setProject(projectData);
    setVersions(versionData ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const latestByChapter = new Map<number, Version>();
  for (const version of versions) {
    if (version.chapter_number && !latestByChapter.has(version.chapter_number)) {
      latestByChapter.set(version.chapter_number, version);
    }
  }

  const uploadChapter = async (chapter: number, file: File | undefined) => {
    if (!file || !project || role !== "student" || !user) return;
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Each chapter must be a PDF file.");
      return;
    }
    setUploadingChapter(chapter);
    setError(null);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${project.id}/chapter-${chapter}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("project-documents").upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (uploadError) {
      setError(uploadError.message);
      setUploadingChapter(null);
      return;
    }
    const documentHash = await sha256File(file);
    const nextVersion = Math.max(0, ...versions.map((version) => version.version_number)) + 1;
    const { error: insertError } = await supabase.from("project_versions").insert({
      project_id: project.id,
      chapter_number: chapter,
      version_number: nextVersion,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: "application/pdf",
      document_hash: documentHash,
      uploaded_by: user.id,
    });
    if (insertError) {
      setError(insertError.message);
      setUploadingChapter(null);
      return;
    }
    await supabase.from("projects").update({ current_version: nextVersion }).eq("id", project.id);
    setUploadingChapter(null);
    await load();
  };

  const openDocument = async (version: Version) => {
    setDownloadError(null);
    try {
      const result = await getDocumentUrl({ data: { versionId: version.id } });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Could not open document.");
    }
  };

  if (role === "student" || role === "supervisor" || role === "admin") {
    return (
      <div>
        <PageHeader
          title="Project details"
          description="Project metadata and uploaded versions."
          icon={BookMarked}
        />
        {loading ? <LoadingState label="Loading project..." /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && !project ? (
          <UnauthorizedState message="This project was not found or you do not have access to it." />
        ) : null}

        {!loading && !error && project ? (
          <div className="space-y-4">
            <div className="surface-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{project.title}</h2>
                <StatusBadge status={project.status} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Department</dt>
                  <dd>{project.department || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Programme</dt>
                  <dd>{project.programme || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Academic session</dt>
                  <dd>{project.academic_session || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Current version</dt>
                  <dd>{project.current_version}</dd>
                </div>
              </dl>
            </div>

            {role === "student" ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Project chapters</h2>
                  <p className="text-sm text-muted-foreground">Upload one PDF for each chapter. Replacing a chapter creates a new version and keeps its history.</p>
                </div>
                {downloadError ? <p className="text-sm text-destructive">{downloadError}</p> : null}
                <div className="grid gap-3 lg:grid-cols-2">
                  {chapters.map((chapter) => {
                    const version = latestByChapter.get(chapter);
                    return (
                      <div key={chapter} className="rounded-md border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-medium">Chapter {chapter}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{version?.file_name ?? "No file uploaded"}</p>
                          </div>
                          <StatusBadge status={version ? "uploaded" : "pending"} />
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div><dt>File type</dt><dd className="text-foreground">{version?.mime_type ?? "PDF only"}</dd></div>
                          <div><dt>Uploaded</dt><dd className="text-foreground">{version ? new Date(version.created_at).toLocaleString() : "—"}</dd></div>
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" disabled={!version} onClick={() => version && void openDocument(version)}>
                            <Download className="mr-2 size-4" /> View / Download
                          </Button>
                          <Button type="button" variant="outline" size="sm" asChild disabled={uploadingChapter === chapter}>
                            <label>
                              <Upload className="mr-2 size-4" /> {uploadingChapter === chapter ? "Uploading..." : version ? "Replace" : "Upload PDF"}
                              <input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(event) => void uploadChapter(chapter, event.target.files?.[0])} />
                            </label>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : versions.length === 0 ? (
              <EmptyState
                title="No uploaded versions yet"
                description="Upload a document version before submitting for review."
              />
            ) : (
              <div className="surface-card overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Version</th>
                      <th className="px-4 py-3 font-medium">File</th>
                      <th className="px-4 py-3 font-medium">Uploaded</th>
                      <th className="px-4 py-3 font-medium">Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((version) => (
                      <tr key={version.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">v{version.version_number}</td>
                        <td className="px-4 py-3">{version.file_name}</td>
                        <td className="px-4 py-3">
                          {new Date(version.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {version.document_hash.slice(0, 20)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return <UnauthorizedState message="You are not authorised to view projects." />;
}
