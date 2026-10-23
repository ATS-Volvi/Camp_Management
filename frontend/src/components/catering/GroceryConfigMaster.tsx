import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Trash2, Pencil, Check, X, Search, ShoppingBasket, Coffee, Sun, Moon, UtensilsCrossed, Sparkles, Users, ChevronDown, ChevronUp, Settings2, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useIngredients, useCampOccupancy, useUpsertIngredient } from "@/hooks/useCatering";
import {
  useMenuDishes, useUpsertMenuDish, useDeleteMenuDish,
  useDishIngredients, useUpsertDishIngredient, useDeleteDishIngredient,
} from "@/hooks/useMenuDishes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { findRecipe, RecipeIngredient } from "@/data/dishRecipes";
import { MASTER_INGREDIENTS } from "@/data/ingredientMaster";

const INGREDIENT_CATEGORIES = ["Rice & Grains", "Meat & Poultry", "Vegetables", "Dairy", "Beverages", "Spices", "Miscellaneous"];

const ALL_MEALS = ["Breakfast", "Lunch", "Dinner", "Suhoor", "Iftar"];
const mealIcons: Record<string, any> = { Breakfast: Coffee, Lunch: Sun, Dinner: Moon, Suhoor: Moon, Iftar: Sun };

interface GroceryConfigMasterProps {
  mealTypes: string[];
  campId?: string;
  camps?: any[];
}

export default function GroceryConfigMaster({ mealTypes, campId, camps = [] }: GroceryConfigMasterProps) {
  const { data: ingredients = [] } = useIngredients();
  const [activeMeal, setActiveMeal] = useState(mealTypes[0] || "Breakfast");
  const { data: dishes = [] } = useMenuDishes(activeMeal);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const { data: dishIngredients = [], refetch: refetchDishIngredients } = useDishIngredients(selectedDishId);

  // Use the selected camp for headcount — or allow picking one
  const [localCampId, setLocalCampId] = useState(campId || "");
  useEffect(() => { if (campId) setLocalCampId(campId); }, [campId]);

  const { data: occupancy, isLoading: occupancyLoading } = useCampOccupancy(localCampId || null);
  const [customHeadcount, setCustomHeadcount] = useState<number | null>(null);
  // Sync custom headcount when occupancy loads
  useEffect(() => { if (occupancy && customHeadcount === null) setCustomHeadcount(occupancy); }, [occupancy]);
  useEffect(() => { setCustomHeadcount(null); }, [localCampId]);
  const headcount = customHeadcount ?? occupancy ?? 0;

  const selectedCamp = camps.find((c: any) => c.id === localCampId);

  const upsertDish = useUpsertMenuDish();
  const deleteDish = useDeleteMenuDish();
  const upsertDishIng = useUpsertDishIngredient();
  const deleteDishIng = useDeleteDishIngredient();

  const [search, setSearch] = useState("");
  const [showAddDish, setShowAddDish] = useState(false);
  const [dishForm, setDishForm] = useState({ name: "", description: "" });

  const [showAddIng, setShowAddIng] = useState(false);
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQty, setNewQty] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);

  // AI auto-fill state
  const [aiLoading, setAiLoading] = useState(false);

  // Ingredient Master panel state
  const [showIngMaster, setShowIngMaster] = useState(false);
  const [showAddIngForm, setShowAddIngForm] = useState(false);
  const upsertIngredient = useUpsertIngredient();
  const { refetch: refetchIngredients } = useIngredients();
  const [ingForm, setIngForm] = useState({ name: "", unit: "kg", category: "Miscellaneous", unit_cost: 0, reorder_level: 5 });
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [autoPopulateProgress, setAutoPopulateProgress] = useState<string | null>(null);

  const handleAddIngredientLocal = () => {
    if (!ingForm.name) return;
    upsertIngredient.mutate(ingForm, {
      onSuccess: () => { setShowAddIngForm(false); setIngForm({ name: "", unit: "kg", category: "Miscellaneous", unit_cost: 0, reorder_level: 5 }); }
    });
  };

  const handleAutoPopulateLocal = async () => {
    setAutoPopulating(true);
    setAutoPopulateProgress("Starting...");
    try {
      const existingNames = new Set((ingredients || []).map((i: any) => i.name.toLowerCase().trim()));
      const toAdd = MASTER_INGREDIENTS.filter(m => !existingNames.has(m.name.toLowerCase().trim()));
      if (toAdd.length === 0) {
        toast({ title: "Already up to date", description: "All master ingredients are already in your list." });
        return;
      }
      let added = 0;
      for (const ing of toAdd) {
        setAutoPopulateProgress(`Adding ${added + 1}/${toAdd.length}: ${ing.name}`);
        await upsertIngredient.mutateAsync(ing);
        added++;
      }
      await refetchIngredients();
      toast({ title: "Ingredient Master populated!", description: `Added ${added} new ingredients.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAutoPopulating(false);
      setAutoPopulateProgress(null);
    }
  };

  const filteredDishes = useMemo(() => {
    if (!search) return dishes || [];
    return (dishes || []).filter((d: any) => d.name.toLowerCase().includes(search.toLowerCase()));
  }, [dishes, search]);

  const existingIngIds = new Set((dishIngredients || []).map((di: any) => di.ingredient_id));
  const availableIngredients = (ingredients || []).filter(
    (i: any) => i.is_active && !existingIngIds.has(i.id)
  );

  const totalCostPerPerson = (dishIngredients || []).reduce(
    (sum: number, di: any) => sum + (di.qty_per_person * (di.ingredients?.unit_cost || 0)), 0
  );
  const ingredientCount = (dishIngredients || []).length;
  const selectedDish = (dishes || []).find((d: any) => d.id === selectedDishId);

  // Auto-fill via AI when a dish is selected and has no ingredients
  const autoFillWithAI = useCallback(async (dishId: string, dishName: string, hc: number, clearExisting = false) => {
    if (hc <= 0) {
      toast({ title: "No headcount", description: "Please select a camp with occupants first.", variant: "destructive" });
      return;
    }

    if (clearExisting) {
      const confirm = window.confirm("Are you sure you want to clear current ingredients and re-generate? This will remove any manual changes.");
      if (!confirm) return;
    }

    setAiLoading(true);
    try {
      if (clearExisting) {
        // Delete existing ingredients for this dish first
        const { error: delError } = await supabase
          .from("menu_dish_ingredients")
          .delete()
          .eq("dish_id", dishId);
        if (delError) throw delError;
        await refetchDishIngredients();
      }

      // PHASE 1: Try local recipe book first
      const localRecipe = findRecipe(dishName);
      const ingMap = new Map((ingredients || []).map((i: any) => [i.name.toLowerCase().trim(), i]));
      let added = 0;

      if (localRecipe && localRecipe.length > 0) {
        console.log(`Found local recipe for "${dishName}":`, localRecipe);

        for (const lr of localRecipe) {
          const name = lr.name.toLowerCase().trim();
          let match = ingMap.get(name);

          // Fuzzy match fallback for local recipes
          if (!match) {
            for (const [key, val] of ingMap) {
              if (key.includes(name) || name.includes(key)) { match = val; break; }
            }
          }

          if (match) {
            const { data: existing } = await supabase
              .from("menu_dish_ingredients")
              .select("id")
              .eq("dish_id", dishId)
              .eq("ingredient_id", match.id)
              .maybeSingle();

            if (!existing) {
              await upsertDishIng.mutateAsync({
                dish_id: dishId,
                ingredient_id: match.id,
                qty_per_person: lr.qty_per_person || 0,
              });
              added++;
            }
          }
        }

        if (added > 0) {
          toast({ title: "Recipe applied", description: `Added ${added} ingredients for "${dishName}" from local recipe book.` });
          setAiLoading(false);
          await refetchDishIngredients();
          return;
        }
      }

      // PHASE 2: Fallback to AI
      const { data, error } = await supabase.functions.invoke("ai-dish-ingredients", {
        body: {
          dishName,
          headcount: hc,
          availableIngredients: (ingredients || []).map(i => ({ id: i.id, name: i.name, unit: i.unit }))
        },
      });

      if (error) throw error;
      if (!data?.ingredients?.length) {
        toast({ title: "AI returned no ingredients", description: "Please add ingredients manually.", variant: "destructive" });
        return;
      }

      added = 0;
      for (const ai of data.ingredients) {
        const name = (ai.ingredient || "").toLowerCase().trim();
        const aiIngId = ai.ingredientId;

        let match = aiIngId ? (ingredients || []).find(i => i.id === aiIngId) : null;
        if (!match) match = ingMap.get(name);
        if (!match) {
          // Better fuzzy matching using split words
          const words = name.split(/\s+/).filter(w => w.length > 3);
          for (const [key, val] of ingMap) {
            if (key.includes(name) || name.includes(key) || words.some(w => key.includes(w))) {
              match = val;
              break;
            }
          }
        }

        if (match) {
          const { data: existing } = await supabase
            .from("menu_dish_ingredients")
            .select("id")
            .eq("dish_id", dishId)
            .eq("ingredient_id", match.id)
            .maybeSingle();

          if (!existing) {
            await upsertDishIng.mutateAsync({
              dish_id: dishId,
              ingredient_id: match.id,
              qty_per_person: ai.qtyPerPerson || 0,
            });
            added++;
          }
        } else {
          console.warn(`Could not find match for AI ingredient: ${name}`);
        }
      }

      if (added > 0) {
        toast({ title: "AI Auto-filled", description: `Added ${added} ingredients for "${dishName}" using AI.` });
        await refetchDishIngredients();
      } else {
        toast({ title: "Ingredients already configured or no match", description: "AI suggested items but they already exist or don't match the ingredient master." });
      }
    } catch (e: any) {
      console.error("Auto-fill error detail:", e);
      const errorMsg = e.message || (typeof e === 'string' ? e : JSON.stringify(e));
      toast({
        title: "Auto-generate failed",
        description: `Error: ${errorMsg.substring(0, 100)}. check console for details.`,
        variant: "destructive"
      });
    } finally {
      setAiLoading(false);
    }
  }, [ingredients, upsertDishIng, refetchDishIngredients]);

  // Trigger AI auto-fill when dish is selected and has no ingredients
  useEffect(() => {
    if (selectedDishId && selectedDish && dishIngredients !== undefined) {
      if (dishIngredients.length === 0 && ingredients.length > 0 && !aiLoading && headcount > 0) {
        autoFillWithAI(selectedDishId, selectedDish.name, headcount);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDishId, dishIngredients?.length, ingredients.length, headcount]);

  const handleAddDish = () => {
    if (!dishForm.name.trim()) return;
    upsertDish.mutate(
      { name: dishForm.name, meal_type: activeMeal, description: dishForm.description },
      { onSuccess: () => { setShowAddDish(false); setDishForm({ name: "", description: "" }); } }
    );
  };

  const handleAddIngredient = () => {
    if (!newIngredientId || !newQty || !selectedDishId) return;
    upsertDishIng.mutate(
      { dish_id: selectedDishId, ingredient_id: newIngredientId, qty_per_person: newQty },
      { onSuccess: () => { setShowAddIng(false); setNewIngredientId(""); setNewQty(0); } }
    );
  };

  const handleSaveEdit = (id: string) => {
    if (!editQty) return;
    upsertDishIng.mutate({ id, qty_per_person: editQty }, { onSuccess: () => setEditId(null) });
  };

  const handleMealChange = (meal: string) => {
    setActiveMeal(meal);
    setSelectedDishId(null);
    setSearch("");
  };

  const renderSkeletonRows = () => (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Preparing ingredients for {headcount} people...
          </p>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBasket size={20} className="text-primary" />
              Grocery Configuration — AI-Powered
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Select a camp → meal type → dish. Ingredients auto-populate via AI based on actual camp headcount.
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Camp Selector + Meal Type */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Camp selector */}
            <div className="min-w-[260px]">
              <Label className="text-xs text-muted-foreground mb-2 block">Select Camp</Label>
              <select
                value={localCampId}
                onChange={e => { setLocalCampId(e.target.value); setSelectedDishId(null); }}
                className="w-full border rounded-lg px-3 py-2.5 text-sm bg-card focus:ring-2 focus:ring-ring outline-none"
              >
                <option value="">— Choose a camp —</option>
                {camps.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.location}</option>)}
              </select>
            </div>

            {/* Camp occupancy (read-only) */}
            {localCampId && (
              <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-lg border border-border">
                <Users size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Camp Occupancy</p>
                  <p className="text-lg font-bold text-foreground">
                    {occupancyLoading ? "..." : (occupancy ?? 0)}
                  </p>
                </div>
              </div>
            )}

            {/* Custom headcount (editable) */}
            {localCampId && (
              <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 rounded-lg border border-primary/20">
                <Users size={18} className="text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Headcount (editable)</p>
                  <Input
                    type="number"
                    min={1}
                    value={headcount || ""}
                    onChange={e => setCustomHeadcount(Math.max(1, +e.target.value))}
                    className="w-24 h-8 text-lg font-bold text-primary bg-transparent border-0 p-0 focus-visible:ring-0"
                  />
                </div>
              </div>
            )}

            {/* Meal type pills */}
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-2 block">Meal Type</Label>
              <div className="flex gap-1.5 flex-wrap">
                {ALL_MEALS.map(m => {
                  const Icon = mealIcons[m] || Sun;
                  const isRamadan = m === "Suhoor" || m === "Iftar";
                  return (
                    <button
                      key={m}
                      onClick={() => handleMealChange(m)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${activeMeal === m
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                        }`}
                    >
                      <Icon size={14} />
                      {m}
                      {isRamadan && <span className="text-[10px]">🌙</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No camp selected warning */}
      {!localCampId && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-8 text-center">
            <Users size={36} className="mx-auto text-amber-600 mb-2" />
            <p className="text-sm font-medium text-foreground">Please select a camp</p>
            <p className="text-xs text-muted-foreground mt-1">
              Camp headcount is required for accurate ingredient calculations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Two-panel layout (only when camp is selected) */}
      {localCampId && (
        <div className="grid grid-cols-12 gap-4">
          {/* Left: Dish List */}
          <div className="col-span-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search dishes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Button size="sm" onClick={() => setShowAddDish(true)}>
                <Plus size={14} className="mr-1" /> Add Dish
              </Button>
            </div>

            <Card className="max-h-[500px] overflow-y-auto">
              <CardContent className="p-0">
                {filteredDishes.length === 0 ? (
                  <div className="py-8 text-center">
                    <UtensilsCrossed size={30} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No dishes for {activeMeal}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredDishes.map((dish: any) => (
                      <button
                        key={dish.id}
                        onClick={() => setSelectedDishId(dish.id)}
                        className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${selectedDishId === dish.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
                          }`}
                      >
                        <p className="font-medium text-sm text-foreground">{dish.name}</p>
                        {dish.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{dish.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground text-center">{filteredDishes.length} dishes in {activeMeal}</p>
          </div>

          {/* Right: Dish Ingredients */}
          <div className="col-span-8 space-y-4">
            {!selectedDishId ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <UtensilsCrossed size={40} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Select a dish from the left to configure its ingredients</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Dish Header + KPIs */}
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <UtensilsCrossed size={18} className="text-primary" />
                          {selectedDish?.name}
                          {aiLoading && <Sparkles size={14} className="text-primary animate-pulse" />}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedDish?.description} · {selectedCamp?.name || ""}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="text-center px-4 py-2 bg-muted rounded-lg">
                          <p className="text-xl font-bold text-foreground">{ingredientCount}</p>
                          <p className="text-[10px] text-muted-foreground">Ingredients</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-primary/10 rounded-lg">
                          <p className="text-xl font-bold text-primary">SAR {totalCostPerPerson.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">Cost / Person</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-accent rounded-lg">
                          <p className="text-xl font-bold text-foreground">{headcount}</p>
                          <p className="text-[10px] text-muted-foreground">Headcount</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action buttons */}
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">{ingredientCount} ingredients configured</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectedDish && autoFillWithAI(selectedDishId!, selectedDish.name, headcount, true)}
                      disabled={aiLoading || headcount <= 0}
                    >
                      <Sparkles size={14} className="mr-1" /> Fresh Re-generate
                    </Button>
                    <Button size="sm" onClick={() => setShowAddIng(true)}>
                      <Plus size={14} className="mr-1" /> Add Ingredient
                    </Button>
                  </div>
                </div>

                {/* Add Ingredient Form */}
                {showAddIng && (
                  <Card className="border-primary/30">
                    <CardContent className="pt-4 pb-4">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-5">
                          <Label className="text-xs">Ingredient</Label>
                          <Select value={newIngredientId} onValueChange={setNewIngredientId}>
                            <SelectTrigger><SelectValue placeholder="Select ingredient..." /></SelectTrigger>
                            <SelectContent>
                              {availableIngredients.map((i: any) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.name} ({i.unit}) — {i.category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs">Qty per Person ({
                            ingredients.find((i: any) => i.id === newIngredientId)?.unit || "unit"
                          })</Label>
                          <Input type="number" step="0.001" min={0} value={newQty || ""} onChange={e => setNewQty(+e.target.value)} placeholder="e.g. 0.150" />
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Est. Cost/Person</p>
                          <p className="text-sm font-semibold text-foreground px-3 py-2 bg-muted rounded-md">
                            SAR {(newQty * Number(ingredients.find((i: any) => i.id === newIngredientId)?.unit_cost || 0)).toFixed(3)}
                          </p>
                        </div>
                        <div className="col-span-2 flex gap-2">
                          <Button size="sm" onClick={handleAddIngredient} disabled={upsertDishIng.isPending}>
                            <Check size={14} className="mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setShowAddIng(false); setNewIngredientId(""); setNewQty(0); }}>
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Loading Skeleton */}
                {aiLoading && renderSkeletonRows()}

                {/* Ingredients Table */}
                {!aiLoading && ingredientCount === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <ShoppingBasket size={36} className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">No ingredients mapped to <strong>{selectedDish?.name}</strong> yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">Click "Re-generate with AI" or "Add Ingredient" to start.</p>
                    </CardContent>
                  </Card>
                ) : !aiLoading && ingredientCount > 0 ? (
                  <Card>
                    <CardContent className="pt-0 pb-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ingredient</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Qty / Person</TableHead>
                            <TableHead className="text-right">Total Qty ({headcount})</TableHead>
                            <TableHead className="text-right">Unit Cost (SAR)</TableHead>
                            <TableHead className="text-right">Cost / Person</TableHead>
                            <TableHead className="text-right w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(dishIngredients || []).map((di: any) => {
                            const isEditing = editId === di.id;
                            const qtyPP = Number(isEditing ? editQty : di.qty_per_person) || 0;
                            const unitCost = Number(di.ingredients?.unit_cost || 0);
                            const costPerPerson = qtyPP * unitCost;
                            const totalQty = qtyPP * (Number(headcount) || 0);
                            return (
                              <TableRow key={di.id}>
                                <TableCell className="font-medium">{di.ingredients?.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">{di.ingredients?.category}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{di.ingredients?.unit}</TableCell>
                                <TableCell className="text-right">
                                  {isEditing ? (
                                    <Input type="number" step="0.001" min={0} value={editQty} onChange={e => setEditQty(+e.target.value)} className="w-24 ml-auto text-right h-8" autoFocus />
                                  ) : (
                                    <span className="font-mono">{di.qty_per_person}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-mono text-primary">{totalQty.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{unitCost.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-semibold">{costPerPerson.toFixed(3)}</TableCell>
                                <TableCell className="text-right">
                                  {isEditing ? (
                                    <div className="flex gap-1 justify-end">
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(di.id)}>
                                        <Check size={14} className="text-primary" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}>
                                        <X size={14} />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1 justify-end">
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditId(di.id); setEditQty(di.qty_per_person); }}>
                                        <Pencil size={14} />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteDishIng.mutate(di.id)}>
                                        <Trash2 size={14} />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Summary */}
                {!aiLoading && ingredientCount > 0 && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {selectedDish?.name}: {ingredientCount} ingredients × {headcount} people ({selectedCamp?.name})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Totals auto-calculated from actual camp occupancy. Edit any row and save.
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">SAR {(totalCostPerPerson * headcount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">total cost ({totalCostPerPerson.toFixed(2)}/person)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Dish Dialog */}
      <Dialog open={showAddDish} onOpenChange={setShowAddDish}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New {activeMeal} Dish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Dish Name</Label>
              <Input value={dishForm.name} onChange={e => setDishForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Chicken Biryani" />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Input value={dishForm.description} onChange={e => setDishForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDish(false)}>Cancel</Button>
            <Button onClick={handleAddDish} disabled={upsertDish.isPending}>Add Dish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Ingredient Master (collapsible) ── */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowIngMaster(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-sm font-semibold"
        >
          <span className="flex items-center gap-2"><Settings2 size={14} className="text-primary" /> Ingredient Master ({(ingredients || []).length} items)</span>
          {showIngMaster ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showIngMaster && (
          <div className="p-4 space-y-4">
            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleAutoPopulateLocal}
                disabled={autoPopulating}
                className="text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Wand2 size={12} />
                {autoPopulating ? "Populating..." : `Auto-Populate (${MASTER_INGREDIENTS.length} standard items)`}
              </button>
              <button
                onClick={() => setShowAddIngForm(p => !p)}
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <Plus size={12} /> Add Ingredient
              </button>
            </div>

            {autoPopulateProgress && (
              <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                <Wand2 size={12} className="text-amber-600 animate-pulse" />
                <span className="text-xs text-amber-700">{autoPopulateProgress}</span>
              </div>
            )}

            {showAddIngForm && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <input value={ingForm.name} onChange={e => setIngForm(p => ({ ...p, name: e.target.value }))} placeholder="Ingredient name" className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={ingForm.unit} onChange={e => setIngForm(p => ({ ...p, unit: e.target.value }))} className="border rounded px-2 py-1.5 text-sm bg-card">
                    {["kg", "litres", "pieces", "grams", "ml"].map(u => <option key={u}>{u}</option>)}
                  </select>
                  <select value={ingForm.category} onChange={e => setIngForm(p => ({ ...p, category: e.target.value }))} className="border rounded px-2 py-1.5 text-sm bg-card">
                    {INGREDIENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={ingForm.unit_cost} onChange={e => setIngForm(p => ({ ...p, unit_cost: +e.target.value }))} placeholder="Unit cost (SAR)" className="border rounded px-2 py-1.5 text-sm bg-card" />
                  <input type="number" value={ingForm.reorder_level} onChange={e => setIngForm(p => ({ ...p, reorder_level: +e.target.value }))} placeholder="Reorder level" className="border rounded px-2 py-1.5 text-sm bg-card" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddIngredientLocal} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded">Save</button>
                  <button onClick={() => setShowAddIngForm(false)} className="text-xs px-3 py-1.5 rounded border">Cancel</button>
                </div>
              </div>
            )}

            {/* Ingredient list */}
            <div className="max-h-64 overflow-y-auto divide-y border rounded-lg">
              {(ingredients || []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No ingredients yet. Click Auto-Populate to get started.</p>
              ) : (
                (ingredients || []).map((ing: any) => (
                  <div key={ing.id} className="px-3 py-2 flex items-center justify-between text-sm hover:bg-muted/30">
                    <div>
                      <p className="font-medium">{ing.name}</p>
                      <p className="text-xs text-muted-foreground">{ing.category} · {ing.unit} · SAR {ing.unit_cost}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ing.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>{ing.is_active ? "Active" : "Inactive"}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
