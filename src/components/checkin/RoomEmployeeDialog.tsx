import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Users, DoorOpen, Ban, CheckCircle2 } from "lucide-react";
import { getRoomCategoryLabel } from "@/constants/roomCategories";

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  designation?: string | null;
  company?: string | null;
  supplier_name?: string | null;
  is_blacklisted?: boolean | null;
  iqama_number?: string | null;
  passport_number?: string | null;
}

interface Room {
  id: string;
  room_number: string;
  category: string;
  current_occupancy: number;
  max_capacity: number;
  buildings?: { name: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
  employees: Employee[];
  onSelectEmployee: (employeeId: string, employeeName: string) => void;
}

export default function RoomEmployeeDialog({ open, onOpenChange, room, employees, onSelectEmployee }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q) ||
      (e.designation && e.designation.toLowerCase().includes(q)) ||
      (e.iqama_number && e.iqama_number.toLowerCase().includes(q))
    );
  }, [employees, search]);

  const handleSelect = (emp: Employee) => {
    onSelectEmployee(emp.id, emp.name);
    setSearch("");
    onOpenChange(false);
  };

  if (!room) return null;

  const spotsLeft = room.max_capacity - room.current_occupancy;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSearch(""); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen size={18} className="text-primary" />
            Room {room.room_number}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs">
            <span>{(room.buildings as any)?.name || "Block"}</span>
            <span>·</span>
            <span>{getRoomCategoryLabel(room.category)}</span>
            <span>·</span>
            <span className="font-medium text-primary">{spotsLeft} bed{spotsLeft !== 1 ? "s" : ""} available</span>
            <span>·</span>
            <span>{room.current_occupancy}/{room.max_capacity} occupied</span>
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, designation, or iqama..."
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg divide-y min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users size={24} className="mb-2 opacity-50" />
              <p className="text-sm">No employees found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          ) : (
            filtered.map(emp => (
              <button
                key={emp.id}
                onClick={() => handleSelect(emp)}
                className="w-full text-left px-3 py-2.5 hover:bg-primary/5 transition-colors flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Users size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {emp.name}
                    {emp.is_blacklisted && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                        <Ban size={8} /> Blacklisted
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emp.employee_id}
                    {emp.designation && <> · {emp.designation}</>}
                    {emp.company && <> · {emp.company}</>}
                    {emp.supplier_name && <> · {emp.supplier_name}</>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {emp.iqama_number && (
                    <p className="text-[10px] text-muted-foreground font-mono">{emp.iqama_number}</p>
                  )}
                  <CheckCircle2 size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                </div>
              </button>
            ))
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          {filtered.length} employee{filtered.length !== 1 ? "s" : ""} · Click to assign to Room {room.room_number}
        </p>
      </DialogContent>
    </Dialog>
  );
}
