"use client";

export function Toast({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="fixed bottom-4 right-4 rounded-md bg-slate-950 px-4 py-3 text-sm text-white shadow-lg">{message}</div>;
}
