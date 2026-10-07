import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <Link className={buttonVariants({ size: "md" })} href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
