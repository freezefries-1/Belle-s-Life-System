import { Bell, Lightbulb, ListTodo, StickyNote, type LucideIcon } from "lucide-react";

import type { CaptureKind } from "@/types";

export const CAPTURE_KINDS: { id: CaptureKind; label: string; icon: LucideIcon; className: string }[] = [
  { id: "task", label: "Task", icon: ListTodo, className: "text-primary" },
  { id: "idea", label: "Idea", icon: Lightbulb, className: "text-amber-600" },
  { id: "reminder", label: "Reminder", icon: Bell, className: "text-teal-600" },
  { id: "note", label: "Note", icon: StickyNote, className: "text-slate-500" },
];

export const CAPTURE_KIND_BY_ID = Object.fromEntries(CAPTURE_KINDS.map((k) => [k.id, k])) as Record<
  CaptureKind,
  (typeof CAPTURE_KINDS)[number]
>;
