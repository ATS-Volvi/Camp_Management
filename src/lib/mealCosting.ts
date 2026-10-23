/** Per-meal food costing: Breakfast, Lunch, Dinner on normal days; a single Ramadan day rate during Ramadan. */
export interface MealRates { breakfast: number; lunch: number; dinner: number; ramadan: number }
export interface MealCancellation { from: string; to: string; meals: string[] }
export interface MealCostBreakdown {
  breakfast: number; lunch: number; dinner: number; ramadan: number;
  breakfastDays: number; lunchDays: number; dinnerDays: number; ramadanDays: number;
  mealsCancelled: number; full: number; net: number;
}

const DAY = 86400000;
const utcDay = (d: Date | string) => { const x = new Date(d); return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); };

/** Default rates when no client is linked: the room's daily food rate split evenly across three meals. */
export function defaultMealRates(dailyFood: number): MealRates {
  return { breakfast: dailyFood / 3, lunch: dailyFood / 3, dinner: dailyFood / 3, ramadan: dailyFood };
}

export function computeMealCost(
  stayStart: Date, stayEnd: Date, rates: MealRates, cancellations: MealCancellation[],
  ramadan?: { start: string; end: string } | null,
): MealCostBreakdown {
  const out: MealCostBreakdown = { breakfast: 0, lunch: 0, dinner: 0, ramadan: 0, breakfastDays: 0, lunchDays: 0, dinnerDays: 0, ramadanDays: 0, mealsCancelled: 0, full: 0, net: 0 };
  const rs = ramadan ? utcDay(ramadan.start) : null;
  const re = ramadan ? utcDay(ramadan.end) : null;
  for (let t = utcDay(stayStart); t <= utcDay(stayEnd); t += DAY) {
    const cancelled = new Set<string>();
    for (const c of cancellations) {
      if (t >= utcDay(c.from) && t <= utcDay(c.to)) (c.meals.length ? c.meals : ["breakfast", "lunch", "dinner", "iftar", "suhoor"]).forEach(m => cancelled.add(m));
    }
    if (rs != null && re != null && t >= rs && t <= re) {
      out.full += rates.ramadan;
      // Ramadan day = Iftar + Suhoor; each cancelled half removes half the day rate.
      const halves = ["iftar", "suhoor"].filter(m => !cancelled.has(m)).length;
      out.mealsCancelled += 2 - halves;
      if (halves) { out.ramadan += (rates.ramadan * halves) / 2; out.ramadanDays += halves / 2; }
      continue;
    }
    out.full += rates.breakfast + rates.lunch + rates.dinner;
    (["breakfast", "lunch", "dinner"] as const).forEach(m => {
      if (cancelled.has(m)) { out.mealsCancelled++; return; }
      out[m] += rates[m];
      out[`${m}Days` as const]++;
    });
  }
  out.net = out.breakfast + out.lunch + out.dinner + out.ramadan;
  return out;
}
