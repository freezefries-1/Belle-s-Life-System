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
 * The one place the app reads and writes persistent data.
 * Phase 2 uses localStorage; a Supabase implementation can replace it
 * later without touching components.
 */
export interface WorkspaceRepository {
  load(): Promise<LoadResult>;
  save(data: PersistedData): Promise<SaveResult>;
  clear(): Promise<void>;
  /** Notify when data changes elsewhere (e.g. another browser tab). */
  subscribe(onExternalChange: (data: PersistedData) => void): () => void;
}

/** Keep a copy of the raw value so nothing is silently lost (once per distinct value). */
function backupCorruptValue(raw: string, label?: string) {
  const prefix = `${STORAGE_KEY}:backup:`;
  if (listKeys(prefix).some((key) => readRaw(key) === raw)) return;
  writeRaw(`${prefix}${label ? `${label}-` : ""}${Date.now()}`, raw);
}

function readFromStorage(): LoadResult {
  if (!isStorageAvailable()) {
    return {
      status: "unavailable",
      data: EMPTY_DATA,
      isFirstRun: true,
      message: "This browser isn’t allowing saved data, so changes will only last until you close the tab.",
    };
  }

  const raw = readRaw(STORAGE_KEY);
  if (raw === null) return { status: "ok", data: EMPTY_DATA, isFirstRun: true };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    json = undefined;
  }

  const parsed = json === undefined ? null : parseEnvelope(json);
  if (!parsed) {
    backupCorruptValue(raw);
    return {
      status: "recovered",
      data: EMPTY_DATA,
      isFirstRun: false,
      message: "Your saved data couldn’t be read, so a backup copy was kept and a fresh workspace was started.",
    };
  }

  if (parsed.dropped > 0) {
    backupCorruptValue(raw);
    return {
      status: "recovered",
      data: parsed.data,
      isFirstRun: false,
      message: `${parsed.dropped} saved ${parsed.dropped === 1 ? "item" : "items"} couldn’t be read and ${parsed.dropped === 1 ? "was" : "were"} skipped. A backup copy was kept.`,
    };
  }

  if (parsed.migratedFrom !== null) {
    // Keep the pre-upgrade copy, then save in the new format straight away so
    // the newly assigned task order is fixed from now on.
    backupCorruptValue(raw, `pre-v${SCHEMA_VERSION}`);
    writeRaw(STORAGE_KEY, JSON.stringify(createEnvelope(parsed.data)));
  }

  return { status: "ok", data: parsed.data, isFirstRun: false };
}

export const localStorageRepository: WorkspaceRepository = {
  async load() {
    return readFromStorage();
  },

  async save(data) {
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
