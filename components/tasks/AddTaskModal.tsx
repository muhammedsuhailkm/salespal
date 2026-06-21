"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function AddTaskModal() {
  const [open, setOpen] = useState(false);
  return <><Button type="button" onClick={() => setOpen(true)}>Add task</Button><Modal open={open}><div className="space-y-3"><h2 className="text-lg font-semibold">Add task</h2><p className="text-sm text-slate-500">Task creation UI can post to /api/tasks.</p><Button type="button" onClick={() => setOpen(false)}>Close</Button></div></Modal></>;
}
