"use client";

import * as React from "react";
import { Check, Plus, Star } from "lucide-react";
import { toast } from "sonner";

import { ChoiceGroup } from "@/components/students/student-visuals";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { genreOptions } from "@/lib/reading/books";
import { useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Book, BookStatus } from "@/types";

/** Add or edit a book: title, author, genres (several), reading or finished, stars, dates and a note. */
export function BookDialog({
  book,
  initialStatus = "finished",
  open,
  onOpenChange,
}: {
  book?: Book;
  initialStatus?: BookStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { workspace, actions } = useWorkspace();
  const [title, setTitle] = React.useState(book?.title ?? "");
  const [author, setAuthor] = React.useState(book?.author ?? "");
  const [status, setStatus] = React.useState<BookStatus>(book?.status ?? initialStatus);
  const [genres, setGenres] = React.useState<string[]>(book?.genres ?? []);
  const [rating, setRating] = React.useState<number | null>(book?.rating ?? null);
  const [startedOn, setStartedOn] = React.useState(book?.startedOn ?? (initialStatus === "reading" ? workspace.today : ""));
  const [finishedOn, setFinishedOn] = React.useState(book?.finishedOn ?? workspace.today);
  const [note, setNote] = React.useState(book?.note ?? "");
  const [extra, setExtra] = React.useState<string[]>([]);
  const [newGenre, setNewGenre] = React.useState("");

  // Built-in genres, the ones you've used before, plus any you add here.
  const options = React.useMemo(() => {
    const list = genreOptions(workspace.books);
    const seen = new Set(list.map((g) => g.toLowerCase()));
    for (const g of [...(book?.genres ?? []), ...extra]) {
      if (seen.has(g.toLowerCase())) continue;
      seen.add(g.toLowerCase());
      list.push(g);
    }
    return list;
  }, [workspace.books, book, extra]);

  const has = (g: string) => genres.some((x) => x.toLowerCase() === g.toLowerCase());
  const toggle = (g: string) => setGenres((list) => (has(g) ? list.filter((x) => x.toLowerCase() !== g.toLowerCase()) : [...list, g]));

  function addGenre() {
    const name = newGenre.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!name) return;
    const known = options.find((g) => g.toLowerCase() === name.toLowerCase());
    if (!known) setExtra((x) => [...x, name]);
    if (!has(known ?? name)) setGenres((list) => [...list, known ?? name]);
    setNewGenre("");
  }

  const datesOk = status === "reading" || (!!finishedOn && (!startedOn || startedOn <= finishedOn));
  const valid = title.trim().length > 0 && datesOk;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const input = {
      title,
      author,
      genres,
      status,
      rating: status === "finished" ? rating : null,
      startedOn: startedOn || null,
      finishedOn: status === "finished" ? finishedOn : null,
      note,
    };
    if (book) {
      actions.updateBook(book.id, input);
      toast("Book saved", { description: title.trim() });
    } else if (actions.addBook(input)) {
      toast(status === "finished" ? "Book finished" : "Added to currently reading", { description: title.trim() });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:top-[6%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle>{book ? "Edit book" : "Add a book"}</DialogTitle>
          <DialogDescription>{book ? "Change any detail." : "A book you've finished, or one you're reading now."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="book-title">Title</Label>
            <Input id="book-title" autoFocus={!book} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} autoComplete="off" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="book-author">Author</Label>
            <Input id="book-author" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={200} autoComplete="off" />
          </div>
          <ChoiceGroup
            legend="Status"
            name="book-status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "finished", label: "Finished" },
              { value: "reading", label: "Reading now" },
            ]}
          />

          <fieldset>
            <legend className="mb-1 text-[13px] font-semibold">Genres</legend>
            <p className="mb-2 text-xs text-muted-foreground">Pick as many as fit, e.g. WLW and Mystery.</p>
            <div className="flex flex-wrap gap-1.5">
              {options.map((g) => {
                const on = has(g);
                return (
                  <label
                    key={g}
                    className={cn(
                      "flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] pointer-coarse:py-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50",
                      on ? "border-primary bg-accent font-semibold text-accent-foreground" : "hover:bg-muted/50",
                    )}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggle(g)} className="sr-only" />
                    {on && <Check className="size-3.5" aria-hidden />}
                    {g}
                  </label>
                );
              })}
            </div>
            <div className="mt-2.5 flex gap-2">
              <Label htmlFor="book-new-genre" className="sr-only">
                Add your own genre
              </Label>
              <Input
                id="book-new-genre"
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGenre();
                  }
                }}
                placeholder="Your own genre, e.g. WLW"
                maxLength={40}
                className="max-w-60"
                autoComplete="off"
              />
              <Button type="button" variant="outline" onClick={addGenre} disabled={!newGenre.trim()} className="gap-1">
                <Plus className="size-3.5" />
                Add genre
              </Button>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="book-started">Started (optional)</Label>
              <Input id="book-started" type="date" value={startedOn} max={workspace.today} onChange={(e) => setStartedOn(e.target.value)} className="w-44" />
            </div>
            {status === "finished" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="book-finished">Finished</Label>
                <Input id="book-finished" type="date" value={finishedOn} max={workspace.today} onChange={(e) => setFinishedOn(e.target.value)} className="w-44" />
              </div>
            )}
          </div>
          {status === "finished" && !datesOk && (
            <p role="alert" className="text-xs text-rose-700">
              {finishedOn ? "The finish date can't be before the start date." : "Add the date you finished it."}
            </p>
          )}

          {status === "finished" && <StarPicker value={rating} onChange={setRating} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="book-note">Note (optional)</Label>
            <Textarea id="book-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What stayed with you" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {book ? "Save book" : "Add book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** 1–5 stars as a radio group (arrow keys work), with "No rating". */
export function StarPicker({ value, onChange, name = "book-rating" }: { value: number | null; onChange: (v: number | null) => void; name?: string }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold">Rating (optional)</legend>
      <div className="flex flex-wrap items-center gap-1" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="cursor-pointer rounded-md p-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50"
            onMouseEnter={() => setHover(n)}
          >
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            <span className="sr-only">
              {n} {n === 1 ? "star" : "stars"}
            </span>
            <Star aria-hidden className={cn("size-6", n <= shown ? "fill-amber-400 text-amber-500" : "text-muted-foreground/50")} />
          </label>
        ))}
        <label className="ml-2 cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground has-[:checked]:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50">
          <input type="radio" name={name} value="" checked={value === null} onChange={() => onChange(null)} className="sr-only" />
          No rating
        </label>
      </div>
    </fieldset>
  );
}

/** Read-only stars, e.g. "4 of 5 stars". */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)} role="img" aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={cn("size-3.5", n <= value ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40")} />
      ))}
    </span>
  );
}
