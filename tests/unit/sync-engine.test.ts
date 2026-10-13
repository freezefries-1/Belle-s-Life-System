import { describe, expect, it } from "vitest";

import { applyOps, coalesce, dropWithDependents, mergeChanges, mergeText, type Op } from "@/lib/repositories/cloud-sync";
import { emptyRowSet } from "@/lib/repositories/mappers";
import type { AnyRow, TombstoneRow } from "@/types/database";

const k = (t: string, id: string) => `${t}\u0000${id}`;
const row = (o: object) => o as unknown as AnyRow;
const title = (r: AnyRow | undefined) => (r as unknown as { title: string } | undefined)?.title;

describe("queueing changes", () => {
  it("a later edit keeps the version the first edit was based on", () => {
    const merged = coalesce([[{ table: "tasks", op: "upsert", id: "t", row: row({ id: "t", title: "a" }), base: 3 }], [{ table: "tasks", op: "upsert", id: "t", row: row({ id: "t", title: "b" }) }]]);
    expect(merged).toHaveLength(1);
    expect(merged[0].base).toBe(3);
    expect(title(merged[0].row)).toBe("b");
  });

  it("orders deletes children-first and upserts parents-first", () => {
    const ordered = coalesce([
      [
        { table: "tasks", op: "upsert", id: "t", row: row({ id: "t" }) },
        { table: "projects", op: "upsert", id: "p", row: row({ id: "p" }) },
        { table: "projects", op: "delete", id: "p2" },
        { table: "tasks", op: "delete", id: "t2" },
      ],
    ]);
    expect(ordered.map((o) => `${o.op}:${o.table}`)).toEqual(["delete:tasks", "delete:projects", "upsert:projects", "upsert:tasks"]);
  });
});

describe("setting aside changes that can't be saved", () => {
  const batch: Op[] = [
    { table: "sprint_sessions", op: "upsert", id: "s1", row: row({ id: "s1" }) },
    { table: "sprint_session_tasks", op: "upsert", id: "s1:t1", row: row({ id: "s1:t1", session_id: "s1", task_id: "t1" }) },
    { table: "tasks", op: "upsert", id: "t9", row: row({ id: "t9", project_id: null }) },
  ];

  it("drops a new session's task links along with it", () => {
    expect(dropWithDependents(batch, new Set([k("sprint_sessions", "s1")]), new Map()).map((o) => o.id)).toEqual(["t9"]);
  });

  it("keeps the links when the session already exists on the server", () => {
    expect(dropWithDependents(batch, new Set([k("sprint_sessions", "s1")]), new Map([[k("sprint_sessions", "s1"), 2]]))).toHaveLength(2);
  });

  it("follows chains (project → milestone → task)", () => {
    const chain: Op[] = [
      { table: "projects", op: "upsert", id: "p", row: row({ id: "p" }) },
      { table: "project_milestones", op: "upsert", id: "m", row: row({ id: "m", project_id: "p" }) },
      { table: "tasks", op: "upsert", id: "t", row: row({ id: "t", project_id: "x", milestone_id: "m" }) },
    ];
    expect(dropWithDependents(chain, new Set([k("projects", "p")]), new Map())).toHaveLength(0);
  });
});

describe("merging text from two devices", () => {
  it("keeps both", () => expect(mergeText("From laptop", "From phone")).toBe("From laptop\n\nFrom phone"));
  it("ignores an empty side", () => {
    expect(mergeText("", "Mine")).toBe("Mine");
    expect(mergeText("Theirs", "")).toBe("Theirs");
  });
  it("doesn't duplicate identical or contained text", () => {
    expect(mergeText("Same", "Same")).toBe("Same");
    expect(mergeText("A\n\nB", "B")).toBe("A\n\nB");
  });
});

describe("re-applying kept changes", () => {
  it("shows them on top of the server rows without changing those", () => {
    const rows = emptyRowSet();
    rows.tasks.set("a", row({ id: "a", title: "server" }) as never);
    rows.tasks.set("b", row({ id: "b", title: "gone" }) as never);
    const applied = applyOps(rows, [{ table: "tasks", op: "upsert", id: "a", row: row({ id: "a", title: "mine" }) }, { table: "tasks", op: "delete", id: "b" }]);
    expect(title(applied.tasks.get("a"))).toBe("mine");
    expect(applied.tasks.has("b")).toBe(false);
    expect(title(rows.tasks.get("a"))).toBe("server");
  });
});

describe("catching up with changes (device copy and pulls)", () => {
  const base = () => {
    const rows = emptyRowSet();
    rows.tasks.set("a", row({ id: "a", title: "old", version: 1, synced_at: "2026-10-12T10:00:00Z" }) as never);
    rows.tasks.set("b", row({ id: "b", title: "keep", version: 1, synced_at: "2026-10-12T10:00:00Z" }) as never);
    return rows;
  };
  const tomb = (id: string, at: string): TombstoneRow => ({ table_name: "tasks", id, deleted_at: at });

  it("applies edits, additions and deletions and moves the cursor to the newest", () => {
    const rows = base();
    const { touched, newest } = mergeChanges(
      rows,
      [["tasks", [row({ id: "a", title: "new", version: 2, synced_at: "2026-10-12T11:00:00Z" }), row({ id: "c", title: "added", version: 1, synced_at: "2026-10-12T11:01:00Z" })]]],
      [tomb("b", "2026-10-12T11:02:00Z")],
      "2026-10-12T10:00:00Z",
    );
    expect(touched).toBe(true);
    expect(newest).toBe("2026-10-12T11:02:00Z");
    expect([...rows.tasks.keys()].sort()).toEqual(["a", "c"]);
    expect(title(rows.tasks.get("a"))).toBe("new");
  });

  it("ignores rows it already has", () => {
    const { touched } = mergeChanges(base(), [["tasks", [row({ id: "a", title: "old", version: 1, synced_at: "2026-10-12T10:00:00Z" })]]], [], "2026-10-12T10:00:00Z");
    expect(touched).toBe(false);
  });

  it("doesn't let an old deletion remove a row restored after it", () => {
    const rows = base();
    mergeChanges(rows, [], [tomb("a", "2026-10-12T09:00:00Z")], null);
    expect(rows.tasks.has("a")).toBe(true);
  });
});
