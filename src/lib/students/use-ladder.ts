"use client";

import * as React from "react";

import { useWorkspace } from "@/lib/store/workspace-store";

import type { Sport } from "@/types";

import { buildLadder } from "./ladder";

/** The ladder for a sport (tennis by default), with your edits applied. */
export function useLadder(sport: Sport = "tennis") {
  const { workspace } = useWorkspace();
  return React.useMemo(() => buildLadder(workspace.ladderStages, sport), [workspace.ladderStages, sport]);
}
