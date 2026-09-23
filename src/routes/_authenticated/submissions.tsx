import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app/DashboardLayout";
import { ErrorState, LoadingState } from "@/components/app/PageStates";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitProject } from "@/lib/fyp.functions";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/submissions")({
  component: SubmissionsPage,
});

type Submission = Tables<"submissions">;
type Project = Tables<"projects">;

function SubmissionsPage() {
  const { role, user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let projectsQuery = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      let submissionsQuery = supabase
        .from("submissions")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (role === "student" && user) {
        projectsQuery = projectsQuery.eq("student_id", user.id);
        submissionsQuery = submissionsQuery.eq("student_id", user.id);
      }
      if (role === "supervisor" && user) {
        projectsQuery = projectsQuery.eq("supervisor_id", user.id);
        submissionsQuery = submissionsQuery.eq("supervisor_id", user.id);
      }

      const [
        { data: projectData, error: projectsError },
        { data: submissionData, error: submissionsError },
      ] = await Promise.all([projectsQuery, submissionsQuery]);

      if (projectsError || submissionsError) {
        throw new Error(
          projectsError?.message ?? submissionsError?.message ?? "Could not load submissions",
        );
      }

      setProjects(projectData ?? []);
      setSubmissions(submissionData ?? []);

      if ((projectData ?? []).length > 0) {
        const firstProjectId = (projectData ?? [])[0]!.id;
        setProjectId((current) => current || firstProjectId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load submissions");
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeProject = async (nextProjectId: string) => {
    setProjectId(nextProjectId);
  };

  const canSubmit = role === "student";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId) {
      setError("Choose a project.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await submitProject({ data: { projectId } });
      toast.success(result.anchor.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Submissions"
        description="Submit project versions and track review decisions."
        icon={FileCheck2}
      />

      {loading ? <LoadingState label="Loading submissions..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && canSubmit ? (
        <form className="surface-card mb-4 grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={(value) => void changeProject(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={saving || !projectId}>
              {saving ? "Submitting..." : "Submit for review"}
            </Button>
          </div>
        </form>
      ) : null}

      {!loading && !error && submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Submitted versions will appear here after students submit them for review."
        />
      ) : null}

      {!loading && !error && submissions.length > 0 ? (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Project ID</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Final</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{submission.project_id}</td>
                  <td className="px-4 py-3">v{submission.version_number}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={submission.status} />
                  </td>
                  <td className="px-4 py-3">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{submission.is_final ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
