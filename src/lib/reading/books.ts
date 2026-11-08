import { createId } from "@/lib/id";
import { cleanGenres } from "@/lib/storage/schema";
import type { Book, BookInput, ISODate, ISODateTime, ReadingGoal } from "@/types";

/** Genres offered on every book; you can add your own (e.g. WLW), which are offered from then on. */
export const BUILTIN_GENRES = [
  "Fiction",
  "Non-fiction",
  "Mystery",
  "Thriller",
  "Romance",
  "Historical fiction",
  "Fantasy",
  "Sci-fi",
  "Literary fiction",
  "Self-help",
  "Business",
  "Biography / memoir",
  "Sport",
  "Poetry",
] as const;

/** Tidy a book form: trimmed text, clean genres, a whole 1–5 rating, and a finish date only when finished. */
export function cleanBookInput(input: BookInput): BookInput {
  const rating = input.rating !== null && Number.isInteger(input.rating) && input.rating >= 1 && input.rating <= 5 ? input.rating : null;
  return {
    title: input.title.trim().slice(0, 300),
    author: input.author.trim().slice(0, 200),
    genres: cleanGenres(input.genres),
    status: input.status,
    rating,
    startedOn: input.startedOn || null,
    finishedOn: input.status === "finished" ? input.finishedOn || null : null,
    note: input.note.trim(),
  };
}

export function createBook(input: BookInput, now: ISODateTime): Book {
  return { id: createId(), ...cleanBookInput(input), createdAt: now, updatedAt: now };
}

/** Every genre you can pick: the built-in ones, then the ones you added (most used first). */
export function genreOptions(books: Book[]): string[] {
  const builtin = new Set<string>(BUILTIN_GENRES.map((g) => g.toLowerCase()));
  const own = new Map<string, { name: string; n: number }>();
  for (const b of books)
    for (const g of b.genres) {
      const key = g.toLowerCase();
      if (builtin.has(key)) continue;
      const cur = own.get(key);
      own.set(key, { name: cur?.name ?? g, n: (cur?.n ?? 0) + 1 });
    }
  const mine = [...own.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).map((x) => x.name);
  return [...BUILTIN_GENRES, ...mine];
}

export const finishedBooks = (books: Book[]) =>
  books
    .filter((b) => b.status === "finished" && b.finishedOn)
    .sort((a, b) => b.finishedOn!.localeCompare(a.finishedOn!) || b.updatedAt.localeCompare(a.updatedAt));

export const currentlyReading = (books: Book[]) =>
  books.filter((b) => b.status === "reading").sort((a, b) => (b.startedOn ?? b.createdAt).localeCompare(a.startedOn ?? a.createdAt));

export const yearOf = (date: ISODate) => Number(date.slice(0, 4));

export const finishedIn = (books: Book[], year: number) => finishedBooks(books).filter((b) => yearOf(b.finishedOn!) === year);

/** Years that have finished books (newest first), always including this year. */
export function readingYears(books: Book[], thisYear: number): number[] {
  const years = new Set<number>([thisYear]);
  for (const b of finishedBooks(books)) years.add(yearOf(b.finishedOn!));
  return [...years].sort((a, b) => b - a);
}

/** Books finished each month of a year (12 numbers, January first). */
export function booksByMonth(books: Book[], year: number): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  for (const b of finishedIn(books, year)) months[Number(b.finishedOn!.slice(5, 7)) - 1] += 1;
  return months;
}

/**
 * How many finished books carry each genre, most first. A book with two genres
 * counts once for each, so the counts can add up to more than the number of books.
 */
export function genreCounts(books: Book[]): { genre: string; count: number }[] {
  const counts = new Map<string, { genre: string; count: number }>();
  for (const b of books)
    for (const g of b.genres) {
      const key = g.toLowerCase();
      const cur = counts.get(key);
      counts.set(key, { genre: cur?.genre ?? g, count: (cur?.count ?? 0) + 1 });
    }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

export const goalFor = (goals: ReadingGoal[], year: number) => goals.find((g) => g.year === year) ?? null;

/**
 * Progress towards a yearly goal. `expected` is where you'd be today at a steady
 * pace (for the current year only), so the page can say "ahead" or "behind".
 */
export function goalProgress(finished: number, target: number, today: ISODate, year: number) {
  const percent = Math.min(100, Math.round((finished / target) * 100));
  const thisYear = yearOf(today) === year;
  let expected: number | null = null;
  if (thisYear) {
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);
    const [y, m, d] = today.split("-").map(Number);
    const elapsed = (Date.UTC(y, m - 1, d) + 86_400_000 - start) / (end - start);
    expected = Math.round(target * elapsed * 10) / 10;
  }
  const ahead = expected === null ? null : Math.round((finished - expected) * 10) / 10;
  return { finished, target, percent, left: Math.max(0, target - finished), expected, ahead, done: finished >= target };
}
