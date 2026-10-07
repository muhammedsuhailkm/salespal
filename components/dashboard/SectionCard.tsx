import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  action,
  children,
  className,
  bodyClassName,
  href,
}: {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Makes the title a link and adds a "View all" shortcut. */
  href?: string;
}) {
  const heading = title && (
    <h2 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-foreground">
      {Icon && <Icon size={15} className={cn("shrink-0", iconClassName)} />}
      {href ? (
        <Link href={href} className="transition hover:text-primary hover:underline underline-offset-4">
          {title}
        </Link>
      ) : (
        title
      )}
    </h2>
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_8px_rgba(15,23,42,0.03)]",
        className,
      )}
    >
      {(title || action || href) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {heading}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action ??
            (href && (
              <Link
                href={href}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                View all
                <ArrowRight size={12} />
              </Link>
            ))}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
