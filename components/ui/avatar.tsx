import { cn } from "@/lib/utils";

const sizes = { sm: "size-8 text-xs", md: "size-9 text-sm", lg: "size-11 text-base" } as const;

/** Initials avatar on the soft accent tint. */
export function Avatar({ name, size = "md", className }: { name?: string | null; size?: keyof typeof sizes; className?: string }) {
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-soft-foreground ring-1 ring-primary/15",
        sizes[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
