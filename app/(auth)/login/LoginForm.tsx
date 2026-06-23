"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

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

    const dest = roleId === 1 
      ? "/dashboard/admin" 
      : roleId === 2 
        ? "/dashboard/manager" 
        : "/dashboard/salesman";

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
            className="h-8 w-8 object-contain rounded border border-slate-100/80 shadow-sm"
          />
          <span className="font-bold text-slate-900 text-xl tracking-tight">
            Sales<span className="text-teal-600">Pal</span>
          </span>
        </div>
        <p className="text-slate-500 font-medium text-[13px] text-center">
          Sign in to your account to continue
        </p>
      </div>

      {/* Email Input */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider" htmlFor="email">
          Email address
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Mail size={18} className="stroke-[1.75]" />
          </span>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400/30 placeholder:text-slate-400/70 text-slate-900"
            required
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Lock size={18} className="stroke-[1.75]" />
          </span>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full pl-11 pr-11 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400/30 placeholder:text-slate-400/70 text-slate-900"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
          >
            {showPassword ? <EyeOff size={18} className="stroke-[1.75]" /> : <Eye size={18} className="stroke-[1.75]" />}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error ? (
        <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg py-2 px-3">
          {error}
        </p>
      ) : null}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-slate-950 hover:bg-slate-900 text-white font-semibold text-sm rounded-xl transition duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400/50 flex items-center justify-center cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
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
      <div className="text-center text-xs space-y-2 pt-3 border-t border-slate-100 mt-4">
        <p className="text-slate-500">
          Don't have an account?{" "}
          <span className="font-semibold text-slate-900 cursor-help" title="System admin setup is required for new accounts.">
            Contact Admin
          </span>
        </p>
        <p className="text-[11px] text-slate-400/90">
          Seed users use <code className="font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-100 text-slate-500">password123</code>
        </p>
      </div>
    </form>
  );
}
