import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentInmateStays } from "@/lib/inmatesReport";
import { floorLabel } from "@/lib/blockStructure";
import { resolveInmateTariff } from "@/lib/inmateTariff";
import { loadAccommodationAbsences } from "./useAccommodationAbsences";
import { absenceOnDay, accommodationStatus, residentStatus } from "@/lib/accommodationAbsence";
import { format } from "date-fns";

async function pageAll(build: (from: number, to: number) => any) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export function useInmatesReport(campId?: string) {
  return useQuery({ queryKey: ["camp-inmates", campId ?? "all"], queryFn: () => loadInmates(campId) });
}

/** Residents on a given day (default today), reconstructed from saved occupancy events. */
export async function loadInmates(campId?: string, day?: string) {
      const absences = await loadAccommodationAbsences();
      const today = day ?? format(new Date(), "yyyy-MM-dd");
      const isToday = today === format(new Date(), "yyyy-MM-dd");
      const [ins, outs, camps, blocks, floors, categories, roomRates, roomMealRates, campMealRates, suppliers] = await Promise.all([
        pageAll((f, t) => supabase.from("check_ins").select("id, employee_id, room_id, camp_id, check_in_date, food_required").order("check_in_date", { ascending: false }).order("id").range(f, t)),
        pageAll((f, t) => supabase.from("check_outs").select("id, employee_id, room_id, check_out_date").order("check_out_date", { ascending: false }).order("id").range(f, t)),
        pageAll((f, t) => supabase.from("camps").select("id, name, camp_code").order("id").range(f, t)),
        pageAll((f, t) => supabase.from("buildings").select("id, name, block_code, camp_id").order("id").range(f, t)),
        pageAll((f, t) => supabase.from("block_floors").select("id, building_id, floor_number, name").order("id").range(f, t)),
        pageAll((f, t) => supabase.from("room_categories").select("id, code, category_key, daily_rate, holding_charge").order("id").range(f, t)),
        pageAll((f, t) => supabase.from("camp_room_rates").select("id, camp_id, room_category, daily_rate").order("id").range(f, t)),
        pageAll((f, t) => supabase.from("camp_room_meal_rates").select("id, camp_id, room_category, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate").order("id").range(f, t)),
        pageAll((f, t) => supabase.from("camp_meal_rates").select("id, camp_id, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate").order("id").range(f, t)),
        pageAll((f, t) => supabase.from("clients").select("id, name, is_active, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate, client_room_rates(room_category_code, daily_rate)").order("id").range(f, t)),
      ]);
      const foodByCheckIn = new Map(ins.map(s => [`${s.employee_id}|${s.room_id}|${s.check_in_date}`, s.food_required]));
      const stays = currentInmateStays(ins, outs, new Date(today + "T23:59:59")).filter(s => !campId || s.camp_id === campId);
      const ids = stays.map(s => s.employee_id);
      const roomIds = [...new Set(stays.map(s => s.room_id))];
      const employees: any[] = [], rooms: any[] = [];
      const chunks = async (table: "employees" | "rooms", keys: string[], target: any[]) => {
        for (let i = 0; i < keys.length; i += 200) {
          const { data, error } = await supabase.from(table).select("*").in("id", keys.slice(i, i + 200));
          if (error) throw error;
          target.push(...(data ?? []));
        }
      };
      await Promise.all([chunks("employees", ids, employees), chunks("rooms", roomIds, rooms)]);
      const roomMap = new Map(rooms.map(r => [r.id, r]));
      const empMap = new Map(employees.map(e => [e.id, e]));
      const campMap = new Map(camps.map(c => [c.id, c]));
      const blockMap = new Map(blocks.map(b => [b.id, b]));
      const floorMap = new Map(floors.map(f => [`${f.building_id}|${f.floor_number}`, f.name]));
      return stays.flatMap(stay => {
        const emp = empMap.get(stay.employee_id);
        if (!emp) return [];
        const room = roomMap.get(stay.room_id);
        const blockId = room?.building_id ?? "";
        const floor = room?.floor ?? 1;
        const key = `${blockId}|${floor}`;
        const foodRequired = foodByCheckIn.get(`${stay.employee_id}|${stay.room_id}|${stay.check_in_date}`) === true;
        const tariff = resolveInmateTariff(stay.camp_id, room?.category ?? "", emp, foodRequired, Number(room?.daily_food_rate) || 0,
          { categories, roomRates, roomMealRates, campMealRates, suppliers });
        const absence = absences.find(a => a.employee_id === emp.id && absenceOnDay(a, today));
        const holding = Number(categories.find(c => c.category_key === room?.category)?.holding_charge) || 0;
        return [{ ...emp, camp_id: stay.camp_id, camp_name: campMap.get(stay.camp_id)?.name ?? "—",
          block_id: blockId, block_name: blockMap.get(blockId)?.name ?? "—",
          floor_key: key, floor_name: floorLabel(floor, { [floor]: floorMap.get(key) ?? "" }),
          room_id: stay.room_id, room_number: room?.room_number ?? "—", room_category: room?.category ?? "—",
          absence, accommodation_status: accommodationStatus(absence), status: residentStatus(absence, isToday ? emp.presence_status : null),
          daily_rate: absence ? holding : tariff.room, daily_food_rate: absence ? 0 : tariff.food,
          holding_charge: holding, normal_room_rate: tariff.room, food_required: foodRequired, check_in_date: stay.check_in_date }];
      }).sort((a, b) => a.name.localeCompare(b.name));
}