import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getRoomCategoryLabel } from "@/constants/roomCategories";
import { Users, DoorOpen, Building2, MapPin, Calendar, Briefcase, CreditCard, User, Hash, Globe, Phone } from "lucide-react";
import { format } from "date-fns";

interface CheckInConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  employee: {
    id: string;
    name: string;
    employee_id: string;
    designation?: string | null;
    department?: string | null;
    company?: string | null;
    supplier_name?: string | null;
    employee_type?: string;
    nationality?: string | null;
    phone?: string | null;
    iqama_number?: string | null;
    passport_number?: string | null;
  } | null;
  room: {
    id: string;
    room_number: string;
    category: string;
    floor: number;
    current_occupancy: number;
    max_capacity: number;
    ac: boolean;
    attached_bathroom: boolean;
    buildings?: { name: string } | null;
  } | null;
  camp: {
    id: string;
    name: string;
    location: string;
  } | null;
  project?: string;
  checkInDate?: string;
  checkInTime?: string;
  // For bulk check-in
  bulkEmployees?: Array<{
    id: string;
    name: string;
    employee_id: string;
    designation?: string | null;
    roomAssigned?: string;
  }>;
}

export default function CheckInConfirmDialog({
  open, onOpenChange, onConfirm, isSubmitting,
  employee, room, camp, project, checkInDate, checkInTime,
  bulkEmployees,
}: CheckInConfirmDialogProps) {
  const isBulk = bulkEmployees && bulkEmployees.length > 0;
  const employeeCount = isBulk ? bulkEmployees.length : (employee ? 1 : 0);

  // Fetch room rate for this camp + category
  const { data: roomRate } = useQuery({
    queryKey: ["camp-room-rate", camp?.id, room?.category],
    queryFn: async () => {
      if (!camp?.id || !room?.category) return null;
      const { data } = await supabase
        .from("camp_room_rates")
        .select("daily_rate")
        .eq("camp_id", camp.id)
        .eq("room_category", room.category)
        .maybeSingle();
      return data?.daily_rate ?? null;
    },
    enabled: open && !!camp?.id && !!room?.category,
  });

  if (!room || !camp) return null;

  const occupancyAfter = room.current_occupancy + employeeCount;
  const occupancyPercent = Math.round((occupancyAfter / room.max_capacity) * 100);
  const willBeFull = occupancyAfter >= room.max_capacity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <DoorOpen size={20} className="text-primary" />
            Confirm Room Allocation
          </DialogTitle>
          <DialogDescription>
            Review the allocation details before confirming check-in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Camp Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <MapPin size={16} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-semibold">{camp.name}</p>
              <p className="text-xs text-muted-foreground">{camp.location}</p>
            </div>
            {checkInDate && (
              <div className="ml-auto text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar size={10} />
                  {format(new Date(checkInDate), "dd MMM yyyy")}
                  {checkInTime && ` · ${checkInTime}`}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Room Allocation Matrix */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Room Details</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr className="bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground flex items-center gap-2">
                      <Hash size={12} /> Room
                    </td>
                    <td className="px-3 py-2 font-semibold">{room.room_number}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground flex items-center gap-2">
                      <Building2 size={12} /> Block
                    </td>
                    <td className="px-3 py-2">{(room as any).buildings?.name || "—"}</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">Category</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-xs">{getRoomCategoryLabel(room.category)}</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground">Floor</td>
                    <td className="px-3 py-2">Floor {room.floor}</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">Amenities</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        {room.ac && <Badge variant="outline" className="text-[10px]">AC</Badge>}
                        {room.attached_bathroom && <Badge variant="outline" className="text-[10px]">Attached Bath</Badge>}
                        {!room.ac && !room.attached_bathroom && <span className="text-xs text-muted-foreground">Standard</span>}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground flex items-center gap-2">
                      <Users size={12} /> Occupancy
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{room.current_occupancy}</span>
                        <span className="text-primary font-bold">→ {occupancyAfter}</span>
                        <span className="text-muted-foreground">/ {room.max_capacity}</span>
                        {willBeFull && <Badge variant="destructive" className="text-[10px]">Full</Badge>}
                      </div>
                      {/* Occupancy bar */}
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-32">
                        <div
                          className={`h-full rounded-full transition-all ${willBeFull ? "bg-destructive" : occupancyPercent > 70 ? "bg-amber-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                  {roomRate !== null && roomRate !== undefined && (
                    <tr className="bg-primary/5">
                      <td className="px-3 py-2 text-muted-foreground flex items-center gap-2">
                        <CreditCard size={12} /> Daily Rate
                      </td>
                      <td className="px-3 py-2 font-semibold text-primary">
                        SAR {Number(roomRate).toFixed(0)} / day
                        {isBulk && <span className="text-xs text-muted-foreground font-normal ml-1">(× {employeeCount} = SAR {(Number(roomRate) * employeeCount).toFixed(0)}/day)</span>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Employee(s) Info */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {isBulk ? `Employees (${employeeCount})` : "Employee Details"}
            </h4>

            {/* Single employee */}
            {!isBulk && employee && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr className="bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground flex items-center gap-2"><User size={12} /> Name</td>
                      <td className="px-3 py-2 font-semibold">{employee.name}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Employee ID</td>
                      <td className="px-3 py-2 font-mono text-xs">{employee.employee_id}</td>
                    </tr>
                    {employee.designation && (
                      <tr className="bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">Designation</td>
                        <td className="px-3 py-2">{employee.designation}</td>
                      </tr>
                    )}
                    {(employee.company || employee.supplier_name) && (
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground flex items-center gap-2"><Briefcase size={12} /> Company</td>
                        <td className="px-3 py-2">{employee.company || employee.supplier_name}</td>
                      </tr>
                    )}
                    {employee.nationality && (
                      <tr className="bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground flex items-center gap-2"><Globe size={12} /> Nationality</td>
                        <td className="px-3 py-2">{employee.nationality}</td>
                      </tr>
                    )}
                    {employee.phone && (
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground flex items-center gap-2"><Phone size={12} /> Phone</td>
                        <td className="px-3 py-2">{employee.phone}</td>
                      </tr>
                    )}
                    {employee.iqama_number && (
                      <tr className="bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground">Iqama</td>
                        <td className="px-3 py-2 font-mono text-xs">{employee.iqama_number}</td>
                      </tr>
                    )}
                    {employee.passport_number && (
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground">Passport</td>
                        <td className="px-3 py-2 font-mono text-xs">{employee.passport_number}</td>
                      </tr>
                    )}
                    {project && (
                      <tr className="bg-primary/5">
                        <td className="px-3 py-2 text-muted-foreground flex items-center gap-2"><Briefcase size={12} /> Project</td>
                        <td className="px-3 py-2 font-semibold text-primary">{project}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bulk employees */}
            {isBulk && (
              <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                {bulkEmployees.map((emp, i) => (
                  <div key={emp.id} className={`px-3 py-2 flex items-center gap-3 text-sm ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                    <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                    <span className="font-medium flex-1">{emp.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{emp.employee_id}</span>
                    {emp.designation && <Badge variant="outline" className="text-[10px]">{emp.designation}</Badge>}
                    {emp.roomAssigned && <Badge variant="secondary" className="text-[10px]">Room {emp.roomAssigned}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : isBulk ? `Confirm Check-In (${employeeCount})` : "Confirm Check-In"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
