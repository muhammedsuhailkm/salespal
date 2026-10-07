/**
 * Shared look for every text-like control (input, select, textarea): one height, radius,
 * border, focus ring and disabled state across the app.
 */
export const controlBase =
  "w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15";

export const controlHeight = "h-10";

/** Label above a control. */
export const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

/** Helper / error line under a control. */
export const hintClass = "mt-1.5 text-xs text-muted-foreground";
export const errorClass = "mt-1.5 text-xs font-medium text-danger-foreground";
