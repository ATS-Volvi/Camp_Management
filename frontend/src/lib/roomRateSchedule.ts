import { format, addDays, parseISO, isBefore, isAfter } from "date-fns";

export interface RoomRateSchedule {
  id?: string;
  camp_id: string;
  room_category: string;
  daily_rate: number;
  holding_rate?: number;
  effective_from: string; // YYYY-MM-DD
  effective_to?: string | null; // YYYY-MM-DD or null
  notes?: string;
}

export interface RateSegment {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  days: number;
  dailyRate: number;
  holdingRate: number;
  normalDays: number;
  leaveDays: number;
  normalCost: number;
  holdingCost: number;
  totalCost: number;
}

export interface SlicedRoomStayResult {
  stayDays: number;
  leaveDays: number;
  normalDays: number;
  normalRoomCost: number;
  holdingCost: number;
  totalRoomRevenue: number;
  effectiveDailyRate: number;
  hasRateChange: boolean;
  rateBreakdownLabel: string;
  segments: RateSegment[];
}

export interface LeaveDateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

/**
 * Finds the effective room rate and holding charge for a specific calendar day.
 */
export function getEffectiveRateForDay(
  dayStr: string,
  campId: string,
  roomCategory: string,
  schedules: RoomRateSchedule[],
  fallbackDailyRate: number,
  fallbackHoldingRate: number
): { dailyRate: number; holdingRate: number; scheduleId?: string } {
  if (!schedules || schedules.length === 0) {
    return { dailyRate: fallbackDailyRate, holdingRate: fallbackHoldingRate };
  }

  // Filter matching schedules: matching camp (or global "all"), matching category, and day falls in [effective_from, effective_to]
  const matching = schedules.filter((s) => {
    if (s.camp_id && s.camp_id !== "all" && s.camp_id !== campId) return false;
    if (s.room_category && s.room_category.toLowerCase() !== roomCategory.toLowerCase()) return false;
    if (s.effective_from && s.effective_from > dayStr) return false;
    if (s.effective_to && s.effective_to < dayStr) return false;
    return true;
  });

  if (matching.length === 0) {
    return { dailyRate: fallbackDailyRate, holdingRate: fallbackHoldingRate };
  }

  // Sort descending by effective_from to get the most specific / recent active schedule
  matching.sort((a, b) => (b.effective_from || "").localeCompare(a.effective_from || ""));
  const active = matching[0];

  return {
    dailyRate: Number(active.daily_rate) >= 0 ? Number(active.daily_rate) : fallbackDailyRate,
    holdingRate: Number(active.holding_rate) >= 0 ? Number(active.holding_rate) : fallbackHoldingRate,
    scheduleId: active.id,
  };
}

/**
 * Checks if a specific YYYY-MM-DD date falls into any of the leave/absence ranges.
 */
function isDateInLeaves(dateStr: string, leaves: LeaveDateRange[]): boolean {
  return leaves.some((l) => dateStr >= l.from && dateStr <= l.to);
}

/**
 * Slices a stay window into segmented day groups based on rate change boundaries,
 * taking leaves and holding rates into account for each day.
 */
export function resolveRoomStayCost(
  stayStart: Date,
  stayEnd: Date,
  campId: string,
  roomCategory: string,
  schedules: RoomRateSchedule[],
  fallbackDailyRate: number,
  fallbackHoldingRate: number,
  leaves: LeaveDateRange[] = []
): SlicedRoomStayResult {
  const startStr = format(stayStart, "yyyy-MM-dd");
  const endStr = format(stayEnd, "yyyy-MM-dd");

  if (startStr > endStr) {
    return {
      stayDays: 0,
      leaveDays: 0,
      normalDays: 0,
      normalRoomCost: 0,
      holdingCost: 0,
      totalRoomRevenue: 0,
      effectiveDailyRate: fallbackDailyRate,
      hasRateChange: false,
      rateBreakdownLabel: `${fallbackDailyRate.toFixed(2)} SAR/day`,
      segments: [],
    };
  }

  // Iterate day by day from stayStart to stayEnd
  let cur = parseISO(startStr);
  const end = parseISO(endStr);

  interface DayRecord {
    dateStr: string;
    isLeave: boolean;
    dailyRate: number;
    holdingRate: number;
  }

  const days: DayRecord[] = [];
  while (!isAfter(cur, end)) {
    const dStr = format(cur, "yyyy-MM-dd");
    const isLeave = isDateInLeaves(dStr, leaves);
    const rates = getEffectiveRateForDay(
      dStr,
      campId,
      roomCategory,
      schedules,
      fallbackDailyRate,
      fallbackHoldingRate
    );

    days.push({
      dateStr: dStr,
      isLeave,
      dailyRate: rates.dailyRate,
      holdingRate: rates.holdingRate,
    });

    cur = addDays(cur, 1);
  }

  // Group contiguous days having the same rates into segments
  const segments: RateSegment[] = [];
  let currentSegment: {
    from: string;
    to: string;
    dailyRate: number;
    holdingRate: number;
    days: number;
    normalDays: number;
    leaveDays: number;
  } | null = null;

  for (const d of days) {
    if (
      !currentSegment ||
      currentSegment.dailyRate !== d.dailyRate ||
      currentSegment.holdingRate !== d.holdingRate
    ) {
      if (currentSegment) {
        const normalCost = currentSegment.normalDays * currentSegment.dailyRate;
        const holdingCost = currentSegment.leaveDays * currentSegment.holdingRate;
        segments.push({
          ...currentSegment,
          normalCost,
          holdingCost,
          totalCost: normalCost + holdingCost,
        });
      }
      currentSegment = {
        from: d.dateStr,
        to: d.dateStr,
        dailyRate: d.dailyRate,
        holdingRate: d.holdingRate,
        days: 1,
        normalDays: d.isLeave ? 0 : 1,
        leaveDays: d.isLeave ? 1 : 0,
      };
    } else {
      currentSegment.to = d.dateStr;
      currentSegment.days += 1;
      if (d.isLeave) {
        currentSegment.leaveDays += 1;
      } else {
        currentSegment.normalDays += 1;
      }
    }
  }

  if (currentSegment) {
    const normalCost = currentSegment.normalDays * currentSegment.dailyRate;
    const holdingCost = currentSegment.leaveDays * currentSegment.holdingRate;
    segments.push({
      ...currentSegment,
      normalCost,
      holdingCost,
      totalCost: normalCost + holdingCost,
    });
  }

  const stayDays = days.length;
  const leaveDays = days.filter((d) => d.isLeave).length;
  const normalDays = stayDays - leaveDays;
  const normalRoomCost = segments.reduce((sum, s) => sum + s.normalCost, 0);
  const holdingCost = segments.reduce((sum, s) => sum + s.holdingCost, 0);
  const totalRoomRevenue = normalRoomCost + holdingCost;

  // Determine if rate changed during the stay
  const uniqueRates = Array.from(new Set(segments.map((s) => s.dailyRate)));
  const hasRateChange = uniqueRates.length > 1;

  // Build clean human-readable rate breakdown
  let rateBreakdownLabel = "";
  if (!hasRateChange) {
    const singleRate = segments[0]?.dailyRate ?? fallbackDailyRate;
    rateBreakdownLabel = `${singleRate.toFixed(2)} SAR/day`;
  } else {
    rateBreakdownLabel = segments
      .map((s) => `${s.days}d @ SAR ${s.dailyRate.toFixed(0)}`)
      .join(" + ");
  }

  const effectiveDailyRate = stayDays > 0 ? totalRoomRevenue / stayDays : fallbackDailyRate;

  return {
    stayDays,
    leaveDays,
    normalDays,
    normalRoomCost,
    holdingCost,
    totalRoomRevenue,
    effectiveDailyRate,
    hasRateChange,
    rateBreakdownLabel,
    segments,
  };
}
