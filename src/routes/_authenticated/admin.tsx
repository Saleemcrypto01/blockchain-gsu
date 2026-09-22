import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, PageHeader } from "@/components/app/DashboardLayout";
import { ErrorState, LoadingState, UnauthorizedState } from "@/components/app/PageStates";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminDirectory, adminSetUserActive, getChainStatus } from "@/lib/fyp.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directory, setDirectory] = useState<Awaited<ReturnType<typeof adminDirectory>> | null>(
    null,
  );
  const [chain, setChain] = useState<Awaited<ReturnType<typeof getChainStatus>> | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [directoryData, chainData] = await Promise.all([adminDirectory(), getChainStatus()]);
      setDirectory(directoryData);
      setChain(chainData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === "admin") {
      void load();
    }
  }, [load, role]);

  if (role !== "admin") {
    return <UnauthorizedState message="Only administrators can access this page." />;
  }

  const roleByUser = new Map((directory?.roles ?? []).map((row) => [row.user_id, row.role]));
  const filteredProfiles = (directory?.profiles ?? []).filter((profile) => {
    const value = search.trim().toLowerCase();
    if (!value) return true;
    return (
      profile.full_name.toLowerCase().includes(value) || profile.email.toLowerCase().includes(value)
    );
  });

  const toggleActive = async (userId: string, isActive: boolean) => {
    setError(null);
    try {
      await adminSetUserActive({ data: { userId, isActive: !isActive } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update user state");
    }
  };

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Manage users and monitor blockchain system health."
        icon={Settings}
      />
      {loading ? <LoadingState label="Loading admin data..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && directory ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Settings} label="Users" value={directory.profiles.length} />
            <StatCard
              icon={Settings}
              label="Students"
              value={directory.students.length}
              tone="green"
            />
            <StatCard
              icon={Settings}
              label="Supervisors"
              value={directory.supervisors.length}
              tone="purple"
            />
            <StatCard
              icon={Settings}
              label="Wallet configured"
              value={chain?.walletConfigured ? "Yes" : "No"}
              tone={chain?.walletConfigured ? "green" : "orange"}
            />
          </div>

          <div className="surface-card mt-4 p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-search">Search users</Label>
                <Input
                  id="user-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="name or email"
                  className="w-64"
                />
              </div>
            </div>

            {filteredProfiles.length === 0 ? (
              <EmptyState title="No users found" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-3 font-medium">Name</th>
                      <th className="px-2 py-3 font-medium">Email</th>
                      <th className="px-2 py-3 font-medium">Role</th>
                      <th className="px-2 py-3 font-medium">Status</th>
                      <th className="px-2 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map((profile) => (
                      <tr key={profile.id} className="border-b last:border-0">
                        <td className="px-2 py-3">{profile.full_name}</td>
                        <td className="px-2 py-3">{profile.email}</td>
                        <td className="px-2 py-3 capitalize">
                          {roleByUser.get(profile.id) ?? "—"}
                        </td>
                        <td className="px-2 py-3">{profile.is_active ? "Active" : "Inactive"}</td>
                        <td className="px-2 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void toggleActive(profile.id, profile.is_active)}
                          >
                            {profile.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
