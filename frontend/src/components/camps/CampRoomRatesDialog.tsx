import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { NEW_ROOM_CATEGORIES } from "@/constants/roomCategories";
import { DollarSign, Calendar, Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campId: string;
  campName: string;
}

export default function CampRoomRatesDialog({ open, onOpenChange, campId, campName }: Props) {
  const queryClient = useQueryClient();
  const [rates, setRates] = useState<Record<string, string>>({});

  // Form state for creating a new date-effective schedule
  const [schedCategory, setSchedCategory] = useState(NEW_ROOM_CATEGORIES[0]?.value || "");
  const [schedEffectiveFrom, setSchedEffectiveFrom] = useState("");
  const [schedEffectiveTo, setSchedEffectiveTo] = useState("");
  const [schedDailyRate, setSchedDailyRate] = useState("");
  const [schedHoldingRate, setSchedHoldingRate] = useState("");
  const [schedNotes, setSchedNotes] = useState("");

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

  const { data: schedules = [], refetch: refetchSchedules } = useQuery({
    queryKey: ["camp-room-rate-schedules", campId],
    enabled: open && !!campId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("camp_room_rate_schedules")
        .select("*")
        .eq("camp_id", campId)
        .order("effective_from", { ascending: false });
      if (error) return [];
      return data || [];
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

  const saveBaseRatesMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["revenue-data"] });
      toast({ title: "Rates saved", description: `Base room rates updated for ${campName}.` });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save rates", description: error.message, variant: "destructive" });
    },
  });

  const addScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!schedCategory || !schedEffectiveFrom || !schedDailyRate) {
        throw new Error("Category, Effective From date, and Daily Rate are required.");
      }
      const { error } = await (supabase as any)
        .from("camp_room_rate_schedules")
        .insert({
          camp_id: campId,
          room_category: schedCategory,
          daily_rate: parseFloat(schedDailyRate),
          holding_rate: schedHoldingRate ? parseFloat(schedHoldingRate) : 0,
          effective_from: schedEffectiveFrom,
          effective_to: schedEffectiveTo || null,
          notes: schedNotes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camp-room-rate-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-data"] });
      toast({ title: "Rate schedule saved", description: "Date-effective rate change added." });
      setSchedEffectiveFrom("");
      setSchedEffectiveTo("");
      setSchedDailyRate("");
      setSchedHoldingRate("");
      setSchedNotes("");
      refetchSchedules();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add schedule", description: error.message, variant: "destructive" });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("camp_room_rate_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["camp-room-rate-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-data"] });
      toast({ title: "Schedule deleted" });
      refetchSchedules();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete schedule", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <DollarSign size={18} className="text-primary" />
            Room Rates Management — {campName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure standard base rates or schedule mid-month date-effective room rate changes.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="base" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="base" className="text-xs">Base Room Rates</TabsTrigger>
            <TabsTrigger value="schedules" className="text-xs flex items-center gap-1.5">
              <Calendar size={13} />
              Date-Effective Schedules ({schedules.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base" className="space-y-4 pt-3">
            <div className="space-y-2">
              {NEW_ROOM_CATEGORIES.map(cat => (
                <div key={cat.value} className="flex items-center gap-3">
                  <Label className="text-xs flex-1 min-w-0 truncate">{cat.label} ({cat.capacity} beds)</Label>
                  <div className="relative w-32">
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

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={() => saveBaseRatesMutation.mutate()} disabled={saveBaseRatesMutation.isPending}>
                {saveBaseRatesMutation.isPending ? "Saving..." : "Save Base Rates"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4 pt-3">
            <div className="p-3 bg-muted/40 rounded-lg border space-y-3">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Plus size={14} className="text-primary" />
                Schedule a Date-Effective Rate Change
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <Label className="text-[11px]">Room Category</Label>
                  <Select value={schedCategory} onValueChange={setSchedCategory}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NEW_ROOM_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value} className="text-xs">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">Effective From</Label>
                  <Input
                    type="date"
                    value={schedEffectiveFrom}
                    onChange={e => setSchedEffectiveFrom(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Effective To (Optional)</Label>
                  <Input
                    type="date"
                    placeholder="Ongoing"
                    value={schedEffectiveTo}
                    onChange={e => setSchedEffectiveTo(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Daily Rate (SAR)</Label>
                  <Input
                    type="number"
                    step={0.01}
                    placeholder="e.g. 70"
                    value={schedDailyRate}
                    onChange={e => setSchedDailyRate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Holding Rate (SAR)</Label>
                  <Input
                    type="number"
                    step={0.01}
                    placeholder="e.g. 20"
                    value={schedHoldingRate}
                    onChange={e => setSchedHoldingRate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Reason / Notes</Label>
                  <Input
                    placeholder="e.g. Rate revision"
                    value={schedNotes}
                    onChange={e => setSchedNotes(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <Button
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => addScheduleMutation.mutate()}
                disabled={addScheduleMutation.isPending}
              >
                {addScheduleMutation.isPending ? "Adding..." : "Add Rate Schedule"}
              </Button>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold">Active & Upcoming Schedules</div>
              {schedules.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded">
                  No date-effective schedules recorded. Base rates apply.
                </div>
              ) : (
                <div className="border rounded max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px]">
                        <TableHead className="py-1">Category</TableHead>
                        <TableHead className="py-1">From</TableHead>
                        <TableHead className="py-1">To</TableHead>
                        <TableHead className="py-1 text-right">Daily (SAR)</TableHead>
                        <TableHead className="py-1 text-right">Holding</TableHead>
                        <TableHead className="py-1 text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((s: any) => (
                        <TableRow key={s.id} className="text-xs">
                          <TableCell className="py-1 font-medium">{s.room_category}</TableCell>
                          <TableCell className="py-1 font-mono text-[11px]">{s.effective_from}</TableCell>
                          <TableCell className="py-1 font-mono text-[11px]">{s.effective_to || "Ongoing"}</TableCell>
                          <TableCell className="py-1 text-right font-semibold">{s.daily_rate}</TableCell>
                          <TableCell className="py-1 text-right">{s.holding_rate ?? 0}</TableCell>
                          <TableCell className="py-1 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              onClick={() => deleteScheduleMutation.mutate(s.id)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
