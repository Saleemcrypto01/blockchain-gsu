import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  submitted: "bg-success/12 text-success border-success/25",
  under_review: "bg-warning/15 text-warning-foreground border-warning/35",
  revision_requested: "bg-warning/15 text-warning-foreground border-warning/35",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/12 text-destructive border-destructive/25",
  pending: "bg-warning/15 text-warning-foreground border-warning/35",
  confirmed: "bg-success/15 text-success border-success/30",
  failed: "bg-destructive/12 text-destructive border-destructive/25",
  active: "bg-success/15 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const labels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  revision_requested: "Revision Requested",
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
  active: "Active",
  inactive: "Inactive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        styles[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
