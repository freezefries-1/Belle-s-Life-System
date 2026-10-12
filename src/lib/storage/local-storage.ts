/**
 * Minimal, defensive localStorage wrapper.
 * Never throws: private browsing, disabled storage, quota limits and
 * server rendering all degrade to "unavailable" instead of crashing.
 */

export type StorageWriteResult = { ok: true } | { ok: false; reason: "unavailable" | "quota" | "unknown" };

export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "__bls_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): StorageWriteResult {
  if (typeof window === "undefined") return { ok: false, reason: "unavailable" };
  try {
    window.localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return { ok: false, reason: quota ? "quota" : "unknown" };
  }
}

export function removeRaw(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing else we can do.
  }
}

/** Keys currently in storage that start with `prefix`. */
export function listKeys(prefix: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return Object.keys(window.localStorage).filter((k) => k.startsWith(prefix));
  } catch {
    return [];
  }
}
