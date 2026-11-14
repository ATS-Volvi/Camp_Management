import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAbsenceTransaction } from "@/hooks/useAccommodationAbsences";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { format } from "date-fns";
export default function TemporaryAbsenceDialog({ inmate, onClose }: { inmate: any; onClose: () => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today), [expected, setExpected] = useState(""), [reason, setReason] = useState("");
  const [roomId, setRoomId] = useState(inmate.room_id);
  const mutation = useAbsenceTransaction();
  const { data: reasons = [] } = useQuery({ queryKey: ["absence-reasons"], queryFn: async () => {
    const { data, error } = await supabase.from("accommodation_absence_reasons").select("*").eq("is_active", true).order("name");
    if (error) throw error; return data;
  } });
  const returning = !!inmate.absence;
  const { data: rooms = [] } = useQuery({ queryKey: ["return-rooms", inmate.camp_id], enabled: returning, queryFn: async () => {
    const out = [];
    for (let f = 0; ; f += 1000) {
      const { data, error } = await supabase.from("rooms").select("id,room_number,current_occupancy,max_capacity,status").eq("camp_id", inmate.camp_id).order("id").range(f, f + 999);
      if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) return out;
    }
  } });
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[85vh] overflow-auto"><DialogHeader><DialogTitle>{returning ? "Check-in (Return)" : "Temporary Check-out"}</DialogTitle></DialogHeader>
    <p>{inmate.employee_id} · {inmate.name}</p><p className="text-sm text-muted-foreground">{inmate.camp_name} · {inmate.block_name} · Room {inmate.room_number}</p>
    <Label htmlFor="absence-date">{returning ? "Actual Return Date" : "Temporary Check-out Date"}</Label><Input id="absence-date" type="date" min={returning ? inmate.absence.temporary_out_date : inmate.check_in_date?.slice(0, 10)} max={today} value={date} onChange={e => setDate(e.target.value)} />
    {returning && <><Label>Return Room</Label><Select value={roomId} onValueChange={setRoomId}><SelectTrigger aria-label="Return room"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={inmate.room_id}>{inmate.room_number} (Retained)</SelectItem>{rooms.filter(r => r.id !== inmate.room_id && r.current_occupancy < r.max_capacity && !["reserved", "under_maintenance"].includes(r.status)).map(r => <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>)}</SelectContent></Select></>}
    {!returning && <><Label>Reason</Label><Select value={reason} onValueChange={setReason}><SelectTrigger aria-label="Absence reason"><SelectValue placeholder="Select reason" /></SelectTrigger><SelectContent>{reasons.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}</SelectContent></Select>
    <Label htmlFor="expected-return">Expected Return Date</Label><Input id="expected-return" type="date" min={date} value={expected} onChange={e => setExpected(e.target.value)} /></>}
    {mutation.error && <p role="alert" className="text-destructive text-sm">{mutation.error.message}</p>}
    <Button disabled={mutation.isPending || !date || (!returning && !reason)} onClick={() => mutation.mutate({ employeeId: inmate.id, date, reason, expected, absenceId: inmate.absence?.id, roomId: returning ? roomId : undefined }, { onSuccess: onClose })}>{mutation.isPending ? "Saving…" : returning ? "Confirm Return" : "Confirm Temporary Check-out"}</Button>
  </DialogContent></Dialog>;
}