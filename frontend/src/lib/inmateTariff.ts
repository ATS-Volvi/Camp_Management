import { resolveDailyRoomRate } from "./roomRateFallback";
import { resolveCampMealRates, type CampMealRate } from "./campMealRates";

interface TariffMasters {
  categories: { category_key: string | null; code: string; daily_rate: number }[];
  roomRates: { camp_id: string; room_category: string; daily_rate: number }[];
  roomMealRates: CampMealRate[];
  campMealRates: CampMealRate[];
  suppliers: { name: string; is_active: boolean; breakfast_rate: number; lunch_rate: number; dinner_rate: number; ramadan_rate: number; client_room_rates: { room_category_code: string; daily_rate: number }[] }[];
}

/** Standard daily tariff, using the same master precedence as the revenue report. */
export function resolveInmateTariff(campId: string, category: string, employee: { employee_type: string; supplier_name?: string | null }, foodRequired: boolean, legacyDailyFood: number, masters: TariffMasters) {
  const master = masters.categories.find(c => c.category_key === category);
  const camp = masters.roomRates.find(r => r.camp_id === campId && r.room_category === category);
  const supplier = employee.employee_type === "supplier" && employee.supplier_name
    ? masters.suppliers.find(s => s.is_active !== false && s.name.trim().toLowerCase() === employee.supplier_name?.trim().toLowerCase())
    : undefined;
  const supplierRoom = master ? supplier?.client_room_rates.find(r => r.room_category_code === master.code) : undefined;
  const room = supplierRoom ? Number(supplierRoom.daily_rate) || 0
    : resolveDailyRoomRate(camp ? Number(camp.daily_rate) || 0 : undefined, master ? Number(master.daily_rate) || 0 : undefined);
  const meals = !foodRequired ? { breakfast: 0, lunch: 0, dinner: 0, ramadan: 0 }
    : supplier ? { breakfast: Number(supplier.breakfast_rate) || 0, lunch: Number(supplier.lunch_rate) || 0, dinner: Number(supplier.dinner_rate) || 0, ramadan: Number(supplier.ramadan_rate) || 0 }
    : resolveCampMealRates(campId, category, masters.roomMealRates, masters.campMealRates, legacyDailyFood);
  const food = meals.breakfast + meals.lunch + meals.dinner;
  return { room, food, meals, total: room + food };
}