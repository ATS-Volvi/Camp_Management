const DAY = 86400000;
export function billingDay(date: string) { return new Date(date.slice(0, 10) + "T00:00:00Z"); }

/** Match a stay to its first departure, never the latest checkout of a later stay. */
export function stayDeparture(
  stay: { employee_id: string; check_in_date: string },
  checkOuts: { employee_id: string; check_out_date: string }[],
  checkIns: { employee_id: string; check_in_date: string }[],
) {
  const arrival = new Date(stay.check_in_date).getTime();
  const events = [
    ...checkOuts.filter(e => e.employee_id === stay.employee_id && new Date(e.check_out_date).getTime() >= arrival).map(e => e.check_out_date),
    ...checkIns.filter(e => e.employee_id === stay.employee_id && new Date(e.check_in_date).getTime() > arrival).map(e => e.check_in_date),
  ].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return events[0] ?? null;
}

export function billableStayWindow(arrival: string, departure: string | null, from: string, to: string) {
  const start = new Date(Math.max(billingDay(arrival).getTime(), billingDay(from).getTime()));
  const end = new Date(Math.min(billingDay(to).getTime(), departure ? billingDay(departure).getTime() - DAY : Infinity));
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY) + 1);
  return { start, end, days };
}