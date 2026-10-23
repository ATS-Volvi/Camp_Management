import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import VoiceDictationButton from "./VoiceDictationButton";

interface MaintenanceFormData {
  camp_id: string;
  room_id: string | null;
  category: string;
  description: string;
  priority: "low" | "medium" | "high" | "emergency";
  status: "open" | "in_progress" | "completed";
  assigned_to: string | null;
  cost: number | null;
}

interface AddMaintenanceFormProps {
  camps: { id: string; name: string }[];
  rooms: { id: string; room_number: string; camp_id: string; buildings: { name: string } | null }[];
  onSubmit: (data: MaintenanceFormData) => void;
  isLoading: boolean;
  initialData?: Partial<MaintenanceFormData> | null;
  isEdit?: boolean;
}

const categories = ["Electrical", "Plumbing", "HVAC", "Furniture", "Cleaning", "Security", "Other"];

export default function AddMaintenanceForm({
  camps,
  rooms,
  onSubmit,
  isLoading,
  initialData,
  isEdit = false,
}: AddMaintenanceFormProps) {
  const [campId, setCampId] = useState(initialData?.camp_id || "");
  const [roomId, setRoomId] = useState(initialData?.room_id || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priority, setPriority] = useState<MaintenanceFormData["priority"]>(initialData?.priority || "medium");
  const [status, setStatus] = useState<MaintenanceFormData["status"]>(initialData?.status || "open");
  const [assignedTo, setAssignedTo] = useState(initialData?.assigned_to || "");
  const [cost, setCost] = useState(initialData?.cost?.toString() || "");

  // Fetch camp staff for selected camp
  const { data: campStaff = [] } = useQuery({
    queryKey: ["camp-staff-for-assignment", campId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, staff_role, employee_id")
        .eq("employee_type", "camp_staff")
        .eq("camp_id", campId)
        .eq("status", "active")
        .order("staff_role");
      if (error) throw error;
      return data;
    },
    enabled: !!campId,
  });

  useEffect(() => {
    if (initialData) {
      setCampId(initialData.camp_id || "");
      setRoomId(initialData.room_id || "");
      setCategory(initialData.category || "");
      setDescription(initialData.description || "");
      setPriority(initialData.priority || "medium");
      setStatus(initialData.status || "open");
      setAssignedTo(initialData.assigned_to || "");
      setCost(initialData.cost?.toString() || "");
    }
  }, [initialData]);

  const filteredRooms = rooms.filter((r) => r.camp_id === campId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campId || !category || !description) {
      toast.error("Please fill in all required fields");
      return;
    }
    onSubmit({
      camp_id: campId,
      room_id: roomId || null,
      category,
      description,
      priority,
      status,
      assigned_to: assignedTo || null,
      cost: cost ? parseFloat(cost) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Camp *</label>
        <Select value={campId} onValueChange={(v) => { setCampId(v); setRoomId(""); setAssignedTo(""); }}>
          <SelectTrigger><SelectValue placeholder="Select camp" /></SelectTrigger>
          <SelectContent>
            {camps.map((camp) => (
              <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Room (Optional)</label>
        <Select value={roomId} onValueChange={setRoomId} disabled={!campId}>
          <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
          <SelectContent>
            {filteredRooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.buildings?.name} - {room.room_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Category *</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                category === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Description *</label>
          <VoiceDictationButton
            onTranscript={(text) => setDescription(text)}
            onParsedFields={(fields) => {
              if (fields.description) setDescription(fields.description);
              if (fields.category) {
                const match = categories.find(c => c.toLowerCase() === fields.category!.toLowerCase());
                if (match) setCategory(match);
              }
              if (fields.priority) setPriority(fields.priority as MaintenanceFormData["priority"]);
            }}
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
          rows={3}
          placeholder="Describe the issue or use the Voice button..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Priority</label>
          <div className="flex flex-wrap gap-2">
            {(["low", "medium", "high", "emergency"] as const).map((p) => {
              const styles: Record<string, string> = {
                low: "bg-blue-100 text-blue-700 border-blue-300",
                medium: "bg-amber-100 text-amber-700 border-amber-300",
                high: "bg-orange-100 text-orange-700 border-orange-300",
                emergency: "bg-red-100 text-red-700 border-red-300",
              };
              const active = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm border capitalize transition-all ${
                    active ? `${styles[p]} ring-2 ring-offset-1 ring-primary/40 font-medium` : "bg-background border-input hover:bg-accent"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {isEdit && (
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {(["open", "in_progress", "completed"] as const).map((s) => {
                const styles: Record<string, string> = {
                  open: "bg-blue-100 text-blue-700 border-blue-300",
                  in_progress: "bg-amber-100 text-amber-700 border-amber-300",
                  completed: "bg-green-100 text-green-700 border-green-300",
                };
                const active = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm border capitalize transition-all ${
                      active ? `${styles[s]} ring-2 ring-offset-1 ring-primary/40 font-medium` : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    {s.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Assign To (Camp Staff)</label>
        {campStaff.length > 0 ? (
          <Select value={assignedTo} onValueChange={setAssignedTo} disabled={!campId}>
            <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
            <SelectContent>
              {campStaff.map((staff) => (
                <SelectItem key={staff.id} value={staff.name}>
                  {staff.name} — {staff.staff_role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
            placeholder={campId ? "No camp staff found — type name" : "Select a camp first"}
            disabled={!campId}
          />
        )}
      </div>

      {isEdit && (
        <div>
          <label className="block text-sm font-medium mb-1">Cost (Optional)</label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
            placeholder="0.00"
            step="0.01"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {isLoading ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update Ticket" : "Create Ticket")}
      </button>
    </form>
  );
}
