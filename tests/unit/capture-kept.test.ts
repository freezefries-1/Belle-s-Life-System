import { describe, expect, it } from "vitest";

import { createCapture } from "@/lib/brain-dump/capture-model";
import { createProject } from "@/lib/projects/project-model";
import { dataToRows, rowsToData } from "@/lib/repositories/mappers";
import { EMPTY_DATA, SCHEMA_VERSION, createEnvelope, parseEnvelope } from "@/lib/storage/schema";
import * as tasks from "@/lib/store/changes/tasks";
import { getInbox } from "@/lib/selectors";
import type { PersistedData, Workspace } from "@/types";

import { local } from "./helpers";

const NOW = local("2026-10-14", 9);
const LATER = local("2026-10-14", 10);
const thought = createCapture({ title: "Coaching idea", note: "Try doubles drills first", kind: "note" }, NOW);
const project = { ...createProject({ name: "Tennis coaching" }, NOW), notes: "Existing notes\nstay as they are  " };
const base: PersistedData = { ...EMPTY_DATA, captures: [thought], projects: [project] };
const inboxOf = (d: PersistedData) => getInbox({ ...d, today: "2026-10-14" } as Workspace);

describe("Brain Dump: keep as note", () => {
  it("takes the entry out of the inbox, and back again", () => {
    const kept = tasks.setCaptureKept(base, thought.id, true, LATER);
    expect(kept.captures[0]).toMatchObject({ status: "kept", updatedAt: LATER });
    expect(inboxOf(kept)).toHaveLength(0);
    const back = tasks.setCaptureKept(kept, thought.id, false, LATER);
    expect(back.captures[0].status).toBe("inbox");
    expect(inboxOf(back)).toHaveLength(1);
  });

  it("leaves converted entries alone, and does nothing twice", () => {
    const converted = { ...base, captures: [{ ...thought, status: "converted" as const }] };
    expect(tasks.setCaptureKept(converted, thought.id, true, LATER)).toBe(converted);
    const kept = tasks.setCaptureKept(base, thought.id, true, LATER);
    expect(tasks.setCaptureKept(kept, thought.id, true, LATER)).toBe(kept);
  });

  it("a kept note can still be turned into a task", () => {
    const kept = tasks.setCaptureKept(base, thought.id, true, LATER);
    const result = tasks.convertCapture(kept, thought.id, { title: "Plan doubles drills" }, LATER);
    expect(result?.data.captures[0]).toMatchObject({ status: "converted", convertedTaskId: result?.task.id });
  });

  it("survives saving: device copy, backup file and the cloud", () => {
    const kept = tasks.setCaptureKept(base, thought.id, true, LATER);
    expect(parseEnvelope(JSON.parse(JSON.stringify(createEnvelope(kept))))!.data.captures[0].status).toBe("kept");
    expect(rowsToData(dataToRows(kept)).captures[0].status).toBe("kept");
    expect(parseEnvelope({ schemaVersion: SCHEMA_VERSION, data: kept })!.data.captures).toHaveLength(1);
  });
});

describe("Brain Dump: add to project notes", () => {
  const filed = tasks.fileCaptureToProject(base, thought.id, project.id, "14 Oct 2026", LATER)!;
  const notes = filed.data.projects[0].notes;

  it("adds to the end of the notes, never changing what's there", () => {
    expect(notes.startsWith(project.notes)).toBe(true);
    expect(notes).toBe(`${project.notes}\n\n— 14 Oct 2026, from Brain Dump\nCoaching idea\nTry doubles drills first`);
    expect(filed.data.projects[0].updatedAt).toBe(LATER);
  });

  it("removes the entry from the Brain Dump", () => {
    expect(filed.data.captures).toHaveLength(0);
  });

  it("starts empty notes without a gap", () => {
    const empty = { ...base, projects: [{ ...project, notes: "" }] };
    expect(tasks.fileCaptureToProject(empty, thought.id, project.id, "14 Oct 2026", LATER)!.data.projects[0].notes).toBe(
      "— 14 Oct 2026, from Brain Dump\nCoaching idea\nTry doubles drills first",
    );
  });

  it("works from a kept note, but not for converted entries or missing projects", () => {
    const kept = tasks.setCaptureKept(base, thought.id, true, LATER);
    expect(tasks.fileCaptureToProject(kept, thought.id, project.id, "14 Oct 2026", LATER)).not.toBeNull();
    const converted = { ...base, captures: [{ ...thought, status: "converted" as const }] };
    expect(tasks.fileCaptureToProject(converted, thought.id, project.id, "14 Oct 2026", LATER)).toBeNull();
    expect(tasks.fileCaptureToProject(base, thought.id, "nope", "14 Oct 2026", LATER)).toBeNull();
  });

  it("Undo puts both back exactly", () => {
    const undone = tasks.unfileCapture(filed.data, filed, LATER);
    expect(undone.captures).toEqual([thought]);
    expect(undone.projects[0].notes).toBe(project.notes);
  });

  it("Undo keeps anything typed into the notes since", () => {
    const edited = { ...filed.data, projects: [{ ...filed.data.projects[0], notes: `${notes}\nWritten afterwards` }] };
    expect(tasks.unfileCapture(edited, filed, LATER).projects[0].notes).toBe(`${project.notes}\nWritten afterwards`);
  });
});
