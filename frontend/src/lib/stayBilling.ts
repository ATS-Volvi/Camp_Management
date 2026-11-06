const DAY = 86400000;
export function billingDay(date: string) { return new Date(date.slice(0, 10) + "T00:00:00Z"); }

// Per-array employee index, so each stay only scans its own employee's events instead of every row.
// Built once per array; callers pass query data, which is never mutated after it is fetched.
const byEmployee = new WeakMap<object, Map<string, unknown[]>>();
function eventsOf<T extends { employee_id: string }>(rows: T[], employeeId: string): T[] {
  let index = byEmployee.get(rows);
  if (!index) {
    index = new Map();
    for (const row of rows) {
      const list = index.get(row.employee_id);
      if (list) list.push(row); else index.set(row.employee_id, [row]);
    }
    byEmployee.set(rows, index);
  }
  return (index.get(employeeId) ?? []) as T[];
}

/** Match a stay to its first departure, never the latest checkout of a later stay. */
export function stayDeparture(
  stay: { employee_id: string; check_in_date: string },
  checkOuts: { employee_id: string; check_out_date: string }[],
  checkIns: { employee_id: string; check_in_date: string }[],
) {
  const arrival = new Date(stay.check_in_date).getTime();
  const events = [
    ...eventsOf(checkOuts, stay.employee_id).filter(e => new Date(e.check_out_date).getTime() >= arrival).map(e => e.check_out_date),
    ...eventsOf(checkIns, stay.employee_id).filter(e => new Date(e.check_in_date).getTime() > arrival).map(e => e.check_in_date),
  ].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return events[0] ?? null;
}

export function billableStayWindow(arrival: string, departure: string | null, from: string, to: string) {
  const start = new Date(Math.max(billingDay(arrival).getTime(), billingDay(from).getTime()));
  const end = new Date(Math.min(billingDay(to).getTime(), departure ? billingDay(departure).getTime() - DAY : Infinity));
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY) + 1);
  return { start, end, days };
}