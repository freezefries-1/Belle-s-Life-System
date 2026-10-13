import type { PersistedData } from "@/types";

import { isStorageAvailable, listKeys, readRaw, removeRaw, writeRaw } from "./local-storage";
import { EMPTY_DATA, SCHEMA_VERSION, STORAGE_KEY, createEnvelope, parseEnvelope } from "./schema";

export type LoadStatus =
  /** Saved data loaded (or nothing saved yet). */
  | "ok"
  /** Some or all saved data was unreadable; a backup copy of the raw value was kept. */
  | "recovered"
  /** The browser won't let us store anything (e.g. private mode). */
  | "unavailable";

export interface LoadResult {
  status: LoadStatus;
  data: PersistedData;
  /** True when nothing has ever been saved in this browser. */
  isFirstRun: boolean;
  message?: string;
}

export type SaveResult = { ok: true } | { ok: false; message: string };

/**
 * The one place the app reads and writes persistent data: this browser's
 * storage (below), or the cloud account (repositories/cloud-repository.ts).
 * Components never know which.
 */
export interface WorkspaceRepository {
  load(): Promise<LoadResult>;
  /** `previous` lets a cloud repository send only what changed. */
  save(data: PersistedData, previous: PersistedData | null): Promise<SaveResult>;
  clear(): Promise<void>;
  /** Notify when data changes elsewhere (e.g. another browser tab). */
  subscribe(onExternalChange: (data: PersistedData) => void): () => void;
}

/**
 * When set, saving is refused: the stored data couldn't be read or backed
 * up, or it came from a newer version of the app. Overwriting it could lose
 * data, so the app stays read-only for this visit instead.
 */
let writeBlockedReason: string | null = null;

/** Keep a copy of the raw value so nothing is silently lost (once per distinct value). Returns whether a copy exists. */
function backupCorruptValue(raw: string, label?: string): boolean {
  const prefix = `${STORAGE_KEY}:backup:`;
  if (listKeys(prefix).some((key) => readRaw(key) === raw)) return true;
  const k = `${prefix}${label ? `${label}-` : ""}${Date.now()}`;
  return writeRaw(k, raw).ok && readRaw(k) === raw;
}

const NOT_BACKED_UP =
  "Your saved data couldn’t be fully read, and there wasn’t room to keep a backup copy — so nothing will be saved over it. Free up browser storage, then reload.";

function readFromStorage(): LoadResult {
  if (!isStorageAvailable()) {
    return {
      status: "unavailable",
      data: EMPTY_DATA,
      isFirstRun: true,
      message: "This browser isn’t allowing saved data, so changes will only last until you close the tab.",
    };
  }

  writeBlockedReason = null;
  const raw = readRaw(STORAGE_KEY);
  if (raw === null) return { status: "ok", data: EMPTY_DATA, isFirstRun: true };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    json = undefined;
  }

  // Saved by a newer version of the app: never overwrite it with an older format.
  const version = typeof json === "object" && json !== null ? (json as { schemaVersion?: unknown }).schemaVersion : undefined;
  if (typeof version === "number" && version > SCHEMA_VERSION) {
    writeBlockedReason = "Your data was saved by a newer version of the app. Reload the page to update — nothing here will be changed until then.";
    return { status: "unavailable", data: EMPTY_DATA, isFirstRun: false, message: writeBlockedReason };
  }

  const parsed = json === undefined ? null : parseEnvelope(json);
  if (!parsed) {
    if (!backupCorruptValue(raw)) {
      writeBlockedReason = NOT_BACKED_UP;
      return { status: "unavailable", data: EMPTY_DATA, isFirstRun: false, message: NOT_BACKED_UP };
    }
    return {
      status: "recovered",
      data: EMPTY_DATA,
      isFirstRun: false,
      message: "Your saved data couldn’t be read, so a backup copy was kept and a fresh workspace was started.",
    };
  }

  if (parsed.dropped > 0) {
    if (!backupCorruptValue(raw)) {
      writeBlockedReason = NOT_BACKED_UP;
      return { status: "unavailable", data: parsed.data, isFirstRun: false, message: NOT_BACKED_UP };
    }
    return {
      status: "recovered",
      data: parsed.data,
      isFirstRun: false,
      message: `${parsed.dropped} saved ${parsed.dropped === 1 ? "item" : "items"} couldn’t be used and ${parsed.dropped === 1 ? "was" : "were"} set aside (unreadable, repeated, or linked to something that no longer exists). A backup copy was kept.`,
    };
  }

  if (parsed.migratedFrom !== null) {
    // Keep the pre-upgrade copy, then save in the new format straight away so
    // the newly assigned task order is fixed from now on.
    if (!backupCorruptValue(raw, `pre-v${SCHEMA_VERSION}`)) {
      writeBlockedReason = NOT_BACKED_UP;
      return { status: "unavailable", data: parsed.data, isFirstRun: false, message: NOT_BACKED_UP };
    }
    writeRaw(STORAGE_KEY, JSON.stringify(createEnvelope(parsed.data)));
  }

  return { status: "ok", data: parsed.data, isFirstRun: false };
}

export const localStorageRepository: WorkspaceRepository = {
  async load() {
    return readFromStorage();
  },

  async save(data) {
    if (writeBlockedReason) return { ok: false, message: writeBlockedReason };
    const result = writeRaw(STORAGE_KEY, JSON.stringify(createEnvelope(data)));
    if (result.ok) return { ok: true };
    return {
      ok: false,
      message:
        result.reason === "quota"
          ? "Your browser’s storage is full, so the latest change wasn’t saved."
          : "The latest change couldn’t be saved in this browser.",
    };
  },

  async clear() {
    removeRaw(STORAGE_KEY);
  },

  subscribe(onExternalChange) {
    if (typeof window === "undefined") return () => {};
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      try {
        const parsed = parseEnvelope(JSON.parse(event.newValue));
        if (parsed) onExternalChange(parsed.data);
      } catch {
        // Ignore unreadable external writes; our own copy stays intact.
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};
