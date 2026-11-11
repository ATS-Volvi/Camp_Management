import { billingDay, billingToday } from "./stayBilling";

export interface StayEmployee {
  name: string; employee_id: string; employee_type: string;
  department: string | null; designation: string | null; supplier_name: string | null;
  company: string | null; project: string | null;
}
export interface Arrival {
  id: string; employee_id: string; camp_id: string; room_id: string; check_in_date: string;
  employees: StayEmployee | null; camps: { name: string } | null;
  rooms: { room_number: string; category: string } | null;
}
export interface Departure {
  id: string; employee_id: string; camp_id: string; room_id: string; check_out_date: string;
  employees: StayEmployee | null; camps: { name: string } | null;
  rooms: { room_number: string; category: string } | null;
  assets_returned: boolean | null; damage_remarks: string | null; clearance_notes: string | null;
}
export interface StayCancellation {
  id: string; employee_id: string; camp_id: string | null; from_date: string; to_date: string;
  status: string; reason: string; source: string; remarks: string | null;
  food_cancellation_request_meals: { meal_type: string }[];
}
export interface EmployeeStay {
  id: string; employee_id: string; camp_id: string; room_id: string;
  employee: StayEmployee | null; camp: string; room: string; category: string;
  arrival: string | null; departure: string | null; days: number | null;
  status: "Checked out" | "In camp" | "Missing checkout" | "Missing check-in";
  checkout: Departure | null; requests: StayCancellation[];
}

/** Calendar days: arrival included, departure excluded; ongoing stays stop at today. */
export function scopeEmployeeStays(rows: EmployeeStay[], campId?: string, checkoutOnly = false) {
  return rows.filter(row => (!campId || row.camp_id === campId) && (!checkoutOnly || !!row.checkout));
}

export function stayedDays(arrival: string, departure: string | null, today = billingToday()) {
  const end = departure ? billingDay(departure).getTime() : billingDay(today).getTime() + 86400000;
  return Math.max(0, Math.round((end - billingDay(arrival).getTime()) / 86400000));
}

/** Pair actual events one-to-one. A later arrival is a boundary, never an invented checkout. */
export function buildEmployeeStays(arrivals: Arrival[], departures: Departure[], requests: StayCancellation[], today = billingToday()): EmployeeStay[] {
  const ins = [...arrivals].sort((a, b) => a.check_in_date.localeCompare(b.check_in_date) || a.id.localeCompare(b.id));
  const outs = [...departures].sort((a, b) => a.check_out_date.localeCompare(b.check_out_date) || a.id.localeCompare(b.id));
  const used = new Set<string>();
  const byEmployee = new Map<string, Arrival[]>();
  const outByEmployee = new Map<string, Departure[]>();
  const requestByEmployee = new Map<string, StayCancellation[]>();
  for (const i of ins) byEmployee.set(i.employee_id, [...(byEmployee.get(i.employee_id) ?? []), i]);
  for (const o of outs) outByEmployee.set(o.employee_id, [...(outByEmployee.get(o.employee_id) ?? []), o]);
  for (const r of requests) requestByEmployee.set(r.employee_id, [...(requestByEmployee.get(r.employee_id) ?? []), r]);
  const rows: EmployeeStay[] = [];
  for (const group of byEmployee.values()) {
    group.forEach((i, index) => {
      const next = group[index + 1]?.check_in_date;
      const out = (outByEmployee.get(i.employee_id) ?? []).find(o => !used.has(o.id)
        && o.camp_id === i.camp_id && o.room_id === i.room_id
        && o.check_out_date >= i.check_in_date && (!next || o.check_out_date <= next));
      if (out) used.add(out.id);
      const end = out?.check_out_date ?? next ?? null;
      // Include every request status for transparency, without calculating invoice credits.
      const linked = (requestByEmployee.get(i.employee_id) ?? []).filter(r =>
        (!r.camp_id || r.camp_id === i.camp_id)
        && r.to_date >= i.check_in_date.slice(0, 10)
        && (!end || r.from_date <= end.slice(0, 10))
        && (!next || r.from_date < next.slice(0, 10) || !!out));
      rows.push({ id: i.id, employee_id: i.employee_id, camp_id: i.camp_id, room_id: i.room_id,
        employee: i.employees, camp: i.camps?.name ?? "—", room: i.rooms?.room_number ?? "—", category: i.rooms?.category ?? "",
        arrival: i.check_in_date, departure: out?.check_out_date ?? null,
        days: !out && next ? null : stayedDays(i.check_in_date, out?.check_out_date ?? null, today),
        status: out ? "Checked out" : next ? "Missing checkout" : "In camp", checkout: out ?? null, requests: linked });
    });
  }
  // Keep historical departures visible even where the matching arrival is unavailable.
  for (const o of outs.filter(o => !used.has(o.id))) rows.push({ id: `out-${o.id}`, employee_id: o.employee_id, camp_id: o.camp_id,
    room_id: o.room_id, employee: o.employees, camp: o.camps?.name ?? "—", room: o.rooms?.room_number ?? "—",
    category: o.rooms?.category ?? "", arrival: null, departure: o.check_out_date, days: null,
    status: "Missing check-in", checkout: o, requests: [] });
  return rows.sort((a, b) => (b.arrival ?? b.departure ?? "").localeCompare(a.arrival ?? a.departure ?? "") || a.id.localeCompare(b.id));
}