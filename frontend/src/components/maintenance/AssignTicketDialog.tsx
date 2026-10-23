import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, User, ArrowRight } from "lucide-react";
import VoiceDictationButton from "./VoiceDictationButton";

interface AssignTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    camp_id: string;
    category: string;
    assigned_to: string | null;
    description: string;
  } | null;
  onAssign: (ticketId: string, staffName: string, notes: string) => void;
  isLoading: boolean;
}

const categoryToRole: Record<string, string[]> = {
  Electrical: ["Electrician", "Supervisor"],
  Plumbing: ["Plumber", "Supervisor"],
  HVAC: ["Electrician", "Supervisor"],
  Furniture: ["Cleaner", "Supervisor", "Warden"],
  Cleaning: ["Cleaner", "Warden"],
  Security: ["Warden", "Supervisor"],
  Other: ["Supervisor", "Warden"],
};

export default function AssignTicketDialog({
  open,
  onOpenChange,
  ticket,
  onAssign,
  isLoading,
}: AssignTicketDialogProps) {
  const [selectedStaff, setSelectedStaff] = useState("");
  const [notes, setNotes] = useState("");

  const { data: campStaff = [] } = useQuery({
    queryKey: ["camp-staff-assign", ticket?.camp_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, staff_role, employee_id")
        .eq("employee_type", "camp_staff")
        .eq("camp_id", ticket!.camp_id)
        .eq("status", "active")
        .order("staff_role");
      if (error) throw error;
      return data;
    },
    enabled: !!ticket?.camp_id,
  });

  const { data: ticketCounts = {} } = useQuery({
    queryKey: ["staff-ticket-counts", ticket?.camp_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("assigned_to, status")
        .in("status", ["open", "in_progress"]);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const t of data || []) {
        if (t.assigned_to) counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1;
      }
      return counts;
    },
    enabled: !!ticket?.camp_id,
  });

  // Auto-suggest: match category to role, then pick least loaded
  const suggested = useMemo(() => {
    if (!ticket || campStaff.length === 0) return null;
    const preferredRoles = categoryToRole[ticket.category] || ["Supervisor"];
    const matching = campStaff.filter((s) => preferredRoles.includes(s.staff_role || ""));
    const pool = matching.length > 0 ? matching : campStaff;
    return pool.sort((a, b) => (ticketCounts[a.name] || 0) - (ticketCounts[b.name] || 0))[0];
  }, [ticket, campStaff, ticketCounts]);

  const handleSubmit = () => {
    if (!ticket || !selectedStaff) return;
    onAssign(ticket.id, selectedStaff, notes);
    setSelectedStaff("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User size={18} /> Assign Ticket
          </DialogTitle>
        </DialogHeader>

        {ticket && (
          <div className="space-y-4">
            {/* Ticket info */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <div className="font-medium">{ticket.category}</div>
              <div className="text-muted-foreground truncate">{ticket.description}</div>
              {ticket.assigned_to && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  Currently: <Badge variant="outline" className="text-xs">{ticket.assigned_to}</Badge>
                </div>
              )}
            </div>

            {/* AI Suggestion */}
            {suggested && (
              <button
                type="button"
                onClick={() => setSelectedStaff(suggested.name)}
                className="w-full flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm hover:bg-primary/10 transition-colors text-left"
              >
                <Sparkles size={16} className="text-primary shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    Suggested: {suggested.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {suggested.staff_role} · {ticketCounts[suggested.name] || 0} active tickets (lowest workload for {ticket.category})
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground" />
              </button>
            )}

            {/* Staff selector */}
            <div>
              <label className="block text-sm font-medium mb-1">Assign To *</label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {campStaff.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      <span className="flex items-center gap-2">
                        {s.name} — {s.staff_role}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({ticketCounts[s.name] || 0} active)
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Assignment Notes</label>
                <VoiceDictationButton onTranscript={(text) => setNotes(text)} />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                rows={2}
                placeholder="Optional notes or use Voice..."
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || !selectedStaff}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {isLoading ? "Assigning..." : "Assign Ticket"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
