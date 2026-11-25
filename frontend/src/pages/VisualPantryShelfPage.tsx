import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Layers, Package, AlertTriangle, Search, Utensils,
  ChefHat, Sparkles, SlidersHorizontal, RefreshCw, CheckCircle2,
  DollarSign
} from "lucide-react";
import { useCateringStock } from "@/hooks/useCatering";
import { useCamps } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DISH_RECIPES } from "@/data/dishRecipes";
import VisualPantryShelf from "@/components/catering/VisualPantryShelf";
import { matchesDishIngredient } from "@/pages/MessCatering";

export default function VisualPantryShelfPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: camps = [] } = useCamps();

  const [selectedCampId, setSelectedCampId] = useState<string>("");
  const effectiveCampId = selectedCampId || camps[0]?.id || "";

  const { data: stock = [], isLoading, refetch } = useCateringStock(effectiveCampId || undefined);

  const [search, setSearch] = useState("");
  const [selectedDish, setSelectedDish] = useState("");

  // Edit stock dialog
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editMin, setEditMin] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Selected dish ingredients
  const selectedDishIngredients = useMemo(() => {
    if (!selectedDish) return [];
    return DISH_RECIPES[selectedDish.toLowerCase()] || [];
  }, [selectedDish]);

  // Filter stock by search & recipe
  const filteredStock = useMemo(() => {
    let result = stock;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s: any) =>
          s.ingredients?.name?.toLowerCase().includes(q) ||
          s.ingredients?.category?.toLowerCase().includes(q)
      );
    }
    if (selectedDish && selectedDishIngredients.length > 0) {
      result = result.filter((s: any) =>
        selectedDishIngredients.some(ri =>
          matchesDishIngredient(s.ingredients?.name, ri.name)
        )
      );
    }
    return result;
  }, [stock, search, selectedDish, selectedDishIngredients]);

  // Quick stats
  const stats = useMemo(() => {
    let totalItems = stock.length;
    let lowStock = 0;
    let totalValuation = 0;

    stock.forEach((s: any) => {
      const bal = Number(s.balance ?? 0);
      const min = Number(s.min_level ?? 5);
      const cost = Number(s.ingredients?.unit_cost ?? 0);
      if (bal <= min) lowStock++;
      totalValuation += bal * cost;
    });

    return { totalItems, lowStock, totalValuation };
  }, [stock]);

  // Quick direct save from card
  const handleQuickSaveStock = async (ingredientId: string, newBalance: number, currentStockRow?: any) => {
    try {
      const now = new Date().toISOString();
      const currentMin = currentStockRow?.min_level ?? 5;

      if (currentStockRow?.id) {
        const { error } = await supabase
          .from("catering_stock")
          .update({
            opening_stock: newBalance,
            stock_in: 0,
            stock_out: 0,
            min_level: currentMin,
            updated_at: now,
          })
          .eq("id", currentStockRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("catering_stock").insert({
          camp_id: effectiveCampId,
          ingredient_id: ingredientId,
          opening_stock: newBalance,
          stock_in: 0,
          stock_out: 0,
          min_level: currentMin,
          updated_at: now,
        });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["catering-stock"] });
      await queryClient.invalidateQueries({ queryKey: ["catering-stock-summary"] });
      toast({
        title: "Pantry Stock Saved",
        description: `Physical stock updated to ${newBalance} ${currentStockRow?.ingredients?.unit || "units"}.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to update shelf stock",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Full dialog save
  const handleSaveEdit = async () => {
    if (!editItem) return;
    const newQty = parseFloat(editQty);
    const newMin = parseFloat(editMin);
    if (isNaN(newQty) || newQty < 0) {
      toast({ title: "Invalid quantity", description: "Must be a non-negative number.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      if (editItem.id) {
        const { error } = await supabase
          .from("catering_stock")
          .update({
            opening_stock: newQty,
            stock_in: 0,
            stock_out: 0,
            min_level: isNaN(newMin) ? 5 : newMin,
            updated_at: now,
          })
          .eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("catering_stock").insert({
          camp_id: effectiveCampId,
          ingredient_id: editItem.ingredient_id,
          opening_stock: newQty,
          stock_in: 0,
          stock_out: 0,
          min_level: isNaN(newMin) ? 5 : newMin,
          updated_at: now,
        });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["catering-stock"] });
      await queryClient.invalidateQueries({ queryKey: ["catering-stock-summary"] });
      toast({ title: "Shelf Stock Updated", description: "Inventory count successfully saved." });
      setEditItem(null);
    } catch (err: any) {
      toast({ title: "Update Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-5 rounded-2xl border border-amber-500/20 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
              <Layers size={22} />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Visual Pantry Shelf & Physical Stock
            </h1>
            <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-mono">
              TACTILE INVENTORY
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Live interactive digital twin of warehouse storage shelves. Monitor 5-bar battery levels, adjust quantities with rapid steppers and sliders, and filter by recipe requirements.
          </p>
        </div>

        {/* Camp Selector & Refresh */}
        <div className="flex items-center gap-2">
          {camps.length > 0 && (
            <Select
              value={effectiveCampId}
              onValueChange={setSelectedCampId}
            >
              <SelectTrigger className="w-[190px] bg-card text-xs font-semibold">
                <SelectValue placeholder="Select Kitchen Camp" />
              </SelectTrigger>
              <SelectContent>
                {camps.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Catalogued Items</p>
              <p className="text-2xl font-black tracking-tight mt-1 text-foreground">
                {stats.totalItems}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Package size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Low Stock Alerts</p>
              <p className={`text-2xl font-black tracking-tight mt-1 ${stats.lowStock > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                {stats.lowStock}
              </p>
            </div>
            <div className={`p-2.5 rounded-xl ${stats.lowStock > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}>
              {stats.lowStock > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pantry Valuation</p>
              <p className="text-2xl font-black tracking-tight mt-1 text-foreground">
                SAR {stats.totalValuation.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <DollarSign size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Recipe Toolbar */}
      <Card className="border-border/70 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input
                placeholder="Search pantry shelf by ingredient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Recipe Filter */}
            <div className="flex items-center gap-2">
              <Utensils size={15} className="text-primary shrink-0" />
              <Select value={selectedDish} onValueChange={setSelectedDish}>
                <SelectTrigger className="w-full sm:w-[260px] text-xs">
                  <SelectValue placeholder="Filter by Dish Recipe..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value=" ">All Dishes (Show All Pantry)</SelectItem>
                  {Object.keys(DISH_RECIPES).map((dishKey) => {
                    const dishName = dishKey.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                    const ingCount = DISH_RECIPES[dishKey]?.length || 0;
                    return (
                      <SelectItem key={dishKey} value={dishKey}>
                        {dishName} ({ingCount} ingredients)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedDish && selectedDish.trim() !== "" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDish("")}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Active Dish Recipe Filter Banner */}
          {selectedDish && selectedDish.trim() !== "" && (
            <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ChefHat size={16} className="text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  Showing ingredients matching recipe:{" "}
                  <span className="font-bold underline capitalize">{selectedDish}</span>
                </span>
                <Badge variant="outline" className="text-[10px] bg-background">
                  {selectedDishIngredients.length} Recipe Items
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDish("")}
                className="h-6 text-[11px] text-amber-700 hover:text-amber-900 dark:text-amber-300"
              >
                Reset Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Visual Pantry Shelf Grid */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between border-b border-border/50">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers size={17} className="text-primary" />
              Interactive Shelf Matrix
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click any card's quick stepper or range slider to update storage balance.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {filteredStock.length} items on shelf
          </Badge>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <VisualPantryShelf
            stock={filteredStock}
            onEditStock={(item) => {
              setEditItem(item);
              setEditQty(String(item.balance ?? 0));
              setEditMin(String(item.min_level ?? 5));
            }}
            onQuickSaveStock={handleQuickSaveStock}
            selectedDishIngredients={selectedDishIngredients}
            matchesDishFn={matchesDishIngredient}
          />
        </CardContent>
      </Card>

      {/* Dialog for Edit Stock Details */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package size={18} className="text-primary" />
              Adjust Physical Stock for {editItem?.ingredients?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Physical Storage Count ({editItem?.ingredients?.unit || "units"})
              </Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                className="font-mono text-sm"
              />
              <div className="flex gap-1.5 mt-2">
                {[-10, -5, -1, 1, 5, 10, 50].map((delta) => (
                  <Button
                    key={delta}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px] font-mono"
                    onClick={() => {
                      const cur = parseFloat(editQty) || 0;
                      setEditQty(String(Math.max(0, cur + delta)));
                    }}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Safety Reorder Level ({editItem?.ingredients?.unit || "units"})
              </Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={editMin}
                onChange={(e) => setEditMin(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditItem(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="gap-1.5">
              {isSaving ? "Saving..." : "Save Count"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
