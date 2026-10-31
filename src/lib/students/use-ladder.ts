"use client";

import * as React from "react";

import { useWorkspace } from "@/lib/store/workspace-store";

import { buildLadder } from "./ladder";

/** The coaching ladder with your edits applied. */
export function useLadder() {
  const { workspace } = useWorkspace();
  return React.useMemo(() => buildLadder(workspace.ladderStages), [workspace.ladderStages]);
}
