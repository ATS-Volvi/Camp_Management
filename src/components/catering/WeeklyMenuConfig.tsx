import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil, Check, X, Copy, Calendar, Coffee, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMenuDishes } from "@/hooks/useMenuDishes";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STANDARD_MEALS = ["Breakfast", "Lunch", "Dinner"];
const RAMADAN_MEALS = ["Suhoor", "Iftar"];
const mealIcons: Record<string, any> = { Breakfast: Coffee, Lunch: Sun, Dinner: Moon, Suhoor: Moon, Iftar: Sun };
const dayColors = [
  "bg-red-500/10 border-red-500/20",
  "bg-blue-500/10 border-blue-500/20",
  "bg-green-500/10 border-green-500/20",
  "bg-yellow-500/10 border-yellow-500/20",
  "bg-purple-500/10 border-purple-500/20",
  "bg-pink-500/10 border-pink-500/20",
  "bg-orange-500/10 border-orange-500/20",
];

interface WeeklyMenuConfigProps {
  campId: string;
  camps: any[];
  mealTypes: string[];
}

function useWeeklyMenu(campId: string | null) {
  return useQuery({
    queryKey: ["weekly-menu-config", campId],
    enabled: !!campId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_menu_config" as any)
        .select("*, menu_dishes(id, name, description, meal_type)")
        .eq("camp_id", campId!)
        .eq("is_active", true)
        .order("day_of_week")
        .order("meal_type")
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });
}

function useUpsertMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: any) => {
      if (item.id) {
        const { id, ...rest } = item;
        const { data, error } = await supabase
          .from("weekly_menu_config" as any)
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("weekly_menu_config" as any)
          .insert(item)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-menu-config"] });
      toast({ title: "Menu item saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_menu_config" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-menu-config"] });
      toast({ title: "Menu item removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

function useCopyDayMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campId, fromDay, toDay, items }: { campId: string; fromDay: number; toDay: number; items: any[] }) => {
      const { error: delErr } = await supabase
        .from("weekly_menu_config" as any)
        .delete()
        .eq("camp_id", campId)
        .eq("day_of_week", toDay);
      if (delErr) throw delErr;

      if (items.length > 0) {
        const copies = items.map((item: any) => ({
          camp_id: campId,
          day_of_week: toDay,
          meal_type: item.meal_type,
          dish_name: item.dish_name,
          description: item.description,
          menu_dish_id: item.menu_dish_id,
          sort_order: item.sort_order,
        }));
        const { error: insErr } = await supabase.from("weekly_menu_config" as any).insert(copies);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly-menu-config"] });
      toast({ title: "Menu copied successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export default function WeeklyMenuConfig({ campId, camps, mealTypes }: WeeklyMenuConfigProps) {
  const [menuCamp, setMenuCamp] = useState(campId || "");
  const { data: menuItems = [] } = useWeeklyMenu(menuCamp || null);
  const upsertItem = useUpsertMenuItem();
  const deleteItem = useDeleteMenuItem();
  const copyDay = useCopyDayMenu();

  const [addDialog, setAddDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [copyDialog, setCopyDialog] = useState(false);
  const [copyFromDay, setCopyFromDay] = useState(0);
  const [copyToDay, setCopyToDay] = useState(1);
  const [formState, setFormState] = useState({
    day_of_week: 0,
    meal_type: mealTypes[0] || "Breakfast",
    menu_dish_id: "",
  });

  // Load dishes for the selected meal type in the form
  const { data: dishesForMeal = [] } = useMenuDishes(formState.meal_type);

  const activeMeals = mealTypes;

  // Group items by day -> meal
  const weekGrid = useMemo(() => {
    const grid: Record<number, Record<string, any[]>> = {};
    for (let d = 0; d < 7; d++) {
      grid[d] = {};
      activeMeals.forEach(m => { grid[d][m] = []; });
    }
    (menuItems || []).forEach((item: any) => {
      if (grid[item.day_of_week]?.[item.meal_type]) {
        grid[item.day_of_week][item.meal_type].push(item);
      }
    });
    return grid;
  }, [menuItems, activeMeals]);

  const totalDishes = (menuItems || []).length;
  const filledSlots = DAYS.reduce((count, _, d) => {
    return count + activeMeals.filter(m => (weekGrid[d]?.[m]?.length || 0) > 0).length;
  }, 0);
  const totalSlots = 7 * activeMeals.length;

  const openAdd = (day: number, meal: string) => {
    setFormState({ day_of_week: day, meal_type: meal, menu_dish_id: "" });
    setEditItem(null);
    setAddDialog(true);
  };

  const handleSave = () => {
    if (!formState.menu_dish_id) return;
    const selectedDish = (dishesForMeal || []).find((d: any) => d.id === formState.menu_dish_id);
    const payload = editItem
      ? {
          id: editItem.id,
          day_of_week: formState.day_of_week,
          meal_type: formState.meal_type,
          menu_dish_id: formState.menu_dish_id,
          dish_name: selectedDish?.name || "",
          description: selectedDish?.description || "",
        }
      : {
          camp_id: menuCamp,
          day_of_week: formState.day_of_week,
          meal_type: formState.meal_type,
          menu_dish_id: formState.menu_dish_id,
          dish_name: selectedDish?.name || "",
          description: selectedDish?.description || "",
          sort_order: weekGrid[formState.day_of_week]?.[formState.meal_type]?.length || 0,
        };
    upsertItem.mutate(payload, { onSuccess: () => setAddDialog(false) });
  };

  const handleCopy = () => {
    if (copyFromDay === copyToDay) return;
    const sourceItems = (menuItems || []).filter((i: any) => i.day_of_week === copyFromDay);
    copyDay.mutate({ campId: menuCamp, fromDay: copyFromDay, toDay: copyToDay, items: sourceItems }, {
      onSuccess: () => setCopyDialog(false),
    });
  };

  if (!menuCamp) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Select a camp to configure the weekly menu.</p>
          <div className="mt-4 max-w-xs mx-auto">
            <Select value={menuCamp} onValueChange={setMenuCamp}>
              <SelectTrigger><SelectValue placeholder="Choose camp..." /></SelectTrigger>
              <SelectContent>
                {camps.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Weekly Menu Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select dishes from the master list for each day and meal. Ingredients are automatically linked via the Grocery Config.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={menuCamp} onValueChange={setMenuCamp}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select camp" />
                </SelectTrigger>
                <SelectContent>
                  {camps.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setCopyDialog(true)}>
                <Copy size={14} className="mr-1" /> Copy Day
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalDishes}</p>
            <p className="text-xs text-muted-foreground">Total Dishes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{filledSlots}/{totalSlots}</p>
            <p className="text-xs text-muted-foreground">Slots Configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-foreground">{activeMeals.length}</p>
            <p className="text-xs text-muted-foreground">Meals / Day</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-7 gap-3">
        {DAYS.map((day, dayIdx) => (
          <Card key={dayIdx} className={`${dayColors[dayIdx]} border`}>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm font-semibold text-center">{day}</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3 space-y-2">
              {activeMeals.map(meal => {
                const Icon = mealIcons[meal] || Sun;
                const dishes = weekGrid[dayIdx]?.[meal] || [];
                return (
                  <div key={meal} className="bg-card rounded-lg p-2 border border-border/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                        <Icon size={10} /> {meal}
                      </span>
                      <button
                        onClick={() => openAdd(dayIdx, meal)}
                        className="text-primary hover:bg-primary/10 rounded p-0.5 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    {dishes.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/50 italic text-center py-1">No dishes</p>
                    ) : (
                      <div className="space-y-1">
                        {dishes.map((dish: any) => (
                          <div
                            key={dish.id}
                            className="group flex items-start justify-between gap-1 text-[11px] leading-tight bg-muted/30 rounded px-1.5 py-1"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {dish.menu_dishes?.name || dish.dish_name}
                              </p>
                            </div>
                            <div className="hidden group-hover:flex gap-0.5 shrink-0">
                              <button onClick={() => deleteItem.mutate(dish.id)} className="text-muted-foreground hover:text-destructive p-0.5">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Dish Dialog - now uses dropdown from dish master */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Dish — {DAYS[formState.day_of_week]} {formState.meal_type}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Day</Label>
                <Select
                  value={String(formState.day_of_week)}
                  onValueChange={v => setFormState(p => ({ ...p, day_of_week: +v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Meal</Label>
                <Select
                  value={formState.meal_type}
                  onValueChange={v => setFormState(p => ({ ...p, meal_type: v, menu_dish_id: "" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeMeals.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Select Dish</Label>
              <Select
                value={formState.menu_dish_id}
                onValueChange={v => setFormState(p => ({ ...p, menu_dish_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Choose a dish..." /></SelectTrigger>
                <SelectContent>
                  {(dishesForMeal || []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formState.menu_dish_id && (
                <p className="text-xs text-muted-foreground mt-1">
                  {(dishesForMeal || []).find((d: any) => d.id === formState.menu_dish_id)?.description}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertItem.isPending || !formState.menu_dish_id}>
              Add Dish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Day Dialog */}
      <Dialog open={copyDialog} onOpenChange={setCopyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Copy Day Menu</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copy all dishes from one day to another. This will replace the target day's menu.
          </p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">From</Label>
              <Select value={String(copyFromDay)} onValueChange={v => setCopyFromDay(+v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Select value={String(copyToDay)} onValueChange={v => setCopyToDay(+v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialog(false)}>Cancel</Button>
            <Button onClick={handleCopy} disabled={copyDay.isPending || copyFromDay === copyToDay}>
              <Copy size={14} className="mr-1" /> Copy Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
