import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nothing to show yet: what's missing and, when there is one, the next step. */
export function EmptyState({
  title,
  message,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  message?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("animate-page-in rounded-card border border-dashed border-border-strong bg-card px-6 py-10 text-center", className)}>
      {Icon && (
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" aria-hidden />
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      {message ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{message}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
