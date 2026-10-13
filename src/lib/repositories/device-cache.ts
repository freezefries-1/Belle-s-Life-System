import { TABLE_ORDER, type AnyRow, type TableName } from "@/types/database";

/**
 * A copy of the account's confirmed server rows, kept in this browser
 * (IndexedDB) so opening the app only needs the changes since last time.
 * It never holds unsaved changes (those are kept separately until the server
 * confirms them), and signing out deletes it. Every failure here just means
 * "no copy": the app then loads everything from the server as before.
 */

const DB_NAME = "belles-life-system-cloud-cache";
const STORE = "accounts";

export interface DeviceCopy {
  /** Bumped when the stored shape changes; an older copy is ignored. */
  format: number;
  userId: string;
  /** Server time of the newest change in this copy (the sync cursor). */
  cursor: string | null;
  /** When everything was last downloaded in full. */
  fullAt: string;
  savedAt: string;
  rows: Record<TableName, AnyRow[]>;
}

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const req = action(tx.objectStore(STORE));
          tx.oncomplete = () => {
            db.close();
            resolve(req.result ?? null);
          };
          tx.onerror = tx.onabort = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      }),
  );
}

/** The saved copy for this account, or null if there isn't a usable one. */
export async function readDeviceCopy(userId: string, format: number): Promise<DeviceCopy | null> {
  const copy = (await run("readonly", (s) => s.get(userId))) as DeviceCopy | null;
  if (!copy || copy.format !== format || copy.userId !== userId || typeof copy.fullAt !== "string" || !copy.rows) return null;
  if (!TABLE_ORDER.every((t) => Array.isArray(copy.rows[t]))) return null;
  return copy;
}

/** Bumped by every clear, so a save that started before it can't put a copy back afterwards. */
let generation = 0;

/** Save this account's copy. Only one account's copy is ever kept, so any other is removed. */
export async function writeDeviceCopy(copy: DeviceCopy): Promise<boolean> {
  const started = generation;
  return (
    (await run("readwrite", (s) => {
      if (started !== generation) throw new Error("cleared");
      s.clear();
      return s.put(copy, copy.userId);
    })) !== null
  );
}

/** Remove every account's copy from this browser (on sign-out). */
export async function clearDeviceCopies(): Promise<void> {
  generation++;
  await run("readwrite", (s) => s.clear());
}
