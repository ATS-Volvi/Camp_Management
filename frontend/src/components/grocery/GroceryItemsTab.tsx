import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, AlertTriangle, ArrowUpDown, Package, Pencil, Check, X, Utensils, ChefHat, Sparkles } from "lucide-react";
import { useGroceryItems, useIngredientCategories, useCateringStockSummary, useAddPriceEntry } from "@/hooks/useGroceryInventory";
import { useUpsertIngredient } from "@/hooks/useCatering";
import { useCamps } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DISH_RECIPES } from "@/data/dishRecipes";
import { format } from "date-fns";

const formatDateSafe = (dateVal?: any) => {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
  } catch {
    return "—";
  }
};

// Smart matcher to check if an inventory item belongs to a dish recipe ingredient
function matchesDishIngredient(itemName?: string | null, recipeIngredientName?: string | null): boolean {
  if (!itemName || !recipeIngredientName) return false;
  const normItem = itemName.toLowerCase().trim();
  const normRecipe = recipeIngredientName.toLowerCase().trim();

  // 1. Direct inclusion
  if (normItem.includes(normRecipe) || normRecipe.includes(normItem)) return true;

  // 2. Token overlap (e.g. "Pita" in "Arabic Bread (Pita)" and "Pita Bread")
  const recipeTokens = normRecipe.split(/\s+/).filter(t => t.length > 2);
  const itemTokens = normItem.split(/[\s(),/]+/).filter(t => t.length > 2);

  const hasOverlap = recipeTokens.some(rt =>
    itemTokens.some(it => it.includes(rt) || rt.includes(it))
  );
  if (hasOverlap) return true;

  // 3. Synonym mapping
  const synonyms: Record<string, string[]> = {
    oil: ["sunflower", "olive", "canola", "vegetable", "ghee", "butter", "cooking oil"],
    chicken: ["poultry", "breast", "drumstick", "thigh", "whole chicken"],
    bread: ["pita", "roti", "parota", "naan", "chapati", "khubz", "arabic bread"],
    rice: ["basmati", "biryani", "grain", "sella", "white rice"],
    egg: ["eggs", "omelette"],
    potato: ["potatoes", "aloo"],
    onion: ["onions", "fresh onion"],
    tomato: ["tomatoes", "puree", "paste"],
    dal: ["lentil", "lentils", "chana", "moong", "toor", "urad"],
    spice: ["masala", "curry powder", "turmeric", "chilli", "cumin", "coriander", "assorted spices"],
    cheese: ["cheddar", "mozzarella", "slice cheese"],
    mutton: ["lamb", "meat"],
    chickpea: ["chickpeas", "hummus"],
  };

  for (const [key, syns] of Object.entries(synonyms)) {
    if (normRecipe.includes(key) && syns.some(s => normItem.includes(s))) return true;
    if (normItem.includes(key) && syns.some(s => normRecipe.includes(s))) return true;
  }

  return false;
}

export default function GroceryItemsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [selectedDish, setSelectedDish] = useState<string>("");
  const [campId, setCampId] = useState<string>("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", unit: "kg", category: "Miscellaneous", unit_cost: 0, reorder_level: 5 });

  // Quantity editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQtyValue, setEditQtyValue] = useState<string>("");
  const [isSavingQty, setIsSavingQty] = useState(false);

  const { data: items = [], isLoading } = useGroceryItems(search || undefined, category || undefined);
  const { data: categories = [] } = useIngredientCategories();
  const { data: camps = [] } = useCamps();
  const { data: stock = [] } = useCateringStockSummary(campId || undefined);
  const upsertIngredient = useUpsertIngredient();
  const addPrice = useAddPriceEntry();

  // Default to first camp so stock is visible immediately
  useEffect(() => {
    if (!campId && camps.length > 0) setCampId(camps[0].id);
  }, [camps, campId]);

  // Build stock map
  const stockMap: Record<string, any> = {};
  stock.forEach((s: any) => {
    stockMap[s.ingredient_id] = s;
  });

  // Extract all available dish names from DISH_RECIPES
  const dishOptions = useMemo(() => {
    return Object.keys(DISH_RECIPES)
      .map(key => ({
        id: key,
        name: key.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Get recipe ingredients for selected dish
  const selectedDishIngredients = useMemo(() => {
    if (!selectedDish) return [];
    return DISH_RECIPES[selectedDish.toLowerCase()] || [];
  }, [selectedDish]);

  // Filter items by dish recipe if selected
  const dishFilteredItems = useMemo(() => {
    if (!selectedDish || selectedDishIngredients.length === 0) return items;
    return items.filter(item =>
      selectedDishIngredients.some(ri => matchesDishIngredient(item.name, ri.name))
    );
  }, [items, selectedDish, selectedDishIngredients]);

  // Sort items
  const sorted = [...dishFilteredItems].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "name") return (a.name || "").localeCompare(b.name || "") * dir;
    if (sortField === "unit_cost") return ((Number(a.unit_cost) || 0) - (Number(b.unit_cost) || 0)) * dir;
    if (sortField === "category") return (a.category || "").localeCompare(b.category || "") * dir;
    return 0;
  });

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const lowStockCount = sorted.filter(item => {
    const s = stockMap[item.id];
    if (!s) return false;
    const bal = (s.opening_stock || 0) + (s.stock_in || 0) - (s.stock_out || 0);
    return bal <= (s.min_level || item.reorder_level);
  }).length;

  const handleAddItem = async () => {
    if (!newItem.name) return;
    await upsertIngredient.mutateAsync(newItem);
    setNewItem({ name: "", unit: "kg", category: "Miscellaneous", unit_cost: 0, reorder_level: 5 });
    setAddOpen(false);
  };

  // Start editing quantity
  const startEdit = (item: any, currentBal: number) => {
    if (!campId) {
      toast({
        title: "Camp required",
        description: "Please select a specific camp to adjust its stock quantity.",
        variant: "destructive",
      });
      return;
    }
    setEditingItemId(item.id);
    setEditQtyValue(String(currentBal));
  };

  // Save updated quantity
  const handleSaveQty = async (item: any) => {
    const newQty = parseFloat(editQtyValue);
    if (isNaN(newQty) || newQty < 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid non-negative number.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingQty(true);
    try {
      const s = stockMap[item.id];
      const now = new Date().toISOString();

      if (s && s.id) {
        // Update existing stock row (omit 'balance' since it is a GENERATED ALWAYS column)
        const { error } = await supabase
          .from("catering_stock")
          .update({
            opening_stock: newQty,
            stock_in: 0,
            stock_out: 0,
            updated_at: now,
          })
          .eq("id", s.id);
        if (error) throw error;
      } else {
        // Insert new stock row for this camp & ingredient (omit 'balance')
        const { error } = await supabase.from("catering_stock").insert({
          camp_id: campId,
          ingredient_id: item.id,
          opening_stock: newQty,
          stock_in: 0,
          stock_out: 0,
          min_level: item.reorder_level || 5,
          updated_at: now,
        });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["catering-stock-summary"] });
      toast({
        title: "Stock Quantity Updated",
        description: `${item.name} available quantity set to ${newQty.toFixed(1)} ${item.unit}.`,
      });
      setEditingItemId(null);
    } catch (err: any) {
      toast({
        title: "Error updating quantity",
        description: err.message || "Failed to update stock in database",
        variant: "destructive",
      });
    } finally {
      setIsSavingQty(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Ingredients</p>
                <p className="text-2xl font-bold">{sorted.length}</p>
                {selectedDish && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Filtered by dish
                  </p>
                )}
              </div>
              <Package className="text-primary" size={28} />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <ArrowUpDown className="text-blue-500" size={28} />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-destructive">{lowStockCount}</p>
              </div>
              <AlertTriangle className="text-destructive" size={28} />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Unit Rate</p>
                <p className="text-2xl font-bold">
                  {sorted.length ? (sorted.reduce((s, i) => s + (Number(i.unit_cost) || 0), 0) / sorted.length).toFixed(2) : "0"}
                </p>
              </div>
              <span className="text-lg font-bold text-green-600">SAR</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search Input */}
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs font-semibold">Search Ingredients</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <Input
                  placeholder="Search by ingredient name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {/* Filter by Dish Dropdown */}
            <div className="w-full sm:w-[220px]">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Utensils className="h-3.5 w-3.5 text-[#fe932c]" />
                Filter by Dish Recipe
              </Label>
              <Select value={selectedDish} onValueChange={v => setSelectedDish(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9 text-xs mt-1 border-border/80">
                  <SelectValue placeholder="All Dishes (Show All)" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all" className="text-xs font-bold">
                    All Dishes (Show All Ingredients)
                  </SelectItem>
                  {dishOptions.map(dish => (
                    <SelectItem key={dish.id} value={dish.id} className="text-xs">
                      {dish.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="w-[170px]">
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={category} onValueChange={v => setCategory(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Camp Selector */}
            <div className="w-[180px]">
              <Label className="text-xs font-semibold">Camp Location</Label>
              <Select value={campId} onValueChange={v => setCampId(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Select Camp" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Camps</SelectItem>
                  {camps.map((c: any) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Add Item Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 font-semibold"><Plus size={15} className="mr-1" /> Add Ingredient</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Grocery Ingredient</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Item Name *</Label><Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Unit (UOM)</Label><Input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} /></div>
                    <div><Label>Category</Label><Input value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Unit Cost (SAR)</Label><Input type="number" value={newItem.unit_cost} onChange={e => setNewItem({ ...newItem, unit_cost: +e.target.value })} /></div>
                    <div><Label>Reorder Level</Label><Input type="number" value={newItem.reorder_level} onChange={e => setNewItem({ ...newItem, reorder_level: +e.target.value })} /></div>
                  </div>
                  <Button onClick={handleAddItem} disabled={upsertIngredient.isPending} className="w-full mt-2">Save Item</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Active Dish Filter Banner */}
          {selectedDish && (
            <div className="mt-3 flex items-center justify-between px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 text-xs">
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-[#fe932c]" />
                <span>
                  Filtering ingredients required for:{" "}
                  <strong className="font-bold capitalize text-foreground">
                    {dishOptions.find(d => d.id === selectedDish)?.name || selectedDish}
                  </strong>{" "}
                  <span className="text-muted-foreground ml-1">
                    ({sorted.length} matching ingredient{sorted.length !== 1 ? "s" : ""} in pantry database)
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDish("")}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                  Item Name {sortField === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("category")}>
                  Category {sortField === "category" && (sortDir === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="font-bold text-foreground">
                  Available Qty
                  <span className="block text-[10px] text-muted-foreground font-normal">Click value to edit</span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("unit_cost")}>
                  Rate (SAR) {sortField === "unit_cost" && (sortDir === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading ingredients...</TableCell></TableRow>
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {selectedDish
                      ? `No ingredients found in pantry matching recipe "${selectedDish}".`
                      : "No ingredients found."}
                  </TableCell>
                </TableRow>
              ) : sorted.map(item => {
                const s = stockMap[item.id];
                const bal = s ? (s.opening_stock || 0) + (s.stock_in || 0) - (s.stock_out || 0) : 0;
                const isLow = s ? bal <= (s.min_level || item.reorder_level) : false;
                const isEditing = editingItemId === item.id;

                // Match with dish ingredient if dish filter is active
                const matchedRecipeIngredient = selectedDishIngredients.find(ri =>
                  matchesDishIngredient(item.name, ri.name)
                );

                return (
                  <TableRow key={item.id} className={`group ${isLow ? "bg-destructive/5" : ""}`}>
                    {/* Item Name */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{item.name}</span>
                        {matchedRecipeIngredient && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono"
                          >
                            {matchedRecipeIngredient.qty_per_person} {matchedRecipeIngredient.unit}/pax
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    </TableCell>

                    {/* UOM */}
                    <TableCell className="text-xs font-mono">{item.unit}</TableCell>

                    {/* Available Qty (EDITABLE) */}
                    <TableCell className="relative">
                      {isEditing ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Input
                            type="number"
                            step="any"
                            value={editQtyValue}
                            onChange={e => setEditQtyValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleSaveQty(item);
                              if (e.key === "Escape") setEditingItemId(null);
                            }}
                            className="w-24 h-7 text-xs font-mono font-bold px-1.5 py-0.5 border-primary focus:ring-1 focus:ring-primary bg-background"
                            autoFocus
                            disabled={isSavingQty}
                          />
                          <button
                            onClick={() => handleSaveQty(item)}
                            disabled={isSavingQty}
                            className="h-7 w-7 rounded bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                            title="Save quantity"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => setEditingItemId(null)}
                            disabled={isSavingQty}
                            className="h-7 w-7 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                            title="Cancel"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => campId && startEdit(item, bal)}
                            className={`cursor-pointer hover:underline font-mono text-sm ${
                              isLow ? "text-destructive font-semibold" : "font-medium text-foreground"
                            }`}
                            title={campId ? "Click to edit quantity" : "Select a camp to edit quantity"}
                          >
                            {campId ? Number(bal).toFixed(1) : "—"}
                          </span>
                          {campId && (
                            <button
                              onClick={() => startEdit(item, bal)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-opacity"
                              title="Edit quantity"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Rate SAR */}
                    <TableCell className="font-mono">{Number(item.unit_cost || 0).toFixed(2)}</TableCell>

                    {/* Reorder Level */}
                    <TableCell className="font-mono text-xs">{item.reorder_level}</TableCell>

                    {/* Status */}
                    <TableCell>
                      {campId ? (
                        isLow ? (
                          <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                        ) : (
                          <Badge className="bg-green-600 text-xs">OK</Badge>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">Select camp</span>
                      )}
                    </TableCell>

                    {/* Last Updated */}
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {formatDateSafe(item.updated_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
