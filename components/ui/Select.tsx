import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlBase, controlHeight, labelClass } from "@/components/ui/field-styles";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  /** Classes for the wrapper (width etc.); `className` styles the select itself. */
  wrapperClassName?: string;
};

/** Native select with the shared control look and a consistent chevron. */
export function Select({ label, className, wrapperClassName, id, ...props }: SelectProps) {
  const field = (
    <span className={cn("relative block", !label && wrapperClassName)}>
      <select id={id} className={cn(controlBase, controlHeight, "cursor-pointer appearance-none pr-9", className)} {...props} />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </span>
  );
  if (!label) return field;
  return (
    <label htmlFor={id} className={cn("block", wrapperClassName)}>
      <span className={labelClass}>{label}</span>
      {field}
    </label>
  );
}
