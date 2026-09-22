import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/app/DashboardLayout";
import { ErrorState, LoadingState, UnauthorizedState } from "@/components/app/PageStates";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { markUnderReview, reviewSubmission } from "@/lib/fyp.functions";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/reviews")({
  component: ReviewsPage,
});

type Submission = Tables<"submissions">;

function ReviewsPage() {
  const { role, user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>("");
  const [decision, setDecision] = useState<"approved" | "revision_requested" | "rejected">(
    "approved",
  );
  const [comments, setComments] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (role === "supervisor" && user) query = query.eq("supervisor_id", user.id);

    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setSubmissions(data ?? []);
    setSubmissionId((current) => current || (data ?? [])[0]?.id || "");
    setLoading(false);
  }, [role, user]);

  useEffect(() => {
    if (role === "supervisor" || role === "admin") {
      void load();
    }
  }, [load, role]);

  if (role !== "supervisor" && role !== "admin") {
    return (
      <UnauthorizedState message="Only supervisors and administrators can review submissions." />
    );
  }

  const selected = submissions.find((submission) => submission.id === submissionId);

  const startReview = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await markUnderReview({ data: { submissionId: selected.id } });
      toast.success("Submission marked under review");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark submission under review");
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await reviewSubmission({ data: { submissionId: selected.id, decision, comments } });
      toast.success("Review saved");
      setComments("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Process assigned submissions safely and transparently."
        icon={ClipboardCheck}
      />

      {loading ? <LoadingState label="Loading reviews..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && submissions.length === 0 ? (
        <EmptyState title="No submissions to review" />
      ) : null}

      {!loading && !error && submissions.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="surface-card p-5">
            <div className="space-y-1.5">
              <Label>Submission</Label>
              <Select value={submissionId} onValueChange={setSubmissionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select submission" />
                </SelectTrigger>
                <SelectContent>
                  {submissions.map((submission) => (
                    <SelectItem key={submission.id} value={submission.id}>
                      {submission.project_id.slice(0, 8)}… • v{submission.version_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected ? (
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Project:</span>{" "}
                  <span className="font-mono text-xs">{selected.project_id}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Version:</span> v{selected.version_number}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <StatusBadge status={selected.status} />
                </div>
                <Button
                  variant="outline"
                  onClick={() => void startReview()}
                  disabled={saving || selected.status !== "submitted"}
                >
                  Mark under review
                </Button>
              </div>
            ) : null}
          </div>

          <form className="surface-card p-5" onSubmit={submitReview}>
            <p className="text-sm font-semibold">Review decision</p>
            <div className="mt-3 space-y-1.5">
              <Label>Decision</Label>
              <Select
                value={decision}
                onValueChange={(value) => setDecision(value as typeof decision)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="revision_requested">Request revision</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label>Comments</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={5}
                required
                placeholder="Provide review feedback for the student"
              />
            </div>
            <Button type="submit" className="mt-4" disabled={saving || !selected}>
              {saving ? "Saving..." : "Submit review"}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
