export interface OccupancyEvent { employee_id: string; camp_id: string | null; room_id?: string; check_in_date: string; food_required?: boolean }
export interface DepartureEvent { employee_id: string; check_out_date: string; camp_id?: string | null }

export function residentsAt(checkIns: OccupancyEvent[], checkOuts: DepartureEvent[], at: string) {
  const cutoff = new Date(at).getTime();
  const latest = new Map<string, OccupancyEvent>();
  const departures = new Map<string, number>();
  for (const event of checkIns) {
    const time = new Date(event.check_in_date).getTime();
    if (time > cutoff) continue;
    const previous = latest.get(event.employee_id);
    if (!previous || time > new Date(previous.check_in_date).getTime()) latest.set(event.employee_id, event);
  }
  for (const event of checkOuts) {
    const time = new Date(event.check_out_date).getTime();
    if (time <= cutoff) departures.set(event.employee_id, Math.max(time, departures.get(event.employee_id) ?? 0));
  }
  return [...latest.values()].filter(event => (departures.get(event.employee_id) ?? 0) < new Date(event.check_in_date).getTime());
}

export function contractStatus(endDate: string | null, at: string) {
  if (!endDate) return "No end date";
  const days = Math.ceil((new Date(endDate.slice(0, 10)).getTime() - new Date(at.slice(0, 10)).getTime()) / 86400000);
  if (days < 0) return "Expired";
  return days <= 90 ? "Expiring ≤ 90 days" : "Active";
}