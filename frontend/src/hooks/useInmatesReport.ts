import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentInmateStays } from "@/lib/inmatesReport";
import { floorLabel } from "@/lib/blockStructure";
import { resolveInmateTariff } from "@/lib/inmateTariff";

async function safePageAll(build: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  try {
    for (let from = 0; ; from += 1000) {
      const res = await build(from, from + 999);
      if (res?.error) {
        return rows;
      }
      const data = res?.data;
      if (!data || !Array.isArray(data)) return rows;
      rows.push(...data);
      if (data.length < 1000) return rows;
    }
  } catch {
    return rows;
  }
  return rows;
}

export function useInmatesReport(campId?: string) {
  return useQuery({
    queryKey: ["camp-inmates", campId ?? "all"],
    queryFn: async () => {
      const [ins, outs, camps, blocks, categories, roomRates, campMealRates, suppliers] = await Promise.all([
        safePageAll((f, t) => supabase.from("check_ins").select("id, employee_id, room_id, camp_id, check_in_date, food_required").order("check_in_date", { ascending: false }).order("id").range(f, t)),
        safePageAll((f, t) => supabase.from("check_outs").select("id, employee_id, room_id, check_out_date").order("check_out_date", { ascending: false }).order("id").range(f, t)),
        safePageAll((f, t) => supabase.from("camps").select("id, name, camp_code").order("id").range(f, t)),
        safePageAll((f, t) => supabase.from("buildings").select("id, name, block_code, camp_id").order("id").range(f, t)),
        safePageAll((f, t) => supabase.from("room_categories").select("id, code, category_key, daily_rate").order("id").range(f, t)),
        safePageAll((f, t) => supabase.from("camp_room_rates").select("id, camp_id, room_category, daily_rate").order("id").range(f, t)),
        safePageAll((f, t) => supabase.from("camp_meal_rates").select("id, camp_id, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate").order("id").range(f, t)),
        safePageAll((f, t) => supabase.from("clients").select("id, name, is_active, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate, client_room_rates(room_category_code, daily_rate)").order("id").range(f, t)),
      ]);
      const roomMealRates: any[] = [];
      const floors: any[] = [];
      const foodByCheckIn = new Map(ins.map(s => [`${s.employee_id}|${s.room_id}|${s.check_in_date}`, s.food_required]));
      const stays = currentInmateStays(ins, outs).filter(s => !campId || s.camp_id === campId);
      const ids = stays.map(s => s.employee_id);
      const roomIds = [...new Set(stays.map(s => s.room_id))];
      const employees: any[] = [], rooms: any[] = [];
      const chunks = async (table: "employees" | "rooms", keys: string[], target: any[]) => {
        if (!keys || keys.length === 0) return;
        for (let i = 0; i < keys.length; i += 200) {
          const slice = keys.slice(i, i + 200);
          if (slice.length === 0) continue;
          try {
            const { data, error } = await supabase.from(table).select("*").in("id", slice);
            if (!error && data) {
              target.push(...data);
            }
          } catch (err) {
            console.warn(`Failed loading chunk for ${table}:`, err);
          }
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
        return [{ ...emp, camp_id: stay.camp_id, camp_name: campMap.get(stay.camp_id)?.name ?? "—",
          block_id: blockId, block_name: blockMap.get(blockId)?.name ?? "—",
          floor_key: key, floor_name: floorLabel(floor, { [floor]: floorMap.get(key) ?? "" }),
          room_id: stay.room_id, room_number: room?.room_number ?? "—", room_category: room?.category ?? "—",
          daily_rate: tariff.room, daily_food_rate: tariff.food, food_required: foodRequired, check_in_date: stay.check_in_date }];
      }).sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}