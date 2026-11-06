import { type MealRates } from "./mealCosting";

export interface StandardRateTier {
  roomType: string;
  label: string;
  accommodationRate: number; // Daily Room Cost (SAR)
  cateringRate: number;      // Daily Food Cost (SAR)
  combinedRate: number;      // Acco & Catering Combined (SAR)
  holdingRate: number;       // Holding Rate on Site/Vacation (SAR)
  breakfastRate: number;     // Breakfast (SAR)
  lunchRate: number;         // Lunch (SAR)
  dinnerRate: number;        // Dinner (SAR)
}

/**
 * Standard Rates from Company Excel Report ('Occupancy & Mandays Report'):
 * Room Types: 1x1, 2x1, 3x1, 4x1, 5x1, 6x1
 */
export const EXCEL_STANDARD_RATES: Record<string, StandardRateTier> = {
  "1x1": {
    roomType: "1x1",
    label: "Executive Single (1x1)",
    accommodationRate: 17,
    cateringRate: 13,
    combinedRate: 30,
    holdingRate: 17,
    breakfastRate: 2.6,
    lunchRate: 5.2,
    dinnerRate: 5.2,
  },
  "2x1": {
    roomType: "2x1",
    label: "Supervisor Twin (2x1)",
    accommodationRate: 12,
    cateringRate: 13,
    combinedRate: 25,
    holdingRate: 12,
    breakfastRate: 2.6,
    lunchRate: 5.2,
    dinnerRate: 5.2,
  },
  "3x1": {
    roomType: "3x1",
    label: "Triple Sharing (3x1)",
    accommodationRate: 11,
    cateringRate: 11,
    combinedRate: 22,
    holdingRate: 11,
    breakfastRate: 2.2,
    lunchRate: 4.4,
    dinnerRate: 4.4,
  },
  "4x1": {
    roomType: "4x1",
    label: "Staff 4-Bed (4x1)",
    accommodationRate: 10,
    cateringRate: 10,
    combinedRate: 20,
    holdingRate: 10,
    breakfastRate: 2.0,
    lunchRate: 4.0,
    dinnerRate: 4.0,
  },
  "5x1": {
    roomType: "5x1",
    label: "Workforce 5-Bed (5x1)",
    accommodationRate: 9,
    cateringRate: 10,
    combinedRate: 19,
    holdingRate: 9,
    breakfastRate: 2.0,
    lunchRate: 4.0,
    dinnerRate: 4.0,
  },
  "6x1": {
    roomType: "6x1",
    label: "Skilled Labor 6-Bed (6x1)",
    accommodationRate: 9,
    cateringRate: 10,
    combinedRate: 19,
    holdingRate: 9,
    breakfastRate: 2.0,
    lunchRate: 4.0,
    dinnerRate: 4.0,
  },
};

/**
 * Normalizes any category string or capacity to standard Excel tier ("1x1" ... "6x1").
 */
export function resolveRoomTypeTier(category?: string | null, capacity?: number | null): string {
  const norm = String(category ?? "").toLowerCase().trim();

  if (norm.includes("1x1") || norm === "1" || norm === "executive_single" || norm === "guest_single" || norm === "1_occupant" || capacity === 1) {
    return "1x1";
  }
  if (norm.includes("2x1") || norm === "2" || norm === "executive_twin" || norm === "supervisor_twin" || norm === "2_occupants" || capacity === 2) {
    return "2x1";
  }
  if (norm.includes("3x1") || norm === "3" || capacity === 3) {
    return "3x1";
  }
  if (norm.includes("4x1") || norm === "4" || norm === "staff_4bed" || norm === "transit_4bed" || norm === "4_occupants" || capacity === 4) {
    return "4x1";
  }
  if (norm.includes("5x1") || norm === "5" || capacity === 5) {
    return "5x1";
  }
  if (norm.includes("6x1") || norm === "6" || norm === "skilled_6bed" || norm === "6_occupants" || capacity === 6) {
    return "6x1";
  }
  if (norm.includes("8x1") || norm === "8" || norm === "general_8bed" || norm === "8_occupants" || (capacity && capacity >= 8)) {
    return "6x1"; // Map 8x1 to the standard labor tier
  }

  return "4x1"; // Default standard staff room
}

export function getExcelTierRates(category?: string | null, capacity?: number | null): StandardRateTier {
  const tier = resolveRoomTypeTier(category, capacity);
  return EXCEL_STANDARD_RATES[tier] || EXCEL_STANDARD_RATES["4x1"];
}

export function getExcelMealRates(category?: string | null, capacity?: number | null): MealRates {
  const t = getExcelTierRates(category, capacity);
  return {
    breakfast: t.breakfastRate,
    lunch: t.lunchRate,
    dinner: t.dinnerRate,
    ramadan: t.cateringRate,
  };
}

