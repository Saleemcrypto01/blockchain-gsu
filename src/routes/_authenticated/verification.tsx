import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, PageHeader } from "@/components/app/DashboardLayout";
import { ErrorState, LoadingState } from "@/components/app/PageStates";
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
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { verifySubmission } from "@/lib/fyp.functions";

export const Route = createFileRoute("/_authenticated/verification")({
  component: VerificationPage,
});

type Submission = Tables<"submissions">;

type VerificationResult = Awaited<ReturnType<typeof verifySubmission>>;

function VerificationPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionId, setSubmissionId] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("submissions")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(50);

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setSubmissions(data ?? []);
    setSubmissionId((current) => current || (data ?? [])[0]?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runVerification = async () => {
    if (!submissionId) return;
    setChecking(true);
    setError(null);
    try {
      const response = await verifySubmission({ data: { submissionId } });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify submission");
      setResult(null);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Blockchain verification"
        description="Compare stored document hashes with blockchain records."
        icon={ShieldCheck}
      />

      {loading ? <LoadingState label="Loading submissions..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && submissions.length === 0 ? (
        <EmptyState title="No submissions available for verification" />
      ) : null}

      {!loading && !error && submissions.length > 0 ? (
        <div className="space-y-4">
          <div className="surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
            <div className="w-full space-y-1.5 sm:max-w-md">
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
            <Button onClick={() => void runVerification()} disabled={!submissionId || checking}>
              {checking ? "Verifying..." : "Verify"}
            </Button>
          </div>

          {result ? (
            <div className="surface-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Verification result</p>
                <StatusBadge
                  status={result.verified ? "approved" : "rejected"}
                  className="uppercase"
                />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Project ID</dt>
                  <dd className="font-mono text-xs">{result.projectId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submission ID</dt>
                  <dd className="font-mono text-xs">{result.submissionId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stored hash</dt>
                  <dd className="font-mono text-xs">{result.storedHash}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Computed hash</dt>
                  <dd className="font-mono text-xs">{result.computedHash ?? "Not available"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">On-chain hash</dt>
                  <dd className="font-mono text-xs">{result.onChainHash ?? "Not available"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Transaction hash</dt>
                  <dd className="font-mono text-xs">{result.txHash ?? "Not available"}</dd>
                </div>
              </dl>
              {!result.verified && result.chainReadError ? (
                <p className="mt-3 text-xs text-warning-foreground">{result.chainReadError}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
