import { createId } from "@/lib/id";
import type { Capture, CaptureInput, ISODateTime } from "@/types";

/**
 * New captures land in the inbox with no deadline, sprint or project —
 * capturing a thought is not a commitment to do it today.
 */
export function createCapture(input: CaptureInput, now: ISODateTime): Capture {
  return {
    id: createId(),
    title: input.title.trim(),
    note: input.note?.trim() ?? "",
    kind: input.kind ?? "task",
    status: "inbox",
    createdAt: now,
    updatedAt: now,
    convertedTaskId: null,
  };
}

export const isInInbox = (c: Capture) => c.status === "inbox";

/** Newest first. */
export function sortCaptures(captures: Capture[]) {
  return [...captures].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
