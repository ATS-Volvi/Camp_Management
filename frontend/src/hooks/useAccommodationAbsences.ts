import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export async function loadAccommodationAbsences() {
  const rows = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await supabase.from("accommodation_absences").select("*").order("id").range(f, f + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}
export function useAccommodationAbsences() {
  return useQuery({ queryKey: ["accommodation-absences"], queryFn: loadAccommodationAbsences });
}
export function useAbsenceTransaction() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (p: { employeeId: string; date: string; reason: string; expected: string; absenceId?: string; roomId?: string }) => {
    const result = p.absenceId ? await supabase.rpc("return_from_temporary_absence", { p_absence_id: p.absenceId, p_date: p.date, p_room_id: p.roomId || null })
      : await supabase.rpc("temporary_check_out", { p_employee_id: p.employeeId, p_date: p.date, p_reason: p.reason, p_expected_return: p.expected || null });
    if (result.error) throw result.error;
    return result.data;
  }, onSuccess: () => { qc.invalidateQueries(); } });
}