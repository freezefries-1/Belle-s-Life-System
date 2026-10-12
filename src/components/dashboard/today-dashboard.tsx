"use client";

import { DeadlineOverview } from "@/components/projects/deadline-overview";
import { CurrentSessionWidget } from "@/components/sprints/current-session-widget";

import { ActiveProjects } from "./active-projects";
import { DailyProgress } from "./daily-progress";
import { GettingStarted } from "./getting-started";
import { HighlightCard } from "./highlight-card";
import { MicroCommitmentsCard } from "./micro-commitments-card";
import { QuickCaptureCard } from "./quick-capture-card";
import { ReflectionShortcut } from "./reflection-shortcut";
import { SprintOverview } from "./sprint-overview";
import { WeeklyProgress } from "./weekly-progress";
import { WelcomeHeader } from "./welcome-header";

/**
 * The command centre. DOM order is the mobile reading order:
 * highlight → capture → commitments → sprints → progress → reflection → deadlines → this week → projects.
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
        <SprintOverview className="lg:col-span-2 lg:col-start-1 lg:row-span-3 lg:row-start-2" />
        <DailyProgress className="lg:col-start-3 lg:row-start-3 lg:self-start" />
        <ReflectionShortcut className="lg:col-start-3 lg:row-start-4 lg:self-start" />
        <DeadlineOverview limit={5} horizonDays={21} className="lg:col-span-2 lg:col-start-1 lg:row-start-5 lg:self-start" />
        <WeeklyProgress className="lg:col-start-3 lg:row-start-5 lg:self-start" />
      </div>
      <ActiveProjects />
    </div>
  );
}
