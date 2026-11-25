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
import { TodayTasksCard } from "./today-tasks-card";
import { WeeklyProgress } from "./weekly-progress";
import { WelcomeHeader } from "./welcome-header";
import { WhoopTodayCard } from "@/components/whoop/whoop-today-card";

/**
 * The command centre. DOM order is the phone reading order — what you need
 * through the day first: highlight → recovery & sleep → today's tasks → capture → commitments →
 * deadlines, then sprints, progress, reflection, this week and projects.
 *
 * Tablets in portrait (iPad, 768–1023px): two columns that fill top to bottom, then
 * left to right, so reading order still follows the DOM. The highlight and sprints
 * span both columns.
 * Large screens: a 3-column grid with explicit positions (the order above doesn't
 * change the desktop layout). The highlight with recovery & sleep under it sits
 * beside capture, so neither card has to stretch far to match the other.
 */
export function TodayDashboard() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <WelcomeHeader />
      <CurrentSessionWidget />
      <GettingStarted />
      <div className="grid grid-cols-1 gap-5 md:block md:columns-2 md:gap-5 md:*:mb-5 md:*:break-inside-avoid lg:grid lg:grid-cols-3 lg:gap-6 lg:*:mb-0">
        <div className="flex flex-col gap-5 md:[column-span:all] lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:gap-6">
          <HighlightCard className="lg:flex-1" />
          <WhoopTodayCard className="hidden lg:block" />
        </div>
        {/* Phones and tablets: recovery & sleep near the top, right after the highlight. */}
        <WhoopTodayCard className="lg:hidden" />
        <TodayTasksCard className="lg:hidden" />
        <QuickCaptureCard className="lg:col-start-3 lg:row-start-1" />
        <MicroCommitmentsCard className="lg:col-start-3 lg:row-start-2" />
        <DeadlineOverview limit={5} horizonDays={21} className="lg:col-span-2 lg:col-start-1 lg:row-start-5 lg:self-start" />
        <SprintOverview className="md:[column-span:all] lg:col-span-2 lg:col-start-1 lg:row-span-3 lg:row-start-2" />
        <DailyProgress className="lg:col-start-3 lg:row-start-3 lg:self-start" />
        <ReflectionShortcut className="lg:col-start-3 lg:row-start-4 lg:self-start" />
        <WeeklyProgress className="lg:col-start-3 lg:row-start-5 lg:self-start" />
      </div>
      <ActiveProjects />
    </div>
  );
}
