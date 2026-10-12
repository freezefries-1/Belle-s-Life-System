"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: ["N"], label: "Quick capture" },
  { keys: ["Enter"], label: "Save a capture or task" },
  { keys: ["Esc"], label: "Close a dialog" },
  { keys: ["/"], label: "Search" },
  { keys: ["["], label: "Collapse or expand sidebar" },
  { keys: ["?"], label: "Show shortcuts" },
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Fewer clicks, faster capture.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col divide-y">
          {SHORTCUTS.map((s) => (
            <li key={s.label + s.keys.join()} className="flex items-center justify-between py-2.5 text-[13px]">
              <span>{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-6 rounded-md border bg-muted px-1.5 py-0.5 text-center text-[11px] font-semibold text-muted-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
