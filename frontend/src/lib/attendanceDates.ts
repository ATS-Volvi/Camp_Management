import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";

export function attendanceDateAllowed(day: Date, today = new Date()): boolean {
  return startOfDay(day).getTime() <= startOfDay(today).getTime();
}

export function attendanceDateRange(date: Date, mode: "daily" | "weekly" | "monthly", today = new Date()) {
  const selected = attendanceDateAllowed(date, today) ? date : today;
  const start = mode === "daily" ? startOfDay(selected)
    : mode === "weekly" ? startOfWeek(selected, { weekStartsOn: 0 }) : startOfMonth(selected);
  const periodEnd = mode === "daily" ? endOfDay(selected)
    : mode === "weekly" ? endOfWeek(selected, { weekStartsOn: 0 }) : endOfMonth(selected);
  return { start, end: new Date(Math.min(periodEnd.getTime(), endOfDay(today).getTime())) };
}