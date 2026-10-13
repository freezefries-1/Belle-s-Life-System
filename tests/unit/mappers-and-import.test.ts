import { describe, expect, it } from "vitest";

import { createSampleData } from "@/data/sample-data";
import { generateOccurrences } from "@/lib/recurrence/recurrence";
import { countRows, pickSample } from "@/lib/repositories/local-migration";
import { dataToRows, rowsToData } from "@/lib/repositories/mappers";
import { SCHEMA_VERSION, parseEnvelope } from "@/lib/storage/schema";
import { TABLE_ORDER } from "@/types/database";

const TODAY = "2026-10-12";
// As the app has it after opening: recurring occurrences generated.
const generated = generateOccurrences(createSampleData(TODAY), TODAY, "2026-10-12T09:00:00.000Z");
const sample = parseEnvelope({ schemaVersion: SCHEMA_VERSION, savedAt: "", data: generated })!;

describe("database row mapping", () => {
  it("the sample data has nothing set aside on load", () => {
    expect(sample.dropped).toBe(0);
  });

  it("app data → rows → app data loses nothing", () => {
    expect(rowsToData(dataToRows(sample.data))).toEqual(sample.data);
  });

  it("every record type is represented", () => {
    const counts = countRows(dataToRows(sample.data));
    expect(TABLE_ORDER.filter((t) => counts[t] === 0)).toEqual([]);
  });
});

describe("test-import sample", () => {
  const rows = dataToRows(sample.data);
  const picked = pickSample(rows);

  it("is small", () => {
    const size = Object.values(countRows(picked)).reduce((a, b) => a + b, 0);
    expect(size).toBeGreaterThan(5);
    expect(size).toBeLessThan(30);
  });

  it("covers each kind of link", () => {
    const tasks = [...picked.tasks.values()];
    expect(tasks.some((t) => t.project_id && t.milestone_id)).toBe(true);
    expect(tasks.some((t) => t.status === "completed")).toBe(true);
    expect(tasks.some((t) => t.sprint)).toBe(true);
    expect(tasks.some((t) => t.recurrence_template_id)).toBe(true);
    for (const t of ["daily_highlights", "micro_commitment_completions", "weekly_priorities"] as const) expect(picked[t].size).toBeGreaterThan(0);
  });

  it("includes every parent its records point to", () => {
    for (const t of picked.tasks.values()) {
      if (t.project_id) expect(picked.projects.has(t.project_id)).toBe(true);
      if (t.milestone_id) expect(picked.project_milestones.has(t.milestone_id)).toBe(true);
      if (t.recurrence_template_id) expect(picked.recurrence_templates.has(t.recurrence_template_id)).toBe(true);
      if (t.source_capture_id) expect(picked.brain_dump_entries.has(t.source_capture_id)).toBe(true);
    }
    for (const m of picked.project_milestones.values()) expect(picked.projects.has(m.project_id)).toBe(true);
    for (const c of picked.brain_dump_entries.values()) if (c.converted_task_id) expect(picked.tasks.has(c.converted_task_id)).toBe(true);
    for (const h of picked.daily_highlights.values()) if (h.task_id) expect(picked.tasks.has(h.task_id)).toBe(true);
    for (const c of picked.micro_commitment_completions.values()) expect(picked.micro_commitments.has(c.commitment_id)).toBe(true);
    for (const p of picked.weekly_priorities.values()) {
      expect(picked.weekly_reviews.has(p.weekly_review_id)).toBe(true);
      if (p.task_id) expect(picked.tasks.has(p.task_id)).toBe(true);
      if (p.project_id) expect(picked.projects.has(p.project_id)).toBe(true);
    }
  });
});
