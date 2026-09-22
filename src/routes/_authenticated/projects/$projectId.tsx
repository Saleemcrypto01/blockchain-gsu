import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BookMarked, FileText } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/DashboardLayout";
import { ErrorState, LoadingState, UnauthorizedState } from "@/components/app/PageStates";
import { StatusBadge } from "@/components/app/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  component: ProjectDetailsPage,
});

type Project = Tables<"projects">;
type Version = Tables<"project_versions">;

function ProjectDetailsPage() {
  const { role } = useAuth();
  const { projectId } = Route.useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

            {versions.length === 0 ? (
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
