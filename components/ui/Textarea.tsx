import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { controlBase, labelClass } from "@/components/ui/field-styles";

export function Textarea({
  label,
  className,
  wrapperClassName,
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; wrapperClassName?: string }) {
  const area = <textarea id={id} className={cn(controlBase, "min-h-20 py-2.5 leading-relaxed", className)} {...props} />;
  if (!label) return area;
  return (
    <label htmlFor={id} className={cn("block", wrapperClassName)}>
      <span className={labelClass}>{label}</span>
      {area}
    </label>
  );
}
