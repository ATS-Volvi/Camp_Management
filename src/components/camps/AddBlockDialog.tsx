import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddBlock } from "@/hooks/useCampManagement";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
}

const BLOCK_TYPES = ["Executive", "Staff", "Worker", "Supervisor", "Technician", "Labor"];

export default function AddBlockDialog({ open, onOpenChange, campId }: Props) {
  const addBlock = useAddBlock();
  const [form, setForm] = useState({
    name: "",
    block_type: "staff",
    floors: "1",
    supervisor_name: "",
  });

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    addBlock.mutate(
      {
        camp_id: campId,
        name: form.name.trim(),
        block_type: form.block_type,
        floors: parseInt(form.floors) || 1,
        supervisor_name: form.supervisor_name || null,
      } as any,
      {
        onSuccess: () => {
          setForm({ name: "", block_type: "staff", floors: "1", supervisor_name: "" });
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Block</DialogTitle>
          <DialogDescription>Create a block within this camp.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Block Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Block A" />
          </div>
          <div className="space-y-1.5">
            <Label>Block Type</Label>
            <Select value={form.block_type} onValueChange={(v) => update("block_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((t) => (
                  <SelectItem key={t.toLowerCase()} value={t.toLowerCase()}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Number of Floors</Label>
            <Input type="number" min={1} value={form.floors} onChange={(e) => update("floors", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Supervisor Name</Label>
            <Input value={form.supervisor_name} onChange={(e) => update("supervisor_name", e.target.value)} placeholder="Supervisor name" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={addBlock.isPending}>
            {addBlock.isPending ? "Creating..." : "Create Block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
