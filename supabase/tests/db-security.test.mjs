// Database security & integrity tests against a running Supabase stack
// (local: supabase/local/start.sh). Uses two real accounts.
//   SUPABASE_URL=http://localhost:54321 ANON_KEY=... node supabase/tests/db-security.test.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "http://localhost:54321";
const anonKey = process.env.ANON_KEY;
if (!anonKey) throw new Error("ANON_KEY is required");

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};
const now = new Date().toISOString();
const stamp = Date.now();

async function account(label) {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `${label}-${stamp}@belle.test`;
  const { data, error } = await client.auth.signUp({ email, password: "correct horse battery 9" });
  if (error) throw error;
  // The app always names the account a save is for (p_user); do the same here unless a test overrides it.
  const rpc = client.rpc.bind(client);
  client.rpc = (fn, args) =>
    rpc(fn, (fn === "apply_changes" || fn === "import_rows") && args && !("p_user" in args) ? { ...args, p_user: data.user.id } : args);
  return { client, id: data.user.id, email };
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const a = await account("alice");
const b = await account("bob");

const project = (id, extra = {}) => ({ id, name: `Project ${id}`, status: "active", created_at: now, updated_at: now, ...extra });
const stripMeta = ({ user_id, version, synced_at, ...rest }) => (void user_id, void version, void synced_at, rest);
const apply = (acc, changes) => acc.client.rpc("apply_changes", { changes });
const task = (id, extra = {}) => ({ id, title: `Task ${id}`, status: "todo", created_at: now, updated_at: now, ...extra });

// ---------- ownership & RLS ----------
let r = await a.client.from("projects").insert(project("p1"));
check("Owner can insert", !r.error, r.error?.message);
r = await a.client.from("tasks").insert(task("t1", { project_id: "p1", due_date: "2026-10-20" }));
check("Owner can insert task linked to own project", !r.error, r.error?.message);
r = await a.client.from("projects").insert({ ...project("p-spoof"), user_id: b.id });
const spoof = await a.client.from("projects").select("user_id").eq("id", "p-spoof").single();
check("Inserting with someone else's user_id is rewritten to the caller", !r.error && spoof.data?.user_id === a.id);

r = await b.client.from("tasks").select("*");
check("Cross-account read blocked (Bob sees none of Alice's tasks)", !r.error && r.data.length === 0);
r = await b.client.from("projects").select("*").eq("id", "p1");
check("Cross-account read by id blocked", !r.error && r.data.length === 0);
r = await b.client.from("tasks").update({ title: "hacked" }).eq("id", "t1").select();
const still = await a.client.from("tasks").select("title").eq("id", "t1").single();
check("Cross-account update blocked", (r.data ?? []).length === 0 && still.data.title === "Task t1");
r = await b.client.from("tasks").delete().eq("id", "t1").select();
const exists = await a.client.from("tasks").select("id").eq("id", "t1");
check("Cross-account delete blocked", (r.data ?? []).length === 0 && exists.data.length === 1);
r = await b.client.from("tasks").update({ user_id: b.id }).eq("id", "t1").select();
check("Cannot take over another user's row", (r.data ?? []).length === 0);
r = await a.client.from("tasks").update({ user_id: b.id }).eq("id", "t1").select("user_id");
check("Owner cannot move a row to another account", r.error !== null || r.data?.[0]?.user_id === a.id, r.error?.message ?? r.data?.[0]?.user_id);

// Cross-account foreign keys: Bob links his task to Alice's project id.
r = await b.client.from("tasks").insert(task("tb1", { project_id: "p1" }));
check("Cross-account foreign key blocked (task → other user's project)", !!r.error && /foreign key/i.test(r.error.message), r.error?.message);
// Bob has his own project with the same id — allowed, and separate.
await b.client.from("projects").insert(project("p1", { name: "Bob's p1" }));
r = await b.client.from("tasks").insert(task("tb1", { project_id: "p1" }));
const alicesP1 = await a.client.from("projects").select("name").eq("id", "p1").single();
check("Same id in two accounts stays separate", !r.error && alicesP1.data.name === "Project p1");
r = await b.client.rpc("apply_changes", { changes: [{ table: "tasks", op: "upsert", id: "t1", row: task("t1", { title: "via rpc" }), expected_version: 1 }] });
const t1 = await a.client.from("tasks").select("title").eq("id", "t1").single();
check("RPC can't touch another user's row", t1.data.title === "Task t1" && r.data?.ok === false, JSON.stringify(r.data ?? r.error));

r = await anon.from("tasks").select("*");
check("Anonymous access denied", !!r.error || r.data.length === 0);
r = await anon.rpc("apply_changes", { changes: [] });
check("Anonymous RPC denied", !!r.error);
r = await b.client.from("sync_tombstones").insert({ user_id: b.id, table_name: "tasks", id: "x" });
check("Clients can't write tombstones directly", !!r.error);

// ---------- integrity constraints ----------
r = await a.client.from("daily_highlights").insert([
  { id: "h1", date_key: "2026-10-12", task_id: "t1", title_snapshot: "x", selected_at: now, updated_at: now },
  { id: "h2", date_key: "2026-10-12", task_id: "t1", title_snapshot: "y", selected_at: now, updated_at: now },
]);
check("One highlight per day (DB unique)", !!r.error && /duplicate|unique/i.test(r.error.message));
await a.client.from("micro_commitments").insert({ id: "c1", title: "Read", frequency: "daily", start_date: "2026-10-01", status: "active", created_at: now, updated_at: now });
r = await a.client.from("micro_commitment_completions").insert([
  { id: "cc1", commitment_id: "c1", date_key: "2026-10-12", completed_at: now },
  { id: "cc2", commitment_id: "c1", date_key: "2026-10-12", completed_at: now },
]);
check("One completion per commitment per day", !!r.error);
r = await a.client.from("weekly_reviews").insert([
  { id: "w1", week_start_date: "2026-10-05", week_end_date: "2026-10-11", status: "in_progress", created_at: now, updated_at: now },
  { id: "w2", week_start_date: "2026-10-05", week_end_date: "2026-10-11", status: "in_progress", created_at: now, updated_at: now },
]);
check("One weekly review per week", !!r.error);
r = await a.client.from("weekly_reviews").insert({ id: "w3", week_start_date: "2026-10-06", week_end_date: "2026-10-12", status: "in_progress", created_at: now, updated_at: now });
check("Weekly review must start on a Monday", !!r.error);
await a.client.from("recurrence_templates").insert({ id: "rt1", title: "Water", frequency: "daily", start_date: "2026-10-01", status: "active", created_at: now, updated_at: now });
r = await a.client.from("tasks").insert([
  task("rec_rt1_2026-10-12", { recurrence_template_id: "rt1", occurrence_date: "2026-10-12" }),
  task("other-id", { recurrence_template_id: "rt1", occurrence_date: "2026-10-12" }),
]);
check("One occurrence per template per date", !!r.error);
r = await a.client.from("tasks").insert(task("bad", { status: "done" }));
check("Status values are constrained", !!r.error);
await a.client.from("project_milestones").insert({ id: "m1", project_id: "p1", title: "M", status: "upcoming", created_at: now, updated_at: now });
await a.client.from("projects").insert(project("p2"));
r = await a.client.from("tasks").insert(task("tm", { project_id: "p2", milestone_id: "m1" }));
check("A task's milestone must belong to its project", !!r.error);

// ---------- deleting a project keeps tasks ----------
await a.client.from("tasks").insert(task("tm2", { project_id: "p1", milestone_id: "m1" }));
await a.client.from("projects").delete().eq("id", "p1");
const kept = await a.client.from("tasks").select("id, project_id, milestone_id").in("id", ["t1", "tm2"]);
check("Deleting a project keeps its tasks, unlinked", kept.data.length === 2 && kept.data.every((t) => t.project_id === null && t.milestone_id === null));
const ms = await a.client.from("project_milestones").select("id").eq("id", "m1");
check("…and removes its milestones", ms.data.length === 0);
const tomb = await a.client.from("sync_tombstones").select("table_name, id");
check("Deletions leave tombstones for sync", tomb.data.some((x) => x.table_name === "projects" && x.id === "p1") && tomb.data.some((x) => x.table_name === "project_milestones"));
const bobTomb = await b.client.from("sync_tombstones").select("*");
check("Tombstones are private too", bobTomb.data.length === 0);

// ---------- apply_changes: versions, conflicts, retries ----------
const base = (await a.client.from("tasks").select("*").eq("id", "t1").single()).data;
const edit = (title) => ({ table: "tasks", op: "upsert", id: "t1", row: { ...base, title }, expected_version: base.version });
r = await a.client.rpc("apply_changes", { changes: [edit("Device 1 edit")] });
check("Versioned update succeeds", r.data?.ok === true && r.data.results[0].version === base.version + 1, JSON.stringify(r.data ?? r.error));
r = await a.client.rpc("apply_changes", { changes: [edit("Device 1 edit")] });
check("Retrying the same change is recognised (idempotent)", r.data?.ok === true);
r = await a.client.rpc("apply_changes", { changes: [edit("Stale device 2 edit")] });
const after = await a.client.from("tasks").select("title").eq("id", "t1").single();
check("Stale update is rejected as a conflict, not overwritten", r.data?.ok === false && r.data.conflicts[0].reason === "changed" && after.data.title === "Device 1 edit");
r = await a.client.rpc("apply_changes", {
  changes: [
    { table: "tasks", op: "upsert", id: "new-1", row: task("new-1"), expected_version: null },
    { table: "tasks", op: "upsert", id: "t1", row: { ...base, title: "x" }, expected_version: base.version },
  ],
});
const new1 = await a.client.from("tasks").select("id").eq("id", "new-1");
check("A conflict rolls back the whole batch", r.data?.ok === false && new1.data.length === 0);
const occ = (id) => ({ table: "tasks", op: "upsert", id, row: task(id, { recurrence_template_id: "rt1", occurrence_date: "2026-10-13", created_at: new Date().toISOString() }), expected_version: null, if_exists: "ignore" });
const d1 = await a.client.rpc("apply_changes", { changes: [occ("rec_rt1_2026-10-13")] });
const d2 = await a.client.rpc("apply_changes", { changes: [occ("rec_rt1_2026-10-13")] });
const occs = await a.client.from("tasks").select("id").eq("recurrence_template_id", "rt1").eq("occurrence_date", "2026-10-13");
check("Two devices generating the same occurrence → one task", d1.data.ok && d2.data.ok && occs.data.length === 1 && !!d2.data.results[0].adopted);
r = await a.client.rpc("apply_changes", { changes: [{ table: "tasks", op: "upsert", id: "rec-other", row: task("rec-other", { recurrence_template_id: "rt1", occurrence_date: "2026-10-13" }), expected_version: null }] });
check("A different id for the same occurrence is reported as duplicate", r.data?.ok === false && r.data.conflicts[0].reason === "duplicate");
r = await a.client.rpc("apply_changes", { changes: [{ table: "tasks", op: "delete", id: "never-existed", expected_version: 3 }] });
check("Deleting a missing row is idempotent", r.data?.ok === true);
const v = (await a.client.from("tasks").select("version").eq("id", "t1").single()).data.version;
await a.client.rpc("apply_changes", { changes: [{ table: "tasks", op: "delete", id: "t1", expected_version: v }] });
r = await a.client.rpc("apply_changes", { changes: [{ table: "tasks", op: "upsert", id: "t1", row: { ...base, title: "edited offline" }, expected_version: v }] });
check("Editing a row deleted elsewhere is a conflict", r.data?.ok === false && r.data.conflicts[0].reason === "deleted");
// Capture ↔ converted task in one batch (deferred FK).
r = await a.client.rpc("apply_changes", {
  changes: [
    { table: "brain_dump_entries", op: "upsert", id: "cap1", row: { id: "cap1", title: "Idea", kind: "task", status: "converted", converted_task_id: "conv1", created_at: now, updated_at: now }, expected_version: null },
    { table: "tasks", op: "upsert", id: "conv1", row: task("conv1", { source_capture_id: "cap1" }), expected_version: null },
  ],
});
check("Capture and its converted task save together", r.data?.ok === true, JSON.stringify(r.data ?? r.error));

// ---------- import_rows ----------
const rows = [task("imp1", { created_at: "2025-01-01T10:00:00Z", completed_at: "2025-01-02T10:00:00Z", status: "completed" }), task("imp2"), task("conv1")];
r = await a.client.rpc("import_rows", { target: "tasks", rows });
check("Import inserts new rows, keeps existing", r.data?.inserted === 2 && r.data?.existing === 1, JSON.stringify(r.data ?? r.error));
r = await a.client.rpc("import_rows", { target: "tasks", rows });
check("Import is safe to retry (no duplicates)", r.data?.inserted === 0 && r.data?.existing === 3);
const imp = await a.client.from("tasks").select("created_at, completed_at").eq("id", "imp1").single();
check("Import preserves historical timestamps", imp.data.created_at.startsWith("2025-01-01T10:00:00") && imp.data.completed_at.startsWith("2025-01-02"));
r = await a.client.rpc("import_rows", { target: "tasks", rows: [task("orphan", { project_id: "missing-project" })] });
check("Import skips rows with missing parents instead of failing", r.data?.inserted === 0 && r.data?.skipped.length === 1);
await a.client.from("kaizen_logs").insert({ id: "cloud-log", date_key: "2026-10-12", created_at: now, updated_at: now });
r = await a.client.rpc("import_rows", { target: "kaizen_logs", rows: [{ id: "local-log", date_key: "2026-10-12", reflection_went_well: "Local words", reflection_improve: "", reflection_learned: "", notes: "", created_at: now, updated_at: now }] });
const log = await a.client.from("kaizen_logs").select("id, reflection_went_well").eq("date_key", "2026-10-12").single();
check("Import fills an empty same-day cloud log instead of losing local words", r.data?.filled === 1 && log.data.reflection_went_well === "Local words");
r = await b.client.rpc("import_rows", { target: "tasks", rows: [task("imp1", { title: "bob's" })] });
const aliceImp = await a.client.from("tasks").select("title").eq("id", "imp1").single();
check("Import is scoped to the caller", r.data?.inserted === 1 && aliceImp.data.title === "Task imp1");

// ---------- Stage A: account binding, conflict judging, rejections, duplicates ----------
r = await a.client.rpc("apply_changes", { changes: [], p_user: b.id });
check("A save naming a different account is refused", !!r.error && /account mismatch/.test(r.error.message), r.error?.message);
r = await a.client.rpc("import_rows", { target: "tasks", rows: [], p_user: b.id });
check("An import naming a different account is refused", !!r.error);
{
  const raw = createClient(url, anonKey, { auth: { persistSession: false } });
  await raw.auth.signInWithPassword({ email: a.email, password: "correct horse battery 9" });
  const old = await raw.rpc("apply_changes", { changes: [] });
  check("The old function without the account check can no longer be called", !!old.error, old.error?.message);
}
// Deleting a project and unlinking its tasks in one batch is not a conflict.
await a.client.from("projects").insert(project("pd"));
await a.client.from("tasks").insert([task("pd1", { project_id: "pd" }), task("pd2", { project_id: "pd" })]);
const pdv = (await a.client.from("projects").select("version").eq("id", "pd").single()).data.version;
const pdt = (await a.client.from("tasks").select("*").in("id", ["pd1", "pd2"])).data;
r = await apply(a, [
  { table: "projects", op: "delete", id: "pd", expected_version: pdv },
  ...pdt.map((t) => ({ table: "tasks", op: "upsert", id: t.id, row: { ...stripMeta(t), project_id: null, updated_at: new Date().toISOString() }, expected_version: t.version })),
]);
check("Deleting a project with tasks saves without a false conflict", r.data?.ok === true, JSON.stringify(r.data?.conflicts ?? r.error));
// A change that depends on something deleted elsewhere is rejected cleanly (not an error that blocks saving).
r = await apply(a, [
  { table: "tasks", op: "upsert", id: "fk1", row: task("fk1"), expected_version: null },
  { table: "tasks", op: "upsert", id: "fk2", row: task("fk2", { project_id: "gone-project" }), expected_version: null },
]);
const fk1 = await a.client.from("tasks").select("id").eq("id", "fk1");
check("A change pointing at a deleted record is reported as rejected", r.data?.ok === false && r.data.conflicts[0].reason === "rejected" && r.data.conflicts[0].id === "fk2", JSON.stringify(r.data ?? r.error));
check("…and the whole batch is rolled back", fk1.data.length === 0);
r = await apply(a, [{ table: "brain_dump_entries", op: "upsert", id: "cap-x", row: { id: "cap-x", title: "x", kind: "task", status: "converted", converted_task_id: "no-such-task", created_at: now, updated_at: now }, expected_version: null }]);
check("A delayed link check is also reported as rejected", r.data?.ok === false && r.data.conflicts[0].reason === "rejected", JSON.stringify(r.data ?? r.error));
// Same-day duplicates come back with the existing record so text can be merged.
await a.client.from("kaizen_logs").insert({ id: "phone-log", date_key: "2026-10-20", reflection_went_well: "From phone", created_at: now, updated_at: now });
r = await apply(a, [{ table: "kaizen_logs", op: "upsert", id: "laptop-log", row: { id: "laptop-log", date_key: "2026-10-20", reflection_went_well: "From laptop", reflection_improve: "", reflection_learned: "", notes: "", created_at: now, updated_at: now }, expected_version: null }]);
check("A second log for the same day returns the existing one", r.data?.ok === false && r.data.conflicts[0].reason === "duplicate" && r.data.conflicts[0].server?.id === "phone-log", JSON.stringify(r.data?.conflicts));
await a.client.from("micro_commitment_completions").insert({ id: "cc-first", commitment_id: "c1", date_key: "2026-10-12", completed_at: now });
r = await apply(a, [{ table: "micro_commitment_completions", op: "upsert", id: "cc-dup", row: { id: "cc-dup", commitment_id: "c1", date_key: "2026-10-12", completed_at: now }, expected_version: null }]);
check("A second tick for the same commitment and day returns the existing one", r.data?.ok === false && r.data.conflicts[0].reason === "duplicate" && !!r.data.conflicts[0].server);
// Malformed input is refused with a clear error.
for (const [label, changes] of [
  ["missing op", [{ table: "tasks", id: "x", row: task("x") }]],
  ["missing table", [{ op: "upsert", id: "x", row: task("x") }]],
  ["row with no columns", [{ table: "tasks", op: "upsert", id: "x", row: { nonsense: 1 } }]],
  ["not an array", { table: "tasks" }],
]) {
  r = await apply(a, changes);
  check(`Malformed input refused: ${label}`, !!r.error);
}
// Profiles: only the display name can be changed.
r = await a.client.from("profiles").update({ display_name: "Belle" }).eq("id", a.id).select("display_name");
check("Profile display name can be updated", !r.error && r.data[0]?.display_name === "Belle", r.error?.message);
r = await a.client.from("profiles").update({ created_at: "2000-01-01T00:00:00Z" }).eq("id", a.id).select();
check("Other profile fields can't be changed", !!r.error);
r = await b.client.from("profiles").select("*").eq("id", a.id);
check("Profiles are private", !r.error && r.data.length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
