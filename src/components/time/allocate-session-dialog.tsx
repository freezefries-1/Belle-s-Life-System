"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { sessionMinutes } from "@/lib/analytics/time";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn, formatMinutes } from "@/lib/utils";
import type { SprintSession } from "@/types";

/**
 * Share a session's recorded time between its tasks. The total can't exceed
 * the session, and each task's actual time changes by exactly the difference.
 */
export function AllocateSessionDialog({ session, onClose }: { session: SprintSession; onClose: () => void }) {
  const { workspace, actions } = useWorkspace();
  const tasks = session.taskIds.map((id) => workspace.tasks.find((t) => t.id === id)).filter((t) => !!t);
  const available = sessionMinutes(session);
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(tasks.map((t) => [t.id, String(session.allocations.find((a) => a.taskId === t.id)?.minutes ?? "")])),
  );
  const total = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);
  const over = total > available;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Allocate session time</DialogTitle>
          <DialogDescription>
            This session ran {formatMinutes(available)}. Give minutes to the tasks you worked on — they’re added to each task’s actual time. Leave any
            blank.
          </DialogDescription>
        </DialogHeader>
        {tasks.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">This session’s tasks no longer exist.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{t.title}</span>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`Minutes for “${t.title}”`}
                  value={values[t.id] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [t.id]: e.target.value }))}
                  className="h-8 w-20 text-right text-xs"
                  placeholder="0"
                />
                <span className="w-7 text-xs text-muted-foreground">min</span>
              </li>
            ))}
          </ul>
        )}
        <p className={cn("text-xs", over ? "font-semibold text-rose-600" : "text-muted-foreground")} aria-live="polite">
          {total} of {available} min allocated{over ? " — that’s more than the session ran." : ""}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={over || tasks.length === 0}
            onClick={() => {
              const ok = actions.allocateSessionTime(
                session.id,
                tasks.map((t) => ({ taskId: t.id, minutes: Number(values[t.id]) || 0 })),
              );
              if (ok) {
                toast("Session time allocated");
                onClose();
              }
            }}
          >
            Save allocation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
