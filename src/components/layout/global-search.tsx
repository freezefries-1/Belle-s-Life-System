"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Inbox, ListChecks, Search, Sprout, type LucideIcon } from "lucide-react";

import { useWorkspaceOptional } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/types";

interface SearchResult {
  id: string;
  label: string;
  meta: string;
  href: string;
  icon: LucideIcon;
}

function search(ws: Workspace, query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const match = (s: string) => s.toLowerCase().includes(q);
  return [
    ...ws.projects
      .filter((p) => match(p.name))
      .map((p) => ({ id: p.id, label: p.name, meta: "Project", href: "/projects", icon: FolderKanban })),
    ...ws.tasks
      .filter((t) => match(t.title))
      .map((t) => ({
        id: t.id,
        label: t.title,
        meta: t.status === "done" ? "Task · done" : "Task",
        href: "/tasks",
        icon: ListChecks,
      })),
    ...ws.captures
      .filter((c) => match(c.text))
      .map((c) => ({ id: c.id, label: c.text, meta: "Brain Dump", href: "/brain-dump", icon: Inbox })),
    ...ws.commitments
      .filter((c) => match(c.title))
      .map((c) => ({ id: c.id, label: c.title, meta: "Micro-commitment", href: "/micro-commitments", icon: Sprout })),
  ].slice(0, 8);
}

/**
 * Phase 1 search: filters the in-memory sample data and links to the
 * relevant page. Phase 2 swaps this for a proper indexed search.
 */
export function GlobalSearch({
  className,
  autoFocus,
  onNavigate,
  inputRef,
}: {
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const ctx = useWorkspaceOptional();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const results = ctx ? search(ctx.workspace, query) : [];
  const open = focused && query.trim().length > 0;

  function go(href: string) {
    setQuery("");
    setFocused(false);
    onNavigate?.();
    router.push(href);
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) go(results[0].href);
          if (e.key === "Escape") {
            setQuery("");
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Search tasks, projects, notes…"
        aria-label="Search"
        className="h-9 w-full rounded-lg border border-input bg-card pr-12 pl-9 text-[13px] shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-subtle-foreground focus:border-primary/60 focus:ring-[3px] focus:ring-ring/15 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground sm:block">
        ⌘K
      </kbd>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 overflow-hidden rounded-xl border bg-popover p-1 shadow-xl animate-in fade-in-0 zoom-in-[0.98]">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            <ul role="listbox" aria-label="Search results">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={r.href}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      go(r.href);
                    }}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <r.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{r.meta}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
