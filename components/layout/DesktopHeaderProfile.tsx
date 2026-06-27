"use client";

import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LogOut, X, Key, Shield, User, Mail } from "lucide-react";

export function DesktopHeaderProfile() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleId = session?.user.role_id ?? 0;
  const initials = session?.user?.name?.charAt(0)?.toUpperCase() ?? "U";

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

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
    } catch (err: any) {
      setResetMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsResetSubmitting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Clickable Profile Avatar Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setResettingPassword(false);
          setResetMessage(null);
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-200 ring-1 ring-slate-700 shadow-inner hover:ring-2 hover:ring-teal-500 transition-all cursor-pointer"
      >
        {initials}
      </button>

      {/* Profile Popup Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-5 z-50 text-slate-850 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <User size={15} className="text-slate-400" /> Account Details
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
            >
              <X size={15} />
            </button>
          </div>

          {/* User Info Card */}
          <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-slate-200 ring-1 ring-slate-700 shadow-inner">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-xs truncate">
                {session?.user?.name}
              </p>
              <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <Mail size={10} /> {session?.user?.email}
              </p>
            </div>
          </div>

          {/* System Role Badge */}
          <div className="flex items-center justify-between text-xs text-slate-500 py-2 px-3.5 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-medium text-slate-500">System Role</span>
            <span className="inline-flex items-center rounded-md bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700 ring-1 ring-inset ring-teal-600/20">
              {roleId === 1
                ? "Administrator"
                : roleId === 2
                  ? "Manager"
                  : "Sales Representative"}
            </span>
          </div>

          {/* Reset Password Option just after the System Role item */}
          <div className="space-y-3">
            {!resettingPassword ? (
              <button
                onClick={() => {
                  setResettingPassword(true);
                  setResetMessage(null);
                  setNewPassword("");
                }}
                className="flex items-center justify-between w-full text-xs text-slate-700 py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition cursor-pointer"
              >
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Key size={13} className="text-slate-400" /> Reset Password
                </span>
                <span className="text-[10px] text-teal-600 font-bold hover:underline">Change</span>
              </button>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700">New Password</span>
                  <button
                    type="button"
                    onClick={() => setResettingPassword(false)}
                    className="text-[9px] text-slate-400 hover:text-slate-650 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-slate-400 bg-white transition"
                />
                {resetMessage && (
                  <p className={cn("text-[9px] font-bold", resetMessage.type === "success" ? "text-emerald-600" : "text-rose-600")}>
                    {resetMessage.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isResetSubmitting}
                  className="w-full flex items-center justify-center py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] transition cursor-pointer"
                >
                  {isResetSubmitting ? "Updating..." : "Save Password"}
                </button>
              </form>
            )}
          </div>

          {/* Logout Action */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-4 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition border border-red-100/50 disabled:opacity-50 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Logout Overlay Loader */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 w-full max-w-xs flex flex-col items-center justify-center gap-4 text-center animate-in zoom-in-95 duration-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-100 shadow-inner">
              <svg className="animate-spin h-6 w-6 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 text-sm">Logging Out</h3>
              <p className="text-slate-500 text-xs">Please wait while we secure your session...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
