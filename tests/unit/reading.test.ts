import { describe, expect, it } from "vitest";

import { createSampleData } from "@/data/sample-data";
import { dataToRows, rowsToData } from "@/lib/repositories/mappers";
import {
  BUILTIN_GENRES,
  booksByMonth,
  createBook,
  currentlyReading,
  finishedBooks,
  finishedIn,
  genreCounts,
  genreOptions,
  goalFor,
  goalProgress,
  readingYears,
} from "@/lib/reading/books";
import { EMPTY_DATA, SCHEMA_VERSION, createEnvelope, parseEnvelope } from "@/lib/storage/schema";
import * as reading from "@/lib/store/changes/reading";
import type { BookInput, PersistedData } from "@/types";

const NOW = "2026-11-08T09:00:00.000Z";
const LATER = "2026-11-09T09:00:00.000Z";

const input = (over: Partial<BookInput>): BookInput => ({
  title: "A book",
  author: "Someone",
  genres: [],
  status: "finished",
  rating: null,
  startedOn: null,
  finishedOn: "2026-10-01",
  note: "",
  ...over,
});

describe("books", () => {
  it("cleans the form: trims, tidies genres, drops a finish date on a book you're reading", () => {
    const b = createBook(input({ title: "  The Quiet Harbour ", genres: [" WLW ", "Mystery", "wlw", "", "Romance  novel"], rating: 7 }), NOW);
    expect(b).toMatchObject({ title: "The Quiet Harbour", genres: ["WLW", "Mystery", "Romance novel"], rating: null });
    const r = createBook(input({ status: "reading", finishedOn: "2026-10-01", startedOn: "2026-11-01" }), NOW);
    expect(r).toMatchObject({ status: "reading", finishedOn: null, startedOn: "2026-11-01" });
  });

  it("lists finished books newest first and what you're reading", () => {
    const list = [
      createBook(input({ title: "Old", finishedOn: "2025-12-30" }), NOW),
      createBook(input({ title: "New", finishedOn: "2026-11-02" }), NOW),
      createBook(input({ title: "Mid", finishedOn: "2026-03-15" }), NOW),
      createBook(input({ title: "Now", status: "reading", finishedOn: null }), NOW),
    ];
    expect(finishedBooks(list).map((b) => b.title)).toEqual(["New", "Mid", "Old"]);
    expect(finishedIn(list, 2026).map((b) => b.title)).toEqual(["New", "Mid"]);
    expect(currentlyReading(list).map((b) => b.title)).toEqual(["Now"]);
    expect(readingYears(list, 2026)).toEqual([2026, 2025]);
    expect(booksByMonth(list, 2026)).toEqual([0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0]);
  });

  it("counts every genre on a book (a WLW mystery counts for both), ignoring capitals", () => {
    const list = [
      createBook(input({ genres: ["WLW", "Mystery"] }), NOW),
      createBook(input({ genres: ["wlw", "Romance"] }), NOW),
      createBook(input({ genres: ["Historical fiction", "WLW"] }), NOW),
    ];
    expect(genreCounts(list)).toEqual([
      { genre: "WLW", count: 3 },
      { genre: "Historical fiction", count: 1 },
      { genre: "Mystery", count: 1 },
      { genre: "Romance", count: 1 },
    ]);
  });

  it("offers the built-in genres, then your own (most used first)", () => {
    const list = [createBook(input({ genres: ["Cosy", "WLW"] }), NOW), createBook(input({ genres: ["WLW", "mystery"] }), NOW)];
    const options = genreOptions(list);
    expect(options.slice(0, BUILTIN_GENRES.length)).toEqual([...BUILTIN_GENRES]);
    expect(options.slice(BUILTIN_GENRES.length)).toEqual(["WLW", "Cosy"]);
  });
});

describe("yearly goal", () => {
  it("progress, and ahead or behind a steady pace this year", () => {
    // 8 Nov is about 85% through 2026: 24 × 0.855 ≈ 20.5 expected.
    const p = goalProgress(18, 24, "2026-11-08", 2026);
    expect(p).toMatchObject({ percent: 75, left: 6, done: false });
    expect(p.expected).toBeCloseTo(20.5, 0);
    expect(p.ahead!).toBeLessThan(0);
    const past = goalProgress(30, 24, "2026-11-08", 2025);
    expect(past).toMatchObject({ percent: 100, left: 0, done: true, expected: null, ahead: null });
  });

  it("one goal per year: set, change, remove", () => {
    let d: PersistedData = { ...EMPTY_DATA };
    d = reading.setReadingGoal(d, 2026, 24, NOW);
    d = reading.setReadingGoal(d, 2026, 30, LATER);
    expect(d.readingGoals).toEqual([{ id: "2026", year: 2026, target: 30, createdAt: NOW, updatedAt: LATER }]);
    expect(goalFor(d.readingGoals, 2026)?.target).toBe(30);
    expect(goalFor(d.readingGoals, 2025)).toBeNull();
    d = reading.setReadingGoal(d, 2026, 0, LATER);
    expect(d.readingGoals).toEqual([]);
  });
});

describe("book changes", () => {
  it("add, edit, finish, delete and restore", () => {
    const b = createBook(input({ status: "reading", finishedOn: null, title: "Night Ferry" }), NOW);
    let d: PersistedData = reading.addBook({ ...EMPTY_DATA }, b);
    expect(reading.addBook(d, b).books).toHaveLength(1); // no double add
    d = reading.updateBook(d, b.id, { ...b, author: " C. Varga ", genres: ["Thriller"] }, LATER);
    expect(d.books[0]).toMatchObject({ author: "C. Varga", genres: ["Thriller"], updatedAt: LATER });
    d = reading.finishBook(d, b.id, "2026-11-08", 4, LATER);
    expect(d.books[0]).toMatchObject({ status: "finished", finishedOn: "2026-11-08", rating: 4 });
    const removed = d.books[0];
    d = reading.deleteBook(d, b.id);
    expect(d.books).toEqual([]);
    d = reading.restoreBook(d, removed);
    expect(d.books).toEqual([removed]);
  });
});

describe("saved everywhere", () => {
  const sample = parseEnvelope({ schemaVersion: SCHEMA_VERSION, data: createSampleData("2026-11-08") })!.data;

  it("the sample has finished books, books on the go and a goal", () => {
    expect(finishedIn(sample.books, 2026).length).toBeGreaterThan(3);
    expect(currentlyReading(sample.books).length).toBe(2);
    expect(goalFor(sample.readingGoals, 2026)?.target).toBe(24);
  });

  it("round-trips through the cloud rows and the backup file", () => {
    expect(rowsToData(dataToRows(sample))).toEqual(sample);
    expect(parseEnvelope(JSON.parse(JSON.stringify(createEnvelope(sample))))!.data).toEqual(sample);
  });

  it("older (v9) data upgrades with no books and no goals; nothing else changes", () => {
    const old = parseEnvelope({ schemaVersion: 9, data: { tasks: [] } })!;
    expect(old.data.books).toEqual([]);
    expect(old.data.readingGoals).toEqual([]);
    expect(old.migratedFrom).toBe(9);
  });

  it("unusable books and goals are skipped; one goal per year is kept", () => {
    const parsed = parseEnvelope({
      schemaVersion: SCHEMA_VERSION,
      data: {
        books: [
          { id: "b1", title: "", status: "finished", finishedOn: "2026-01-01", createdAt: NOW }, // no title
          { id: "b2", title: "Ok", status: "finished", createdAt: NOW }, // finished with no date
          { id: "b3", title: "Ok", status: "lost", createdAt: NOW }, // unknown status
          { id: "b4", title: "Fine", status: "reading", rating: 4.5, genres: ["X", 3, "x"], createdAt: NOW },
        ],
        readingGoals: [
          { id: "2026", year: 2026, target: 20, createdAt: NOW, updatedAt: NOW },
          { id: "other", year: 2026, target: 25, createdAt: NOW, updatedAt: LATER },
          { year: 2027, target: 0, createdAt: NOW },
        ],
      },
    })!;
    expect(parsed.data.books.map((b) => [b.id, b.rating, b.genres])).toEqual([["b4", null, ["X"]]]);
    expect(parsed.data.readingGoals).toEqual([{ id: "2026", year: 2026, target: 25, createdAt: NOW, updatedAt: LATER }]);
    expect(parsed.unreadable).toBe(4);
    expect(parsed.removed.duplicates).toBe(1);
  });
});
