"use client";

import { Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { Capture } from "@/types";

import { CaptureRow } from "./capture-row";

export function CaptureInbox({ captures, filtered = false }: { captures: Capture[]; filtered?: boolean }) {
  return (
    <Card className="overflow-hidden">
      {captures.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
            <Sparkles className="size-5" />
          </span>
          <p className="text-[15px] font-semibold">{filtered ? "Nothing of this type" : "Your mind is clear."}</p>
          <p className="max-w-xs text-[13px] text-muted-foreground">
            {filtered ? "Try another filter." : "Capture anything that comes to mind."}
          </p>
        </div>
      ) : (
        <ul className="divide-y" aria-label="Brain Dump inbox">
          {captures.map((c) => (
            <CaptureRow key={c.id} capture={c} />
          ))}
        </ul>
      )}
    </Card>
  );
}
