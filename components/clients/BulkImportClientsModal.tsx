"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileUp, Loader2, X, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CompanySelect, defaultCompanyId, type CompanyOption } from "@/components/clients/CompanySelect";

import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
type SalesmanItem = { id: number; name: string; org_ids: number[] };

const TEMPLATE_HEADERS = [
  "name",
  "contact_person_name",
  "contact_no",
  "mail_id",
  "contact_person_designation",
  "cr_no",
  "cr_expiry_date",
  "location_coordinates",
  "notes",
  "salesman_name",
] as const;

const TEMPLATE_EXAMPLE = [
  "Acme Logistics",
  "John Smith",
  "+97455556666",
  "john@acme.com",
  "Operations Manager",
  "CR-123456",
  "2027-12-31",
  "25.2854, 51.5310",
  "Met at trade expo",
  "",
];

const REQUIRED = ["name", "contact_person_name", "contact_no"] as const;

type Row = Record<(typeof TEMPLATE_HEADERS)[number], string>;
type RowResult = { line: number; name: string; ok: boolean; message?: string };

/** Minimal RFC 4180 CSV parser: handles quoted fields, escaped quotes and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(","), TEMPLATE_EXAMPLE.map(csvCell).join(",")].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "clients-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function BulkImportClientsModal({
  open,
  onClose,
  onImported,
  salesmen,
  companies,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
  salesmen: SalesmanItem[];
  /** The manager's companies; with several, the import asks which one the clients belong to. */
  companies: CompanyOption[];
}) {
  const [orgId, setOrgId] = useState(() => defaultCompanyId(companies));
  // Salesmen who can take clients of the chosen company.
  const eligible = salesmen.filter((s) => !orgId || s.org_ids.includes(Number(orgId)));
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<{ line: number; data: Row }[]>([]);
  const [defaultSalesmanId, setDefaultSalesmanId] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RowResult[] | null>(null);

  function reset() {
    setFileName("");
    setRows([]);
    setParseError(null);
    setProgress(0);
    setResults(null);
  }

  function close() {
    if (running) return;
    reset();
    onClose();
  }

  async function handleFile(file: File | undefined) {
    reset();
    if (!file) return;
    setFileName(file.name);
    const parsed = parseCsv((await file.text()).replace(/^﻿/, ""));
    if (parsed.length < 2) {
      setParseError("The file has no data rows. Use the template and add one client per row.");
      return;
    }
    const headers = parsed[0].map((h) => h.trim().toLowerCase());
    const missing = REQUIRED.filter((col) => !headers.includes(col));
    if (missing.length) {
      setParseError(`Missing required column(s): ${missing.join(", ")}`);
      return;
    }
    setRows(
      parsed.slice(1).map((cells, index) => {
        const data = Object.fromEntries(
          TEMPLATE_HEADERS.map((col) => {
            const at = headers.indexOf(col);
            return [col, at >= 0 ? (cells[at] ?? "").trim() : ""];
          })
        ) as Row;
        return { line: index + 2, data };
      })
    );
  }

  function resolveSalesman(data: Row): number | string {
    if (data.salesman_name) {
      const match = salesmen.find((s) => s.name.trim().toLowerCase() === data.salesman_name.toLowerCase());
      if (!match) return `Salesman "${data.salesman_name}" is not on your team`;
      if (!eligible.includes(match)) return `${match.name} doesn't work for the selected company`;
      return match.id;
    }
    return defaultSalesmanId ? Number(defaultSalesmanId) : "No salesman in row and no default selected";
  }

  async function runImport() {
    setRunning(true);
    setProgress(0);
    const out: RowResult[] = [];

    for (const { line, data } of rows) {
      const missing = REQUIRED.filter((col) => !data[col]);
      const salesman = resolveSalesman(data);
      if (missing.length) {
        out.push({ line, name: data.name || "—", ok: false, message: `Missing ${missing.join(", ")}` });
      } else if (typeof salesman === "string") {
        out.push({ line, name: data.name, ok: false, message: salesman });
      } else {
        try {
          const res = await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.name,
              contact_person_name: data.contact_person_name,
              contact_no: data.contact_no,
              mail_id: data.mail_id || null,
              contact_person_designation: data.contact_person_designation || null,
              cr_no: data.cr_no || null,
              cr_expiry_date: data.cr_expiry_date || null,
              location_coordinates: data.location_coordinates || null,
              notes: data.notes || null,
              assigned_salesman_id: salesman,
              org_id: orgId ? Number(orgId) : undefined,
              status: "lead",
            }),
          });
          const body = await res.json().catch(() => ({}));
          out.push(res.ok ? { line, name: data.name, ok: true } : { line, name: data.name, ok: false, message: body.error || "Failed" });
        } catch {
          out.push({ line, name: data.name, ok: false, message: "Network error" });
        }
      }
      setProgress(out.length);
    }

    setResults(out);
    setRunning(false);
    const created = out.filter((r) => r.ok).length;
    if (created) onImported(created);
  }

  const created = results?.filter((r) => r.ok).length ?? 0;
  const failed = results?.filter((r) => !r.ok) ?? [];

  return (
    <Modal onClose={close} open={open}>
      <div className="space-y-4">
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Import clients</h3>
            <p className="text-xs text-muted-foreground">Upload a CSV file. Every imported client starts with status Lead.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <X size={16} />
          </button>
        </div>

        {!results && (
          <>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-subtle p-3">
              <p className="text-xs text-foreground/70">
                Required: <span className="font-semibold">name, contact_person_name, contact_no</span>. Dates as YYYY-MM-DD.
              </p>
              <button type="button" onClick={downloadTemplate} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0")}>
                <Download size={13} />
                <span>Template</span>
              </button>
            </div>

            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-border-strong bg-card p-6 text-center transition hover:border-border-strong hover:bg-subtle">
              <FileUp size={22} className="text-muted-foreground/80" />
              <span className="text-sm font-semibold text-foreground/85">{fileName || "Choose a CSV file"}</span>
              {rows.length > 0 && <span className="text-xs text-muted-foreground">{rows.length} client row(s) found</span>}
              <input type="file" accept=".csv,text/csv" className="sr-only" disabled={running} onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>

            {parseError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs font-medium text-danger-foreground">{parseError}</p>}

            <CompanySelect
              id="import-company"
              companies={companies}
              value={orgId}
              onChange={(value) => {
                setOrgId(value);
                const s = salesmen.find((x) => String(x.id) === defaultSalesmanId);
                if (value && s && !s.org_ids.includes(Number(value))) setDefaultSalesmanId("");
              }}
              hint="Every imported client is added under this company."
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="import-salesman" className="text-xs font-semibold text-foreground/85">Default salesman</label>
              <select
                id="import-salesman"
                value={defaultSalesmanId}
                onChange={(e) => setDefaultSalesmanId(e.target.value)}
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
              >
                <option value="">Select a salesman...</option>
                {eligible.map((s) => (
                  <option key={s.id} value={s.id.toString()}>{s.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">Used for rows with an empty salesman_name column.</p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <button type="button" onClick={close} disabled={running} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground/70 transition hover:bg-subtle disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={running || rows.length === 0 || (companies.length > 1 && !orgId)}
                className={buttonVariants({ size: "sm" })}
              >
                {running && <Loader2 size={12} className="animate-spin" />}
                <span>{running ? `Importing ${progress}/${rows.length}` : `Import ${rows.length || ""} clients`}</span>
              </button>
            </div>
          </>
        )}

        {results && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-success-soft p-3 text-success-foreground">
                <CheckCircle2 size={18} />
                <span className="text-sm font-semibold">{created} imported</span>
              </div>
              <div className={`flex items-center gap-2 rounded-lg p-3 ${failed.length ? "bg-danger-soft text-danger-foreground" : "bg-subtle text-muted-foreground"}`}>
                <XCircle size={18} />
                <span className="text-sm font-semibold">{failed.length} skipped</span>
              </div>
            </div>
            {failed.length > 0 && (
              <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border text-xs">
                {failed.map((r) => (
                  <li key={r.line} className="flex gap-3 px-3 py-2">
                    <span className="shrink-0 font-semibold text-muted-foreground">Row {r.line}</span>
                    <span className="font-semibold text-foreground">{r.name}</span>
                    <span className="ml-auto text-right text-danger-foreground">{r.message}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button type="button" onClick={reset} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground/70 transition hover:bg-subtle">
                Import another file
              </button>
              <button type="button" onClick={close} className={buttonVariants({ size: "sm" })}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
