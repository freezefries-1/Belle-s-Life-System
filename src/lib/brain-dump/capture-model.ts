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
/** Kept as a note: out of the inbox, but still in the Brain Dump. */
export const isKept = (c: Capture) => c.status === "kept";

/** Newest first. */
export function sortCaptures(captures: Capture[]) {
  return [...captures].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
