"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" } as const;

/**
 * Centered dialog. Animates in and out, locks page scroll, and returns focus to whatever
 * opened it. With `onClose`, Escape closes it (and a backdrop click, with `closeOnBackdrop`).
 */
export function Modal({
  open,
  children,
  size = "md",
  onClose,
  closeOnBackdrop = false,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  size?: keyof typeof sizes;
  /** Enables Escape to close. */
  onClose?: () => void;
  /** Also close on a backdrop click. Off by default so a stray click can't discard a half-filled form. */
  closeOnBackdrop?: boolean;
  className?: string;
}) {
  // Stay mounted through the exit animation.
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  // Keep the last content on screen while animating out (callers often unmount it on close).
  const [content, setContent] = useState(children);
  if (open && content !== children) setContent(children);
  const panelRef = useRef<HTMLDivElement>(null);

  // Latest onClose without re-running the open/close effect: callers pass a new function on every
  // render, and re-running it would steal focus from whatever field is being typed in.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog (not onto a field — that can pop open pickers) unless a field asked for autoFocus.
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      (panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel).focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCloseRef.current) {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open && !shown) return null;
  const closing = !open;

  const dialog = (
    <div
      className={cn("fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4", closing ? "animate-fade-out" : "animate-fade-in")}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) setShown(false);
      }}
    >
      <div aria-hidden className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={closeOnBackdrop ? onClose : undefined} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "relative w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-card border border-border bg-card p-6 text-card-foreground shadow-pop outline-none",
          closing ? "animate-pop-out" : "animate-pop-in",
          sizes[size],
          className,
        )}
      >
        {open ? children : content}
      </div>
    </div>
  );

  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

/** Standard modal title row with an optional description and close button. */
export function ModalHeader({
  title,
  description,
  onClose,
  icon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="-mx-6 -mt-6 mb-5 flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-soft-foreground [&_svg]:size-[18px]">{icon}</span> : null}
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-6 text-foreground">{title}</h3>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="press -mr-1.5 -mt-0.5 shrink-0 cursor-pointer rounded-control p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/** Standard modal action row: secondary actions left of the primary one. */
export function ModalFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("-mx-6 -mb-6 mt-6 flex flex-col-reverse gap-2 rounded-b-card border-t border-border bg-subtle px-6 py-4 sm:flex-row sm:justify-end", className)}>
      {children}
    </div>
  );
}
