"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sideClasses = {
  left: "inset-y-0 left-0 h-full w-[280px] max-w-[85vw] border-r animate-sheet-in-left",
  right: "inset-y-0 right-0 h-full w-[380px] max-w-[90vw] border-l animate-sheet-in-right",
} as const;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: keyof typeof sideClasses;
    /** Accessible title; rendered visually hidden when `hideTitle` is set. */
    title: string;
    hideTitle?: boolean;
    showClose?: boolean;
  }
>(function SheetContent({ side = "right", title, hideTitle = false, showClose = true, className, children, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="animate-fade-in fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        ref={ref}
        aria-describedby={undefined}
        className={cn("fixed z-50 flex flex-col border-border bg-card text-card-foreground shadow-pop outline-none", sideClasses[side], className)}
        {...props}
      >
        <DialogPrimitive.Title className={cn(hideTitle ? "sr-only" : "px-5 pt-5 text-base font-semibold")}>{title}</DialogPrimitive.Title>
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className="absolute right-3 top-3 rounded-control p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
