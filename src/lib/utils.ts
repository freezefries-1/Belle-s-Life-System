import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Short, stable-enough id for client-side mock records. */
export function createId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function formatMinutes(minutes: number | null | undefined) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
