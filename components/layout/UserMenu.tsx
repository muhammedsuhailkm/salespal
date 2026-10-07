"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, Key, LogOut, Mail } from "lucide-react";
import { useShell } from "@/components/layout/ShellContext";
import { ROLE_LABELS } from "@/components/layout/nav-meta";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Account popover: profile details, password reset, logout. */
export function UserMenu() {
  const { data: session } = useSession();
  const { isLoggingOut, logout } = useShell();
  const [isOpen, setIsOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const roleId = session?.user.role_id ?? 0;
  const roleLabel = ROLE_LABELS[roleId] ?? ROLE_LABELS[3];

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setResetMessage({ type: "error", text: "Password must be at least 6 characters long" });
      return;
    }
    setIsResetSubmitting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage({ type: "success", text: "Password reset successfully!" });
        setNewPassword("");
        setTimeout(() => {
          setResettingPassword(false);
          setResetMessage(null);
          setIsOpen(false);
        }, 1500);
      } else {
        setResetMessage({ type: "error", text: data.error || "Reset failed" });
      }
    } catch {
      setResetMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsResetSubmitting(false);
    }
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        setResettingPassword(false);
        setResetMessage(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex cursor-pointer items-center gap-2.5 rounded-full p-0.5 transition-colors hover:bg-muted lg:rounded-control lg:py-1 lg:pl-1 lg:pr-2"
        >
          <Avatar name={session?.user?.name} />
          <span className="hidden min-w-0 text-left lg:block">
            <span className="block max-w-[140px] truncate text-sm font-medium leading-tight text-foreground">
              {session?.user?.name}
            </span>
            <span className="block text-xs leading-tight text-muted-foreground">{roleLabel}</span>
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground lg:block" aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 space-y-4 p-0">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Avatar name={session?.user?.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{session?.user?.name}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail size={12} className="shrink-0" /> {session?.user?.email}
            </p>
          </div>
        </div>

        <div className="space-y-2 px-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">System role</span>
            <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary-soft-foreground">
              {roleLabel}
            </span>
          </div>

          {!resettingPassword ? (
            <button
              type="button"
              onClick={() => {
                setResettingPassword(true);
                setResetMessage(null);
                setNewPassword("");
              }}
              className="flex h-10 w-full cursor-pointer items-center justify-between rounded-control px-3 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                <Key size={15} className="text-muted-foreground" /> Reset password
              </span>
              <span className="text-xs font-medium text-primary">Change</span>
            </button>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-2.5 rounded-control border border-border bg-subtle p-3">
              <div className="flex items-center justify-between">
                <label htmlFor="new-password" className="text-xs font-medium text-foreground">
                  New password
                </label>
                <button
                  type="button"
                  onClick={() => setResettingPassword(false)}
                  className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              <input
                id="new-password"
                type="password"
                required
                autoFocus
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-invalid={resetMessage?.type === "error" || undefined}
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-9 w-full"
              />
              {resetMessage && (
                <p
                  role={resetMessage.type === "error" ? "alert" : "status"}
                  className={cn("text-xs font-medium", resetMessage.type === "success" ? "text-success-foreground" : "text-danger-foreground")}
                >
                  {resetMessage.text}
                </p>
              )}
              <Button type="submit" size="sm" className="w-full" loading={isResetSubmitting}>
                {isResetSubmitting ? "Updating..." : "Save password"}
              </Button>
            </form>
          )}
        </div>

        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={logout}
            disabled={isLoggingOut}
            className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-control px-3 text-sm font-medium text-danger-foreground transition-colors hover:bg-danger-soft disabled:opacity-50"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
