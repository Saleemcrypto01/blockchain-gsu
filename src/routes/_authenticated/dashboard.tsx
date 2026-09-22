import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, FileText, Link2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, PageHeader } from "@/components/app/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/app/PageStates";
import { StatCard } from "@/components/app/StatCard";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type Stats = {
  projects: number;
  submissions: number;
  approved: number;
  blockchain: number;
};

function DashboardPage() {
  const { role, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!role || !user) return;
    setLoading(true);
    setError(null);

    try {
      let projectsListQuery = supabase
        .from("projects")
        .select("id")
        .order("created_at", { ascending: false });
      if (role === "student") projectsListQuery = projectsListQuery.eq("student_id", user.id);
      if (role === "supervisor") projectsListQuery = projectsListQuery.eq("supervisor_id", user.id);
      const { data: projectRows, error: projectRowsError } = await projectsListQuery;
      if (projectRowsError) throw new Error(projectRowsError.message);
      const projectIds = (projectRows ?? []).map((row) => row.id);

      let submissionsBase = supabase
        .from("submissions")
        .select("id", { head: true, count: "exact" });
      let approvedBase = supabase
        .from("submissions")
        .select("id", { head: true, count: "exact" })
        .eq("status", "approved");
      if (role === "student") {
        submissionsBase = submissionsBase.eq("student_id", user.id);
        approvedBase = approvedBase.eq("student_id", user.id);
      }
      if (role === "supervisor") {
        submissionsBase = submissionsBase.eq("supervisor_id", user.id);
        approvedBase = approvedBase.eq("supervisor_id", user.id);
      }

      const [submissionsRes, approvedRes, chainRes] = await Promise.all([
        submissionsBase,
        approvedBase,
        role === "admin"
          ? supabase
              .from("blockchain_records")
              .select("id", { head: true, count: "exact" })
              .eq("status", "confirmed")
          : projectIds.length === 0
            ? Promise.resolve({ data: null, count: 0, error: null })
            : supabase
                .from("blockchain_records")
                .select("id", { head: true, count: "exact" })
                .eq("status", "confirmed")
                .in("project_id", projectIds),
      ]);

      if (submissionsRes.error || approvedRes.error || chainRes.error) {
        throw new Error(
          submissionsRes.error?.message ??
            approvedRes.error?.message ??
            chainRes.error?.message ??
            "Failed to load dashboard",
        );
      }

      setStats({
        projects: projectIds.length,
        submissions: submissionsRes.count ?? 0,
        approved: approvedRes.count ?? 0,
        blockchain: chainRes.count ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your project workflow and verification activity."
        icon={ShieldCheck}
      />

      {loading ? <LoadingState label="Loading dashboard..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && !stats ? <EmptyState title="No dashboard data yet" /> : null}

      {!loading && !error && stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={FileText} label="Projects" value={stats.projects} />
            <StatCard icon={Clock3} label="Submissions" value={stats.submissions} tone="orange" />
            <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} tone="green" />
            <StatCard
              icon={Link2}
              label="Confirmed blockchain records"
              value={stats.blockchain}
              tone="purple"
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="surface-card p-5">
              <p className="text-sm font-semibold">Quick actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  to="/projects"
                >
                  Projects
                </Link>
                <Link
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  to="/submissions"
                >
                  Submissions
                </Link>
                <Link
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  to="/verification"
                >
                  Verification
                </Link>
              </div>
            </div>
            <div className="surface-card p-5">
              <p className="text-sm font-semibold">Status</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Keep project status changes inside the authenticated workflow to preserve audit and
                blockchain provenance integrity.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
