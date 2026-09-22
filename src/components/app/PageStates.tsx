import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="surface-card flex items-center justify-center gap-2 px-6 py-14 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="surface-card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="rounded-full bg-destructive/10 p-2 text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <p className="font-semibold">Something went wrong</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function UnauthorizedState({ message }: { message: string }) {
  return (
    <div className="surface-card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="rounded-full bg-warning/15 p-2 text-warning-foreground">
        <ShieldAlert className="size-5" />
      </span>
      <p className="font-semibold">Not authorised</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
