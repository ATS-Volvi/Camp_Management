export interface StayEvent {
  employee_id: string;
  room_id: string;
  camp_id: string;
  check_in_date: string;
}

export function currentInmateStays(checkIns: StayEvent[], checkOuts: { employee_id: string; room_id: string; check_out_date: string }[], now = new Date()) {
  const departures = new Map<string, number>();
  for (const out of checkOuts) {
    const date = new Date(out.check_out_date).getTime();
    if (date > now.getTime()) continue;
    const key = `${out.employee_id}|${out.room_id}`;
    departures.set(key, Math.max(departures.get(key) ?? 0, date));
  }
  const latest = new Map<string, StayEvent>();
  for (const stay of checkIns) {
    const date = new Date(stay.check_in_date).getTime();
    if (date > now.getTime()) continue;
    const previous = latest.get(stay.employee_id);
    if (!previous || date > new Date(previous.check_in_date).getTime()) latest.set(stay.employee_id, stay);
  }
  return [...latest.values()].filter(stay => new Date(stay.check_in_date).getTime() > (departures.get(`${stay.employee_id}|${stay.room_id}`) ?? 0));
}

export interface InmateLocation {
  camp_id: string;
  block_id: string;
  floor_key: string;
  room_id: string;
}

export function matchesInmateLocation(row: InmateLocation, filters: { camp: string; block: string; floor: string; room: string }) {
  return (filters.camp === "all" || row.camp_id === filters.camp)
    && (filters.block === "all" || row.block_id === filters.block)
    && (filters.floor === "all" || row.floor_key === filters.floor)
    && (filters.room === "all" || row.room_id === filters.room);
}