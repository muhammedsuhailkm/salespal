"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(function TooltipContent({ className, sideOffset = 6, ...props }, ref) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "animate-fade-in z-50 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white shadow-pop dark:bg-muted dark:text-foreground",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});

/** Convenience wrapper: <SimpleTooltip label="Settings"><button …/></SimpleTooltip> */
export function SimpleTooltip({
  label,
  side = "top",
  disabled = false,
  children,
}: {
  label: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
