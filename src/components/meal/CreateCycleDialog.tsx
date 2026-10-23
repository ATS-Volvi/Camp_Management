import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCamps } from "@/hooks/useCampManagement";
import { useCreateCycle } from "@/hooks/useMealManagement";

interface Props {
  open: boolean;
  onClose: () => void;
}

function addDays(date: string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function CreateCycleDialog({ open, onClose }: Props) {
  const { data: camps = [] } = useCamps();
  const create = useCreateCycle();

  const today = new Date().toISOString().split("T")[0];
  const [campId, setCampId] = useState<string>("");
  const [name, setName] = useState("Weekly Meal Cycle");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 6));
  const [cutoff, setCutoff] = useState(`${today}T18:00`);

  const handleStart = (v: string) => {
    setStart(v);
    setEnd(addDays(v, 6));
    setCutoff(`${v}T18:00`);
  };

  const handleSave = async () => {
    await create.mutateAsync({
      camp_id: campId || null,
      name,
      start_date: start,
      end_date: end,
      cutoff_datetime: new Date(cutoff).toISOString(),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Meal Cycle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Camp (optional)</Label>
            <Select value={campId} onValueChange={setCampId}>
              <SelectTrigger>
                <SelectValue placeholder="All camps" />
              </SelectTrigger>
              <SelectContent>
                {camps?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={start} onChange={(e) => handleStart(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Cut-off (orders close after this)</Label>
            <Input type="datetime-local" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={create.isPending}>
            Create Cycle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
