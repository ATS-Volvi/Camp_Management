import type { EmployeeStay } from "./employeeStays";
import { billingToday } from "./stayBilling";
import { absenceOnDay, residentStatus } from "./accommodationAbsence";

export function employeeCampMap(stays: EmployeeStay[], today = billingToday()) {
  const camps: Record<string, string> = {};
  for (const stay of stays) {
    if (stay.status !== "In camp" || !stay.arrival || stay.arrival.slice(0, 10) > today || camps[stay.employee_id]) continue;
    camps[stay.employee_id] = stay.camp_id;
  }
  return camps;
}

export function matchesEmployeeCamp(employee: { id: string; employee_type: string; camp_id: string | null }, campId: string, currentCamps: Record<string, string>) {
  if (campId === "all") return true;
  const assignedCamp = currentCamps[employee.id] ?? (employee.employee_type === "camp_staff" ? employee.camp_id : null);
  return campId === "unassigned" ? !assignedCamp : assignedCamp === campId;
}

export function employeePresence(employee: { id: string; status: string; presence_status?: string | null }, stays: EmployeeStay[], today = billingToday()) {
  const absence = stays.filter(s => s.employee_id === employee.id).flatMap(s => s.absences || []).find(a => absenceOnDay(a, today));
  if (absence) return residentStatus(absence);
  if (employee.presence_status === "vacation") return "Vacation";
  if (employee.presence_status === "away") return "Away";
  const history = stays.filter(s => s.employee_id === employee.id && (s.arrival ?? s.departure ?? "").slice(0, 10) <= today);
  if (history.some(s => s.status === "In camp")) return employee.presence_status === "on_site" ? "On Site" : "Active";
  if (history.length) return "Checked out";
  return employee.status.charAt(0).toUpperCase() + employee.status.slice(1);
}