import type { LeavePeriod } from "./roomHolding";
export interface AccommodationAbsence {
  id: string; check_in_id: string; employee_id: string; camp_id: string; room_id: string;
  reason: string; absence_status: string; temporary_out_date: string; expected_return_date: string | null;
  actual_return_date: string | null; ended_by_checkout: boolean;
}
export function absenceOnDay(a: AccommodationAbsence, day: string) {
  return a.temporary_out_date <= day && (!a.actual_return_date || day < a.actual_return_date);
}
export function absencePeriods(absences: AccommodationAbsence[], checkInId: string): LeavePeriod[] {
  return absences.filter(a => a.check_in_id === checkInId).map(a => ({ from: a.temporary_out_date,
    to: a.actual_return_date ? new Date(Date.parse(a.actual_return_date + "T00:00:00Z") - 86400000).toISOString().slice(0, 10) : null }));
}
export function accommodationStatus(a?: AccommodationAbsence) {
  return !a ? "Occupied / In Camp" : a.absence_status === "vacation" ? "In Vacation" : a.absence_status === "on_site" ? "On Site" : "Temporarily Checked Out";
}/** Labels shared by Employee Master, Inmates and Total Inmates so a checkout reason maps to one status everywhere. */
export const RESIDENT_STATUSES = ["Active", "On Site", "Vacation", "Away"] as const;
const PRESENCE_LABELS: Record<string, string> = { active: "Active", on_site: "On Site", vacation: "Vacation", away: "Away" };
export function residentStatus(absence?: Pick<AccommodationAbsence, "absence_status"> | null, presence?: string | null) {
  if (absence) return PRESENCE_LABELS[absence.absence_status] ?? "Away";
  return PRESENCE_LABELS[presence ?? ""] ?? "Active";
}
