import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { controlBase, controlHeight, errorClass, hintClass, labelClass } from "@/components/ui/field-styles";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  /** Helper text under the field. */
  hint?: string;
  /** Error text under the field; also marks the input invalid. */
  error?: string;
};

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  // Same id rule as before (explicit id → name → label slug) so existing selectors keep working.
  const inputId = id ?? props.name ?? label?.toLowerCase().replace(/\s+/g, "-");
  const describedBy = error || hint ? `${inputId}-desc` : undefined;
  return (
    <label className="block" htmlFor={inputId}>
      {label ? <span className={labelClass}>{label}</span> : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlBase, controlHeight, className)}
        {...props}
      />
      {error ? (
        <span id={describedBy} className={cn(errorClass, "block")}>{error}</span>
      ) : hint ? (
        <span id={describedBy} className={cn(hintClass, "block")}>{hint}</span>
      ) : null}
    </label>
  );
}
