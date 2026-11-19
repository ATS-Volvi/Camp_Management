import { useState, useMemo } from "react";
import {
  UtensilsCrossed, Package, ClipboardList, BarChart3, Settings2,
  Plus, Trash2, Check, X, ChevronRight, AlertTriangle, Download,
  Coffee, Sun, Moon, Users, Calculator, FileText, Truck, Sparkles, Recycle, ShoppingBasket, Wand2
} from "lucide-react";
import { MASTER_INGREDIENTS } from "@/data/ingredientMaster";
import GroceryConfigMaster from "@/components/catering/GroceryConfigMaster";
import WeeklyMenuConfig from "@/components/catering/WeeklyMenuConfig";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  useIngredients, useUpsertIngredient,
  useMealMenuTemplates, useUpsertMenuTemplate, useDeleteMenuTemplate,
  useDailyMealPlan, useUpsertDailyMealPlan,
  useGroceryRequests, useCreateGroceryRequest, useUpdateRequestStatus, useGroceryRequestItems,
  useCateringStock,
  useCateringGRNs, useCreateGRN,
  useCateringIssues, useCreateIssue,
  useCampOccupancy, useCateringCostSummary,
  useFoodWastage, useCreateWastage,
} from "@/hooks/useCatering";
import { useCreateCookRequest } from "@/hooks/useCookRequests";
import { useQuery } from "@tanstack/react-query";
import { findRecipe } from "@/data/dishRecipes";

type Tab = "dashboard" | "grocery-config" | "weekly-menu" | "menu" | "daily-plan" | "requests" | "inventory" | "costs" | "wastage";

const STANDARD_MEALS: string[] = ["Breakfast", "Lunch", "Dinner"];
const RAMADAN_MEALS: string[] = ["Suhoor", "Iftar"];
const INGREDIENT_CATEGORIES = ["Rice & Grains", "Meat & Poultry", "Vegetables", "Dairy", "Beverages", "Spices", "Miscellaneous"];

const mealIcons: Record<string, any> = {
  Breakfast: Coffee, Lunch: Sun, Dinner: Moon,
  Suhoor: Moon, Iftar: Sun,
  default: UtensilsCrossed
};

export const formatDateSafe = (dateVal: any, fmt: string = "dd MMM yyyy") => {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
};

export default function MessCatering() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedCampId, setSelectedCampId] = useState("");
  const [ramadanMode, setRamadanMode] = useState(false);

  const activeMealTypes = ramadanMode ? RAMADAN_MEALS : STANDARD_MEALS;

  const { data: camps = [] } = useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "grocery-config", label: "Grocery Config", icon: ShoppingBasket },
    { key: "weekly-menu", label: "Weekly Menu", icon: UtensilsCrossed },
    { key: "daily-plan", label: "Daily Plan", icon: Calculator },
    { key: "requests", label: "Requests", icon: ClipboardList },
    { key: "wastage", label: "Wastage", icon: Recycle },
    { key: "costs", label: "Cost Reports", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">Home / Mess & Catering</div>
        <h1 className="text-2xl font-bold text-foreground mt-1 flex items-center gap-2">
          <UtensilsCrossed className="text-primary" size={24} /> Mess & Catering Management
        </h1>
      </div>

      {/* Camp Selector + Ramadan Toggle */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium text-foreground">Camp:</label>
        <select
          value={selectedCampId}
          onChange={e => setSelectedCampId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-card focus:ring-2 focus:ring-ring outline-none min-w-[250px]"
        >
          <option value="">All Camps</option>
          {camps.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.location}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setRamadanMode(!ramadanMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${ramadanMode
              ? "bg-amber-500/15 text-amber-700 border border-amber-500/30"
              : "bg-muted text-muted-foreground border border-transparent"
              }`}
          >
            <Sparkles size={14} />
            {ramadanMode ? "🌙 Ramadan Mode ON" : "Ramadan Mode"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            data-tab={t.key}
            onClick={() => setTab(t.key)}
            className={`tab-btn flex items-center gap-2 text-sm ${tab === t.key ? "tab-btn-active" : "tab-btn-inactive"}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <CateringDashboard campId={selectedCampId || undefined} camps={camps} />}
      {tab === "grocery-config" && <GroceryConfigMaster mealTypes={activeMealTypes} campId={selectedCampId} camps={camps} />}
      {tab === "weekly-menu" && <WeeklyMenuConfig campId={selectedCampId} camps={camps} mealTypes={activeMealTypes} />}
      {tab === "daily-plan" && <DailyPlan campId={selectedCampId} camps={camps} mealTypes={activeMealTypes} />}
      {tab === "requests" && <GroceryRequestsTab campId={selectedCampId} camps={camps} mealTypes={activeMealTypes} />}
      {/* Inventory tab merged into the Grocery Inventory page (left sidebar → Grocery Inventory) */}
      {tab === "wastage" && <WastageTab campId={selectedCampId} camps={camps} mealTypes={activeMealTypes} />}
      {tab === "costs" && <CostReports campId={selectedCampId} camps={camps} />}
    </div>
  );
}

// ==========================================
// DASHBOARD TAB
// ==========================================
function CateringDashboard({ campId, camps }: { campId?: string; camps: any[] }) {
  const { data: stock = [] } = useCateringStock(campId);
  const { data: issues = [] } = useCateringCostSummary(campId);
  const { data: requests = [] } = useGroceryRequests(campId);
  const { data: occupancy } = useCampOccupancy(campId || null);

  const totalCost = (issues || []).reduce((sum: number, i: any) => sum + (Number(i.total_cost) || 0), 0);
  const lowStockItems = (stock || []).filter((s: any) => s.balance !== null && Number(s.balance) <= Number(s.min_level));
  const pendingRequests = (requests || []).filter((r: any) => r.status === "submitted").length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/30">
          <p className="text-xs font-medium text-muted-foreground">Current Occupancy</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{occupancy ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Active inmates</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/30">
          <p className="text-xs font-medium text-muted-foreground">Total Food Cost (Recent)</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">SAR {totalCost.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">From issue slips</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-violet-500/15 to-violet-600/5 border border-violet-500/30">
          <p className="text-xs font-medium text-muted-foreground">Cost per Person/Day</p>
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">
            {occupancy && occupancy > 0 ? `SAR ${(totalCost / occupancy).toFixed(2)}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Avg food expense</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/30">
          <p className="text-xs font-medium text-muted-foreground">Pending Requests</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{pendingRequests}</p>
          <p className="text-xs text-muted-foreground">Awaiting approval</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="stat-card border-destructive/30">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive mb-3">
            <AlertTriangle size={16} /> Low Stock Alerts ({lowStockItems.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {lowStockItems.map((s: any) => (
              <div key={s.id} className="px-3 py-2 bg-destructive/5 rounded-lg text-sm">
                <p className="font-medium">{s.ingredients?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Balance: <span className="text-destructive font-bold">{s.balance}</span> {s.ingredients?.unit} (Min: {s.min_level})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Issues */}
      <div className="stat-card">
        <h3 className="text-sm font-semibold mb-3">Recent Issue Slips</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Camp</th>
              <th className="pb-2 font-medium">Meal</th>
              <th className="pb-2 font-medium">Cook</th>
              <th className="pb-2 font-medium text-right">Cost</th>
            </tr></thead>
            <tbody>
              {(issues || []).slice(0, 10).map((i: any) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="py-2">{formatDateSafe(i.issue_date)}</td>
                  <td>{i.camps?.name || "—"}</td>
                  <td>{i.meal_type}</td>
                  <td>{i.cook_name || "—"}</td>
                  <td className="text-right font-medium">SAR {(Number(i.total_cost) || 0).toFixed(2)}</td>
                </tr>
              ))}
              {(!issues || issues.length === 0) && (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No issue slips yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MENU SETUP TAB
// ==========================================
function MenuSetup({ mealTypes }: { mealTypes: string[] }) {
  const { data: ingredients = [], refetch: refetchIngredients } = useIngredients();
  const { data: templates = [] } = useMealMenuTemplates();
  const upsertIngredient = useUpsertIngredient();
  const upsertTemplate = useUpsertMenuTemplate();
  const deleteTemplate = useDeleteMenuTemplate();

  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [ingForm, setIngForm] = useState({ name: "", unit: "kg", category: "Miscellaneous", unit_cost: 0, reorder_level: 5 });
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [tplForm, setTplForm] = useState({ meal_type: "Breakfast", ingredient_id: "", qty_per_person: 0 });
  const [activeMeal, setActiveMeal] = useState<string>("Breakfast");
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [autoPopulateProgress, setAutoPopulateProgress] = useState<string | null>(null);

  const handleAddIngredient = () => {
    if (!ingForm.name) return;
    upsertIngredient.mutate(ingForm, { onSuccess: () => { setShowAddIngredient(false); setIngForm({ name: "", unit: "kg", category: "Miscellaneous", unit_cost: 0, reorder_level: 5 }); } });
  };

  const handleAddTemplate = () => {
    if (!tplForm.ingredient_id || !tplForm.qty_per_person) return;
    upsertTemplate.mutate(tplForm, { onSuccess: () => { setShowAddTemplate(false); setTplForm({ meal_type: "Breakfast", ingredient_id: "", qty_per_person: 0 }); } });
  };

  const handleAutoPopulate = async () => {
    setAutoPopulating(true);
    setAutoPopulateProgress("Starting...");
    try {
      // Build a set of existing names to skip duplicates
      const existingNames = new Set(
        (ingredients || []).map((i: any) => i.name.toLowerCase().trim())
      );
      const toAdd = MASTER_INGREDIENTS.filter(
        m => !existingNames.has(m.name.toLowerCase().trim())
      );

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
      toast({ title: "Ingredient Master populated!", description: `Added ${added} ingredients. ${existingNames.size} already existed.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAutoPopulating(false);
      setAutoPopulateProgress(null);
    }
  };

  const mealTemplates = (templates || []).filter((t: any) => t.meal_type === activeMeal);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Ingredient Master */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Ingredient Master ({(ingredients || []).length})</h3>
          <div className="flex gap-2">
            <button
              onClick={handleAutoPopulate}
              disabled={autoPopulating}
              title={`Auto-populate from ${MASTER_INGREDIENTS.length} standard ingredients`}
              className="text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Wand2 size={12} />
              {autoPopulating ? "Populating..." : "Auto-Populate"}
            </button>
            <button onClick={() => setShowAddIngredient(!showAddIngredient)} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Plus size={12} /> Add Ingredient
            </button>
          </div>
        </div>
        {autoPopulateProgress && (
          <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
            <Wand2 size={12} className="text-amber-600 animate-pulse" />
            <span className="text-xs text-amber-700">{autoPopulateProgress}</span>
          </div>
        )}
        {(ingredients || []).length === 0 && !autoPopulating && (
          <div className="mb-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg text-center">
            <Wand2 size={24} className="mx-auto text-blue-400 mb-2" />
            <p className="text-sm font-medium text-foreground">No ingredients yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click <strong>Auto-Populate</strong> to add {MASTER_INGREDIENTS.length} standard ingredients instantly.
            </p>
          </div>
        )}

        {showAddIngredient && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2">
            <input value={ingForm.name} onChange={e => setIngForm(p => ({ ...p, name: e.target.value }))} placeholder="Ingredient name" className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
            <div className="grid grid-cols-2 gap-2">
              <select value={ingForm.unit} onChange={e => setIngForm(p => ({ ...p, unit: e.target.value }))} className="border rounded px-2 py-1.5 text-sm bg-card">
                {["kg", "liters", "pieces", "grams", "ml"].map(u => <option key={u}>{u}</option>)}
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
              <button onClick={handleAddIngredient} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded">Save</button>
              <button onClick={() => setShowAddIngredient(false)} className="text-xs px-3 py-1.5 rounded border">Cancel</button>
            </div>
          </div>
        )}

        <div className="max-h-[400px] overflow-y-auto divide-y">
          {(ingredients || []).map((ing: any) => (
            <div key={ing.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{ing.name}</p>
                <p className="text-xs text-muted-foreground">{ing.category} · {ing.unit} · SAR {ing.unit_cost}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ing.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {ing.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Meal Templates */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Meal Menu Templates</h3>
          <button onClick={() => setShowAddTemplate(!showAddTemplate)} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus size={12} /> Add Item
          </button>
        </div>

        {/* Meal type tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
          {[...STANDARD_MEALS, ...RAMADAN_MEALS].map(m => {
            const Icon = mealIcons[m];
            return (
              <button key={m} onClick={() => setActiveMeal(m)}
                className={`tab-btn flex items-center gap-1.5 text-xs ${activeMeal === m ? "tab-btn-active" : "tab-btn-inactive"}`}>
                <Icon size={12} /> {m}
              </button>
            );
          })}
        </div>

        {showAddTemplate && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2">
            <select value={tplForm.meal_type} onChange={e => setTplForm(p => ({ ...p, meal_type: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm bg-card">
              {[...STANDARD_MEALS, ...RAMADAN_MEALS].map(m => <option key={m}>{m}</option>)}
            </select>
            <select value={tplForm.ingredient_id} onChange={e => setTplForm(p => ({ ...p, ingredient_id: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm bg-card">
              <option value="">Select ingredient...</option>
              {(ingredients || []).filter((i: any) => i.is_active).map((i: any) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
            <input type="number" step="0.001" value={tplForm.qty_per_person} onChange={e => setTplForm(p => ({ ...p, qty_per_person: +e.target.value }))} placeholder="Qty per person (in base unit)" className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
            <div className="flex gap-2">
              <button onClick={handleAddTemplate} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded">Save</button>
              <button onClick={() => setShowAddTemplate(false)} className="text-xs px-3 py-1.5 rounded border">Cancel</button>
            </div>
          </div>
        )}

        <div className="divide-y">
          {mealTemplates.map((t: any) => (
            <div key={t.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{t.ingredients?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.qty_per_person} {t.ingredients?.unit} per person · SAR {t.ingredients?.unit_cost}/{t.ingredients?.unit}
                </p>
              </div>
              <button onClick={() => deleteTemplate.mutate(t.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {mealTemplates.length === 0 && <p className="py-4 text-sm text-muted-foreground text-center">No items for {activeMeal}</p>}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DAILY PLAN TAB (Dish-based)
// ==========================================
function DailyPlan({ campId, camps, mealTypes }: { campId: string; camps: any[]; mealTypes: string[] }) {
  const currentMeals = useMemo(() => (mealTypes && mealTypes.length > 0) ? mealTypes : STANDARD_MEALS, [mealTypes]);
  const [planDate, setPlanDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [planCamp, setPlanCamp] = useState(campId || "");
  const { data: occupancy } = useCampOccupancy(planCamp || null);
  const { data: plan } = useDailyMealPlan(planCamp || null, planDate);
  const upsertPlan = useUpsertDailyMealPlan();
  const createCookRequest = useCreateCookRequest();

  const { data: visitorCount = 0 } = useQuery({
    queryKey: ["visitor-count", planCamp],
    enabled: !!planCamp,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true })
        .eq("camp_id", planCamp)
        .eq("status", "checked_in");
      if (error) throw error;
      return count || 0;
    },
  });

  // Get day of week from selected date
  const dayOfWeek = useMemo(() => new Date(planDate).getDay(), [planDate]);

  // Fetch weekly menu for this camp + day of week
  const { data: dayMenu = [] } = useQuery({
    queryKey: ["weekly-menu-day", planCamp, dayOfWeek],
    enabled: !!planCamp,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_menu_config" as any)
        .select("*, menu_dishes(id, name, description, meal_type)")
        .eq("camp_id", planCamp)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .order("meal_type")
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  // Get unique dish IDs from today's menu
  const dishIds = useMemo(() => {
    const ids = new Set<string>();
    (dayMenu || []).forEach((m: any) => {
      if (m.menu_dish_id) ids.add(m.menu_dish_id);
    });
    return Array.from(ids);
  }, [dayMenu]);

  // Fetch all dish ingredients for today's dishes
  const { data: allDishIngredients = [] } = useQuery({
    queryKey: ["dish-ingredients-bulk", dishIds],
    enabled: dishIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_dish_ingredients")
        .select("*, ingredients(name, unit, unit_cost, category)")
        .in("dish_id", dishIds);
      if (error) throw error;
      return data;
    },
  });

  const [guestCounts, setGuestCounts] = useState<Record<string, number>>({});
  const [skipCounts, setSkipCounts] = useState<Record<string, number>>({});
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  const baseOccupancy = occupancy || 0;

  const mealCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentMeals.forEach(m => {
      counts[m] = Math.max(0, baseOccupancy + (guestCounts[m] || 0) - (skipCounts[m] || 0));
    });
    return counts;
  }, [baseOccupancy, guestCounts, skipCounts, currentMeals]);

  // Load saved plan
  useMemo(() => {
    if (plan) {
      const g: Record<string, number> = {};
      const s: Record<string, number> = {};
      const planMap: Record<string, string> = { Breakfast: "breakfast_count", Lunch: "lunch_count", Dinner: "dinner_count", Suhoor: "breakfast_count", Iftar: "lunch_count" };
      currentMeals.forEach(m => {
        const savedCount = (plan as any)[planMap[m]] || 0;
        const diff = savedCount - baseOccupancy;
        if (diff >= 0) { g[m] = diff; s[m] = 0; }
        else { g[m] = 0; s[m] = Math.abs(diff); }
      });
      setGuestCounts(g);
      setSkipCounts(s);
      setAdjustNotes(plan.adjustment_notes || "");
    } else {
      setGuestCounts({});
      setSkipCounts({});
      setAdjustNotes("");
    }
  }, [plan, baseOccupancy, currentMeals]);

  // Group menu by meal type with dish info
  const menuByMeal = useMemo(() => {
    const map: Record<string, { dishName: string; dishId: string }[]> = {};
    currentMeals.forEach(m => { map[m] = []; });
    (dayMenu || []).forEach((item: any) => {
      if (map[item.meal_type]) {
        map[item.meal_type].push({
          dishName: item.menu_dishes?.name || item.dish_name || "Unknown",
          dishId: item.menu_dish_id || "",
        });
      }
    });
    return map;
  }, [dayMenu, currentMeals]);

  // Fetch ingredient master to resolve ids/costs for fallback recipes
  const { data: ingredientMaster = [] } = useIngredients();

  // Calculate grocery requirements from dish ingredients
  const groceryReqs = useMemo(() => {
    const result: { meal: string; dish: string; ingredient: string; ingredientId: string; unit: string; qtyPerPerson: number; headCount: number; totalQty: number; cost: number; category: string; unitCost: number }[] = [];
    const ingByName: Record<string, any> = {};
    (ingredientMaster as any[]).forEach((i: any) => { ingByName[(i.name || "").toLowerCase().trim()] = i; });

    currentMeals.forEach(meal => {
      const dishes = menuByMeal[meal] || [];
      const headCount = mealCounts[meal] || 0;
      dishes.forEach(d => {
        const dishIngs = (allDishIngredients || []).filter((di: any) => di.dish_id === d.dishId);
        if (dishIngs.length > 0) {
          dishIngs.forEach((di: any) => {
            const totalQty = di.qty_per_person * headCount;
            result.push({
              meal,
              dish: d.dishName,
              ingredient: di.ingredients?.name || "?",
              ingredientId: di.ingredient_id,
              unit: di.ingredients?.unit || "",
              qtyPerPerson: di.qty_per_person,
              headCount,
              totalQty,
              cost: totalQty * (di.ingredients?.unit_cost || 0),
              category: di.ingredients?.category || "",
              unitCost: di.ingredients?.unit_cost || 0,
            });
          });
        } else {
          // Fallback: lookup hardcoded recipe by dish name
          const recipe = findRecipe(d.dishName);
          if (recipe) {
            recipe.forEach(ri => {
              const masterIng = ingByName[ri.name.toLowerCase().trim()];
              const unitCost = masterIng?.unit_cost || 0;
              const totalQty = ri.qty_per_person * headCount;
              result.push({
                meal,
                dish: d.dishName,
                ingredient: ri.name,
                ingredientId: masterIng?.id || `recipe:${ri.name}`,
                unit: ri.unit,
                qtyPerPerson: ri.qty_per_person,
                headCount,
                totalQty,
                cost: totalQty * unitCost,
                category: masterIng?.category || "",
                unitCost,
              });
            });
          }
        }
      });
    });
    return result;
  }, [allDishIngredients, menuByMeal, mealCounts, currentMeals, ingredientMaster]);

  const totalDailyCost = groceryReqs.reduce((s, r) => s + r.cost, 0);
  const totalHeads = Object.values(mealCounts).reduce((a, b) => a + b, 0);

  const aggregatedIngredients = useMemo(() => {
    const map: Record<string, { ingredient: string; ingredientId: string; unit: string; totalQty: number; cost: number; category: string; unitCost: number }> = {};
    groceryReqs.forEach(r => {
      if (!map[r.ingredientId]) map[r.ingredientId] = { ingredient: r.ingredient, ingredientId: r.ingredientId, unit: r.unit, totalQty: 0, cost: 0, category: r.category, unitCost: r.unitCost };
      map[r.ingredientId].totalQty += r.totalQty;
      map[r.ingredientId].cost += r.cost;
    });
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [groceryReqs]);

  const handleSavePlan = async () => {
    if (!planCamp) { toast({ title: "Select a camp", variant: "destructive" }); return; }
    const { data: { user } } = await supabase.auth.getUser();
    upsertPlan.mutate({
      camp_id: planCamp,
      plan_date: planDate,
      total_occupants: baseOccupancy,
      breakfast_count: mealCounts["Breakfast"] || mealCounts["Suhoor"] || 0,
      lunch_count: mealCounts["Lunch"] || mealCounts["Iftar"] || 0,
      dinner_count: mealCounts["Dinner"] || 0,
      adjustment_notes: adjustNotes || null,
      created_by: user?.id,
    });
  };

  // Create Cook Request with all meal items (same format as Cook Requests page)
  const handleCreateCookRequest = async () => {
    if (!planCamp || groceryReqs.length === 0) {
      toast({ title: "No grocery items to request", description: "Configure dishes and their ingredients first", variant: "destructive" });
      return;
    }
    setIsCreatingRequest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Per-ingredient + per-meal items so the Cook Request view can group by meal_type
      const itemMap: Record<string, { ingredient_id: string; meal_type: string; qty_per_person: number; required_qty: number; unit_cost: number }> = {};
      groceryReqs.forEach(r => {
        const key = `${r.ingredientId}|${r.meal}`;
        if (!itemMap[key]) {
          itemMap[key] = {
            ingredient_id: r.ingredientId,
            meal_type: r.meal,
            qty_per_person: 0,
            required_qty: 0,
            unit_cost: r.unitCost,
          };
        }
        itemMap[key].qty_per_person += r.qtyPerPerson;
        itemMap[key].required_qty += r.totalQty;
      });
      const items = Object.values(itemMap);

      const bf = mealCounts["Breakfast"] || mealCounts["Suhoor"] || 0;
      const lu = mealCounts["Lunch"] || mealCounts["Iftar"] || 0;
      const di = mealCounts["Dinner"] || 0;

      await createCookRequest.mutateAsync({
        request: {
          camp_id: planCamp,
          request_date: planDate,
          meal_type: "daily",
          head_count: Math.max(bf, lu, di),
          bf_head_count: bf,
          lunch_head_count: lu,
          dinner_head_count: di,
          status: "pending",
          requested_by: user?.id,
          notes: `Daily plan for ${format(new Date(planDate), "dd MMM yyyy")} — ${currentMeals.map(m => `${m}: ${mealCounts[m]} pax`).join(", ")}`,
        },
        items,
      });

      toast({ title: "Cook request created!", description: `${items.length} items — view in Cook Requests` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsCreatingRequest(false);
    }
  };

  // PDF Download
  const handleDownloadPDF = async () => {
    if (groceryReqs.length === 0) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const campData = camps.find((c: any) => c.id === planCamp);
    const dateStr = format(new Date(planDate), "dd MMM yyyy");
    const dayName = format(new Date(planDate), "EEEE");

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Camp-365 — Daily Cook Request", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Camp: ${campData?.name || "—"} | Location: ${campData?.location || "—"}`, 14, 28);
    doc.text(`Date: ${dateStr} (${dayName}) | Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 34);

    // Meal summary
    let y = 42;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Meal Summary", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    mealTypes.forEach(m => {
      const dishes = menuByMeal[m] || [];
      const dishNames = dishes.map(d => d.dishName).join(", ") || "No dishes configured";
      doc.text(`${m}: ${mealCounts[m]} pax — ${dishNames}`, 14, y);
      y += 5;
    });
    doc.text(`Total Servings: ${totalHeads} | Estimated Cost: SAR ${totalDailyCost.toFixed(2)}`, 14, y + 2);
    y += 10;

    // Per-meal breakdown
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Meal-wise Grocery Requirement", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Meal", "Dish", "Ingredient", "Per Person", "Head Count", "Total Req", "Cost (SAR)"]],
      body: groceryReqs.map(r => [
        r.meal,
        r.dish,
        r.ingredient,
        `${r.qtyPerPerson} ${r.unit}`,
        String(r.headCount),
        `${r.totalQty.toFixed(2)} ${r.unit}`,
        r.cost.toFixed(2),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Consolidated list
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Consolidated Grocery List", 14, finalY);

    autoTable(doc, {
      startY: finalY + 2,
      head: [["Ingredient", "Category", "Total Qty", "Cost (SAR)"]],
      body: aggregatedIngredients.map(a => [
        a.ingredient,
        a.category,
        `${a.totalQty.toFixed(2)} ${a.unit}`,
        a.cost.toFixed(2),
      ]),
      foot: [["", "", "Grand Total", `SAR ${totalDailyCost.toFixed(2)}`]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [39, 174, 96] },
      footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    doc.save(`Cook-Request-${campData?.name || "Camp"}-${planDate}.pdf`);
    toast({ title: "PDF downloaded" });
  };

  return (
    <div className="space-y-6">
      <div className="stat-card">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Calculator size={16} className="text-primary" /> Daily Meal Plan</h3>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Camp</label>
            <select value={planCamp} onChange={e => setPlanCamp(e.target.value)} className="w-full border rounded px-2 py-2 text-sm bg-card">
              <option value="">Select camp...</option>
              {camps.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
            <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="w-full border rounded px-2 py-2 text-sm bg-card" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Base Occupancy</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
              <Users size={14} className="text-primary" />
              <span className="text-sm font-bold">{baseOccupancy}</span>
              <span className="text-xs text-muted-foreground">inmates</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleSavePlan} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm">
              Save Plan
            </button>
          </div>
        </div>

        {/* Today's Menu */}
        {planCamp && (
          <div className="mb-4 p-4 bg-muted/30 rounded-xl border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              📋 Today's Menu — {format(new Date(planDate), "EEEE")}
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${currentMeals.length}, 1fr)` }}>
              {currentMeals.map(m => {
                const Icon = mealIcons[m] || Sun;
                const dishes = menuByMeal[m] || [];
                return (
                  <div key={m} className="p-3 bg-card rounded-lg border">
                    <p className="text-xs font-semibold flex items-center gap-1 mb-1"><Icon size={12} className="text-primary" /> {m}</p>
                    {dishes.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">No dishes configured</p>
                    ) : (
                      dishes.map((d, i) => (
                        <p key={i} className="text-sm font-medium text-foreground">{d.dishName}</p>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-meal head counts */}
        <div className="space-y-3 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Head Counts</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${currentMeals.length}, 1fr)` }}>
            {currentMeals.map(m => {
              const Icon = mealIcons[m] || Sun;
              const total = mealCounts[m] || 0;
              return (
                <div key={m} className="p-4 bg-muted/50 rounded-xl border space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold flex items-center gap-1.5">
                      <Icon size={14} className="text-primary" /> {m}
                    </label>
                    <span className="text-lg font-bold text-primary">{baseOccupancy}{visitorCount > 0 ? <span className="text-emerald-500">+{visitorCount}</span> : ""}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">+ Guests</label>
                      <input type="number" min={0} value={guestCounts[m] || 0}
                        onChange={e => setGuestCounts(p => ({ ...p, [m]: Math.max(0, +e.target.value) }))}
                        className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">− Absent/Skip</label>
                      <input type="number" min={0} value={skipCounts[m] || 0}
                        onChange={e => setSkipCounts(p => ({ ...p, [m]: Math.max(0, +e.target.value) }))}
                        className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {baseOccupancy} base {(guestCounts[m] || 0) > 0 ? `+ ${guestCounts[m]} guests` : ""} {(skipCounts[m] || 0) > 0 ? `− ${skipCounts[m]} absent` : ""} = <span className="font-bold text-foreground">{total}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Adjustment Notes</label>
          <input value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} placeholder="e.g., +20 guests for lunch, VIP dinner event" className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {currentMeals.map((m, idx) => {
          const mealCost = groceryReqs.filter(r => r.meal === m).reduce((s, r) => s + r.cost, 0);
          const Icon = mealIcons[m] || Sun;
          const kpiColors = ["from-blue-500/15 to-blue-600/5 border-blue-500/30", "from-amber-500/15 to-amber-600/5 border-amber-500/30", "from-purple-500/15 to-purple-600/5 border-purple-500/30"];
          const iconColors = ["text-blue-500", "text-amber-500", "text-purple-500"];
          const textColors = ["text-blue-600", "text-amber-600", "text-purple-600"];
          return (
            <div key={m} className={`stat-card bg-gradient-to-br ${kpiColors[idx % 3]} border`}>
              <div className="flex items-center gap-2 mb-1"><Icon size={14} className={iconColors[idx % 3]} /><span className="text-xs font-medium text-muted-foreground">{m}</span></div>
              <p className={`text-xl font-bold ${textColors[idx % 3]}`}>
                {mealCounts[m]} <span className="text-sm font-normal text-muted-foreground">pax</span>
              </p>
              <p className="text-xs text-muted-foreground">SAR {mealCost.toFixed(2)}</p>
            </div>
          );
        })}
        <div className="stat-card bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/30">
          <p className="text-xs font-medium text-muted-foreground">Total Daily Cost</p>
          <p className="text-xl font-bold text-emerald-600">SAR {totalDailyCost.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{totalHeads} total servings</p>
        </div>
      </div>

      {/* Per-Meal Grocery Breakdown */}
      {groceryReqs.length > 0 && (
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><FileText size={16} className="text-primary" /> Meal-wise Grocery Requirement</h3>
            <span className="text-xs text-muted-foreground">Auto-calculated from today's menu × head count</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Meal</th>
                <th className="pb-2 font-medium">Dish</th>
                <th className="pb-2 font-medium">Ingredient</th>
                <th className="pb-2 font-medium text-right">Per Person</th>
                <th className="pb-2 font-medium text-right">Head Count</th>
                <th className="pb-2 font-medium text-right">Total Required</th>
                <th className="pb-2 font-medium text-right">Cost (SAR)</th>
              </tr></thead>
              <tbody>
                {groceryReqs.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{r.meal}</td>
                    <td className="text-xs text-muted-foreground">{r.dish}</td>
                    <td className="font-medium">{r.ingredient}</td>
                    <td className="text-right">{r.qtyPerPerson} {r.unit}</td>
                    <td className="text-right">{r.headCount}</td>
                    <td className="text-right font-bold">{r.totalQty.toFixed(2)} {r.unit}</td>
                    <td className="text-right">{r.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aggregated + Action Buttons */}
      {aggregatedIngredients.length > 0 && (
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package size={16} className="text-primary" /> Consolidated Grocery List (All Meals)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleCreateCookRequest}
                disabled={isCreatingRequest}
                className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <ClipboardList size={14} /> {isCreatingRequest ? "Creating..." : "Create Cook Request"}
              </button>
              <button
                onClick={handleDownloadPDF}
                className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Ingredient</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Total Qty</th>
                <th className="pb-2 font-medium text-right">Est. Cost (SAR)</th>
              </tr></thead>
              <tbody>
                {aggregatedIngredients.map((a, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-medium">{a.ingredient}</td>
                    <td className="text-muted-foreground">{a.category}</td>
                    <td className="text-right font-bold">{a.totalQty.toFixed(2)} {a.unit}</td>
                    <td className="text-right">{a.cost.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 font-bold">
                  <td className="py-2" colSpan={3}>Grand Total</td>
                  <td className="text-right text-primary">SAR {totalDailyCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {groceryReqs.length === 0 && planCamp && (
        <div className="stat-card text-center py-8">
          <UtensilsCrossed size={36} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">No grocery items calculated.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Make sure dishes are configured in <strong>Weekly Menu</strong> for {format(new Date(planDate), "EEEE")} and ingredients are mapped in <strong>Grocery Config</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// GROCERY REQUESTS TAB
// ==========================================
function GroceryRequestsTab({ campId, camps, mealTypes }: { campId: string; camps: any[]; mealTypes: string[] }) {
  const { data: requests = [] } = useGroceryRequests(campId || undefined);
  const { data: templates = [] } = useMealMenuTemplates();
  const { data: ingredients = [] } = useIngredients();
  const createRequest = useCreateGroceryRequest();
  const updateStatus = useUpdateRequestStatus();
  const [showCreate, setShowCreate] = useState(false);
  const [reqCamp, setReqCamp] = useState(campId || "");
  const [reqMeal, setReqMeal] = useState(mealTypes[0] || "Breakfast");
  const [reqDate, setReqDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reqNotes, setReqNotes] = useState("");
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const { data: reqItems = [] } = useGroceryRequestItems(selectedReqId);
  const { data: occupancy } = useCampOccupancy(reqCamp || null);

  const selectedRequest = useMemo(
    () => (requests || []).find((request: any) => request.id === selectedReqId) || null,
    [requests, selectedReqId]
  );

  // Derive day-of-week and camp from the selected request for menu lookup
  const popupDayOfWeek = useMemo(() => {
    if (!selectedRequest) return null;
    return new Date(selectedRequest.request_date).getDay();
  }, [selectedRequest]);

  const popupDayLabel = useMemo(() => {
    if (popupDayOfWeek === null) return "";
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[popupDayOfWeek] || "";
  }, [popupDayOfWeek]);

  const popupCampId = selectedRequest?.camp_id || "";

  // Fetch weekly menu for the request's day + camp
  const { data: popupDayMenu = [] } = useQuery({
    queryKey: ["popup-weekly-menu-day", popupCampId, popupDayOfWeek],
    enabled: !!popupCampId && popupDayOfWeek !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_menu_config" as any)
        .select("*, menu_dishes(id, name, description, meal_type)")
        .eq("camp_id", popupCampId)
        .eq("day_of_week", popupDayOfWeek)
        .eq("is_active", true)
        .order("meal_type")
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  // Get dish IDs from the popup menu
  const popupDishIds = useMemo(() => {
    const ids = new Set<string>();
    (popupDayMenu || []).forEach((m: any) => { if (m.menu_dish_id) ids.add(m.menu_dish_id); });
    return Array.from(ids);
  }, [popupDayMenu]);

  // Fetch ingredients for those dishes
  const { data: popupDishIngredients = [] } = useQuery({
    queryKey: ["popup-dish-ingredients", popupDishIds],
    enabled: popupDishIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_dish_ingredients")
        .select("*, ingredients(name, unit, unit_cost, category)")
        .in("dish_id", popupDishIds);
      if (error) throw error;
      return data;
    },
  });

  // Group menu by meal type
  const popupMenuByMeal = useMemo(() => {
    const map: Record<string, { dishName: string; dishId: string }[]> = {};
    ["Breakfast", "Lunch", "Dinner"].forEach(m => { map[m] = []; });
    (popupDayMenu || []).forEach((item: any) => {
      const meal = item.menu_dishes?.meal_type || item.meal_type || "Other";
      if (!map[meal]) map[meal] = [];
      map[meal].push({ dishName: item.menu_dishes?.name || "Unknown", dishId: item.menu_dish_id || "" });
    });
    return map;
  }, [popupDayMenu]);

  // Group ingredients by dish
  const popupIngsByDish = useMemo(() => {
    const map: Record<string, any[]> = {};
    (popupDishIngredients || []).forEach((di: any) => {
      if (!map[di.dish_id]) map[di.dish_id] = [];
      map[di.dish_id].push(di);
    });
    return map;
  }, [popupDishIngredients]);

  const relevantPopupDishIds = useMemo(() => {
    const ids = new Set<string>();
    const requestMealType = selectedRequest?.meal_type;

    (popupDayMenu || []).forEach((item: any) => {
      const mealType = item.menu_dishes?.meal_type || item.meal_type;
      const includeDish = !requestMealType || requestMealType === "All Meals" || mealType === requestMealType;

      if (includeDish && item.menu_dish_id) {
        ids.add(item.menu_dish_id);
      }
    });

    return ids;
  }, [popupDayMenu, selectedRequest?.meal_type]);

  const qtyPerPersonByIngredient = useMemo(() => {
    const map: Record<string, number> = {};

    (popupDishIngredients || []).forEach((di: any) => {
      if (!relevantPopupDishIds.has(di.dish_id)) return;
      map[di.ingredient_id] = (map[di.ingredient_id] || 0) + Number(di.qty_per_person || 0);
    });

    if (selectedRequest?.meal_type && selectedRequest.meal_type !== "All Meals") {
      (templates || []).forEach((template: any) => {
        if (template.meal_type !== selectedRequest.meal_type) return;
        if (map[template.ingredient_id] != null) return;
        map[template.ingredient_id] = Number(template.qty_per_person || 0);
      });
    }

    return map;
  }, [popupDishIngredients, relevantPopupDishIds, selectedRequest?.meal_type, templates]);

  const canPrintSelectedRequest = selectedRequest?.status === "approved" || selectedRequest?.status === "issued";

  const requestGrandTotal = useMemo(
    () =>
      (reqItems || []).reduce((sum: number, item: any) => {
        const qty = item.approved_qty ?? item.requested_qty ?? item.calculated_qty ?? 0;
        return sum + qty * (item.unit_cost || 0);
      }, 0),
    [reqItems]
  );

  const formatQty = (value: number | null | undefined) =>
    typeof value === "number" ? value.toFixed(2) : "—";

  const formatMoney = (value: number | null | undefined) => `SAR ${Number(value || 0).toFixed(2)}`;

  const handlePrintRequest = async () => {
    if (!selectedRequest || !reqItems) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const campData = camps.find((c: any) => c.id === selectedRequest.camp_id);
    const dateStr = format(new Date(selectedRequest.request_date), "dd MMM yyyy");
    const dayName = popupDayLabel || format(new Date(selectedRequest.request_date), "EEEE");

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Camp-365 — Approved Grocery Request", 14, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Camp: ${campData?.name || "—"}  |  Location: ${campData?.location || "—"}`, 14, 26);
    doc.text(`Date: ${dateStr} (${dayName})  |  Meal: ${selectedRequest.meal_type}  |  Status: ${selectedRequest.status}`, 14, 32);
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 38);

    // Menu of the Day
    let y = 46;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Menu of the Day — ${dayName}`, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    ["Breakfast", "Lunch", "Dinner"].forEach(meal => {
      const dishes = (popupMenuByMeal[meal] || []).map(d => d.dishName).join(", ") || "No dishes configured";
      doc.text(`${meal}: ${dishes}`, 14, y);
      y += 5;
    });
    y += 4;

    // Notes
    if (selectedRequest.notes) {
      doc.setFont("helvetica", "italic");
      doc.text(`Notes: ${selectedRequest.notes}`, 14, y);
      y += 8;
    }

    // Grocery table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Grocery List", 14, y);
    y += 4;

    const tableRows = (reqItems || []).map((item: any) => {
      const totalQty = item.approved_qty ?? item.requested_qty ?? item.calculated_qty ?? 0;
      const qtyPP = qtyPerPersonByIngredient[item.ingredient_id];
      return [
        item.ingredients?.name || "—",
        item.ingredients?.unit || "—",
        qtyPP != null ? qtyPP.toFixed(3) : "—",
        item.calculated_qty?.toFixed(2) || "—",
        item.requested_qty?.toFixed(2) || "—",
        item.approved_qty?.toFixed(2) || "—",
        `SAR ${Number(item.unit_cost || 0).toFixed(2)}`,
        `SAR ${(totalQty * Number(item.unit_cost || 0)).toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Item", "UOM", "Qty/Person", "Calculated", "Requested", "Approved", "Rate", "Total"]],
      body: tableRows,
      foot: [["", "", "", "", "", "", "Grand Total", formatMoney(requestGrandTotal)]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [236, 240, 241], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    doc.save(`Grocery_Request_${campData?.name || "camp"}_${dateStr.replace(/ /g, "_")}.pdf`);
    toast({ title: "PDF downloaded", description: `Grocery request for ${dateStr}` });
  };

  const handleCreate = async () => {
    if (!reqCamp) return;
    const { data: { user } } = await supabase.auth.getUser();
    const headCount = occupancy || 0;

    const mealTemplates = (templates || []).filter((t: any) => t.meal_type === reqMeal);
    const items = mealTemplates.map((t: any) => ({
      ingredient_id: t.ingredient_id,
      calculated_qty: t.qty_per_person * headCount,
      requested_qty: t.qty_per_person * headCount,
      unit_cost: t.ingredients?.unit_cost || 0,
    }));

    createRequest.mutate({
      request: { camp_id: reqCamp, request_date: reqDate, meal_type: reqMeal, status: "submitted", requested_by: user?.id, notes: reqNotes || null },
      items,
    }, { onSuccess: () => { setShowCreate(false); setReqNotes(""); } });
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    updateStatus.mutate({ id, status: newStatus, approved_by: newStatus === "approved" ? user?.id : undefined });
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-primary/10 text-primary",
    approved: "bg-emerald-500/10 text-emerald-600",
    issued: "bg-blue-500/10 text-blue-600",
    closed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Grocery Requests</h3>
          <button onClick={() => setShowCreate(!showCreate)} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus size={12} /> New Request
          </button>
        </div>

        {showCreate && (
          <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Camp</label>
                <select value={reqCamp} onChange={e => setReqCamp(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-card">
                  <option value="">Select...</option>
                  {camps.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Meal Type</label>
                <select value={reqMeal} onChange={e => setReqMeal(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-card">
                  {mealTypes.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Date</label>
                <input type="date" value={reqDate} onChange={e => setReqDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
              </div>
            </div>
            {reqCamp && <p className="text-xs text-muted-foreground">Occupancy: <strong>{occupancy ?? 0}</strong> — Items auto-calculated from meal templates</p>}
            <input value={reqNotes} onChange={e => setReqNotes(e.target.value)} placeholder="Notes (optional)" className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={createRequest.isPending} className="text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded">Submit Request</button>
              <button onClick={() => setShowCreate(false)} className="text-xs px-3 py-1.5 rounded border">Cancel</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Camp</th>
              <th className="pb-2 font-medium">Meal</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Notes</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr></thead>
            <tbody>
              {(requests || []).map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2">{format(new Date(r.request_date), "dd MMM yyyy")}</td>
                  <td>{r.camps?.name || "—"}</td>
                  <td>{r.meal_type}</td>
                  <td><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[r.status] || ""}`}>{r.status}</span></td>
                  <td className="text-xs text-muted-foreground">{r.notes || "—"}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedReqId(r.id)}
                      className="text-xs border border-border bg-background text-foreground px-2 py-1 rounded mr-1 inline-flex items-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3"
                        aria-hidden="true"
                      >
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View
                    </button>
                    {r.status === "submitted" && (
                      <button onClick={() => handleStatusChange(r.id, "approved")} className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded mr-1">
                        <Check size={12} className="inline" /> Approve
                      </button>
                    )}
                    {r.status === "approved" && (
                      <button onClick={() => handleStatusChange(r.id, "issued")} className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded">
                        <Truck size={12} className="inline" /> Issue
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!requests || requests.length === 0) && (
                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No requests yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" onClick={() => setSelectedReqId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="grocery-request-details-title"
            className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <h3 id="grocery-request-details-title" className="text-lg font-semibold text-foreground">Request details</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.camps?.name || "—"} • {format(new Date(selectedRequest.request_date), "dd MMM yyyy")} • {selectedRequest.meal_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReqId(null)}
                className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close request details"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[calc(85vh-145px)] overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Camp</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{selectedRequest.camps?.name || "—"}</p>
                </div>
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Meal</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{selectedRequest.meal_type}</p>
                </div>
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[selectedRequest.status] || ""}`}>{selectedRequest.status}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm text-foreground">{selectedRequest.notes || "No notes added."}</p>
              </div>

              {/* Menu of the Day */}
              <div className="rounded-xl border border-border bg-background overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h4 className="text-sm font-semibold text-foreground">🍽️ Menu of the Day — {popupDayLabel}</h4>
                  <p className="text-xs text-muted-foreground">Dishes and their ingredients for {format(new Date(selectedRequest.request_date), "dd MMM yyyy")}</p>
                </div>
                <div className="px-4 py-4 space-y-4">
                  {["Breakfast", "Lunch", "Dinner"].map(meal => {
                    const dishes = popupMenuByMeal[meal] || [];
                    if (dishes.length === 0) return (
                      <div key={meal}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{meal}</p>
                        <p className="text-xs text-muted-foreground italic">No dishes configured</p>
                      </div>
                    );
                    return (
                      <div key={meal}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{meal}</p>
                        <div className="space-y-3">
                          {dishes.map((d, idx) => {
                            const ings = popupIngsByDish[d.dishId] || [];
                            return (
                              <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3">
                                <p className="text-sm font-medium text-foreground mb-2">{d.dishName}</p>
                                {ings.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {ings.map((ing: any) => (
                                      <span key={ing.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-foreground">
                                        {ing.ingredients?.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">No ingredients mapped</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h4 className="text-sm font-semibold text-foreground">Grocery list</h4>
                  <p className="text-xs text-muted-foreground">Saved quantities and pricing for this request.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Item name</th>
                        <th className="px-4 py-3 font-medium">UOM</th>
                        <th className="px-4 py-3 font-medium text-right">Qty / person</th>
                        <th className="px-4 py-3 font-medium text-right">Calculated qty</th>
                        <th className="px-4 py-3 font-medium text-right">Requested qty</th>
                        <th className="px-4 py-3 font-medium text-right">Approved qty</th>
                        <th className="px-4 py-3 font-medium text-right">Rate / UOM</th>
                        <th className="px-4 py-3 font-medium text-right">Total price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reqItems || []).map((item: any) => {
                        const totalQty = item.approved_qty ?? item.requested_qty ?? item.calculated_qty ?? 0;
                        const lineTotal = totalQty * (item.unit_cost || 0);
                        // Find qty_per_person from dish ingredients data
                        const qtyPerPerson = qtyPerPersonByIngredient[item.ingredient_id];

                        return (
                          <tr key={item.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3 font-medium text-foreground">{item.ingredients?.name || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{item.ingredients?.unit || "—"}</td>
                            <td className="px-4 py-3 text-right text-foreground">{qtyPerPerson != null ? qtyPerPerson.toFixed(3) : "—"}</td>
                            <td className="px-4 py-3 text-right text-foreground">{formatQty(item.calculated_qty)}</td>
                            <td className="px-4 py-3 text-right text-foreground">{formatQty(item.requested_qty)}</td>
                            <td className="px-4 py-3 text-right text-foreground">{formatQty(item.approved_qty)}</td>
                            <td className="px-4 py-3 text-right text-foreground">{formatMoney(item.unit_cost)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground">{formatMoney(lineTotal)}</td>
                          </tr>
                        );
                      })}
                      {reqItems.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No request items found for this request.</td>
                        </tr>
                      )}
                    </tbody>
                    {reqItems.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-border bg-muted/30">
                          <td colSpan={7} className="px-4 py-3 text-right text-sm font-semibold text-foreground">Grand Total</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-foreground">{formatMoney(requestGrandTotal)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              {canPrintSelectedRequest && (
                <button
                  type="button"
                  onClick={() => handlePrintRequest()}
                  className="text-xs bg-accent text-accent-foreground px-3 py-2 rounded-lg inline-flex items-center gap-1"
                >
                  <Download size={12} /> Print / Download PDF
                </button>
              )}
              {selectedRequest.status === "submitted" && (
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "approved");
                    setSelectedReqId(null);
                  }}
                  className="text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg inline-flex items-center gap-1"
                >
                  <Check size={12} /> Approve
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedReqId(null)}
                className="text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// INVENTORY TAB
// ==========================================
function InventoryTab({ campId, camps }: { campId: string; camps: any[] }) {
  const { data: stock = [] } = useCateringStock(campId || undefined);
  const { data: grns = [] } = useCateringGRNs(campId || undefined);
  const { data: ingredients = [] } = useIngredients();
  const createGRN = useCreateGRN();

  const [showGRN, setShowGRN] = useState(false);
  const [grnCamp, setGrnCamp] = useState(campId || "");
  const [grnVendor, setGrnVendor] = useState("");
  const [grnDate, setGrnDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [grnNotes, setGrnNotes] = useState("");
  const [grnItems, setGrnItems] = useState<{ ingredient_id: string; quantity: number; unit_cost: number; expiry_date: string }[]>([]);

  const addGrnItem = () => setGrnItems(p => [...p, { ingredient_id: "", quantity: 0, unit_cost: 0, expiry_date: "" }]);
  const removeGrnItem = (i: number) => setGrnItems(p => p.filter((_, idx) => idx !== i));
  const updateGrnItem = (i: number, field: string, value: any) => setGrnItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleCreateGRN = async () => {
    if (!grnCamp || grnItems.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    const totalCost = grnItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
    const grnNumber = `GRN-${format(new Date(), "yyyyMMdd-HHmmss")}`;

    createGRN.mutate({
      grn: { camp_id: grnCamp, grn_number: grnNumber, vendor_name: grnVendor || null, grn_date: grnDate, total_cost: totalCost, notes: grnNotes || null, created_by: user?.id },
      items: grnItems.filter(i => i.ingredient_id && i.quantity > 0),
    }, {
      onSuccess: () => { setShowGRN(false); setGrnItems([]); setGrnVendor(""); setGrnNotes(""); },
    });
  };

  const lowStock = (stock || []).filter((s: any) => s.balance !== null && s.balance <= s.min_level);

  return (
    <div className="space-y-6">
      {/* Stock Ledger */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Catering Stock Ledger</h3>
          <button onClick={() => setShowGRN(!showGRN)} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus size={12} /> Record GRN
          </button>
        </div>

        {lowStock.length > 0 && (
          <div className="mb-4 px-3 py-2 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="text-xs text-destructive font-medium flex items-center gap-1"><AlertTriangle size={12} /> {lowStock.length} items below reorder level</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Ingredient</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Opening</th>
              <th className="pb-2 font-medium text-right">In</th>
              <th className="pb-2 font-medium text-right">Out</th>
              <th className="pb-2 font-medium text-right">Balance</th>
              <th className="pb-2 font-medium text-right">Min Level</th>
              <th className="pb-2 font-medium">Status</th>
            </tr></thead>
            <tbody>
              {(stock || []).map((s: any) => {
                const isLow = s.balance !== null && s.balance <= s.min_level;
                return (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{s.ingredients?.name}</td>
                    <td className="text-xs text-muted-foreground">{s.ingredients?.category}</td>
                    <td className="text-right">{s.opening_stock}</td>
                    <td className="text-right text-emerald-600">+{s.stock_in}</td>
                    <td className="text-right text-destructive">-{s.stock_out}</td>
                    <td className={`text-right font-bold ${isLow ? "text-destructive" : ""}`}>{s.balance} {s.ingredients?.unit}</td>
                    <td className="text-right">{s.min_level}</td>
                    <td>{isLow ? <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Low</span> : <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">OK</span>}</td>
                  </tr>
                );
              })}
              {(!stock || stock.length === 0) && (
                <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">No stock records. Record a GRN to start.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GRN Form */}
      {showGRN && (
        <div className="stat-card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Truck size={16} className="text-primary" /> New Goods Receipt Note (GRN)</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium block mb-1">Camp</label>
              <select value={grnCamp} onChange={e => setGrnCamp(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-card">
                <option value="">Select...</option>
                {camps.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Vendor</label>
              <input value={grnVendor} onChange={e => setGrnVendor(e.target.value)} placeholder="Vendor name" className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Date</label>
              <input type="date" value={grnDate} onChange={e => setGrnDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Items</label>
              <button onClick={addGrnItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> Add Item</button>
            </div>
            {grnItems.map((item, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-center">
                <select value={item.ingredient_id} onChange={e => updateGrnItem(i, "ingredient_id", e.target.value)} className="border rounded px-2 py-1.5 text-sm bg-card col-span-2">
                  <option value="">Select ingredient...</option>
                  {(ingredients || []).map((ing: any) => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                </select>
                <input type="number" value={item.quantity} onChange={e => updateGrnItem(i, "quantity", +e.target.value)} placeholder="Qty" className="border rounded px-2 py-1.5 text-sm bg-card" />
                <input type="number" step="0.01" value={item.unit_cost} onChange={e => updateGrnItem(i, "unit_cost", +e.target.value)} placeholder="Unit cost" className="border rounded px-2 py-1.5 text-sm bg-card" />
                <button onClick={() => removeGrnItem(i)} className="text-destructive p-1"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <input value={grnNotes} onChange={e => setGrnNotes(e.target.value)} placeholder="Notes (optional)" className="w-full border rounded px-2 py-1.5 text-sm bg-card mb-3" />
          <div className="flex gap-2">
            <button onClick={handleCreateGRN} disabled={createGRN.isPending} className="text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded">Save GRN</button>
            <button onClick={() => { setShowGRN(false); setGrnItems([]); }} className="text-xs px-3 py-1.5 rounded border">Cancel</button>
          </div>
        </div>
      )}

      {/* Recent GRNs */}
      <div className="stat-card">
        <h3 className="text-sm font-semibold mb-3">Recent GRNs</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">GRN #</th>
            <th className="pb-2 font-medium">Date</th>
            <th className="pb-2 font-medium">Camp</th>
            <th className="pb-2 font-medium">Vendor</th>
            <th className="pb-2 font-medium text-right">Total Cost</th>
          </tr></thead>
          <tbody>
            {(grns || []).map((g: any) => (
              <tr key={g.id} className="border-b last:border-0">
                <td className="py-2 font-mono text-xs">{g.grn_number}</td>
                <td>{format(new Date(g.grn_date), "dd MMM yyyy")}</td>
                <td>{g.camps?.name || "—"}</td>
                <td>{g.vendor_name || "—"}</td>
                <td className="text-right font-medium">SAR {Number(g.total_cost || 0).toFixed(2)}</td>
              </tr>
            ))}
            {(!grns || grns.length === 0) && (
              <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No GRNs recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// COST REPORTS TAB
// ==========================================
function CostReports({ campId, camps }: { campId: string; camps: any[] }) {
  const { data: issues = [] } = useCateringCostSummary(campId || undefined);
  const { data: occupancy } = useCampOccupancy(campId || null);

  const totalCost = (issues || []).reduce((s: number, i: any) => s + (Number(i.total_cost) || 0), 0);
  const issueCount = (issues || []).length;

  // Group by date
  const dailyCosts = useMemo(() => {
    const map = new Map<string, number>();
    (issues || []).forEach((i: any) => {
      const date = i.issue_date;
      map.set(date, (map.get(date) || 0) + (Number(i.total_cost) || 0));
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);
  }, [issues]);

  // Group by meal type
  const mealCosts = useMemo(() => {
    const map = new Map<string, number>();
    (issues || []).forEach((i: any) => {
      map.set(i.meal_type, (map.get(i.meal_type) || 0) + (Number(i.total_cost) || 0));
    });
    return [...map.entries()];
  }, [issues]);

  const handleExport = () => {
    const header = ["Date", "Camp", "Meal", "Cook", "Cost (SAR)"];
    const rows = (issues || []).map((i: any) => [
      i.issue_date, i.camps?.name || "", i.meal_type, i.cook_name || "", (Number(i.total_cost) || 0).toFixed(2),
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `food_cost_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Total Food Cost</p>
          <p className="text-2xl font-bold">SAR {totalCost.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Cost per Person</p>
          <p className="text-2xl font-bold">{occupancy ? `SAR ${(totalCost / occupancy).toFixed(2)}` : "—"}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Total Issue Slips</p>
          <p className="text-2xl font-bold">{issueCount}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Avg Cost per Meal</p>
          <p className="text-2xl font-bold">{issueCount ? `SAR ${(totalCost / issueCount).toFixed(2)}` : "—"}</p>
        </div>
      </div>

      {/* Meal-wise breakdown */}
      <div className="stat-card">
        <h3 className="text-sm font-semibold mb-3">Cost by Meal Type</h3>
        <div className="grid grid-cols-3 gap-4">
          {mealCosts.map(([meal, cost]) => {
            const Icon = mealIcons[meal] || Sun;
            return (
              <div key={meal} className="p-4 bg-muted/50 rounded-lg text-center">
                <Icon size={20} className="mx-auto text-primary mb-2" />
                <p className="text-sm font-medium">{meal}</p>
                <p className="text-lg font-bold">SAR {cost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{((cost / totalCost) * 100).toFixed(1)}% of total</p>
              </div>
            );
          })}
          {mealCosts.length === 0 && <p className="col-span-3 text-sm text-muted-foreground text-center py-4">No data yet</p>}
        </div>
      </div>

      {/* Daily cost table */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Daily Cost Report</h3>
          <button onClick={handleExport} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Download size={12} /> Export CSV
          </button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Date</th>
            <th className="pb-2 font-medium text-right">Daily Cost (SAR)</th>
          </tr></thead>
          <tbody>
            {dailyCosts.map(([date, cost]) => (
              <tr key={date} className="border-b last:border-0">
                <td className="py-2">{format(new Date(date), "dd MMM yyyy")}</td>
                <td className="text-right font-bold">SAR {cost.toFixed(2)}</td>
              </tr>
            ))}
            {dailyCosts.length === 0 && (
              <tr><td colSpan={2} className="py-4 text-center text-muted-foreground">No cost data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// WASTAGE TRACKING TAB
// ==========================================
function WastageTab({ campId, camps, mealTypes }: { campId: string; camps: any[]; mealTypes: string[] }) {
  const [wastageDate, setWastageDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: wastageRecords = [] } = useFoodWastage(campId || undefined, undefined);
  const { data: ingredients = [] } = useIngredients();
  const createWastage = useCreateWastage();

  const [showForm, setShowForm] = useState(false);
  const [formCamp, setFormCamp] = useState(campId || "");
  const [formMeal, setFormMeal] = useState(mealTypes[0] || "Breakfast");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [items, setItems] = useState<{ ingredient_id: string; wasted_qty: number; reason: string }[]>([]);

  const addItem = () => setItems(p => [...p, { ingredient_id: "", wasted_qty: 0, reason: "" }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => setItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSubmit = async () => {
    if (!formCamp || items.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();

    for (const item of items.filter(i => i.ingredient_id && i.wasted_qty > 0)) {
      const ing = (ingredients || []).find((ig: any) => ig.id === item.ingredient_id) as any;
      await createWastage.mutateAsync({
        camp_id: formCamp,
        wastage_date: formDate,
        meal_type: formMeal,
        ingredient_id: item.ingredient_id,
        wasted_qty: item.wasted_qty,
        unit_cost: ing?.unit_cost || 0,
        reason: item.reason || null,
        recorded_by: user?.id,
      });
    }
    setShowForm(false);
    setItems([]);
  };

  const totalWastageCost = (wastageRecords || []).reduce((s: number, w: any) => s + (w.wasted_qty * w.unit_cost), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Total Wastage Records</p>
          <p className="text-2xl font-bold">{(wastageRecords || []).length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Total Wastage Cost</p>
          <p className="text-2xl font-bold text-destructive">SAR {totalWastageCost.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Top Wasted Category</p>
          <p className="text-2xl font-bold">
            {(() => {
              const catMap = new Map<string, number>();
              (wastageRecords || []).forEach((w: any) => {
                const cat = w.ingredients?.category || "Other";
                catMap.set(cat, (catMap.get(cat) || 0) + w.wasted_qty * w.unit_cost);
              });
              const sorted = [...catMap.entries()].sort((a, b) => b[1] - a[1]);
              return sorted[0]?.[0] || "—";
            })()}
          </p>
        </div>
      </div>

      {/* Log Wastage Form */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Recycle size={16} className="text-destructive" /> Food Wastage Log</h3>
          <button onClick={() => { setShowForm(!showForm); if (!showForm && items.length === 0) addItem(); }} className="text-xs bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus size={12} /> Log Wastage
          </button>
        </div>

        {showForm && (
          <div className="mb-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Camp</label>
                <select value={formCamp} onChange={e => setFormCamp(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-card">
                  <option value="">Select...</option>
                  {camps.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Meal Type</label>
                <select value={formMeal} onChange={e => setFormMeal(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-card">
                  {mealTypes.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-card" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Wasted Items</label>
                <button onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={12} /> Add Item</button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-center">
                  <select value={item.ingredient_id} onChange={e => updateItem(i, "ingredient_id", e.target.value)} className="border rounded px-2 py-1.5 text-sm bg-card">
                    <option value="">Select ingredient...</option>
                    {(ingredients || []).map((ing: any) => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                  </select>
                  <input type="number" step="0.01" value={item.wasted_qty} onChange={e => updateItem(i, "wasted_qty", +e.target.value)} placeholder="Qty wasted" className="border rounded px-2 py-1.5 text-sm bg-card" />
                  <input value={item.reason} onChange={e => updateItem(i, "reason", e.target.value)} placeholder="Reason (optional)" className="border rounded px-2 py-1.5 text-sm bg-card" />
                  <button onClick={() => removeItem(i)} className="text-destructive p-1"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={createWastage.isPending} className="text-xs bg-destructive text-destructive-foreground px-4 py-1.5 rounded">Save Wastage</button>
              <button onClick={() => { setShowForm(false); setItems([]); }} className="text-xs px-3 py-1.5 rounded border">Cancel</button>
            </div>
          </div>
        )}

        {/* Wastage records table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Camp</th>
              <th className="pb-2 font-medium">Meal</th>
              <th className="pb-2 font-medium">Ingredient</th>
              <th className="pb-2 font-medium text-right">Qty Wasted</th>
              <th className="pb-2 font-medium text-right">Cost (SAR)</th>
              <th className="pb-2 font-medium">Reason</th>
            </tr></thead>
            <tbody>
              {(wastageRecords || []).map((w: any) => (
                <tr key={w.id} className="border-b last:border-0">
                  <td className="py-2">{format(new Date(w.wastage_date), "dd MMM yyyy")}</td>
                  <td>{w.camps?.name || "—"}</td>
                  <td>{w.meal_type}</td>
                  <td className="font-medium">{w.ingredients?.name}</td>
                  <td className="text-right">{w.wasted_qty} {w.ingredients?.unit}</td>
                  <td className="text-right text-destructive font-medium">{(w.wasted_qty * w.unit_cost).toFixed(2)}</td>
                  <td className="text-xs text-muted-foreground">{w.reason || "—"}</td>
                </tr>
              ))}
              {(!wastageRecords || wastageRecords.length === 0) && (
                <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No wastage records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
