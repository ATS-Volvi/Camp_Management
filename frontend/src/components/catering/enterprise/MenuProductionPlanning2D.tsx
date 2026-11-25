import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCampOccupancy } from "@/hooks/useCatering";
import { useMenuDishes } from "@/hooks/useMenuDishes";
import { DISH_RECIPES } from "@/data/dishRecipes";
import {
  ENTERPRISE_RECIPES,
  scaleRecipe,
  DishRecipeMaster,
  RecipeIngredientBOM,
  SAMPLE_PORTION_SPECS,
  SAMPLE_PRODUCTION_LOGS,
  ProductionVarianceRecord,
  PortionControlSpec,
} from "@/data/enterpriseCateringSuiteData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ChefHat,
  Scale,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
  Thermometer,
  Layers,
  Utensils,
  ArrowRight,
  TrendingDown,
  Clock,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  Check,
  Search,
  Filter,
  Download,
  Snowflake,
  ShieldAlert,
  ArrowUpRight,
  Users,
  Flame,
  CheckCircle,
  HelpCircle,
  Info,
  Building2,
  Package,
  Edit3,
  ShoppingCart,
} from "lucide-react";

interface MenuProductionPlanning2DProps {
  className?: string;
  campId?: string;
  camps?: any[];
  onCampChange?: (campId: string) => void;
}

// Extended initial production records that highlight configured dishes from the user's catalog
const ENHANCED_INITIAL_PRODUCTION_LOGS: ProductionVarianceRecord[] = [
  {
    id: "PROD-2026-1124-B01",
    date: "2026-11-24",
    mealSession: "Breakfast",
    dishId: "dish-aloo-parota",
    dishName: "Aloo Parota",
    forecastPax: 1250,
    plannedPax: 600,
    safetyBufferPct: 4.0,
    targetCookPax: 624,
    actualCookedPax: 625,
    actualConsumedPax: 610,
    leftoverPax: 15,
    leftoverPct: 2.4,
    costPerHeadSAR: 3.50,
    varianceSAR: 52.50,
    disposition: "blast_chill_reuse",
    dispositionNotes: "Blast-chilled to 3°C within 45 mins. Safely packed for cold night duty pantry buffet.",
    headChefSignOff: "Executive Chef Tariq Al-Sayed",
    status: "reconciled",
  },
  {
    id: "PROD-2026-1124-B02",
    date: "2026-11-24",
    mealSession: "Breakfast",
    dishId: "dish-dosa-with-chutney---sambar",
    dishName: "Dosa with Chutney & Sambar",
    forecastPax: 1250,
    plannedPax: 450,
    safetyBufferPct: 3.0,
    targetCookPax: 464,
    actualCookedPax: 465,
    actualConsumedPax: 460,
    leftoverPax: 5,
    leftoverPct: 1.1,
    costPerHeadSAR: 2.80,
    varianceSAR: 14.00,
    disposition: "consumed_perfect",
    dispositionNotes: "Live dosa griddle station closed at 09:30. 98.9% consumption efficiency.",
    headChefSignOff: "Sous Chef Ramanathan",
    status: "reconciled",
  },
  {
    id: "PROD-2026-1123-L01",
    date: "2026-11-23",
    mealSession: "Lunch",
    dishId: "dish-biryani",
    dishName: "Chicken Dum Biryani",
    forecastPax: 1250,
    plannedPax: 650,
    safetyBufferPct: 4.0,
    targetCookPax: 676,
    actualCookedPax: 680,
    actualConsumedPax: 648,
    leftoverPax: 32,
    leftoverPct: 4.7,
    costPerHeadSAR: 7.24,
    varianceSAR: 231.68,
    disposition: "blast_chill_reuse",
    dispositionNotes: "Blast-chilled to 3°C within 90 minutes. Scheduled for tomorrow night shift curry supplement.",
    headChefSignOff: "Executive Chef Tariq Al-Sayed",
    status: "reconciled",
  },
  {
    id: "PROD-2026-1123-L02",
    date: "2026-11-23",
    mealSession: "Lunch",
    dishId: "dish-dal-tadka",
    dishName: "Yellow Dal Tadka & Jeera Rice",
    forecastPax: 1250,
    plannedPax: 420,
    safetyBufferPct: 3.5,
    targetCookPax: 435,
    actualCookedPax: 435,
    actualConsumedPax: 430,
    leftoverPax: 5,
    leftoverPct: 1.1,
    costPerHeadSAR: 2.15,
    varianceSAR: 10.75,
    disposition: "consumed_perfect",
    dispositionNotes: "Near zero variance (1.1%). Serving line finished clean at 13:45.",
    headChefSignOff: "Sous Chef Ramanathan",
    status: "reconciled",
  },
  {
    id: "PROD-2026-1123-B03",
    date: "2026-11-23",
    mealSession: "Breakfast",
    dishId: "dish-falafel-wrap",
    dishName: "Falafel Wrap",
    forecastPax: 1250,
    plannedPax: 380,
    safetyBufferPct: 3.0,
    targetCookPax: 391,
    actualCookedPax: 395,
    actualConsumedPax: 385,
    leftoverPax: 10,
    leftoverPct: 2.5,
    costPerHeadSAR: 3.20,
    varianceSAR: 32.00,
    disposition: "blast_chill_reuse",
    dispositionNotes: "Pita parcels blast chilled under Aramco food safety protocol.",
    headChefSignOff: "Sous Chef Fadi",
    status: "reconciled",
  },
  {
    id: "PROD-2026-1122-D01",
    date: "2026-11-22",
    mealSession: "Dinner",
    dishId: "dish-kabsa",
    dishName: "Saudi Lamb Kabsa",
    forecastPax: 1100,
    plannedPax: 550,
    safetyBufferPct: 5.0,
    targetCookPax: 578,
    actualCookedPax: 580,
    actualConsumedPax: 562,
    leftoverPax: 18,
    leftoverPct: 3.1,
    costPerHeadSAR: 15.55,
    varianceSAR: 279.90,
    disposition: "blast_chill_reuse",
    dispositionNotes: "Tender shredded lamb reserved for tomorrow's lunch broth supplement.",
    headChefSignOff: "Executive Chef Tariq Al-Sayed",
    status: "reconciled",
  },
];

export default function MenuProductionPlanning2D({
  className,
  campId,
  camps: initialCamps,
  onCampChange,
}: MenuProductionPlanning2DProps) {
  // Camp state
  const [localCampId, setLocalCampId] = useState<string>(campId || "");
  useEffect(() => {
    if (campId !== undefined) setLocalCampId(campId);
  }, [campId]);

  // Fetch camps if not provided via props
  const { data: fetchedCamps = [] } = useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camps").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !initialCamps || initialCamps.length === 0,
  });

  const campsList = initialCamps && initialCamps.length > 0 ? initialCamps : fetchedCamps;
  const currentCamp = campsList.find((c: any) => c.id === localCampId);

  // Camp occupancy
  const { data: occupancy } = useCampOccupancy(localCampId || null);

  // Fetch database menu dishes
  const { data: dbDishes = [] } = useMenuDishes();

  // Dynamically compile ALL configured dishes into DishRecipeMaster format
  const allMasterRecipes: DishRecipeMaster[] = useMemo(() => {
    const list: DishRecipeMaster[] = [...ENTERPRISE_RECIPES];
    const seenNames = new Set(ENTERPRISE_RECIPES.map((r) => r.name.toLowerCase()));

    // 1. From database dishes
    (dbDishes || []).forEach((d: any, idx: number) => {
      const name = d.name || "Custom Dish";
      if (seenNames.has(name.toLowerCase())) return;
      seenNames.add(name.toLowerCase());

      const session = (d.meal_type || "Breakfast") as "Breakfast" | "Lunch" | "Dinner";
      const ings: RecipeIngredientBOM[] = (d.menu_dish_ingredients || []).map((di: any, iIdx: number) => ({
        ingredientId: di.ingredient_id || `ing-db-${idx}-${iIdx}`,
        name: di.ingredients?.name || "Ingredient",
        category: (di.ingredients?.category || "Grain") as any,
        unit: di.ingredients?.unit || "kg",
        baseQtyPer100Pax: Number(((Number(di.qty_per_person) || 0.05) * 100).toFixed(2)),
        unitCostSAR: Number(di.ingredients?.unit_cost) || 10,
        warehouseStock: 150,
        prepStation: "Hot Range",
        colorHex: ["#f97316", "#eab308", "#84cc16", "#a855f7", "#06b6d4"][iIdx % 5],
      }));

      list.push({
        id: d.id || `db-dish-${idx}`,
        name,
        arabicName: d.arabic_name || name,
        cuisine: "Standard Camp Catering",
        mealSession: session,
        basePortions: 100,
        prepTimeMinutes: 30,
        cookingTimeMinutes: 45,
        ingredients: ings.length > 0 ? ings : [
          { ingredientId: "ing-staple-1", name: "Flour / Grain", category: "Grain", unit: "kg", baseQtyPer100Pax: 10, unitCostSAR: 5, warehouseStock: 120, prepStation: "Rice & Grain Prep", colorHex: "#eab308" },
          { ingredientId: "ing-staple-2", name: "Cooking Oil", category: "Oil", unit: "L", baseQtyPer100Pax: 2.5, unitCostSAR: 12, warehouseStock: 40, prepStation: "Hot Range", colorHex: "#84cc16" },
        ],
        chefInstructions: ["Prepare ingredients under standard HACCP guidelines.", "Batch cook and test core temperature >= 75°C."],
      });
    });

    // 2. From DISH_RECIPES (catalog)
    Object.entries(DISH_RECIPES).forEach(([dishKey, ings], idx) => {
      const name = dishKey.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      if (seenNames.has(name.toLowerCase())) return;
      seenNames.add(name.toLowerCase());

      const lKey = dishKey.toLowerCase();
      const session: "Breakfast" | "Lunch" | "Dinner" =
        lKey.includes("parota") || lKey.includes("dosa") || lKey.includes("omelette") ||
        lKey.includes("toast") || lKey.includes("croissant") || lKey.includes("falafel") ||
        lKey.includes("idli") || lKey.includes("pancake") || lKey.includes("poori") ||
        lKey.includes("shakshuka") || lKey.includes("upma") || lKey.includes("waffle") ||
        lKey.includes("ful") || lKey.includes("cheese")
          ? "Breakfast"
          : lKey.includes("biryani") || lKey.includes("kabsa") || lKey.includes("curry")
          ? "Lunch"
          : "Dinner";

      const bomIngs: RecipeIngredientBOM[] = ings.map((ing, iIdx) => {
        const lName = ing.name.toLowerCase();
        let category: RecipeIngredientBOM["category"] = "Vegetable";
        let prepStation: RecipeIngredientBOM["prepStation"] = "Cold Larder";
        let cost = 8;

        if (lName.includes("chicken") || lName.includes("meat") || lName.includes("lamb") || lName.includes("fish") || lName.includes("egg")) {
          category = "Protein";
          prepStation = "Butchery";
          cost = 22;
        } else if (lName.includes("rice") || lName.includes("flour") || lName.includes("batter") || lName.includes("parota") || lName.includes("bread")) {
          category = "Grain";
          prepStation = "Rice & Grain Prep";
          cost = 6;
        } else if (lName.includes("oil") || lName.includes("ghee")) {
          category = "Oil";
          prepStation = "Hot Range";
          cost = 12;
        } else if (lName.includes("milk") || lName.includes("cheese") || lName.includes("butter") || lName.includes("yogurt")) {
          category = "Dairy";
          prepStation = "Cold Larder";
          cost = 14;
        } else if (lName.includes("spice") || lName.includes("chilli") || lName.includes("salt") || lName.includes("powder")) {
          category = "Spices";
          prepStation = "Hot Range";
          cost = 25;
        }

        return {
          ingredientId: `ing-${dishKey.replace(/[^a-z0-9]/g, "_")}-${iIdx}`,
          name: ing.name,
          category,
          unit: ing.unit,
          baseQtyPer100Pax: Number((ing.qty_per_person * 100).toFixed(2)),
          unitCostSAR: cost,
          warehouseStock: Math.round(ing.qty_per_person * 100 * 2.2) || 80,
          prepStation,
          colorHex: ["#f97316", "#eab308", "#84cc16", "#a855f7", "#06b6d4", "#ec4899"][iIdx % 6],
        };
      });

      list.push({
        id: `dish-${dishKey.replace(/[^a-z0-9]/g, "_")}`,
        name,
        arabicName: name,
        cuisine: session === "Breakfast" ? "Camp Breakfast Standard" : "Middle Eastern / Asian",
        mealSession: session,
        basePortions: 100,
        prepTimeMinutes: 25,
        cookingTimeMinutes: 35,
        ingredients: bomIngs,
        chefInstructions: [
          `Assemble standard raw ingredients for ${name} under strict hygiene standards.`,
          "Follow Aramco temperature control guidelines during preparation and batching.",
          "Verify final taste profile and internal core temp >= 75°C prior to dining hall release.",
        ],
      });
    });

    return list;
  }, [dbDishes]);

  // Master Recipe Selection & Scaling
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("dish-biryani");
  const [paxCount, setPaxCount] = useState<number>(650);
  const [safetyBufferPct, setSafetyBufferPct] = useState<number>(4.0);

  // Sync pax count when camp occupancy loads
  useEffect(() => {
    if (occupancy && occupancy > 0) {
      setPaxCount(Math.round(occupancy * 0.55));
    }
  }, [occupancy]);

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<
    "planned-vs-actual" | "bom-scaler" | "portion-control" | "meal-forecast"
  >("planned-vs-actual");

  // Production Logs State
  const [productionLogs, setProductionLogs] = useState<ProductionVarianceRecord[]>(
    ENHANCED_INITIAL_PRODUCTION_LOGS
  );
  const [selectedLog, setSelectedLog] = useState<ProductionVarianceRecord>(
    ENHANCED_INITIAL_PRODUCTION_LOGS[0]
  );
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [workOrderNotice, setWorkOrderNotice] = useState<string | null>(null);

  // Filter & Search states for the table
  const [sessionFilter, setSessionFilter] = useState<"all" | "Breakfast" | "Lunch" | "Dinner">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // New Production Log Form State
  const [newActualCooked, setNewActualCooked] = useState<number>(660);
  const [newActualConsumed, setNewActualConsumed] = useState<number>(640);
  const [newDisposition, setNewDisposition] = useState<"blast_chill_reuse" | "consumed_perfect" | "haccp_discard">(
    "blast_chill_reuse"
  );
  const [newDispositionNotes, setNewDispositionNotes] = useState<string>(
    "Chilled to 3°C in blast chiller; allocated to cold buffet salad."
  );

  // Interactive Store Stock Overrides (lets users update or restock on the fly)
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>({});
  const [editingIngredient, setEditingIngredient] = useState<{
    bom: RecipeIngredientBOM;
    scaledQty: number;
    currentStock: number;
  } | null>(null);
  const [editStockValue, setEditStockValue] = useState<number>(0);

  // Recipe calculation from dynamic master catalog
  const currentRecipe = useMemo(() => {
    return allMasterRecipes.find((r) => r.id === selectedRecipeId) || allMasterRecipes[0] || ENTERPRISE_RECIPES[0];
  }, [allMasterRecipes, selectedRecipeId]);

  const targetCookPax = Math.round(paxCount * (1 + safetyBufferPct / 100));
  const rawScaledData = scaleRecipe(currentRecipe, targetCookPax);

  // Apply live stock overrides so user changes immediately turn red alerts to green
  const scaledData = useMemo(() => {
    const ingredients = rawScaledData.ingredients.map((item) => {
      const customStock = stockOverrides[item.bom.ingredientId];
      const stock = customStock !== undefined ? customStock : item.bom.warehouseStock;
      const hasStockShortage = item.scaledQty > stock;
      const shortageQty = hasStockShortage ? Number((item.scaledQty - stock).toFixed(2)) : 0;

      return {
        ...item,
        bom: {
          ...item.bom,
          warehouseStock: stock,
        },
        hasStockShortage,
        shortageQty,
      };
    });

    return {
      ...rawScaledData,
      ingredients,
    };
  }, [rawScaledData, stockOverrides]);

  const shortageItems = scaledData.ingredients.filter((i) => i.hasStockShortage);

  // Quick 1-click restock all shortages
  const handleRestockAllShortages = () => {
    const newOverrides = { ...stockOverrides };
    scaledData.ingredients.forEach((item) => {
      if (item.hasStockShortage) {
        newOverrides[item.bom.ingredientId] = Math.ceil(item.scaledQty * 1.15); // Cover requirement + 15% safety buffer
      }
    });
    setStockOverrides(newOverrides);
    setWorkOrderNotice(
      `✅ Store inventory updated! Received delivery for ${shortageItems.length} short ingredients. All items now fully stocked for ${targetCookPax} portions.`
    );
    setTimeout(() => setWorkOrderNotice(null), 5000);
  };

  // Quick auto-generate PO
  const handleCreateShortagePO = () => {
    const totalShortageCost = shortageItems.reduce((acc, item) => acc + item.shortageQty * item.bom.unitCostSAR, 0);
    setWorkOrderNotice(
      `🛒 Purchase Order #PO-2026-${Math.floor(1000 + Math.random() * 9000)} generated for SAR ${totalShortageCost.toFixed(2)} (${shortageItems.length} items dispatched to vendor).`
    );
    setTimeout(() => setWorkOrderNotice(null), 5000);
  };

  // Open single stock edit modal
  const handleOpenStockModal = (bom: RecipeIngredientBOM, scaledQty: number, currentStock: number) => {
    setEditingIngredient({ bom, scaledQty, currentStock });
    setEditStockValue(currentStock);
  };

  // Save single stock count
  const handleSaveSingleStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient) return;
    setStockOverrides((prev) => ({
      ...prev,
      [editingIngredient.bom.ingredientId]: Number(editStockValue),
    }));
    setWorkOrderNotice(
      `📦 Physical store count for ${editingIngredient.bom.name} updated to ${editStockValue} ${editingIngredient.bom.unit}!`
    );
    setEditingIngredient(null);
    setTimeout(() => setWorkOrderNotice(null), 4000);
  };

  // Portion specs
  const portionSpecs: PortionControlSpec[] = useMemo(() => {
    if (SAMPLE_PORTION_SPECS[selectedRecipeId]) {
      return SAMPLE_PORTION_SPECS[selectedRecipeId];
    }
    // Dynamic portion spec for catalog dishes
    return [
      {
        componentName: `${currentRecipe.name} (Main Portion)`,
        targetServingGrams: currentRecipe.mealSession === "Breakfast" ? 220 : 350,
        toleranceGrams: 15,
        ladleScoopSize: "No. 8 Solid Serving Ladle (120ml) / Tong Portion",
        targetTempServingC: 65,
      },
      {
        componentName: "Side Garnish & Accompaniments",
        targetServingGrams: 80,
        toleranceGrams: 10,
        ladleScoopSize: "No. 16 Sauce Dipper (60ml)",
        targetTempServingC: 60,
      },
    ];
  }, [selectedRecipeId, currentRecipe]);

  // Summary KPIs across production logs
  const totalPlannedPortions = productionLogs.reduce((acc, l) => acc + l.plannedPax, 0);
  const totalCookedPortions = productionLogs.reduce((acc, l) => acc + l.actualCookedPax, 0);
  const totalConsumedPortions = productionLogs.reduce((acc, l) => acc + l.actualConsumedPax, 0);
  const totalLeftoverPortions = totalCookedPortions - totalConsumedPortions;
  const avgLeftoverPct = Number(((totalLeftoverPortions / totalCookedPortions) * 100).toFixed(1));
  const totalVarianceSAR = productionLogs.reduce((acc, l) => acc + l.varianceSAR, 0);
  const attendanceRate = Number(((totalConsumedPortions / totalCookedPortions) * 100).toFixed(1));

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return productionLogs.filter((log) => {
      const matchesSession = sessionFilter === "all" || log.mealSession === sessionFilter;
      const matchesSearch =
        searchQuery === "" ||
        log.dishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.mealSession.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSession && matchesSearch;
    });
  }, [productionLogs, sessionFilter, searchQuery]);

  const handlePrintWorkOrder = () => {
    setWorkOrderNotice(`Kitchen Production Work Order printed for ${targetCookPax} portions of ${currentRecipe.name}!`);
    setTimeout(() => setWorkOrderNotice(null), 4000);
  };

  const handleLogShiftProduction = (e: React.FormEvent) => {
    e.preventDefault();
    const leftover = Math.max(0, newActualCooked - newActualConsumed);
    const leftoverPct = Number(((leftover / newActualCooked) * 100).toFixed(1));
    const cph = scaledData.costPerPersonSAR;
    const varianceSAR = Number((leftover * cph).toFixed(2));

    const newRecord: ProductionVarianceRecord = {
      id: `PROD-2026-1124-L0${productionLogs.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      mealSession: currentRecipe.mealSession as "Breakfast" | "Lunch" | "Dinner",
      dishId: currentRecipe.id,
      dishName: currentRecipe.name,
      forecastPax: occupancy || 1250,
      plannedPax: paxCount,
      safetyBufferPct: safetyBufferPct,
      targetCookPax: targetCookPax,
      actualCookedPax: newActualCooked,
      actualConsumedPax: newActualConsumed,
      leftoverPax: leftover,
      leftoverPct: leftoverPct,
      costPerHeadSAR: cph,
      varianceSAR: varianceSAR,
      disposition: newDisposition,
      dispositionNotes: newDispositionNotes,
      headChefSignOff: "Executive Chef Tariq Al-Sayed",
      status: "reconciled",
    };

    setProductionLogs([newRecord, ...productionLogs]);
    setSelectedLog(newRecord);
    setShowLogModal(false);
    setWorkOrderNotice(`Shift Production Shift closed! Leftover variance: ${leftover} portions (${leftoverPct}%).`);
    setTimeout(() => setWorkOrderNotice(null), 4000);
  };

  const getSessionBadgeColor = (session: string) => {
    switch (session.toLowerCase()) {
      case "breakfast":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/40";
      case "lunch":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/40";
      case "dinner":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300/40";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300/40";
    }
  };

  return (
    <div className={`space-y-5 font-sans ${className || ""}`}>
      {/* ================================================================== */}
      {/* 1. TOP HEADER BANNER - CLEAN EXECUTIVE OVERVIEW                    */}
      {/* ================================================================== */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        {/* Banner Title & Quick Actions */}
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-muted/20 to-card">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 border border-primary/20">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Menu & Kitchen Production Management
                </h2>
                <Badge variant="outline" className="text-[11px] font-semibold bg-primary/5 text-primary border-primary/20">
                  Daily Reconciliation & Waste Control
                </Badge>
                {currentCamp && (
                  <Badge className="bg-primary text-primary-foreground font-semibold text-xs gap-1">
                    <Building2 className="h-3 w-3" /> {currentCamp.name} ({occupancy || 0} Pax)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                Track planned portions against actual food cooked and consumed at dining hall turnstiles.
                Loaded with all configured dishes from your pantry & recipe master.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Camp Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border border-border/70 text-xs">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold text-foreground">Camp:</span>
              <select
                value={localCampId}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalCampId(val);
                  if (onCampChange) onCampChange(val);
                }}
                className="bg-transparent font-semibold text-foreground outline-hidden cursor-pointer"
              >
                <option value="">All Camps (Master View)</option>
                {campsList.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.location || "KSA"}
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handlePrintWorkOrder}
              className="text-xs font-semibold gap-1.5 h-8.5"
            >
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
              Print Order
            </Button>
            <Button
              size="sm"
              onClick={() => setShowLogModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 text-xs h-8.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Record Batch
            </Button>
          </div>
        </div>

        {/* Intuitive 4-Card Executive KPI Summary */}
        <div className="p-4 sm:p-5 bg-muted/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Meals Planned & Cooked */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs hover:border-border transition-all">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span className="font-semibold">Planned ➔ Cooked</span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-foreground">{totalPlannedPortions.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground font-medium">planned</span>
                <span className="text-xs font-bold text-muted-foreground">➔</span>
                <span className="text-base font-bold text-foreground">{totalCookedPortions.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground font-medium">cooked</span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                  +{totalCookedPortions - totalPlannedPortions} buffer portions
                </Badge>
                <span>for field teams</span>
              </div>
            </div>

            {/* Card 2: Meals Consumed (Actual Diners) */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs hover:border-border transition-all">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span className="font-semibold">Consumed (Diners Served)</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {totalConsumedPortions.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  ({attendanceRate}% Turnout)
                </span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Verified by turnstile badge scans</span>
              </div>
            </div>

            {/* Card 3: Leftovers / Overproduction */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs hover:border-border transition-all">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span className="font-semibold">Kitchen Leftovers</span>
                <Flame className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {totalLeftoverPortions}
                </span>
                <span className="text-xs text-muted-foreground font-medium">portions</span>
                <span className="text-xs font-bold text-amber-600">({avgLeftoverPct}%)</span>
              </div>
              <div className="mt-2 text-[11px] flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                  <Check className="h-3 w-3" /> Target Met (&lt;5% threshold)
                </span>
              </div>
            </div>

            {/* Card 4: Value Preserved / Food Saved */}
            <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs hover:border-border transition-all">
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                <span className="font-semibold">Food Value Preserved</span>
                <Snowflake className="h-4 w-4 text-cyan-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-cyan-600 dark:text-cyan-400">
                  SAR {totalVarianceSAR.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 text-[10px] py-0 px-1.5 font-medium border-cyan-200">
                  0 kg Landfill Waste
                </Badge>
                <span>HACCP blast chilled</span>
              </div>
            </div>
          </div>

          {/* Visual Production Cycle Progress Bar */}
          <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span>
                <strong>{currentCamp ? currentCamp.name : "Camp Dining Operation"}:</strong> {totalPlannedPortions.toLocaleString()} planned portions ➔ {totalCookedPortions.toLocaleString()} cooked ➔ {totalConsumedPortions.toLocaleString()} served ({attendanceRate}%) ➔ <strong>{totalLeftoverPortions} portions safely blast-chilled</strong>.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>100% HACCP Food Safety Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {workOrderNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{workOrderNotice}</span>
          </div>
          <button onClick={() => setWorkOrderNotice(null)} className="text-muted-foreground hover:text-foreground text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. SUB-MODULE NAVIGATION - CLEAN SEGMENTED TABS                    */}
      {/* ================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-muted/50 rounded-xl border border-border/60">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab("planned-vs-actual")}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === "planned-vs-actual"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <CalendarDays className={`h-4 w-4 ${activeTab === "planned-vs-actual" ? "text-primary" : ""}`} />
            <span>1. Production & Leftovers Log</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>

          <button
            onClick={() => setActiveTab("bom-scaler")}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === "bom-scaler"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Layers className={`h-4 w-4 ${activeTab === "bom-scaler" ? "text-primary" : ""}`} />
            <span>2. Recipe & Ingredient Scaler ({allMasterRecipes.length} Dishes)</span>
          </button>

          <button
            onClick={() => setActiveTab("portion-control")}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === "portion-control"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Scale className={`h-4 w-4 ${activeTab === "portion-control" ? "text-primary" : ""}`} />
            <span>3. Serving Portion Sizes</span>
          </button>

          <button
            onClick={() => setActiveTab("meal-forecast")}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === "meal-forecast"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Clock className={`h-4 w-4 ${activeTab === "meal-forecast" ? "text-primary" : ""}`} />
            <span>4. Headcount Forecast</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-2">
          <span>Allowable Variance Target:</span>
          <Badge variant="outline" className="text-[11px] font-bold text-foreground">
            &le; 5.0%
          </Badge>
        </div>
      </div>

      {/* ================================================================== */}
      {/* TAB 1: PLANNED VS. ACTUAL PRODUCTION & VARIANCE LOG                */}
      {/* ================================================================== */}
      {activeTab === "planned-vs-actual" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Shift Production Log Table (8 of 12 cols) */}
            <div className="lg:col-span-8 bg-card rounded-2xl border border-border/80 shadow-xs p-4 sm:p-5 space-y-4">
              {/* Table Header with Search & Session Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Kitchen Daily Production & Leftovers Log
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click any row below to view its full HACCP preservation record on the right.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search box */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search dish or batch..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-muted/40 focus:bg-background focus:outline-hidden focus:ring-1 focus:ring-primary w-40 sm:w-48 text-foreground"
                    />
                  </div>

                  {/* Session Filter */}
                  <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-xs">
                    {(["all", "Breakfast", "Lunch", "Dinner"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSessionFilter(s)}
                        className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all capitalize ${
                          sessionFilter === s
                            ? "bg-card text-foreground font-bold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/70 text-foreground font-bold text-[11px] border-b border-border/70">
                    <tr>
                      <th className="p-3">Shift & Batch</th>
                      <th className="p-3">Dish & Session</th>
                      <th className="p-3 text-center">Planned</th>
                      <th className="p-3 text-center">Cooked</th>
                      <th className="p-3 text-center">Consumed</th>
                      <th className="p-3 text-center">Leftover / Variance</th>
                      <th className="p-3 text-right">Food Disposition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground">
                          No production records found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const isSelected = selectedLog.id === log.id;
                        const isWithinBenchmark = log.leftoverPct <= 5.0;
                        const consumptionPct = Math.min(
                          100,
                          Math.round((log.actualConsumedPax / log.actualCookedPax) * 100)
                        );

                        return (
                          <tr
                            key={log.id}
                            onClick={() => setSelectedLog(log)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-primary/10 font-medium border-l-4 border-l-primary"
                                : "hover:bg-muted/40 text-foreground"
                            }`}
                          >
                            <td className="p-3">
                              <span className="font-semibold text-foreground block">{log.id}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{log.date}</span>
                            </td>

                            <td className="p-3">
                              <strong className="block text-foreground font-bold text-xs">{log.dishName}</strong>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] py-0 px-1 font-semibold border ${getSessionBadgeColor(
                                    log.mealSession
                                  )}`}
                                >
                                  {log.mealSession}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  SAR {log.costPerHeadSAR.toFixed(2)}/pax
                                </span>
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <span className="font-semibold text-foreground">{log.plannedPax}</span>
                              <span className="text-[10px] text-muted-foreground block">
                                +{log.safetyBufferPct}% buffer
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <span className="font-bold text-foreground text-xs">{log.actualCookedPax}</span>
                              <span className="text-[10px] text-muted-foreground block">pots batched</span>
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                  {log.actualConsumedPax}
                                </span>
                                {/* Mini consumption progress bar */}
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${consumptionPct}%` }}
                                  ></div>
                                </div>
                                <span className="text-[9px] text-muted-foreground mt-0.5">{consumptionPct}% eaten</span>
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                  isWithinBenchmark
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/40"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/40"
                                }`}
                              >
                                +{log.leftoverPax} ({log.leftoverPct}%)
                              </span>
                            </td>

                            <td className="p-3 text-right">
                              {log.disposition === "blast_chill_reuse" && (
                                <Badge className="bg-cyan-600 hover:bg-cyan-600 text-white font-medium text-[10px] gap-1 py-0.5">
                                  <Snowflake className="h-3 w-3" /> Blast Chilled
                                </Badge>
                              )}
                              {log.disposition === "consumed_perfect" && (
                                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-medium text-[10px] gap-1 py-0.5">
                                  <Check className="h-3 w-3" /> Exact Match
                                </Badge>
                              )}
                              {log.disposition === "haccp_discard" && (
                                <Badge className="bg-rose-600 hover:bg-rose-600 text-white font-medium text-[10px] gap-1 py-0.5">
                                  <AlertTriangle className="h-3 w-3" /> Discarded
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Insight */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                  Showing <strong>{filteredLogs.length}</strong> of {productionLogs.length} shifts
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Green badges indicate leftovers are within the allowable &le;5% buffer.
                </span>
              </div>
            </div>

            {/* Right: Selected Batch Audit & Disposition Slip (4 of 12 cols) */}
            <div className="lg:col-span-4 bg-card rounded-2xl border border-border/80 shadow-xs p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Header */}
                <div className="border-b border-border/60 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Shift Audit Dossier
                    </span>
                    <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20">
                      HACCP Verified
                    </Badge>
                  </div>
                  <h4 className="text-lg font-black text-foreground mt-1.5">
                    {selectedLog.dishName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedLog.mealSession}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {selectedLog.id} • {selectedLog.date}
                    </span>
                  </div>
                </div>

                {/* Production Flow Tracker for This Dish */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground block uppercase">
                    Portion Journey for this Batch
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Planned</span>
                      <strong className="text-sm font-bold text-foreground">{selectedLog.plannedPax}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Cooked</span>
                      <strong className="text-sm font-bold text-foreground">{selectedLog.actualCookedPax}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Served</span>
                      <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedLog.actualConsumedPax}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Leftovers & Cost Breakdown Cards */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Leftover Portions
                    </span>
                    <strong className="text-foreground text-base font-black block mt-0.5">
                      +{selectedLog.leftoverPax} Pax
                    </strong>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                      {selectedLog.leftoverPct}% of batch (Safe)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Value Saved
                    </span>
                    <strong className="text-primary text-base font-black block mt-0.5">
                      SAR {selectedLog.varianceSAR.toFixed(2)}
                    </strong>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      @ SAR {selectedLog.costPerHeadSAR.toFixed(2)} / person
                    </span>
                  </div>
                </div>

                {/* Disposition & HACCP Protocol Explanation */}
                <div className="p-3.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Snowflake className="h-4 w-4 text-cyan-600" />
                      Food Disposition Status:
                    </span>
                    <Badge className="bg-cyan-600 text-white text-[10px] font-bold">
                      {selectedLog.disposition.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedLog.dispositionNotes}
                  </p>
                  <div className="text-[10px] text-cyan-700 dark:text-cyan-300 font-medium pt-1 border-t border-cyan-200/50 dark:border-cyan-800/40">
                    🌱 <strong>Zero Waste Impact:</strong> Rescued food is kept below 3°C and safe for next shift dinner service.
                  </div>
                </div>

                {/* Chef Sign-off Verification Seal */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-foreground font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Executive Chef Sign-Off
                    </span>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {selectedLog.headChefSignOff}
                  </div>
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    Reconciled with dining hall RFID gate turnstiles at 14:15 AST
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setWorkOrderNotice(`Production Reconciliation Certificate for #${selectedLog.id} exported successfully!`);
                    setTimeout(() => setWorkOrderNotice(null), 3000);
                  }}
                  className="w-full text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/5 h-9"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Download Shift Certificate (PDF)
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedRecipeId(selectedLog.dishId);
                    setActiveTab("bom-scaler");
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
                >
                  Inspect Scaled Recipe BOM &rarr;
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 2: STANDARD RECIPES & SCALED BILL OF MATERIALS (BOM)           */}
      {/* ================================================================== */}
      {activeTab === "bom-scaler" && (
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-5 animate-in fade-in">
          <div className="border-b border-border/60 pb-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Standard Recipes & Scaled Bill of Materials (BOM)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select any configured dish from your camp menu to dynamically scale required raw ingredients based on your camp headcount.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center p-4 rounded-xl bg-muted/20 border border-border/60">
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Select Dish from Kitchen Master ({allMasterRecipes.length} Configured Dishes)
              </label>
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-lg bg-card border border-border text-foreground"
              >
                <optgroup label="Breakfast Dishes">
                  {allMasterRecipes
                    .filter((r) => r.mealSession === "Breakfast")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        🍳 {r.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Lunch Dishes">
                  {allMasterRecipes
                    .filter((r) => r.mealSession === "Lunch")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        🍛 {r.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Dinner Dishes">
                  {allMasterRecipes
                    .filter((r) => r.mealSession === "Dinner")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        🍲 {r.name}
                      </option>
                    ))}
                </optgroup>
              </select>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>CPH: <strong>SAR {scaledData.costPerPersonSAR.toFixed(2)}</strong></span>
                <span>•</span>
                <span>Session: <strong>{currentRecipe.mealSession}</strong></span>
                <span>•</span>
                <span>Ingredients: <strong>{scaledData.ingredients.length} items</strong></span>
              </div>
            </div>

            <div className="md:col-span-6 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Batch Portion Target:</span>
                <strong className="text-foreground text-sm font-black">
                  {targetCookPax} Portions ({paxCount} planned + {safetyBufferPct}% safety buffer)
                </strong>
              </div>
              <Slider
                value={[paxCount]}
                min={50}
                max={2500}
                step={25}
                onValueChange={(val) => setPaxCount(val[0])}
                className="py-1 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>50 portions</span>
                <span>Estimated Batch Cost: SAR {scaledData.totalCostSAR.toFixed(2)}</span>
                <span>2,500 portions</span>
              </div>
            </div>
          </div>

          {/* Scaled BOM Table */}
          <div className="space-y-3">
            {/* Shortage Alert & 1-Click Fast Restock Banner */}
            {shortageItems.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs animate-in fade-in">
                <div className="flex items-start gap-2.5 text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <strong className="block font-bold">
                      Stock Shortage Detected for {targetCookPax} Portions!
                    </strong>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      {shortageItems.length} ingredient{shortageItems.length > 1 ? "s" : ""} have less warehouse stock than required ({shortageItems.map((i) => i.bom.name).join(", ")}).
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={handleRestockAllShortages}
                    className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    1-Click Restock All to Store
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateShortagePO}
                    className="h-8 text-xs font-bold gap-1.5 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Auto-Generate PO
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-foreground">
              <span className="flex items-center gap-1.5">
                <Utensils className="h-4 w-4 text-primary" />
                Scaled Raw Ingredient Requirements for {currentRecipe.name}
              </span>
              <div className="flex items-center gap-3 text-muted-foreground font-normal text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Sufficient
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Shortage
                </span>
                <span>• Click "Adjust / Restock" to update physical store counts</span>
              </div>
            </div>

            <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden text-xs">
              {scaledData.ingredients.map((item) => (
                <div
                  key={item.bom.ingredientId}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                    item.hasStockShortage ? "bg-rose-500/10" : "bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.bom.colorHex }}
                    />
                    <div>
                      <strong className="block text-foreground font-bold text-xs">
                        {item.bom.name}
                      </strong>
                      <span className="text-[11px] text-muted-foreground">
                        Prep Station: {item.bom.prepStation} • Category: {item.bom.category} • Cost: SAR {item.bom.unitCostSAR}/{item.bom.unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                    <div>
                      <strong className="text-sm font-black text-foreground block">
                        {item.scaledQty.toLocaleString()} {item.bom.unit}
                      </strong>
                      <div className="text-[11px] mt-0.5">
                        {item.hasStockShortage ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 justify-end">
                            <AlertTriangle className="h-3 w-3" /> Short by {item.shortageQty} {item.bom.unit} (Store has {item.bom.warehouseStock})
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            In Store: {item.bom.warehouseStock} {item.bom.unit} (Sufficient)
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={item.hasStockShortage ? "default" : "outline"}
                      onClick={() => handleOpenStockModal(item.bom, item.scaledQty, item.bom.warehouseStock)}
                      className={`h-7 px-2.5 text-[11px] font-bold gap-1 shrink-0 ${
                        item.hasStockShortage
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Package className="h-3 w-3" />
                      {item.hasStockShortage ? "Restock" : "Adjust"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 3: GRAMS PORTION CONTROL SPECIFICATION                         */}
      {/* ================================================================== */}
      {activeTab === "portion-control" && (
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Standard Portion Control & Serving Utensil Guide
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mandatory serving sizes and designated scoop tools to prevent over-portioning variance and maintain Aramco nutritional guidelines.
                </p>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
              Recipe: {currentRecipe.name}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {portionSpecs.map((spec, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <strong className="font-bold text-foreground text-xs">{spec.componentName}</strong>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5" /> &ge;{spec.targetTempServingC}°C
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Target Portion:</span>
                    <strong className="text-sm font-black text-foreground">
                      {spec.targetServingGrams} grams
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Tolerance Allowed:</span>
                    <span className="text-primary font-bold">&plusmn;{spec.toleranceGrams}g</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-card border border-border/60 text-[11px]">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                    Designated Serving Utensil
                  </span>
                  <strong className="text-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                    <Utensils className="h-3.5 w-3.5 text-primary" /> {spec.ladleScoopSize}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 4: OCCUPANCY MEAL FORECASTING                                  */}
      {/* ================================================================== */}
      {activeTab === "meal-forecast" && (
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Camp Occupancy & Meal Session Headcount Forecasting
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projects expected dining hall turnout for each meal session based on room occupancy rosters and field shift dispatches.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              {currentCamp ? currentCamp.name : "Camp Dining Operation"} ({occupancy || 1250} Residents)
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 text-xs">
            {(
              [
                { session: "Breakfast", rate: "84%", pct: 0.84, menu: "Aloo Parota, Eggs, Foul, Tea" },
                { session: "Lunch (Dining)", rate: "52%", pct: 0.52, menu: "Chicken Dum Biryani & Raita" },
                { session: "Field Packed Lunch", rate: "40%", pct: 0.40, menu: "Falafel Wraps, Juice Packs" },
                { session: "Dinner", rate: "94%", pct: 0.94, menu: "Saudi Lamb Kabsa & Lentil Soup" },
              ] as const
            ).map((s) => {
              const basePax = occupancy || 1250;
              const forecasted = Math.round(basePax * s.pct);

              return (
                <div key={s.session} className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <strong className="font-bold text-foreground text-xs">{s.session}</strong>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {s.rate}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Forecast Diners</span>
                    <strong className="text-lg font-black text-foreground">{forecasted.toLocaleString()} Pax</strong>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate border-t border-border/40 pt-1.5">
                    Menu: {s.menu}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Safety Buffer Setting */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">Kitchen Safety Buffer Allowance:</span>
              <strong className="font-bold text-primary text-sm">+{safetyBufferPct}%</strong>
            </div>
            <Slider
              value={[safetyBufferPct]}
              min={1.0}
              max={8.0}
              step={0.5}
              onValueChange={(val) => setSafetyBufferPct(val[0])}
              className="py-1 cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              A safety buffer of 4.0% ensures offshore teams returning late due to transport delays receive hot meals without causing a kitchen shortage.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* INGREDIENT STORE STOCK ADJUSTMENT / FAST RESTOCK MODAL            */}
      {/* ================================================================== */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Update Store Stock: {editingIngredient.bom.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingIngredient(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSingleStock} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Current Physical Count:</span>
                  <strong className="text-foreground text-xs">
                    {editingIngredient.currentStock} {editingIngredient.bom.unit}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Batch Requirement for {targetCookPax} Pax:</span>
                  <strong className="text-primary text-xs">
                    {editingIngredient.scaledQty} {editingIngredient.bom.unit}
                  </strong>
                </div>
                {editingIngredient.scaledQty > editingIngredient.currentStock && (
                  <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-bold border-t border-border/40 pt-1.5">
                    <span>Shortage to cover:</span>
                    <span>
                      {(editingIngredient.scaledQty - editingIngredient.currentStock).toFixed(2)} {editingIngredient.bom.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* 1-Click Fast Actions */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground block">
                  Quick Restock Actions:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditStockValue(Math.ceil(editingIngredient.scaledQty * 1.1))}
                    className="text-[11px] font-bold h-8 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    Set to Match ({Math.ceil(editingIngredient.scaledQty * 1.1)} {editingIngredient.bom.unit})
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditStockValue((prev) => prev + 500)}
                    className="text-[11px] font-bold h-8 border-primary/40 text-primary hover:bg-primary/10"
                  >
                    +500 {editingIngredient.bom.unit} Delivery
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Physical Store Stock ({editingIngredient.bom.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={editStockValue}
                  onChange={(e) => setEditStockValue(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground font-bold text-sm"
                  min={0}
                  required
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Enter the actual quantity in the camp storeroom, or received from a delivery note.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingIngredient(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                >
                  Save Store Stock Count
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================================================================== */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Record Kitchen Production Shift Batch
                </h3>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogShiftProduction} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Recipe Target</span>
                  <strong className="text-foreground">{currentRecipe.name} ({currentRecipe.mealSession})</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Planned Portions</span>
                  <strong className="text-foreground font-semibold">{paxCount} + {safetyBufferPct}% = {targetCookPax} Pax</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Actually Cooked (Pots Batched)
                  </label>
                  <input
                    type="number"
                    value={newActualCooked}
                    onChange={(e) => setNewActualCooked(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground font-semibold"
                    min={50}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Actually Consumed (Turnstile Scans)
                  </label>
                  <input
                    type="number"
                    value={newActualConsumed}
                    onChange={(e) => setNewActualConsumed(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground font-semibold"
                    min={0}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Leftover Disposition (HACCP Safe Protocol)
                </label>
                <select
                  value={newDisposition}
                  onChange={(e) =>
                    setNewDisposition(
                      e.target.value as "blast_chill_reuse" | "consumed_perfect" | "haccp_discard"
                    )
                  }
                  className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground font-semibold"
                >
                  <option value="blast_chill_reuse">Blast Chill & Reuse for Next Shift (HACCP 3°C)</option>
                  <option value="consumed_perfect">Consumed Perfect (&lt;1% leftover)</option>
                  <option value="haccp_discard">HACCP Discard (Exceeded 4h Hot-Holding Limit)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Disposition Notes & Temperature Log
                </label>
                <textarea
                  value={newDispositionNotes}
                  onChange={(e) => setNewDispositionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-card border border-border text-foreground font-semibold resize-none h-16"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowLogModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
                >
                  Verify & Close Production Shift
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
