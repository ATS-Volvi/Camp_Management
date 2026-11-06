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
  // Real camp room types ("Nx1" = N beds) loaded from the camp master workbooks
  ...[1, 2, 3, 4, 5, 6].map(n => ({
    value: `${n}x1`, label: `${n}x1 - ${n} Bed${n > 1 ? "s" : ""}`, capacity: n,
    designationLevel: "", typicalUsage: "Camp master room type", allowedDesignations: [] as string[],
  })),
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

export function getRoomCategoryMultiplier(value: string): string {
  const cap = getRoomCategoryCapacity(value);
  return `${cap}x1`;
}

/**
 * Maps raw room types from Excel or manual input (e.g. '1x1', '2x1', '3x1', '4x1', '5x1', '6x1', '8x1', or category values)
 * to a valid database room_category and integer bed capacity.
 */
export function mapRawRoomTypeToCategory(rawType: string | number): { category: string; capacity: number; label: string } {
  const norm = String(rawType ?? "").toLowerCase().trim();
  
  if (norm === "1x1" || norm === "1") return { category: "executive_single", capacity: 1, label: "Executive Single (1x1)" };
  if (norm === "2x1" || norm === "2") return { category: "supervisor_twin", capacity: 2, label: "Supervisor Twin (2x1)" };
  if (norm === "3x1" || norm === "3") return { category: "supervisor_twin", capacity: 3, label: "Triple Sharing (3x1)" };
  if (norm === "4x1" || norm === "4") return { category: "staff_4bed", capacity: 4, label: "Staff 4-Bed (4x1)" };
  if (norm === "5x1" || norm === "5") return { category: "skilled_6bed", capacity: 5, label: "5-Bed Sharing (5x1)" };
  if (norm === "6x1" || norm === "6") return { category: "skilled_6bed", capacity: 6, label: "Skilled 6-Bed (6x1)" };
  if (norm === "8x1" || norm === "8") return { category: "general_8bed", capacity: 8, label: "General 8-Bed (8x1)" };

  const matched = ROOM_CATEGORIES.find(c => c.value === norm);
  if (matched) return { category: matched.value, capacity: matched.capacity, label: `${matched.label} (${matched.capacity}x1)` };

  // Fallback default
  return { category: "staff_4bed", capacity: 4, label: "Staff 4-Bed (4x1)" };
}

/**
 * Parses floor input from Excel or user entries. Supports 'G' (Ground), 'F' (First), 'S' (Second), '0', '1', '2', etc.
 */
export function parseFloorInput(rawFloor: any): { floorNumber: number; floorCode: string; displayName: string } {
  const str = String(rawFloor ?? "").trim().toUpperCase();
  if (str === "G" || str === "GROUND" || str === "GF" || str === "0") {
    return { floorNumber: 1, floorCode: "G", displayName: "Floor G (Ground)" };
  }
  if (str === "F" || str === "FIRST" || str === "1F") {
    return { floorNumber: 2, floorCode: "F", displayName: "Floor F (First)" };
  }
  if (str === "S" || str === "SECOND" || str === "2F") {
    return { floorNumber: 3, floorCode: "S", displayName: "Floor S (Second)" };
  }
  if (str === "T" || str === "THIRD" || str === "3F") {
    return { floorNumber: 4, floorCode: "T", displayName: "Floor T (Third)" };
  }
  const parsed = parseInt(str);
  if (!isNaN(parsed) && parsed > 0) {
    const code = parsed === 1 ? "G" : parsed === 2 ? "F" : parsed === 3 ? "S" : String(parsed);
    return { floorNumber: parsed, floorCode: code, displayName: getFloorDisplayName(parsed) };
  }
  return { floorNumber: 1, floorCode: "G", displayName: "Floor G (Ground)" };
}

export function getFloorDisplayName(floorNumber: number): string {
  if (floorNumber === 1) return "Floor G (Ground)";
  if (floorNumber === 2) return "Floor F (First)";
  if (floorNumber === 3) return "Floor S (Second)";
  if (floorNumber === 4) return "Floor T (Third)";
  return `Floor ${floorNumber}`;
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
