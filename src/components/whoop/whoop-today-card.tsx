"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, HeartPulse, Moon, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { ZONE_LABEL, ZONE_STYLE, dayOn, zoneOf } from "@/lib/whoop/whoop";

import { WhoopDialog } from "./whoop-dialog";

/** Today page: today's WHOOP sleep and recovery, or a button to add them. */
export function WhoopTodayCard({ className }: { className?: string }) {
  const { workspace } = useWorkspace();
  const today = dayOn(workspace.whoopDays, workspace.today);
  // The card appears twice on the Today page (phone and desktop spots, one hidden), so ids must be unique.
  const headingId = React.useId();
  // The dialog stays mounted after closing so focus goes back to the button that opened it.
  const [n, setN] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const editRef = React.useRef<HTMLButtonElement>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const openDialog = () => {
    setN((x) => x + 1);
    setOpen(true);
  };

  return (
    <section
      aria-labelledby={headingId}
      className={cn("rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-[14px] font-semibold">
          Recovery &amp; sleep
        </h2>
        <Link
          href="/recovery"
          className="inline-flex items-center gap-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          Trends
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {today ? (
        <div className="mt-3 flex items-stretch gap-3">
          <Metric label="Sleep" value={today.sleep} icon={Moon} />
          <Metric label="Recovery" value={today.recovery} icon={HeartPulse} zoned />
          <Button ref={editRef} variant="ghost" size="icon-xs" className="self-start" onClick={openDialog} aria-label="Edit today’s sleep and recovery">
            <Pencil className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">Add today’s numbers from your WHOOP app.</p>
          <Button ref={addRef} size="sm" variant="outline" className="mt-2.5 gap-1.5" onClick={openDialog}>
            <Plus className="size-3.5" />
            Add today’s WHOOP
          </Button>
        </div>
      )}
      {n > 0 && (
        <WhoopDialog
          key={n}
          open={open}
          onOpenChange={setOpen}
          // After adding today's numbers the Add button is gone; focus its replacement, the Edit button.
          onCloseAutoFocus={(e) => {
            if (!addRef.current && editRef.current) {
              e.preventDefault();
              editRef.current.focus();
            }
          }}
        />
      )}
    </section>
  );
}

function Metric({ label, value, icon: Icon, zoned = false }: { label: string; value: number | null; icon: typeof HeartPulse; zoned?: boolean }) {
  const zone = zoned && value !== null ? zoneOf(value) : null;
  return (
    <div className={cn("min-w-0 flex-1 rounded-lg px-3 py-2", zone ? ZONE_STYLE[zone].bg : "bg-muted/50")}>
      <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className={cn("text-xl font-bold tabular-nums", zone && ZONE_STYLE[zone].text)}>
        {value === null ? "—" : `${value}%`}
        {zone && <span className="sr-only"> ({ZONE_LABEL[zone]})</span>}
      </p>
    </div>
  );
}
