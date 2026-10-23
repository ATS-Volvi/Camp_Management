import { useMemo, useState } from "react";
import { Plus, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  useRoomCategoryMaster,
  useDesignationMapping,
  useAddMapping,
  useDeleteMapping,
} from "@/hooks/useRoomCategoryMaster";
import { useDesignations } from "@/hooks/useDesignations";
import { usePermissions } from "@/hooks/usePermissions";

export default function DesignationRoomMapping() {
  const { data: cats = [] } = useRoomCategoryMaster();
  const { data: mappings = [] } = useDesignationMapping();
  const { data: designations = [] } = useDesignations();
  const add = useAddMapping();
  const del = useDeleteMapping();
  const { isSuperAdmin } = usePermissions();
  const [open, setOpen] = useState(false);
  const [designation, setDesignation] = useState("");
  const [code, setCode] = useState("");

  // Combine DB designations with mapping designations to ensure all are listed
  const allDesignations = useMemo(() => {
    const set = new Set<string>(designations.map(d => d.name));
    mappings.forEach(m => set.add(m.designation));
    return Array.from(set).sort();
  }, [designations, mappings]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof mappings>();
    allDesignations.forEach(d => map.set(d, []));
    mappings.forEach(m => {
      const arr = map.get(m.designation) || [];
      arr.push(m);
      map.set(m.designation, arr);
    });
    return Array.from(map.entries());
  }, [mappings, allDesignations]);

  const codeToCat = useMemo(() => new Map(cats.map(c => [c.code, c])), [cats]);

  const save = async () => {
    if (!designation || !code) return;
    try {
      await add.mutateAsync({ designation, room_category_code: code });
      toast({ title: "Mapping added" });
      setOpen(false); setDesignation(""); setCode("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Link2 className="text-primary" /> Designation ↔ Room Mapping</h1>
          <p className="text-sm text-muted-foreground">Define which room categories each designation is eligible for.</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus size={16} /> Add Mapping</Button>
        )}
      </div>

      <div className="grid gap-3">
        {grouped.map(([des, list]) => (
          <Card key={des} className="p-4 flex items-center gap-4 flex-wrap">
            <div className="min-w-[220px]">
              <p className="font-semibold">{des}</p>
              <p className="text-xs text-muted-foreground">{list.length} eligible categor{list.length === 1 ? "y" : "ies"}</p>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              {list.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">No mapping — falls back to all categories</span>
              ) : list.map(m => {
                const c = codeToCat.get(m.room_category_code);
                return (
                  <Badge key={m.id} variant="secondary" className="gap-1.5 py-1 pl-2 pr-1">
                    <span className="font-mono text-[10px] opacity-70">{m.room_category_code}</span>
                    <span>{c?.name || m.room_category_code}</span>
                    {isSuperAdmin && (
                      <button onClick={() => del.mutate(m.id)} className="ml-1 hover:bg-destructive/20 rounded p-0.5">
                        <Trash2 size={10} className="text-destructive" />
                      </button>
                    )}
                  </Badge>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Mapping</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Designation</Label>
              <Select value={designation} onValueChange={setDesignation}>
                <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                <SelectContent>
                  {allDesignations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Room Category</Label>
              <Select value={code} onValueChange={setCode}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {cats.filter(c => c.is_active).map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.code} · {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!designation || !code || add.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
