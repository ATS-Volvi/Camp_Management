import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VoiceDictationButton from "@/components/maintenance/VoiceDictationButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddCamp, useUpdateCamp, type Camp } from "@/hooks/useCampManagement";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCamp?: Camp | null;
}

const CAMP_TYPES = ["Executive", "Staff", "Worker", "Mixed"];

export default function AddCampDialog({ open, onOpenChange, editCamp }: Props) {
  const addCamp = useAddCamp();
  const updateCamp = useUpdateCamp();
  const isEdit = !!editCamp;

  const [form, setForm] = useState({
    name: editCamp?.name || "",
    location: editCamp?.location || "",
    project_name: editCamp?.project_name || "",
    managed_by: editCamp?.managed_by || "",
    contact_number: editCamp?.contact_number || "",
    camp_type: editCamp?.camp_type || "mixed",
    opening_date: editCamp?.opening_date || "",
    notes: editCamp?.notes || "",
    status: editCamp?.status || "active",
    is_rented: (editCamp as any)?.is_rented || false,
    monthly_rent: (editCamp as any)?.monthly_rent?.toString() || "",
  });

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.location.trim()) return;
    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      project_name: form.project_name || null,
      managed_by: form.managed_by || null,
      contact_number: form.contact_number || null,
      camp_type: form.camp_type,
      opening_date: form.opening_date || null,
      notes: form.notes || null,
      status: form.status,
      is_rented: form.is_rented,
      monthly_rent: form.monthly_rent ? parseFloat(form.monthly_rent) : 0,
    };

    if (isEdit) {
      updateCamp.mutate({ id: editCamp.id, ...payload } as any, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      addCamp.mutate(payload as any, {
        onSuccess: () => {
          setForm({ name: "", location: "", project_name: "", managed_by: "", contact_number: "", camp_type: "mixed", opening_date: "", notes: "", status: "active", is_rented: false, monthly_rent: "" });
          onOpenChange(false);
        },
      });
    }
  };

  const isPending = addCamp.isPending || updateCamp.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Camp" : "Create New Camp"}</DialogTitle>
          <DialogDescription>Fill in the camp details below.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Camp Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Camp Alpha" />
          </div>
          <div className="space-y-1.5">
            <Label>Location *</Label>
            <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Riyadh, KSA" />
          </div>
          <div className="space-y-1.5">
            <Label>Project Name</Label>
            <Input value={form.project_name} onChange={(e) => update("project_name", e.target.value)} placeholder="Project Alpha" />
          </div>
          <div className="space-y-1.5">
            <Label>Camp Manager</Label>
            <Input value={form.managed_by} onChange={(e) => update("managed_by", e.target.value)} placeholder="Ahmad Ali" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Number</Label>
            <Input value={form.contact_number} onChange={(e) => update("contact_number", e.target.value)} placeholder="+966..." />
          </div>
          <div className="space-y-1.5">
            <Label>Camp Type</Label>
            <Select value={form.camp_type} onValueChange={(v) => update("camp_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAMP_TYPES.map((t) => (
                  <SelectItem key={t.toLowerCase()} value={t.toLowerCase()}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Opening Date</Label>
            <Input type="date" value={form.opening_date} onChange={(e) => update("opening_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Rented Camp?</Label>
            <Select value={form.is_rented ? "yes" : "no"} onValueChange={(v) => { update("is_rented", v); setForm(p => ({ ...p, is_rented: v === "yes" })); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No (Owned)</SelectItem>
                <SelectItem value="yes">Yes (Rented)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.is_rented && (
            <div className="space-y-1.5">
              <Label>Monthly Rent (SAR)</Label>
              <Input type="number" value={form.monthly_rent} onChange={(e) => update("monthly_rent", e.target.value)} placeholder="0.00" />
            </div>
          )}
          <div className="col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Notes</Label>
              <VoiceDictationButton onTranscript={(text) => update("notes", text)} />
            </div>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Additional notes or use Voice..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Update Camp" : "Create Camp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
