import { cleanBookInput } from "@/lib/reading/books";
import type { Book, BookInput, ISODateTime, PersistedData } from "@/types";

/** Pure changes for Reading: books and yearly goals. Nothing here deletes more than it is asked to. */

export const addBook = (d: PersistedData, book: Book): PersistedData =>
  d.books.some((b) => b.id === book.id) ? d : { ...d, books: [...d.books, book] };

export function updateBook(d: PersistedData, id: string, input: BookInput, now: ISODateTime): PersistedData {
  if (!d.books.some((b) => b.id === id)) return d;
  return { ...d, books: d.books.map((b) => (b.id === id ? { ...b, ...cleanBookInput(input), updatedAt: now } : b)) };
}

/** Mark a book you're reading as finished on a date (keeps everything else). */
export function finishBook(d: PersistedData, id: string, finishedOn: string, rating: number | null, now: ISODateTime): PersistedData {
  const book = d.books.find((b) => b.id === id);
  if (!book) return d;
  return updateBook(d, id, { ...book, status: "finished", finishedOn, rating: rating ?? book.rating }, now);
}

export const deleteBook = (d: PersistedData, id: string): PersistedData => ({ ...d, books: d.books.filter((b) => b.id !== id) });

export const restoreBook = addBook;

/** Set (or change) the goal for a year. One goal per year: its id is the year. A target of 0 or less removes it. */
export function setReadingGoal(d: PersistedData, year: number, target: number, now: ISODateTime): PersistedData {
  const id = String(year);
  const existing = d.readingGoals.find((g) => g.id === id);
  if (!Number.isInteger(target) || target < 1) return existing ? { ...d, readingGoals: d.readingGoals.filter((g) => g.id !== id) } : d;
  const clamped = Math.min(1000, target);
  if (existing) return { ...d, readingGoals: d.readingGoals.map((g) => (g.id === id ? { ...g, target: clamped, updatedAt: now } : g)) };
  return { ...d, readingGoals: [...d.readingGoals, { id, year, target: clamped, createdAt: now, updatedAt: now }] };
}
