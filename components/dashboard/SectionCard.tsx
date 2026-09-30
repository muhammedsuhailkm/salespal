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
    <h2 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-slate-900">
      {Icon && <Icon size={15} className={cn("shrink-0", iconClassName)} />}
      {href ? (
        <Link href={href} className="transition hover:text-indigo-600 hover:underline underline-offset-4">
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
        "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_8px_rgba(15,23,42,0.03)]",
        className,
      )}
    >
      {(title || action || href) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {heading}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action ??
            (href && (
              <Link
                href={href}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
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
