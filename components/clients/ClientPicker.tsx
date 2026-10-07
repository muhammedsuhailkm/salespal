"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { buttonVariants } from "@/components/ui/Button";
type Option = { id: number; name: string };

/**
 * Type-to-search client selector backed by GET /api/clients?q= (scoped, max 20 results),
 * so forms never have to load the whole client list.
 */
export function ClientPicker({
  id,
  value,
  onChange,
  required,
  placeholder = "Search clients by name, CR no or phone…",
  inputClassName,
}: {
  id?: string;
  value: Option | null;
  onChange: (client: Option | null) => void;
  required?: boolean;
  placeholder?: string;
  inputClassName?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/clients?q=${encodeURIComponent(query.trim())}&limit=20`, { signal: ctrl.signal })
        .then((res) => (res.ok ? res.json() : { clients: [] }))
        .then((json) => {
          setOptions(json.clients ?? []);
          setActive(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (option: Option) => {
    onChange(option);
    setQuery("");
    setOpen(false);
  };

  if (value) {
    return (
      <div className={cn("flex h-10 w-full items-center justify-between rounded-md border border-border-strong bg-card px-3 text-sm", inputClassName)}>
        <span className="truncate font-medium text-foreground">{value.name}</span>
        <button type="button" onClick={() => onChange(null)} aria-label={`Clear ${value.name}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
          <X size={14} />
        </button>
        {/* keeps native "required" validation working */}
        <input type="hidden" value={value.id} />
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80" aria-hidden />
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        required={required}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && options[active]) {
            e.preventDefault();
            choose(options[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cn(
          "h-10 w-full rounded-md border border-border-strong bg-card pl-8 pr-8 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20",
          inputClassName
        )}
      />
      {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground/80" aria-hidden />}
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-card py-1 text-sm shadow-lg">
          {options.map((option, i) => (
            <li
              key={option.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(option)}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center justify-between px-3 py-2", i === active ? "bg-muted" : "")}
            >
              <span className="truncate">{option.name}</span>
              {i === active && <Check size={13} className="text-muted-foreground/80" aria-hidden />}
            </li>
          ))}
          {!loading && options.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground/80">No matching clients</li>}
        </ul>
      )}
    </div>
  );
}
