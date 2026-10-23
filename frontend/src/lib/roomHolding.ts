/** Leave statuses that switch room billing from the daily rate to the holding charge. */
export const LEAVE_STATUSES = ["vacation"];

const DAY = 86400000;
const dayStart = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export interface LeavePeriod { from: string; to: string | null }

/** Whole days (inclusive) of leave that fall inside [stayStart, stayEnd]; open-ended leave runs to stayEnd. */
export function leaveDaysWithin(periods: LeavePeriod[], stayStart: Date, stayEnd: Date): number {
  const s0 = dayStart(stayStart);
  const e0 = dayStart(stayEnd);
  const days = new Set<number>();
  for (const p of periods) {
    const s = Math.max(s0, dayStart(new Date(p.from)));
    const e = Math.min(e0, p.to ? dayStart(new Date(p.to)) : e0);
    for (let t = s; t <= e; t += DAY) days.add(t);
  }
  return days.size;
}

/** Room cost where leave days are billed at the holding charge instead of the daily room rate. */
export function roomCostWithHolding(stayDays: number, leaveDays: number, dailyRoom: number, holding: number): number {
  const leave = Math.min(Math.max(leaveDays, 0), stayDays);
  return (stayDays - leave) * dailyRoom + leave * holding;
}

/** Leave periods clipped to [stayStart, stayEnd] (open-ended leave runs to stayEnd), as ISO yyyy-mm-dd pairs. */
export function leaveRangesWithin(periods: LeavePeriod[], stayStart: Date, stayEnd: Date): { from: string; to: string }[] {
  const s0 = dayStart(stayStart), e0 = dayStart(stayEnd);
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  return periods
    .map(p => ({ s: Math.max(s0, dayStart(new Date(p.from))), e: Math.min(e0, p.to ? dayStart(new Date(p.to)) : e0) }))
    .filter(r => r.e >= r.s).sort((a, b) => a.s - b.s)
    .map(r => ({ from: iso(r.s), to: iso(r.e) }));
}

/** dd/MM/yyyy for an ISO date or Date. */
export const dmy = (d: string | Date) => { const x = typeof d === "string" ? d.slice(0, 10).split("-") : d.toISOString().slice(0, 10).split("-"); return `${x[2]}/${x[1]}/${x[0]}`; };
