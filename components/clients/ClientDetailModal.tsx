"use client";

import { Modal } from "@/components/ui/Modal";

export function ClientDetailModal({ open, children, onClose }: { open: boolean; children: React.ReactNode; onClose?: () => void }) {
  return <Modal open={open} onClose={onClose}>{children}</Modal>;
}
