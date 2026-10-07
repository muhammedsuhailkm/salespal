"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

/** App-wide toast host. Trigger toasts with `import { toast } from "sonner"`. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      closeButton
      richColors={false}
      duration={3500}
      toastOptions={{
        classNames: {
          toast: "!rounded-card !border-border !bg-popover !text-popover-foreground !shadow-pop !font-sans",
          description: "!text-muted-foreground",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
        },
      }}
    />
  );
}
