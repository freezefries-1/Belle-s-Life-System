import type { WorkspaceRepository } from "@/lib/storage/workspace-repository";

import type { CloudSync } from "./cloud-sync";

/**
 * The cloud version of the app's repository: same interface as the
 * localStorage one, so the store and every component stay unchanged.
 * Saving hands the change to the sync engine, which reports progress
 * through its own status (shown in the top bar).
 */
export function createCloudRepository(engine: CloudSync): WorkspaceRepository {
  return {
    async load() {
      const data = await engine.loadAll();
      const empty = Object.values(data).every((list) => Array.isArray(list) && list.length === 0);
      return { status: "ok", data, isFirstRun: empty };
    },
    async save(data, previous) {
      if (previous) engine.push(previous, data);
      return { ok: true };
    },
    async clear() {
      // Deleting cloud data only ever happens through explicit, confirmed actions.
    },
    subscribe(onExternalChange) {
      engine.onRemoteData = onExternalChange;
      engine.start();
      return () => {
        engine.onRemoteData = null;
      };
    },
  };
}
