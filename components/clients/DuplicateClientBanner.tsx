export function DuplicateClientBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return <div className="rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">A client with matching contact details already exists.</div>;
}
