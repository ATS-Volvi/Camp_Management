export interface RoomCategoryConfig {
  value: string;
  label: string;
  capacity: number;
  designationLevel: string;
  typicalUsage: string;
  allowedDesignations: string[];
}

export const ROOM_CATEGORIES: RoomCategoryConfig[] = [
  {
    value: "executive_single",
    label: "Executive Single Room",
    capacity: 1,
    designationLevel: "Project Manager / Senior Engineer",
    typicalUsage: "Senior Management Stay",
    allowedDesignations: ["Project Manager", "Safety Officer", "QA/QC Inspector"],
  },
  {
    value: "executive_twin",
    label: "Executive Twin Sharing",
    capacity: 2,
    designationLevel: "Senior Engineers",
    typicalUsage: "Mid-Level Management",
    allowedDesignations: ["Trainee Engineer", "Safety Officer", "QA/QC Inspector", "SBM"],
  },
  {
    value: "supervisor_twin",
    label: "Supervisor Twin Sharing",
    capacity: 2,
    designationLevel: "Supervisors / Foremen",
    typicalUsage: "Site Supervisors",
    allowedDesignations: ["Static Supervisor", "Static Foreman", "Permit Receiver"],
  },
  {
    value: "staff_4bed",
    label: "Staff 4-Bed Room",
    capacity: 4,
    designationLevel: "Technicians / Operators",
    typicalUsage: "Skilled Workers",
    allowedDesignations: ["BA Technician", "Mechanical Fitter", "Pipe Fitter", "Plumber"],
  },
  {
    value: "skilled_6bed",
    label: "Skilled Worker 6-Bed Room",
    capacity: 6,
    designationLevel: "Electricians / Fitters / Welders",
    typicalUsage: "Skilled Labor",
    allowedDesignations: ["Electrician", "Tig Welder", "Pipe Fitter", "Mechanical Fitter", "Hydro Jetter", "Plumber"],
  },
  {
    value: "general_8bed",
    label: "General Worker 8-Bed Room",
    capacity: 8,
    designationLevel: "Helpers / General Labor",
    typicalUsage: "Workforce Accommodation",
    allowedDesignations: ["Hydro Jetter", "BA Technician"],
  },
  {
    value: "guest_single",
    label: "Guest Single Room",
    capacity: 1,
    designationLevel: "Visitors / Clients",
    typicalUsage: "Short-Term Stay",
    allowedDesignations: [],
  },
  {
    value: "transit_4bed",
    label: "Transit 4-Bed Room",
    capacity: 4,
    designationLevel: "Temporary Workforce",
    typicalUsage: "Short-Term / Rotation Stay",
    allowedDesignations: [],
  },
  // Legacy categories (kept for backward compatibility)
  { value: "1_occupant", label: "1 Occupant (Legacy)", capacity: 1, designationLevel: "", typicalUsage: "", allowedDesignations: [] },
  { value: "2_occupants", label: "2 Occupants (Legacy)", capacity: 2, designationLevel: "", typicalUsage: "", allowedDesignations: [] },
  { value: "4_occupants", label: "4 Occupants (Legacy)", capacity: 4, designationLevel: "", typicalUsage: "", allowedDesignations: [] },
  { value: "6_occupants", label: "6 Occupants (Legacy)", capacity: 6, designationLevel: "", typicalUsage: "", allowedDesignations: [] },
  { value: "8_occupants", label: "8 Occupants (Legacy)", capacity: 8, designationLevel: "", typicalUsage: "", allowedDesignations: [] },
];

/** New categories only (excludes legacy) */
export const NEW_ROOM_CATEGORIES = ROOM_CATEGORIES.filter(c => !c.value.includes("_occupant"));

export function getRoomCategoryLabel(value: string): string {
  return ROOM_CATEGORIES.find(c => c.value === value)?.label || value;
}

export function getRoomCategoryCapacity(value: string): number {
  return ROOM_CATEGORIES.find(c => c.value === value)?.capacity || 4;
}

export function getAllowedDesignations(categoryValue: string): string[] {
  return ROOM_CATEGORIES.find(c => c.value === categoryValue)?.allowedDesignations || [];
}

/**
 * Given an employee designation, return eligible room category values (sorted by capacity ascending).
 * If no mapping found, returns all non-legacy, non-guest, non-transit categories.
 */
export function getEligibleCategoriesForDesignation(designation: string | null): string[] {
  if (!designation) return NEW_ROOM_CATEGORIES.map(c => c.value);
  
  const matched = NEW_ROOM_CATEGORIES.filter(
    c => c.allowedDesignations.length > 0 && c.allowedDesignations.some(
      d => d.toLowerCase() === designation.toLowerCase()
    )
  );
  
  if (matched.length === 0) {
    // Fallback: return all non-guest/transit categories
    return NEW_ROOM_CATEGORIES.filter(c => !["guest_single", "transit_4bed"].includes(c.value)).map(c => c.value);
  }
  
  return matched.sort((a, b) => a.capacity - b.capacity).map(c => c.value);
}

/**
 * Filter and rank rooms for an employee based on designation eligibility and availability.
 * Returns rooms sorted: eligible first (by occupancy ratio ascending), then others.
 */
export function getSuggestedRooms<T extends { category: string; current_occupancy: number; max_capacity: number; status: string }>(
  rooms: T[],
  designation: string | null
): { suggested: T[]; other: T[] } {
  const eligibleCategories = new Set(getEligibleCategoriesForDesignation(designation));
  
  const available = rooms.filter(r => r.current_occupancy < r.max_capacity && r.status !== "under_maintenance");
  
  const suggested = available
    .filter(r => eligibleCategories.has(r.category))
    .sort((a, b) => (a.current_occupancy / a.max_capacity) - (b.current_occupancy / b.max_capacity));
  
  const other = available
    .filter(r => !eligibleCategories.has(r.category))
    .sort((a, b) => (a.current_occupancy / a.max_capacity) - (b.current_occupancy / b.max_capacity));
  
  return { suggested, other };
}
