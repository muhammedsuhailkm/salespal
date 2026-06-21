"use client";

export function Modal({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">{children}</div></div>;
}
