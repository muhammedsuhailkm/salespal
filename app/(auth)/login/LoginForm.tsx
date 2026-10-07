"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { roleHome } from "@/lib/nav-config";

import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@salespal.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    // Fetch session dynamically to get user role, allowing us to navigate
    // directly to the role-specific dashboard page. This lets the Next.js client-side
    // router know the target route instantly and display the correct skeleton loader immediately.
    const sessionRes = await fetch("/api/auth/session");
    const sessionData = await sessionRes.json();
    const roleId = sessionData?.user?.role_id;

    const dest = roleHome[roleId] ?? "/dashboard";

    router.replace(dest);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6">
        <h1 className="sr-only">SalesPal Login</h1>
        <div className="flex items-center gap-2 mb-2">
          <img
            src="/logo_collapsed.png"
            alt="SalesPal Logo"
            className="h-8 w-8 object-contain rounded border border-border/80 shadow-sm"
          />
          <span className="font-semibold text-foreground text-xl tracking-tight">
            Sales<span className="text-primary">Pal</span>
          </span>
        </div>
        <p className="text-muted-foreground font-medium text-[13px] text-center">
          Sign in to your account to continue
        </p>
      </div>

      {/* Email Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-foreground/85" htmlFor="email">
          Email address
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/80">
            <Mail size={18} className="stroke-[1.75]" />
          </span>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-12 w-full pl-11 pr-4"
            required
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-foreground/85" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/80">
            <Lock size={18} className="stroke-[1.75]" />
          </span>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-12 w-full pl-11 pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground/70 transition-colors focus:outline-none cursor-pointer"
          >
            {showPassword ? <EyeOff size={18} className="stroke-[1.75]" /> : <Eye size={18} className="stroke-[1.75]" />}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error ? (
        <p className="text-xs font-medium text-danger-foreground bg-danger-soft border border-danger/30 rounded-lg py-2 px-3">
          {error}
        </p>
      ) : null}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              Signing in…
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </span>
          ) : "Sign in"}
        </button>
      </div>

      {/* Help / Credentials Footer */}
      <div className="text-center text-xs space-y-2 pt-3 border-t border-border mt-4">
        <p className="text-muted-foreground">
          Don't have an account?{" "}
          <span className="font-semibold text-foreground cursor-help" title="System admin setup is required for new accounts.">
            Contact Admin
          </span>
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          Seed users use <code className="font-mono bg-subtle px-1 py-0.5 rounded border border-border text-muted-foreground">password123</code>
        </p>
      </div>
    </form>
  );
}
