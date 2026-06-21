"use client";

import { Modal } from "@/components/ui/Modal";

export function ClientDetailModal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return <Modal open={open}>{children}</Modal>;
}
