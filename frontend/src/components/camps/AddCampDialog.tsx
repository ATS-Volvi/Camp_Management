import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import VoiceDictationButton from "@/components/maintenance/VoiceDictationButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddCamp, useUpdateCamp, type Camp } from "@/hooks/useCampManagement";
import { useCampAttributes } from "@/hooks/useCampAttributes";
import { Sparkles, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCamp?: Camp | null;
  onCampCreated?: (camp: Camp) => void;
}

const CAMP_TYPES = ["Executive", "Staff", "Worker", "Mixed"];

export default function AddCampDialog({ open, onOpenChange, editCamp, onCampCreated }: Props) {
  const addCamp = useAddCamp();
  const updateCamp = useUpdateCamp();
  const { getOptionsFor } = useCampAttributes();
  const masterCampTypes = getOptionsFor("camp_type");
  const masterLocations = getOptionsFor("location");
  const isEdit = !!editCamp;
  const [launchMasterSetup, setLaunchMasterSetup] = useState(true);

  const [form, setForm] = useState({
    name: editCamp?.name || "",
    location: editCamp?.location || "",
    project_name: editCamp?.project_name || "",
    managed_by: editCamp?.managed_by || "",
    contact_number: editCamp?.contact_number || "",
    camp_type: editCamp?.camp_type || "mixed",
    opening_date: editCamp?.opening_date || "",
    contract_start_date: (editCamp as any)?.contract_start_date || "",
    contract_end_date: (editCamp as any)?.contract_end_date || "",
    notes: editCamp?.notes || "",
    status: editCamp?.status || "active",
    is_rented: (editCamp as any)?.is_rented || false,
    monthly_rent: (editCamp as any)?.monthly_rent?.toString() || "",
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadPhoto = async (): Promise<string | undefined> => {
    if (!photo) return undefined;
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("camp-photos").upload(path, photo, { contentType: photo.type });
    if (error) throw error;
    return path;
  };

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.location.trim()) return;
    let photo_path: string | undefined;
    try {
      setUploading(true);
      photo_path = await uploadPhoto();
    } catch (e: any) {
      toast.error("Photo upload failed: " + (e?.message || "unknown error"));
      setUploading(false);
      return;
    }
    setUploading(false);
    const payload = {
      ...(photo_path ? { photo_path } : {}),
      name: form.name.trim(),
      location: form.location.trim(),
      project_name: form.project_name || null,
      managed_by: form.managed_by || null,
      contact_number: form.contact_number || null,
      camp_type: form.camp_type,
      opening_date: form.opening_date || null,
      contract_start_date: form.contract_start_date || null,
      contract_end_date: form.contract_end_date || null,
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
        onSuccess: (data: any) => {
          setForm({ name: "", location: "", project_name: "", managed_by: "", contact_number: "", camp_type: "mixed", opening_date: "", contract_start_date: "", contract_end_date: "", notes: "", status: "active", is_rented: false, monthly_rent: "" });
          setPhoto(null);
          onOpenChange(false);
          if (launchMasterSetup && onCampCreated && data) {
            onCampCreated(data);
          }
        },
      });
    }
  };

  const isPending = uploading || addCamp.isPending || updateCamp.isPending;

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
            <Input list="camp-master-locations" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Jubail Industrial City" />
            <datalist id="camp-master-locations">
              {masterLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
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
          {(["contract_start_date", "contract_end_date"] as const).map((key) => {
            const label = key === "contract_start_date" ? "Contract Start Date" : "Contract End Date";
            return (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" aria-label={label} className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      {form[key] ? format(parseISO(form[key]), "dd/MM/yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form[key] ? parseISO(form[key]) : undefined}
                      defaultMonth={form[key] ? parseISO(form[key]) : undefined}
                      onSelect={(date) => update(key, date ? format(date, "yyyy-MM-dd") : "")}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            );
          })}
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
            <Label>Camp Photo</Label>
            <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            {photo && <img src={URL.createObjectURL(photo)} alt="Selected camp photo" className="mt-2 h-32 w-full rounded-md object-cover" />}
            {!photo && isEdit && (editCamp as any)?.photo_path && <p className="text-xs text-muted-foreground">A photo is already saved. Choose a new file to replace it.</p>}
          </div>
          <div className="col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Notes</Label>
              <VoiceDictationButton onTranscript={(text) => update("notes", text)} />
            </div>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Additional notes or use Voice..." rows={2} />
          </div>

          {!isEdit && (
            <div className="col-span-2 p-3 rounded-lg border bg-primary/5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles size={14} />
                  <span>Configure Structure (Master Setup)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Open the master builder to customize blocks, floors, rooms, and bed sharing immediately.
                </p>
              </div>
              <Switch
                checked={launchMasterSetup}
                onCheckedChange={setLaunchMasterSetup}
              />
            </div>
          )}
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
