import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">404</p>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
