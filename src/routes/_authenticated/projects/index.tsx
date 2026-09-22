import { createFileRoute, Link } from "@tanstack/react-router";
import { BookMarked, PlusCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, PageHeader } from "@/components/app/DashboardLayout";
import { ErrorState, LoadingState } from "@/components/app/PageStates";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/projects/")({
  component: ProjectsPage,
});

type Project = Tables<"projects">;

function ProjectsPage() {
  const { role, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "",
    programme: "",
    academic_session: "",
    keywords: "",
  });

  const load = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    setError(null);

    let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (role === "student" && user) query = query.eq("student_id", user.id);
    if (role === "supervisor" && user) query = query.eq("supervisor_id", user.id);

    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setProjects(data ?? []);
    if (role === "student" && data && data[0]) {
      const first = data[0];
      setForm({
        title: first.title,
        description: first.description,
        department: first.department,
        programme: first.programme,
        academic_session: first.academic_session,
        keywords: first.keywords ?? "",
      });
    }
    setLoading(false);
  }, [role, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const studentProject = useMemo(() => (role === "student" ? projects[0] : null), [projects, role]);

  const saveProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (role !== "student" || !user) return;
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      department: form.department.trim(),
      programme: form.programme.trim(),
      academic_session: form.academic_session.trim(),
      keywords: form.keywords.trim() || null,
    };

    if (!payload.title || !payload.description) {
      setError("Title and description are required.");
      setSaving(false);
      return;
    }

    const action = studentProject
      ? supabase.from("projects").update(payload).eq("id", studentProject.id)
      : supabase.from("projects").insert({ ...payload, student_id: user.id });

    const { error: saveError } = await action;
    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    await load();
  };

  return (
    <div>
      <PageHeader
        title={
          role === "admin" ? "Projects" : role === "supervisor" ? "Assigned projects" : "My project"
        }
        description="Create, update and track project metadata before submission."
        icon={BookMarked}
      />

      {loading ? <LoadingState label="Loading projects..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && role === "student" ? (
        <form className="surface-card space-y-4 p-5" onSubmit={saveProject}>
          <p className="text-sm font-semibold">
            {studentProject ? "Edit project details" : "Create your project"}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
              rows={4}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={form.department}
                onChange={(e) => setForm((v) => ({ ...v, department: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="programme">Programme</Label>
              <Input
                id="programme"
                value={form.programme}
                onChange={(e) => setForm((v) => ({ ...v, programme: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="session">Academic session</Label>
              <Input
                id="session"
                value={form.academic_session}
                onChange={(e) => setForm((v) => ({ ...v, academic_session: e.target.value }))}
                placeholder="2025/2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                value={form.keywords}
                onChange={(e) => setForm((v) => ({ ...v, keywords: e.target.value }))}
                placeholder="blockchain, cryptography"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            {studentProject ? (
              <StatusBadge status={studentProject.status} />
            ) : (
              <span className="text-xs text-muted-foreground">
                Drafts can be submitted from the submissions page.
              </span>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : studentProject ? "Update project" : "Create project"}
            </Button>
          </div>
        </form>
      ) : null}

      {!loading && !error && role !== "student" ? (
        projects.length === 0 ? (
          <EmptyState
            title="No projects found"
            description="Projects will appear here once students create them."
          />
        ) : (
          <div className="surface-card overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last updated</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{project.title}</p>
                      <p className="text-xs text-muted-foreground">{project.programme}</p>
                    </td>
                    <td className="px-4 py-3">{project.department || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: project.id }}
                        className="text-primary hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {!loading && !error && role === "student" && studentProject ? (
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/projects/$projectId" params={{ projectId: studentProject.id }}>
              <PlusCircle className="mr-2 size-4" /> View project detail
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
