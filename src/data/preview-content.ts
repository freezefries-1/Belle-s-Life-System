import { addDays, parseISODate } from "@/lib/date";
import type { CalendarEvent, ISODate, PreviewContent, Project } from "@/types";

/**
 * Sample content for pages whose real functionality arrives in later
 * phases (projects list, calendar events, weekly review).
 * Generated relative to today and kept in memory only — never saved.
 */
export function createPreviewContent(today: ISODate): PreviewContent {
  const d = (offset: number) => addDays(today, offset);

  return {
    projects: createProjects(today),
    events: createEvents(today),
    weeklyReview: {
      id: "w_current",
      weekStart: d(-6),
      wins: [
        "Got the SportCraft product catalogue live",
        "Kept the morning reading habit going most days",
        "Ladder sign-up form is working — 24 players registered",
      ],
      challenges: [
        "Admin tasks piled up mid-week after back-to-back coaching days",
        "Underestimated how long photography and restringing take",
      ],
      lessons:
        "Batching admin into one short sprint after lunch works better than squeezing it between lessons.",
      nextWeekPriorities: [
        "Finish Evolve Tennis Ladder tournament materials",
        "Ship the first version of the SportCraft website",
        "Plan the new pickleball clinic",
      ],
    },
  };
}

/** The four life projects. Tasks link to these ids; full project management comes later. */
export function createProjects(today: ISODate): Project[] {
  return [
    {
      id: "p_sportcraft",
      name: "SportCraft OS",
      description: "Website, product catalogue and day-to-day operations for SportCraft.",
      area: "Business",
      status: "active",
      targetDate: addDays(today, 30),
    },
    {
      id: "p_ladder",
      name: "Evolve Tennis Ladder",
      description: "Season fixtures, results and the end-of-season tournament.",
      area: "Tennis Ladder",
      status: "active",
      targetDate: addDays(today, 18),
    },
    {
      id: "p_coaching",
      name: "Tennis & Pickleball Coaching",
      description: "Students, clinics, scheduling and lesson planning.",
      area: "Coaching",
      status: "active",
      targetDate: null,
    },
    {
      id: "p_life",
      name: "Personal Life Management",
      description: "Home, admin, health and the everyday essentials.",
      area: "Personal",
      status: "active",
      targetDate: null,
    },
  ];
}

function createEvents(today: ISODate): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  // Recurring weekly coaching pattern across roughly six weeks around today.
  for (let offset = -21; offset <= 28; offset++) {
    const date = addDays(today, offset);
    const weekday = parseISODate(date).getDay();
    const add = (title: string, start: string, end: string, kind: CalendarEvent["kind"]) =>
      events.push({ id: `e_${date}_${start}_${kind}`, title, date, start, end, kind });

    if (weekday === 1 || weekday === 3) add("Junior squad", "16:00", "17:30", "coaching");
    if (weekday === 2 || weekday === 4) add("Adult pickleball clinic", "18:00", "19:30", "coaching");
    if (weekday === 5) add("Private lessons", "15:00", "18:00", "coaching");
    if (weekday === 6) add("Evolve Ladder matches", "09:00", "12:00", "ladder");
  }

  const oneOffs: Omit<CalendarEvent, "id">[] = [
    { title: "SportCraft supplier call", date: addDays(today, 1), start: "10:00", end: "10:30", kind: "business" },
    { title: "Vet check-up", date: addDays(today, 6), start: "11:00", end: "11:30", kind: "personal" },
    { title: "Ladder tournament day", date: addDays(today, 18), start: "08:30", end: "16:00", kind: "ladder" },
    { title: "Website review", date: addDays(today, 9), start: "13:00", end: "14:00", kind: "business" },
    { title: "Dinner with friends", date: addDays(today, 3), start: "19:30", end: "21:30", kind: "personal" },
  ];
  oneOffs.forEach((e, i) => events.push({ id: `e_oneoff_${i}`, ...e }));

  return events.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
