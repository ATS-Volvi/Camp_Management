import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FREQUENCY_OPTIONS, PMEquipment, useCreateEquipment, useUpdateEquipment } from "@/hooks/usePreventiveMaintenance";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  camps: { id: string; name: string }[];
  equipment?: PMEquipment | null;
  defaultCampId?: string;
}

export default function EquipmentDialog({ open, onOpenChange, camps, equipment, defaultCampId }: Props) {
  const create = useCreateEquipment();
  const update = useUpdateEquipment();
  const isEdit = !!equipment;

  const [form, setForm] = useState({
    camp_id: defaultCampId ?? "",
    machine_code: "",
    name: "",
    category: "kitchen",
    location: "",
    frequency: "monthly" as any,
    frequency_days: 30,
    notes: "",
    default_assignee_name: "",
  });

  useEffect(() => {
    if (equipment) {
      setForm({
        camp_id: equipment.camp_id,
        machine_code: equipment.machine_code,
        name: equipment.name,
        category: equipment.category ?? "kitchen",
        location: equipment.location ?? "",
        frequency: equipment.frequency,
        frequency_days: equipment.frequency_days,
        notes: equipment.notes ?? "",
        default_assignee_name: (equipment as any).default_assignee_name ?? "",
      });
    } else {
      setForm({
        camp_id: defaultCampId ?? "",
        machine_code: "",
        name: "",
        category: "kitchen",
        location: "",
        frequency: "monthly" as any,
        frequency_days: 30,
        notes: "",
        default_assignee_name: "",
      });
    }
  }, [equipment, defaultCampId, open]);

  // Camp staff for the selected camp (for technician assignment)
  const { data: campStaff = [] } = useQuery({
    queryKey: ["pm-camp-staff", form.camp_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, staff_role")
        .eq("employee_type", "camp_staff")
        .eq("camp_id", form.camp_id)
        .eq("status", "active")
        .order("staff_role");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!form.camp_id,
  });

  const submit = async () => {
    if (!form.camp_id || !form.machine_code || !form.name) return;
    if (isEdit) {
      await update.mutateAsync({ id: equipment!.id, ...form } as any);
    } else {
      await create.mutateAsync(form as any);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Camp *</Label>
            <Select value={form.camp_id} onValueChange={(v) => setForm({ ...form, camp_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select camp" /></SelectTrigger>
              <SelectContent>
                {camps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Machine ID *</Label>
              <Input value={form.machine_code} onChange={e => setForm({ ...form, machine_code: e.target.value })} placeholder="RM-1048" />
            </div>
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Coffee Machine" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Kitchen, Block A" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v: any) => {
                const opt = FREQUENCY_OPTIONS.find(o => o.value === v);
                setForm({ ...form, frequency: v, frequency_days: opt && opt.days > 0 ? opt.days : form.frequency_days });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency (days)</Label>
              <Input type="number" min={1} value={form.frequency_days}
                onChange={e => setForm({ ...form, frequency_days: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <div>
            <Label>Responsible Technician</Label>
            {campStaff.length > 0 ? (
              <Select
                value={form.default_assignee_name || "__unassigned__"}
                onValueChange={(v) => setForm({ ...form, default_assignee_name: v === "__unassigned__" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">— Unassigned —</SelectItem>
                  {campStaff.map((s: any) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}{s.staff_role ? ` — ${s.staff_role}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={form.default_assignee_name}
                onChange={e => setForm({ ...form, default_assignee_name: e.target.value })}
                placeholder={form.camp_id ? "No camp staff found — type name" : "Select a camp first"}
                disabled={!form.camp_id}
              />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Auto-assigned to all generated maintenance tasks for this machine.
            </p>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending || update.isPending}>
              {isEdit ? "Update" : "Add Equipment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
