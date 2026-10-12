"use client";

import { CurrentSessionWidget } from "@/components/sprints/current-session-widget";

import { ActiveProjects } from "./active-projects";
import { DailyProgress } from "./daily-progress";
import { GettingStarted } from "./getting-started";
import { HighlightCard } from "./highlight-card";
import { MicroCommitmentsCard } from "./micro-commitments-card";
import { QuickCaptureCard } from "./quick-capture-card";
import { SprintOverview } from "./sprint-overview";
import { WelcomeHeader } from "./welcome-header";

/**
 * The command centre. DOM order is the mobile reading order:
 * highlight → capture → commitments → sprints → progress → projects.
 * On large screens a 3-column grid places them side by side.
 */
export function TodayDashboard() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <WelcomeHeader />
      <CurrentSessionWidget />
      <GettingStarted />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <HighlightCard className="lg:col-span-2 lg:col-start-1 lg:row-start-1" />
        <QuickCaptureCard className="lg:col-start-3 lg:row-start-1" />
        <MicroCommitmentsCard className="lg:col-start-3 lg:row-start-2" />
        <SprintOverview className="lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-2" />
        <DailyProgress className="lg:col-start-3 lg:row-start-3 lg:self-start" />
      </div>
      <ActiveProjects />
    </div>
  );
}
