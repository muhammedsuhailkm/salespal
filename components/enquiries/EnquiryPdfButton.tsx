"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadEnquiryFormPdf } from "@/lib/enquiry-form-pdf";
import type { EnquiryListItem } from "@/types/enquiry";

/** Downloads the fillable enquiry form: prefilled from `enquiry`, or blank when it's null. */
export function EnquiryPdfButton({ enquiry, label, className }: { enquiry: EnquiryListItem | null; label: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function download() {
    setBusy(true);
    setFailed(false);
    try {
      await downloadEnquiryFormPdf(enquiry);
    } catch (err) {
      console.error(err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      loading={busy}
      onClick={download}
      className={className}
      title={failed ? "Couldn't create the PDF — try again" : enquiry ? "Download this enquiry as a fillable PDF form" : "Download a blank fillable enquiry form"}
    >
      {!busy && <FileDown />} {failed ? "Retry PDF" : label}
    </Button>
  );
}
