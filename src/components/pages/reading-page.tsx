"use client";

import * as React from "react";
import { BookOpen, CheckCircle2, MoreHorizontal, Pencil, Plus, Search, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BarChart, HBarList } from "@/components/analytics/bar-chart";
import { StatTile } from "@/components/analytics/stat-tile";
import { BookDialog, StarPicker, Stars } from "@/components/reading/book-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatShortDate } from "@/lib/date";
import {
  booksByMonth,
  currentlyReading,
  finishedBooks,
  finishedIn,
  genreCounts,
  goalFor,
  goalProgress,
  readingYears,
  yearOf,
} from "@/lib/reading/books";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { Book, BookStatus } from "@/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ALL = "__all__";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Editing = { book?: Book; status?: BookStatus; n: number };

/** Reading: your yearly goal, books finished, the genres you read, and what you're reading now. */
export function ReadingPage() {
  const { workspace } = useWorkspace();
  const thisYear = yearOf(workspace.today);
  const years = readingYears(workspace.books, thisYear);
  const [year, setYear] = React.useState(thisYear);
  // The dialog stays mounted after closing so focus goes back to the button that opened it.
  const [editing, setEditingState] = React.useState<Editing | null>(null);
  const [open, setOpen] = React.useState(false);
  const edit = (e: Omit<Editing, "n">) => {
    setEditingState((prev) => ({ ...e, n: (prev?.n ?? 0) + 1 }));
    setOpen(true);
  };

  const finishedThisYear = finishedIn(workspace.books, year);
  const reading = currentlyReading(workspace.books);

  return (
    <>
      <PageHeader
        title="Reading"
        description="Books you've finished, the genres you read, and your goal for the year."
        actions={
          <Button onClick={() => edit({ status: "finished" })} className="gap-1.5">
            <Plus className="size-4" strokeWidth={2.5} />
            Add book
          </Button>
        }
      />

      {workspace.books.length === 0 && workspace.readingGoals.length === 0 ? (
        <Card className="items-center py-12">
          <EmptyState icon={BookOpen} title="No books yet" description="Add a book you've finished, or one you're reading now. Set a goal for the year if you like." className="py-0" />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => edit({ status: "finished" })}>Add a finished book</Button>
            <Button variant="outline" onClick={() => edit({ status: "reading" })}>
              Add what I&apos;m reading
            </Button>
          </div>
          <div className="mt-6 w-full max-w-sm px-4">
            <GoalCard year={thisYear} finished={0} />
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="reading-year" className="text-[13px]">
                Year
              </Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger id="reading-year" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <GoalCard year={year} finished={finishedThisYear.length} />
            <Summary year={year} finished={finishedThisYear} />
          </div>

          <CurrentlyReading books={reading} onAdd={() => edit({ status: "reading" })} onEdit={(book) => edit({ book })} />

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <Card className="gap-3 p-4 sm:p-5" role="group" aria-labelledby="by-month-heading">
              <h3 id="by-month-heading" className="text-[15px] font-semibold">
                Books finished each month, {year}
              </h3>
              <BarChart
                unit="books"
                height={120}
                data={booksByMonth(workspace.books, year).map((n, i) => ({
                  key: String(i),
                  label: MONTHS[i],
                  title: `${MONTHS_LONG[i]} ${year}`,
                  value: n,
                  highlight: year === thisYear && i === Number(workspace.today.slice(5, 7)) - 1,
                }))}
              />
            </Card>
            <Card className="gap-3 p-4 sm:p-5" role="group" aria-labelledby="genres-heading">
              <div>
                <h3 id="genres-heading" className="text-[15px] font-semibold">
                  What you read, {year}
                </h3>
                <p className="text-xs text-muted-foreground">A book with two genres counts for each.</p>
              </div>
              {finishedThisYear.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No finished books in {year} yet.</p>
              ) : (
                <HBarList
                  ariaLabel={`Genres of books finished in ${year}`}
                  rows={genreCounts(finishedThisYear)
                    .slice(0, 8)
                    .map((g) => ({ key: g.genre, label: g.genre, value: g.count, display: plural(g.count, "book") }))}
                />
              )}
            </Card>
          </div>

          <FinishedList year={year} books={finishedThisYear} onEdit={(book) => edit({ book })} />
        </div>
      )}

      {editing && <BookDialog key={editing.n} book={editing.book} initialStatus={editing.status} open={open} onOpenChange={setOpen} />}
    </>
  );
}

function GoalCard({ year, finished }: { year: number; finished: number }) {
  const { workspace } = useWorkspace();
  const goal = goalFor(workspace.readingGoals, year);
  const [editing, setEditing] = React.useState(false);
  const [mounted, setMounted] = React.useState(0);
  const openGoal = () => {
    setMounted((n) => n + 1);
    setEditing(true);
  };
  const p = goal ? goalProgress(finished, goal.target, workspace.today, year) : null;
  const isPast = year < yearOf(workspace.today);

  return (
    <Card className="gap-3 p-4 sm:p-5" role="group" aria-labelledby={`goal-${year}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Target className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h3 id={`goal-${year}`} className="text-[15px] font-semibold">
              {year} reading goal
            </h3>
            {!p && <p className="text-xs text-muted-foreground">How many books would you like to finish in {year}?</p>}
          </div>
        </div>
        <Button variant={p ? "ghost" : "outline"} size="sm" onClick={openGoal} className="gap-1" aria-label={p ? `Change the ${year} goal` : undefined}>
          {p ? <Pencil className="size-3.5" /> : <Target className="size-3.5" />}
          {p ? "Change" : "Set a goal"}
        </Button>
      </div>
      {p && (
        <>
          <p className="text-[13px]">
            <span className="text-[26px] leading-none font-bold tabular-nums">{p.finished}</span>
            <span className="text-muted-foreground"> of {plural(p.target, "book")}</span>
          </p>
          <Progress value={p.percent} aria-label={`${year} goal: ${p.finished} of ${p.target} books`} className="h-2.5" indicatorClassName={p.done ? "bg-emerald-600" : undefined} />
          <p className="text-xs text-muted-foreground">
            {p.percent}%
            {p.done ? (
              <span className="font-semibold text-emerald-700"> · Goal reached{p.finished > p.target ? `, ${p.finished - p.target} over` : ""}!</span>
            ) : (
              <>
                {" "}
                · {plural(p.left, "book")} to go
                {p.ahead !== null && !isPast && (
                  <span className={p.ahead >= 0 ? "font-semibold text-emerald-700" : ""}>
                    {" "}
                    · {Math.abs(p.ahead) < 0.5 ? "on pace" : p.ahead > 0 ? `${Math.round(p.ahead)} ahead of pace` : `${Math.round(-p.ahead)} behind pace`}
                  </span>
                )}
              </>
            )}
          </p>
        </>
      )}
      {mounted > 0 && <GoalDialog key={mounted} year={year} current={goal?.target ?? null} open={editing} onOpenChange={setEditing} />}
    </Card>
  );
}

function GoalDialog({ year, current, open, onOpenChange }: { year: number; current: number | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { actions } = useWorkspace();
  const [value, setValue] = React.useState(current ? String(current) : "");
  const n = Number(value);
  const ok = /^\d+$/.test(value.trim()) && n >= 1 && n <= 1000;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{year} reading goal</DialogTitle>
          <DialogDescription>How many books would you like to finish in {year}?</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!ok) return;
            actions.setReadingGoal(year, n);
            toast(`Goal set: ${plural(n, "book")} in ${year}`);
            onOpenChange(false);
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-target">Books</Label>
            <Input
              id="goal-target"
              autoFocus
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={value.trim() !== "" && !ok}
              className="w-28"
              autoComplete="off"
            />
          </div>
          {value.trim() !== "" && !ok && (
            <p role="alert" className="text-xs text-rose-700">
              Enter a whole number from 1 to 1000.
            </p>
          )}
          <DialogFooter className="sm:justify-between">
            {current ? (
              <Button
                type="button"
                variant="ghost"
                className="text-rose-700 hover:text-rose-800"
                onClick={() => {
                  actions.setReadingGoal(year, 0);
                  toast(`${year} goal removed`, { action: { label: "Undo", onClick: () => actions.setReadingGoal(year, current) } });
                  onOpenChange(false);
                }}
              >
                Remove goal
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!ok}>
                Save goal
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Summary({ year, finished }: { year: number; finished: Book[] }) {
  const { workspace } = useWorkspace();
  const rated = finished.filter((b) => b.rating !== null);
  const average = rated.length ? rated.reduce((s, b) => s + b.rating!, 0) / rated.length : null;
  const top = genreCounts(finished)[0];
  return (
    <dl className="grid grid-cols-2 gap-3">
      <StatTile label={`Finished in ${year}`} value={finished.length} note={finished.length === 1 ? "book" : "books"} />
      <StatTile label="All time" value={finishedBooks(workspace.books).length} note="books finished" />
      <StatTile label="Top genre" value={<span className="block truncate text-base">{top ? top.genre : "—"}</span>} note={top ? plural(top.count, "book") : `none in ${year}`} />
      <StatTile label="Average rating" value={average === null ? "—" : `${average.toFixed(1)} ★`} note={rated.length ? `from ${plural(rated.length, "rated book")}` : "no ratings yet"} />
    </dl>
  );
}

function CurrentlyReading({ books, onAdd, onEdit }: { books: Book[]; onAdd: () => void; onEdit: (b: Book) => void }) {
  const [finishing, setFinishing] = React.useState<{ book: Book; n: number } | null>(null);
  const [open, setOpen] = React.useState(false);
  return (
    <section aria-labelledby="reading-now-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="reading-now-heading" className="text-base font-semibold">
          Currently reading
        </h3>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onAdd}>
          <Plus className="size-3.5" />
          Add what I&apos;m reading
        </Button>
      </div>
      {books.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-4 text-[13px] text-muted-foreground">Nothing on the go right now.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Currently reading">
          {books.map((b) => (
            <li key={b.id}>
              <Card className="h-full gap-2 p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-snug font-semibold">{b.title}</p>
                    {b.author && <p className="text-xs text-muted-foreground">{b.author}</p>}
                  </div>
                  <BookMenu book={b} onEdit={onEdit} />
                </div>
                <GenreBadges genres={b.genres} />
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">{b.startedOn ? `Started ${formatShortDate(b.startedOn)}` : "Reading now"}</span>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setFinishing((prev) => ({ book: b, n: (prev?.n ?? 0) + 1 }));
                      setOpen(true);
                    }}
                    aria-label={`Finished ${b.title}`}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Finished it
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {finishing && <FinishDialog key={finishing.n} book={finishing.book} open={open} onOpenChange={setOpen} />}
    </section>
  );
}

function FinishDialog({ book, open, onOpenChange }: { book: Book; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { workspace, actions } = useWorkspace();
  const [date, setDate] = React.useState(workspace.today);
  const [rating, setRating] = React.useState<number | null>(null);
  const ok = !!date && (!book.startedOn || book.startedOn <= date);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Finished: {book.title}</DialogTitle>
          <DialogDescription>Well done! When did you finish it?</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!ok) return;
            actions.finishBook(book.id, date, rating);
            toast("Book finished", { description: book.title });
            onOpenChange(false);
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="finish-date">Finished</Label>
            <Input id="finish-date" type="date" value={date} max={workspace.today} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          {!ok && date && (
            <p role="alert" className="text-xs text-rose-700">
              The finish date can&apos;t be before you started ({formatShortDate(book.startedOn!)}).
            </p>
          )}
          <StarPicker value={rating} onChange={setRating} name="finish-rating" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ok}>
              Mark as finished
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FinishedList({ year, books, onEdit }: { year: number; books: Book[]; onEdit: (b: Book) => void }) {
  const [query, setQuery] = React.useState("");
  const [genre, setGenre] = React.useState(ALL);
  const genres = genreCounts(books).map((g) => g.genre);
  const activeGenre = genre !== ALL && genres.some((g) => g.toLowerCase() === genre.toLowerCase()) ? genre : ALL;
  const q = query.trim().toLowerCase();
  const shown = books.filter(
    (b) =>
      (activeGenre === ALL || b.genres.some((g) => g.toLowerCase() === activeGenre.toLowerCase())) &&
      (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)),
  );
  return (
    <section aria-labelledby="finished-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="finished-heading" className="text-base font-semibold">
          Finished in {year} <span className="font-normal text-muted-foreground">({books.length})</span>
        </h3>
        {books.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title or author"
                aria-label="Search finished books"
                className="h-9 w-44 pl-8"
                autoComplete="off"
              />
            </div>
            <Select value={activeGenre} onValueChange={setGenre}>
              <SelectTrigger className="h-9 w-40" aria-label="Filter by genre">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All genres</SelectItem>
                {genres.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {books.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-4 text-[13px] text-muted-foreground">No finished books in {year} yet.</p>
      ) : shown.length === 0 ? (
        <p className="px-1 text-[13px] text-muted-foreground">No books match.</p>
      ) : (
        <Card className="overflow-hidden py-0">
          <ul className="divide-y" aria-label={`Books finished in ${year}`}>
            {shown.map((b) => (
              <li key={b.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <span className="w-14 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">{formatShortDate(b.finishedOn!)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-snug font-semibold">{b.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {b.author && <span>{b.author}</span>}
                    {b.rating !== null && <Stars value={b.rating} />}
                  </p>
                  <GenreBadges genres={b.genres} className="mt-1.5" />
                  {b.note && <p className="mt-1 text-xs text-muted-foreground">{b.note}</p>}
                </div>
                <BookMenu book={b} onEdit={onEdit} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

function GenreBadges({ genres, className }: { genres: string[]; className?: string }) {
  if (genres.length === 0) return null;
  return (
    <ul className={className ? `flex flex-wrap gap-1 ${className}` : "flex flex-wrap gap-1"} aria-label="Genres">
      {genres.map((g) => (
        <li key={g}>
          <Badge variant="secondary" className="font-medium">
            {g}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function BookMenu({ book, onEdit }: { book: Book; onEdit: (b: Book) => void }) {
  const { actions } = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${book.title}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onSelect={() => onEdit(book)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            const removed = actions.deleteBook(book.id);
            if (removed) toast("Book deleted", { description: removed.title, action: { label: "Undo", onClick: () => actions.restoreBook(removed) } });
          }}
          className="text-rose-700 focus:text-rose-800"
        >
          <Trash2 className="text-rose-500" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
