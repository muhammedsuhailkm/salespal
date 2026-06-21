"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@salespal.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">SalesPal</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to monitor company sales activity.</p>
      </div>
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-xs text-slate-500">Seed users use password123.</p>
    </form>
  );
}
