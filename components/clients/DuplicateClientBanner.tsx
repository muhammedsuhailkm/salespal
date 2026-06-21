export function DuplicateClientBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">A client with matching contact details already exists.</div>;
}
