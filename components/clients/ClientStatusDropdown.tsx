"use client";

import { Select } from "@/components/ui/Select";
import { clientStatuses } from "@/types/client";

export function ClientStatusDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <Select value={value} onChange={(event) => onChange(event.target.value)}>{clientStatuses.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</Select>;
}
