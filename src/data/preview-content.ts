import { addDays, parseISODate } from "@/lib/date";
import type { CalendarEvent, ISODate, KaizenEntry, PreviewContent, Project } from "@/types";

/**
 * Sample content for pages whose real functionality arrives in later
 * phases (projects, micro-commitments, calendar, journal, weekly review).
 * Generated relative to today and kept in memory only — never saved.
 */
export function createPreviewContent(today: ISODate): PreviewContent {
  const d = (offset: number) => addDays(today, offset);
  const pattern = (offsets: number[]) => offsets.map((o) => d(-o));

  return {
    projects: createProjects(today),
    commitments: [
      {
        id: "c_reset",
        title: "10-minute home reset",
        description: "Set a timer. Reset one space. Stop when it rings.",
        cue: "Before dinner",
        completedDates: pattern([1, 2, 4, 5, 6, 8, 9, 11]),
      },
      {
        id: "c_read",
        title: "Read 5 pages",
        description: "Any book counts. Five pages is enough.",
        cue: "With morning coffee",
        completedDates: pattern([0, 1, 2, 3, 5, 6, 7, 9, 10]),
      },
      {
        id: "c_shutdown",
        title: "Midnight shutdown routine",
        description: "Screens off, tomorrow’s highlight chosen, lights out.",
        cue: "From 11:30 pm",
        completedDates: pattern([1, 3, 4, 7, 8]),
      },
    ],
    events: createEvents(today),
    kaizenEntries: createKaizenEntries(today),
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
    highlightPreview: {
      title: "Schedule next week’s tennis students",
      sprint: "admin",
      projectId: "p_coaching",
      estimatedMinutes: 30,
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

function createKaizenEntries(today: ISODate): KaizenEntry[] {
  const d = (offset: number) => addDays(today, offset);
  return [
    {
      id: "k_today",
      date: d(0),
      highlight: "Schedule next week’s tennis students",
      highlightDone: false,
      brainDump: ["Order tennis strings", "Buy dog food", "Update SportCraft product prices"],
      commitments: [
        { title: "10-minute home reset", done: false },
        { title: "Read 5 pages", done: true },
        { title: "Midnight shutdown routine", done: false },
      ],
      reflection: { wentWell: "", improve: "", oneSmallStep: "" },
      energy: 3,
    },
    {
      id: "k_yesterday",
      date: d(-1),
      highlight: "Finish grocery shop and meal prep",
      highlightDone: true,
      brainDump: ["Clean bathroom mirror", "Doubles round-robin idea", "Reorder coaching balls"],
      commitments: [
        { title: "10-minute home reset", done: true },
        { title: "Read 5 pages", done: true },
        { title: "Midnight shutdown routine", done: true },
      ],
      reflection: {
        wentWell: "Did the shop straight after morning lessons — no decision fatigue later.",
        improve: "Started the evening scrolling instead of the shutdown routine.",
        oneSmallStep: "Phone on charge in the kitchen at 11:30.",
      },
      energy: 4,
    },
    {
      id: "k_2",
      date: d(-2),
      highlight: "Photograph new grip tape stock",
      highlightDone: true,
      brainDump: ["Ask Sam about junior squad times", "SportCraft newsletter idea"],
      commitments: [
        { title: "10-minute home reset", done: true },
        { title: "Read 5 pages", done: true },
        { title: "Midnight shutdown routine", done: false },
      ],
      reflection: {
        wentWell: "Photos look great and are ready for the website.",
        improve: "It took 45 minutes, not 30 — light setup takes time.",
        oneSmallStep: "Leave the lightbox set up for next time.",
      },
      energy: 3,
    },
    {
      id: "k_3",
      date: d(-3),
      highlight: "Set up SportCraft product catalogue",
      highlightDone: true,
      brainDump: ["Pin ‘small steps’ quote above desk"],
      commitments: [
        { title: "10-minute home reset", done: false },
        { title: "Read 5 pages", done: true },
        { title: "Midnight shutdown routine", done: true },
      ],
      reflection: {
        wentWell: "Deep work in the morning before lessons was really productive.",
        improve: "Ran over time and rushed lunch.",
        oneSmallStep: "Set a 90-minute timer for deep work blocks.",
      },
      energy: 2,
    },
  ];
}
