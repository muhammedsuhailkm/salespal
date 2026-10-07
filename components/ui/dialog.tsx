"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" } as const;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Keep the title for screen readers only (e.g. command palette). */
    hideHeader?: boolean;
    size?: keyof typeof sizes;
    showClose?: boolean;
  }
>(function DialogContent(
  { title, description, hideHeader = false, size = "md", showClose = true, className, children, ...props },
  ref,
) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="animate-fade-in fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]" />
      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
        <DialogPrimitive.Content
          ref={ref}
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "animate-pop-in pointer-events-auto relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-card border border-border bg-card text-card-foreground shadow-pop outline-none",
            sizes[size],
            className,
          )}
          {...props}
        >
          <div className={cn(hideHeader ? "sr-only" : "space-y-1 px-6 pb-2 pt-6 pr-12")}>
            <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
            ) : null}
          </div>
          {children}
          {showClose && (
            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded-control p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
});

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-y-auto px-6 py-4", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 border-t border-border bg-subtle px-6 py-4 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
