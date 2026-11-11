import type { EmployeeStay } from "./employeeStays";
import { billingToday } from "./stayBilling";

export function employeePresence(employee: { id: string; status: string; presence_status?: string | null }, stays: EmployeeStay[], today = billingToday()) {
  if (employee.presence_status === "vacation") return "Vacation";
  if (employee.presence_status === "away") return "Away";
  const history = stays.filter(s => s.employee_id === employee.id && (s.arrival ?? s.departure ?? "").slice(0, 10) <= today);
  if (history.some(s => s.status === "In camp")) return employee.presence_status === "on_site" ? "On Site" : "Active";
  if (history.length) return "Checked out";
  return employee.status.charAt(0).toUpperCase() + employee.status.slice(1);
}