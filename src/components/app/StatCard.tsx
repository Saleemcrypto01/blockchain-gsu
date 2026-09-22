import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "orange" | "red" | "purple";

const tones: Record<Tone, string> = {
  blue: "bg-primary/10 text-primary",
  green: "bg-success/12 text-success",
  orange: "bg-warning/18 text-warning-foreground",
  red: "bg-destructive/10 text-destructive",
  purple: "bg-chart-5/12 text-chart-5",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "blue",
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="surface-card flex items-center gap-4 p-4">
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl leading-tight font-bold">{value}</p>
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        {hint ? <p className="truncate text-[11px] text-muted-foreground/80">{hint}</p> : null}
      </div>
    </div>
  );
}
