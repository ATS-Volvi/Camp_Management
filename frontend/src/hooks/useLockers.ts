import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CampLocker {
  id: string;
  camp_id: string;
  building_id?: string | null;
  room_id?: string | null;
  locker_number: string;
  key_number?: string | null;
  status: "available" | "assigned" | "maintenance" | "damaged";
  condition: "good" | "repair" | "damaged";
  notes?: string | null;
  created_at: string;
  updated_at: string;
  rooms?: {
    id: string;
    room_number: string;
    buildings?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface InmateLockerAssignment {
  id: string;
  locker_id: string;
  employee_id: string;
  camp_id: string;
  room_id?: string | null;
  assigned_date: string;
  returned_date?: string | null;
  status: "active" | "returned" | "lost_key" | "damaged";
  key_issued: boolean;
  key_returned: boolean;
  condition_on_return?: "good" | "repair" | "damaged" | null;
  damage_remarks?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  camp_lockers?: CampLocker;
  employees?: {
    id: string;
    name: string;
    employee_id: string;
  };
}

export function useCampLockers(campId?: string, roomId?: string) {
  return useQuery({
    queryKey: ["camp_lockers", campId, roomId],
    queryFn: async () => {
      let q = supabase
        .from("camp_lockers")
        .select("*, rooms(id, room_number, buildings(id, name))")
        .order("locker_number", { ascending: true });

      if (campId) q = q.eq("camp_id", campId);
      if (roomId) q = q.eq("room_id", roomId);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CampLocker[];
    },
    enabled: true,
  });
}

export function useActiveLockerAssignments(campId?: string) {
  return useQuery({
    queryKey: ["inmate_locker_assignments", "active", campId],
    queryFn: async () => {
      let q = supabase
        .from("inmate_locker_assignments")
        .select("*, camp_lockers(*), employees(id, name, employee_id)")
        .eq("status", "active");

      if (campId) q = q.eq("camp_id", campId);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as InmateLockerAssignment[];
    },
    enabled: true,
  });
}

export function useAssignLocker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lockerId,
      employeeId,
      campId,
      roomId,
      assignedDate,
      keyNumber,
      notes,
    }: {
      lockerId: string;
      employeeId: string;
      campId: string;
      roomId?: string | null;
      assignedDate?: string;
      keyNumber?: string;
      notes?: string;
    }) => {
      // 1. Check if employee already has an active assignment
      const { data: existing } = await supabase
        .from("inmate_locker_assignments")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("status", "active");

      if (existing && existing.length > 0) {
        throw new Error("This inmate already has an active locker assigned. Please release it before assigning a new one.");
      }

      // 2. Insert new assignment
      const { data: assignment, error: assignError } = await supabase
        .from("inmate_locker_assignments")
        .insert({
          locker_id: lockerId,
          employee_id: employeeId,
          camp_id: campId,
          room_id: roomId || null,
          assigned_date: assignedDate || new Date().toISOString().split("T")[0],
          status: "active",
          key_issued: true,
          key_returned: false,
          notes: notes || null,
        })
        .select()
        .single();

      if (assignError) throw assignError;

      // 3. Mark locker as assigned
      const updatePayload: any = { status: "assigned" };
      if (keyNumber) updatePayload.key_number = keyNumber;

      const { error: lockerError } = await supabase
        .from("camp_lockers")
        .update(updatePayload)
        .eq("id", lockerId);

      if (lockerError) throw lockerError;

      return assignment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp_lockers"] });
      qc.invalidateQueries({ queryKey: ["inmate_locker_assignments"] });
      qc.invalidateQueries({ queryKey: ["inmates_report"] });
      toast({ title: "Locker Assigned", description: "Locker successfully allocated to inmate." });
    },
    onError: (err: any) => {
      toast({ title: "Assignment Failed", description: err.message || "Failed to assign locker", variant: "destructive" });
    },
  });
}

export function useReleaseLocker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      lockerId,
      keyReturned = true,
      condition = "good",
      damageRemarks,
      notes,
    }: {
      assignmentId: string;
      lockerId: string;
      keyReturned?: boolean;
      condition?: "good" | "repair" | "damaged";
      damageRemarks?: string;
      notes?: string;
    }) => {
      const today = new Date().toISOString().split("T")[0];
      const assignStatus = !keyReturned ? "lost_key" : condition === "damaged" ? "damaged" : "returned";

      // 1. Update assignment
      const { error: assignError } = await supabase
        .from("inmate_locker_assignments")
        .update({
          returned_date: today,
          status: assignStatus,
          key_returned: keyReturned,
          condition_on_return: condition,
          damage_remarks: damageRemarks || null,
          notes: notes || null,
        })
        .eq("id", assignmentId);

      if (assignError) throw assignError;

      // 2. Update locker status back to available or maintenance
      const lockerStatus = condition === "damaged" || condition === "repair" ? "maintenance" : "available";
      const { error: lockerError } = await supabase
        .from("camp_lockers")
        .update({
          status: lockerStatus,
          condition: condition,
        })
        .eq("id", lockerId);

      if (lockerError) throw lockerError;

      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp_lockers"] });
      qc.invalidateQueries({ queryKey: ["inmate_locker_assignments"] });
      qc.invalidateQueries({ queryKey: ["inmates_report"] });
      toast({ title: "Locker Released", description: "Locker assignment has been closed and updated." });
    },
    onError: (err: any) => {
      toast({ title: "Release Failed", description: err.message || "Failed to release locker", variant: "destructive" });
    },
  });
}

export function useCreateLocker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      camp_id: string;
      building_id?: string | null;
      room_id?: string | null;
      locker_number: string;
      key_number?: string | null;
      status?: "available" | "maintenance";
      condition?: "good" | "repair" | "damaged";
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("camp_lockers")
        .insert({
          ...payload,
          status: payload.status || "available",
          condition: payload.condition || "good",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp_lockers"] });
      toast({ title: "Locker Created", description: "New locker registered successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Creation Failed", description: err.message || "Could not register locker", variant: "destructive" });
    },
  });
}
