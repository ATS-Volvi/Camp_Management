import type { DrillRecord } from "@/components/dashboard/ChartDrilldown";

export function employeeRecord(employee: any, extra: DrillRecord["fields"] = {}): DrillRecord {
  return { id: employee.id, label: employee.name || employee.employee_id || "Employee", fields: {
    "Employee ID": employee.employee_id, Department: employee.department, Nationality: employee.nationality,
    Designation: employee.designation, Type: employee.employee_type, Supplier: employee.supplier_name,
    Project: employee.project, Status: employee.status, Phone: employee.phone,
    "Join date": employee.join_date, "Contract end": employee.contract_end_date, ...extra,
  } };
}
export function revenueRecord(row: any): DrillRecord {
  return { id: row.id, label: row.name, fields: {
    "Employee ID": row.emp_code, Camp: row.camp, Room: row.room, Department: row.department, Supplier: row.supplier,
    Project: row.project, From: row.stayFrom, To: row.stayTo, "Stay days": row.stayDays,
    "Room (SAR)": row.roomRevenue, "Breakfast (SAR)": row.breakfastCost, "Lunch (SAR)": row.lunchCost,
    "Dinner (SAR)": row.dinnerCost, "Ramadan (SAR)": row.ramadanCost, "Food (SAR)": row.foodRevenue,
    "Total (SAR)": row.total, "Leave days": row.leaveDays, "Holding rate (SAR)": row.holdingCharge,
    "Meals cancelled": row.mealsCancelled, "Leave dates": row.leaves?.map((l: any) => `${l.from} — ${l.to}`).join("\n"),
    "Supplier rates": row.supplierRates,
  } };
}
export function roomRecord(room: any, campName: string, occupants: DrillRecord[] = []): DrillRecord {
  return { id: room.id, label: room.room_number || "Room", fields: {
    Camp: campName, Block: room.buildings?.name, Floor: room.floor, Category: room.category,
    Capacity: room.max_capacity, Occupied: room.current_occupancy ?? occupants.length, Status: room.status,
    AC: room.ac, "Attached bathroom": room.attached_bathroom,
  }, ...(occupants.length ? { children: [{ id: `${room.id}-details`, label: "Room details", fields: { Camp: campName, Room: room.room_number, Block: room.buildings?.name, Floor: room.floor, Category: room.category, Capacity: room.max_capacity, Status: room.status } }, ...occupants] } : {}) };
}

export function selectChartRecords<T>(rows: T[], field: (row: T) => string | null | undefined, selected: string): T[] {
  return rows.filter(row => (field(row) || "Not recorded") === selected);
}