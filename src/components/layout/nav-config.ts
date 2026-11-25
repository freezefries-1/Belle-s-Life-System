import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  FolderKanban,
  HeartPulse,
  Inbox,
  Layers,
  ListChecks,
  NotebookPen,
  SlidersHorizontal,
  Sprout,
  Sun,
  Target,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  /** A shorter name for the slim touch sidebar (iPad); always a word from the title. */
  short?: string;
  href: string;
  icon: LucideIcon;
  /** Optional live count key shown as a small badge. */
  countKey?: "inbox" | "today";
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Today", href: "/", icon: Sun, countKey: "today" },
      { title: "Brain Dump", href: "/brain-dump", icon: Inbox, countKey: "inbox" },
      { title: "Sprints", href: "/sprints", icon: Layers },
      { title: "Tasks", href: "/tasks", icon: ListChecks },
      { title: "Projects", href: "/projects", icon: FolderKanban },
      { title: "Students", href: "/students", icon: Users },
      { title: "Calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Personal Growth",
    items: [
      { title: "My Pickleball", short: "Pickleball", href: "/pickleball", icon: Target },
      { title: "Reading", href: "/reading", icon: BookOpen },
      { title: "Recovery & Sleep", short: "Recovery", href: "/recovery", icon: HeartPulse },
      { title: "Kaizen Log", short: "Kaizen", href: "/kaizen-log", icon: NotebookPen },
      { title: "Micro-Commitments", short: "Commitments", href: "/micro-commitments", icon: Sprout },
      { title: "Weekly Review", short: "Review", href: "/weekly-review", icon: ClipboardList },
      { title: "Time Estimation", short: "Estimation", href: "/time-estimation", icon: Timer },
      { title: "Progress", href: "/progress", icon: ChartColumn },
    ],
  },
  {
    label: "Settings",
    items: [{ title: "Preferences", href: "/settings", icon: SlidersHorizontal }],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function getNavItem(pathname: string) {
  return ALL_ITEMS.find((item) => isActivePath(pathname, item.href)) ?? ALL_ITEMS[0];
}
