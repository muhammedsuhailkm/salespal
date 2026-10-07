import type { PDFCheckBox, PDFDocument, PDFFont, PDFForm, PDFPage, PDFTextField } from "pdf-lib";
import { cargoTotals, DEFAULT_DIMENSION_UNIT, dimensionUnitLabels, dimensionUnits, isDimensionUnit, volumetricRuleLabels } from "@/lib/freight";
import {
  enquiryModes,
  enquiryPaymentModes,
  gaugeLabels,
  gauges,
  incotermNames,
  incoterms,
  jobRefNames,
  jobRefs,
  seaServiceTypeLabels,
  seaServiceTypes,
  truckTypeLabels,
  truckTypes,
  type EnquiryListItem,
} from "@/types/enquiry";

/**
 * Fillable A4 enquiry form (AcroForm text fields + checkboxes for every option list).
 * Blank when no enquiry is given; otherwise prefilled and still editable. Internal figures
 * (cost / profit) are left out — this is the version that goes to clients.
 * Built in the browser; pdf-lib is loaded on demand.
 */
export async function buildEnquiryFormPdf(enquiry: EnquiryListItem | null): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc: PDFDocument = await PDFDocument.create();
  doc.setTitle(enquiry ? `Freight enquiry ${enquiry.ref}` : "Freight enquiry form");
  doc.setCreator("SalesPal");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form: PDFForm = doc.getForm();

  const ACCENT = rgb(0.06, 0.45, 0.43);
  const INK = rgb(0.1, 0.12, 0.16);
  const MUTED = rgb(0.42, 0.45, 0.5);
  const LINE = rgb(0.72, 0.75, 0.79);
  const FIELD_BG = rgb(0.97, 0.98, 0.99);

  const W = 595.28;
  const H = 841.89;
  const M = 36;
  const CW = W - M * 2;
  const BOTTOM = M + 22;

  // Standard fonts only cover WinAnsi; drop characters they can't draw (e.g. Arabic names) instead of failing.
  const charset = new Set(font.getCharacterSet());
  const safe = (s: string) =>
    [...s]
      .filter((c) => c === "\n" || charset.has(c.codePointAt(0)!))
      .join("")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[\s—–\-,·]+$/u, "")
      .trim();

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const label = (text: string, x: number, yy: number, size = 7, f: PDFFont = font, color = MUTED) =>
    page.drawText(safe(text), { x, y: yy, size, font: f, color });

  function ensure(height: number) {
    if (y - height < BOTTOM) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
  }

  function section(title: string, height: number) {
    ensure(height + 22);
    y -= 6;
    page.drawRectangle({ x: M, y: y - 14, width: CW, height: 15, color: ACCENT });
    label(title.toUpperCase(), M + 6, y - 10, 8, bold, rgb(1, 1, 1));
    y -= 22;
  }

  function textField(name: string, title: string, x: number, width: number, value: string | null | undefined, height = 17): PDFTextField {
    label(title, x, y - 7);
    const field = form.createTextField(name);
    if (value) field.setText(safe(value));
    field.addToPage(page, { x, y: y - 10 - height, width, height, font, borderColor: LINE, borderWidth: 0.6, backgroundColor: FIELD_BG });
    field.setFontSize(9);
    return field;
  }

  /** A row of text fields sharing the width; `spans` are relative widths. */
  function fieldRow(fields: { name: string; title: string; value?: string | null; span?: number }[], height = 17) {
    ensure(height + 14);
    const gap = 10;
    const total = fields.reduce((s, f) => s + (f.span ?? 1), 0);
    const unit = (CW - gap * (fields.length - 1)) / total;
    let x = M;
    for (const f of fields) {
      const width = unit * (f.span ?? 1);
      textField(f.name, f.title, x, width, f.value, height);
      x += width + gap;
    }
    y -= height + 16;
  }

  function checkbox(name: string, x: number, yy: number, checked: boolean): PDFCheckBox {
    const box = form.createCheckBox(name);
    box.addToPage(page, { x, y: yy, width: 9, height: 9, borderColor: INK, borderWidth: 0.7, backgroundColor: rgb(1, 1, 1) });
    if (checked) box.check();
    return box;
  }

  /** Titled grid of checkboxes, one per option; the enquiry's value is ticked. */
  function checks(name: string, title: string, options: readonly { value: string; text: string }[], selected: string | null | undefined, cols: number, x = M, width = CW) {
    const rowH = 13;
    const rows = Math.ceil(options.length / cols);
    ensure(rows * rowH + 14);
    label(title, x, y - 7);
    y -= 12;
    const colW = width / cols;
    options.forEach((o, i) => {
      const cx = x + (i % cols) * colW;
      const cy = y - Math.floor(i / cols) * rowH - 10;
      checkbox(`${name}.${o.value}`, cx, cy, selected === o.value);
      label(fit(o.text, colW - 16, 7.5), cx + 13, cy + 1.5, 7.5, font, INK);
    });
    y -= rows * rowH + 6;
  }

  /** Truncate to a width so long option labels never run into the next column. */
  function fit(text: string, maxWidth: number, size: number) {
    let t = safe(text);
    if (font.widthOfTextAtSize(t, size) <= maxWidth) return t;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) t = t.slice(0, -1);
    return `${t}…`;
  }

  const e = enquiry;
  // Plain digits (no thousands separators) so the values stay easy to edit in the form.
  const num = (v: number | null | undefined) => (v === null || v === undefined ? "" : new Intl.NumberFormat("en", { maximumFractionDigits: 3, useGrouping: false }).format(v));
  const yesNo = [
    { value: "yes", text: "Yes" },
    { value: "no", text: "No" },
  ];

  // ── Header ──────────────────────────────────────────────────────────────
  page.drawRectangle({ x: M, y: y - 40, width: CW, height: 40, color: ACCENT });
  label("FREIGHT ENQUIRY FORM", M + 12, y - 25, 15, bold, rgb(1, 1, 1));
  if (e) {
    const ref = safe(e.ref);
    label(ref, M + CW - 12 - bold.widthOfTextAtSize(ref, 11), y - 20, 11, bold, rgb(1, 1, 1));
    const date = `Date: ${e.enquiry_date}`;
    label(date, M + CW - 12 - font.widthOfTextAtSize(date, 8), y - 32, 8, font, rgb(0.88, 0.96, 0.95));
  }
  y -= 52;
  label("Fill in every field that applies and tick the matching boxes. All dimensions are per piece.", M, y, 8, font, MUTED);
  y -= 8;

  // ── Client ──────────────────────────────────────────────────────────────
  section("Client details", 70);
  fieldRow([
    { name: "client.company", title: "Company name", value: e?.client_name, span: 2 },
    { name: "client.contact", title: "Contact person" },
  ]);
  fieldRow([
    { name: "client.phone", title: "Phone" },
    { name: "client.email", title: "Email", span: 2 },
  ]);

  // ── Enquiry ─────────────────────────────────────────────────────────────
  section("Enquiry", 40);
  fieldRow([
    { name: "enquiry.ref", title: "Enquiry ref", value: e?.ref },
    { name: "enquiry.date", title: "Enquiry date (YYYY-MM-DD)", value: e?.enquiry_date },
    { name: "enquiry.prepared_by", title: "Prepared by", value: e?.created_by },
  ]);
  checks("job_ref", "Job ref", jobRefs.map((c) => ({ value: c, text: `${c} ${jobRefNames[c]}` })), e?.job_ref, 4);

  // ── Route & terms ───────────────────────────────────────────────────────
  section("Route & terms", 80);
  checks("mode", "Mode of transport", enquiryModes.map((m) => ({ value: m, text: m === "land" ? "Road / land" : m[0].toUpperCase() + m.slice(1) })), e?.mode, 4);
  fieldRow([
    { name: "route.from", title: "From (origin)", value: e?.from },
    { name: "route.to", title: "To (destination)", value: e?.to },
  ]);
  {
    ensure(52);
    label("Collection address (pickup)", M, y - 7);
    const address = form.createTextField("route.collection_address");
    address.enableMultiline();
    if (e?.collection_address) address.setText(safe(e.collection_address));
    address.addToPage(page, { x: M, y: y - 10 - 32, width: CW, height: 32, font, borderColor: LINE, borderWidth: 0.6, backgroundColor: FIELD_BG });
    address.setFontSize(9);
    y -= 32 + 16;
  }
  checks("incoterm", "Incoterm", incoterms.map((t) => ({ value: t, text: `${t} ${incotermNames[t]}` })), e?.incoterm, 4);
  {
    ensure(30);
    const half = (CW - 10) / 2;
    const top = y;
    checks("clearance", "Customs clearance", yesNo, e ? (e.clearance ? "yes" : "no") : null, 2, M, half / 1.4);
    const afterLeft = y;
    y = top;
    checks("dg", "Dangerous goods (DG)", yesNo, e ? (e.is_dg ? "yes" : "no") : null, 2, M + half + 10, half / 2.2);
    y = top;
    textField("dg.un_number", "UN number(s), if DG", M + half + 10 + half / 2.2 + 10, half - half / 2.2 - 10, e?.un_number, 15);
    y = Math.min(afterLeft, top - 32);
  }

  // ── Equipment ───────────────────────────────────────────────────────────
  section("Equipment", 90);
  checks("sea_service", "Sea — service type", seaServiceTypes.map((t) => ({ value: t, text: seaServiceTypeLabels[t] })), e?.service_type, 3);
  {
    const top = y;
    checks("gauge", "Open top (20'OT / 40'OT) — gauge", gauges.map((g) => ({ value: g, text: gaugeLabels[g] })), e?.gauge, 2, M, CW / 2 - 5);
    const after = y;
    y = top;
    textField("sea.reefer_temp", "Reefer temperature, °C (20'RF / 40'RF)", M + CW / 2 + 5, CW / 2 - 5, num(e?.reefer_temp), 15);
    y = Math.min(after, top - 32);
  }
  fieldRow([{ name: "cargo.commodity", title: "Commodity / cargo description" }]);
  checks("truck_type", "Road — truck type", truckTypes.map((t) => ({ value: t, text: truckTypeLabels[t] })), e?.truck_type, 3);

  // ── Cargo ───────────────────────────────────────────────────────────────
  const unit = e && isDimensionUnit(e.dimension_unit) ? e.dimension_unit : DEFAULT_DIMENSION_UNIT;
  const packages = e?.packages ?? [];
  const lines = Math.max(6, packages.length);
  section("Cargo dimensions & weight", 120);
  checks("unit", "Dimension unit", dimensionUnits.map((u) => ({ value: u, text: dimensionUnitLabels[u] })), e ? unit : null, 4, M, CW / 2);
  {
    const cols = [
      { key: "no", title: "#", w: 24 },
      { key: "length", title: "Length", w: 0 },
      { key: "width", title: "Width", w: 0 },
      { key: "height", title: "Height", w: 0 },
      { key: "qty", title: "Nos (pieces)", w: 0 },
    ];
    const flexW = (CW - 24 - 8 * 4) / 4;
    const rowH = 16;
    const header = () => {
      let x = M;
      for (const c of cols) {
        label(c.title, x, y - 7);
        x += (c.w || flexW) + 8;
      }
      y -= 11;
    };
    ensure(rowH * 2 + 11);
    header();
    for (let i = 0; i < lines; i++) {
      if (y - rowH - 3 < BOTTOM) {
        page = doc.addPage([W, H]);
        y = H - M;
        header();
      }
      const p = packages[i];
      let x = M;
      label(String(i + 1), x + 4, y - rowH + 4, 8, font, INK);
      x += 24 + 8;
      for (const key of ["length", "width", "height", "qty"] as const) {
        const field = form.createTextField(`cargo.${i + 1}.${key}`);
        if (p) field.setText(num(p[key]));
        field.addToPage(page, { x, y: y - rowH, width: flexW, height: rowH - 2, font, borderColor: LINE, borderWidth: 0.6, backgroundColor: FIELD_BG });
        field.setFontSize(9);
        x += flexW + 8;
      }
      y -= rowH + 1;
    }
    y -= 6;
  }
  const totals = e ? cargoTotals(packages, unit, e.mode, e.actual_weight) : null;
  checks(
    "stackable",
    "Stacking",
    [
      { value: "yes", text: "Stackable" },
      { value: "no", text: "Non-stackable" },
    ],
    e?.stackable == null ? null : e.stackable ? "yes" : "no",
    4,
    M,
    CW / 2,
  );
  fieldRow([
    { name: "weight.actual", title: "Actual gross weight, kg (total)", value: num(e?.actual_weight) },
    { name: "weight.cbm", title: "Total volume, m³", value: num(e?.cbm) },
    { name: "weight.volumetric", title: "Volumetric weight, kg", value: num(totals?.volumetricWeight) },
    { name: "weight.chargeable", title: "Chargeable weight, kg", value: num(e?.chargeable_weight) },
  ]);
  ensure(40);
  y -= 4;
  label("Chargeable weight is the higher of actual and volumetric weight. Volumetric weight (dimensions in cm):", M, y, 7);
  y -= 10;
  for (const mode of ["air", "land", "sea"]) {
    label(`•  ${volumetricRuleLabels[mode]}`, M + 6, y, 7);
    y -= 9;
  }
  y -= 4;

  // ── Payment ─────────────────────────────────────────────────────────────
  section("Payment", 40);
  {
    const top = y;
    checks("payment", "Payment mode", enquiryPaymentModes.map((p) => ({ value: p, text: p[0].toUpperCase() + p.slice(1) })), e?.payment_mode, 3, M, CW * 0.6);
    const after = y;
    y = top;
    textField("payment.credit_days", "Credit days (if credit)", M + CW * 0.65, CW * 0.35, e?.credit_days ? String(e.credit_days) : "", 15);
    y = Math.min(after, top - 32);
  }

  // ── Notes & sign-off ────────────────────────────────────────────────────
  section("Notes / special instructions", 70);
  ensure(70);
  {
    label("Pickup / delivery address, cargo ready date, packing, special handling…", M, y - 7);
    const notes = form.createTextField("notes");
    notes.enableMultiline();
    if (e?.notes) notes.setText(safe(e.notes));
    notes.addToPage(page, { x: M, y: y - 64, width: CW, height: 54, font, borderColor: LINE, borderWidth: 0.6, backgroundColor: FIELD_BG });
    notes.setFontSize(9);
    y -= 72;
  }
  section("Confirmation", 34);
  fieldRow([
    { name: "sign.name", title: "Name" },
    { name: "sign.signature", title: "Signature" },
    { name: "sign.date", title: "Date" },
  ], 22);

  // ── Footer on every page ────────────────────────────────────────────────
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const text = `${e ? `${e.ref} · ` : ""}Page ${i + 1} of ${pages.length}`;
    p.drawText(safe(text), { x: W - M - font.widthOfTextAtSize(text, 7), y: M - 4, size: 7, font, color: MUTED });
    p.drawLine({ start: { x: M, y: M + 6 }, end: { x: W - M, y: M + 6 }, thickness: 0.4, color: LINE });
  });

  form.updateFieldAppearances(font);
  return doc.save();
}

/** Builds the form and triggers a browser download. */
export async function downloadEnquiryFormPdf(enquiry: EnquiryListItem | null) {
  const bytes = await buildEnquiryFormPdf(enquiry);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = enquiry ? `${enquiry.ref}-enquiry-form.pdf` : "freight-enquiry-form.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
