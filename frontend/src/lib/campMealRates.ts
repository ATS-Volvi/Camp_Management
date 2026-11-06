import { defaultMealRates, type MealRates } from "./mealCosting";

export interface CampMealRate {
  camp_id: string;
  room_category?: string;
  breakfast_rate: number;
  lunch_rate: number;
  dinner_rate: number;
  ramadan_rate?: number;
}

/** Room-type override, then existing camp prices, then the room daily-food fallback. */
export function resolveCampMealRates(campId: string, category: string, roomRates: CampMealRate[], campRates: CampMealRate[], dailyFood: number): MealRates {
  const rate = roomRates.find(r => r.camp_id === campId && r.room_category === category)
    ?? campRates.find(r => r.camp_id === campId);
  if (!rate) return defaultMealRates(dailyFood);
  const breakfast = Number(rate.breakfast_rate) || 0;
  const lunch = Number(rate.lunch_rate) || 0;
  const dinner = Number(rate.dinner_rate) || 0;
  return { breakfast, lunch, dinner, ramadan: Number(rate.ramadan_rate) || breakfast + lunch + dinner };
}