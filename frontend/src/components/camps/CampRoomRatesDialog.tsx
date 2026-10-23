import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { NEW_ROOM_CATEGORIES } from "@/constants/roomCategories";
import { DollarSign } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
}

export default function CampRoomRatesDialog({ open, onOpenChange, campId, campName }: Props) {
  const queryClient = useQueryClient();
  const [rates, setRates] = useState<Record<string, string>>({});

  const { data: existingRates = [] } = useQuery({
    queryKey: ["camp-room-rates", campId],
    enabled: open && !!campId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camp_room_rates" as any)
        .select("*")
        .eq("camp_id", campId);
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    const r: Record<string, string> = {};
    NEW_ROOM_CATEGORIES.forEach(cat => {
      const existing = existingRates.find((er: any) => er.room_category === cat.value);
      r[cat.value] = existing ? String(existing.daily_rate) : "0";
    });
    setRates(r);
  }, [existingRates]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const cat of NEW_ROOM_CATEGORIES) {
        const dailyRate = parseFloat(rates[cat.value] || "0");
        const existing = existingRates.find((er: any) => er.room_category === cat.value);
        if (existing) {
          await supabase
            .from("camp_room_rates" as any)
            .update({ daily_rate: dailyRate } as any)
            .eq("id", existing.id);
        } else if (dailyRate > 0) {
          await supabase
            .from("camp_room_rates" as any)
            .insert({ camp_id: campId, room_category: cat.value, daily_rate: dailyRate } as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camp-room-rates"] });
      toast({ title: "Rates saved", description: `Room rates updated for ${campName}.` });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save rates", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign size={18} className="text-primary" />
            Room Rates — {campName}
          </DialogTitle>
          <DialogDescription>Set daily rate per room category for this camp.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {NEW_ROOM_CATEGORIES.map(cat => (
            <div key={cat.value} className="flex items-center gap-3">
              <Label className="text-xs flex-1 min-w-0 truncate">{cat.label} ({cat.capacity} beds)</Label>
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">SAR</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={rates[cat.value] || "0"}
                  onChange={e => setRates(prev => ({ ...prev, [cat.value]: e.target.value }))}
                  className="pl-10 text-sm h-8"
                />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Rates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
