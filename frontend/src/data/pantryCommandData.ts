import { DISH_RECIPES } from "@/data/dishRecipes";

// ============================================================================
// PANTRY COMMAND CENTER - SAMPLE DATA & SIMULATION ENGINE
// Enterprise Catering Food Stock & Threshold Intelligence for Camp-365
// ============================================================================

export interface IngredientStockItem {
  id: string;
  name: string;
  category: "Grains" | "Meat & Poultry" | "Dairy & Eggs" | "Produce" | "Oils & Spices";
  currentStock: number;
  unit: string;
  avgDailyUsage: number;
  thresholdDays: number; // Expressed strictly in "days of cover"
  supplierName: string;
  supplierContact: string;
  leadTimeDays: number;
  unitPriceSAR: number;
  icon: string;
  color: string;
  storageType: "Dry Store" | "Chilled" | "Deep Freeze";
}

export interface UpcomingDish {
  id: string;
  name: string;
  mealSession: "Breakfast" | "Lunch" | "Dinner";
  scheduledDay: string;
  expectedPortions: number;
  keyIngredientIds: string[]; // 3 to 5 key ingredients
}

// ----------------------------------------------------------------------------
// 1. 14 CORE INGREDIENTS
// ----------------------------------------------------------------------------
// Configured so initially:
// - 3 are RED (below threshold): Cooking Oil (2.1 vs 6), Onions (1.6 vs 5), Eggs (1.5 vs 4)
// - 3 are AMBER (near threshold): Chicken (5.3 vs 5), Rice (6.0 vs 6), Tomatoes (5.3 vs 5)
// - 8 are GREEN (comfortable buffer): Lamb, Fish, Lentils, Chickpeas, Potatoes, Flour, Milk, Spices
// ----------------------------------------------------------------------------
export const PANTRY_INGREDIENTS: IngredientStockItem[] = [
  {
    id: "rice",
    name: "Basmati Rice",
    category: "Grains",
    currentStock: 120, // 120 bags of 10kg
    unit: "bags (10kg)",
    avgDailyUsage: 20,
    thresholdDays: 6, // 6.0 days left -> AMBER (exactly at threshold)
    supplierName: "National Grain Co.",
    supplierContact: "orders@nationalgrain.sa",
    leadTimeDays: 3,
    unitPriceSAR: 165.0,
    icon: "🌾",
    color: "#f59e0b",
    storageType: "Dry Store",
  },
  {
    id: "chicken",
    name: "Fresh Chicken",
    category: "Meat & Poultry",
    currentStock: 320,
    unit: "kg",
    avgDailyUsage: 60,
    thresholdDays: 5, // 5.3 days left -> AMBER (approaching 5 days)
    supplierName: "Al-Watania Poultry",
    supplierContact: "supply@alwatania.com.sa",
    leadTimeDays: 2,
    unitPriceSAR: 18.5,
    icon: "🍗",
    color: "#f59e0b",
    storageType: "Deep Freeze",
  },
  {
    id: "lamb",
    name: "Australian Lamb",
    category: "Meat & Poultry",
    currentStock: 450,
    unit: "kg",
    avgDailyUsage: 45,
    thresholdDays: 5, // 10.0 days left -> GREEN
    supplierName: "Al-Kabeer Meat Co.",
    supplierContact: "sales@alkabeer.sa",
    leadTimeDays: 3,
    unitPriceSAR: 42.0,
    icon: "🥩",
    color: "#10b981",
    storageType: "Deep Freeze",
  },
  {
    id: "fish",
    name: "White Fish Fillet",
    category: "Meat & Poultry",
    currentStock: 240,
    unit: "kg",
    avgDailyUsage: 30,
    thresholdDays: 4, // 8.0 days left -> GREEN
    supplierName: "Arabian Gulf Fisheries",
    supplierContact: "fleet@gulfseafood.sa",
    leadTimeDays: 2,
    unitPriceSAR: 28.0,
    icon: "🐟",
    color: "#10b981",
    storageType: "Deep Freeze",
  },
  {
    id: "cooking_oil",
    name: "Pure Sunflower Oil",
    category: "Oils & Spices",
    currentStock: 380, // 380 Cans -> Healthy buffer
    unit: "cans (4L)",
    avgDailyUsage: 40,
    thresholdDays: 5, // ~9.5 days left -> GREEN
    supplierName: "Afia Edible Oils",
    supplierContact: "orders@afiaoils.sa",
    leadTimeDays: 3,
    unitPriceSAR: 48.0,
    icon: "🛢️",
    color: "#10b981",
    storageType: "Dry Store",
  },
  {
    id: "lentils",
    name: "Red Lentils",
    category: "Grains",
    currentStock: 260,
    unit: "kg",
    avgDailyUsage: 25,
    thresholdDays: 5, // 10.4 days left -> GREEN
    supplierName: "National Grain Co.",
    supplierContact: "orders@nationalgrain.sa",
    leadTimeDays: 3,
    unitPriceSAR: 9.0,
    icon: "🥣",
    color: "#10b981",
    storageType: "Dry Store",
  },
  {
    id: "chickpeas",
    name: "Chickpeas (Kabuli)",
    category: "Grains",
    currentStock: 190,
    unit: "kg",
    avgDailyUsage: 20,
    thresholdDays: 5, // 9.5 days left -> GREEN
    supplierName: "National Grain Co.",
    supplierContact: "orders@nationalgrain.sa",
    leadTimeDays: 3,
    unitPriceSAR: 11.5,
    icon: "🧆",
    color: "#10b981",
    storageType: "Dry Store",
  },
  {
    id: "onions",
    name: "Yellow Onions",
    category: "Produce",
    currentStock: 320,
    unit: "kg",
    avgDailyUsage: 55,
    thresholdDays: 5, // ~5.8 days left -> AMBER / Healthy buffer
    supplierName: "Saudi Fresh Agri",
    supplierContact: "orders@freshagri.sa",
    leadTimeDays: 2,
    unitPriceSAR: 4.8,
    icon: "🧅",
    color: "#f59e0b",
    storageType: "Dry Store",
  },
  {
    id: "tomatoes",
    name: "Vine Tomatoes",
    category: "Produce",
    currentStock: 240,
    unit: "kg",
    avgDailyUsage: 45,
    thresholdDays: 5, // 5.3 days left -> AMBER (near threshold)
    supplierName: "Saudi Fresh Agri",
    supplierContact: "orders@freshagri.sa",
    leadTimeDays: 2,
    unitPriceSAR: 6.2,
    icon: "🍅",
    color: "#f59e0b",
    storageType: "Chilled",
  },
  {
    id: "potatoes",
    name: "Russet Potatoes",
    category: "Produce",
    currentStock: 520,
    unit: "kg",
    avgDailyUsage: 50,
    thresholdDays: 5, // 10.4 days left -> GREEN
    supplierName: "Saudi Fresh Agri",
    supplierContact: "orders@freshagri.sa",
    leadTimeDays: 2,
    unitPriceSAR: 3.8,
    icon: "🥔",
    color: "#10b981",
    storageType: "Dry Store",
  },
  {
    id: "flour",
    name: "Wheat Flour No.1",
    category: "Grains",
    currentStock: 850,
    unit: "bags (10kg)",
    avgDailyUsage: 75,
    thresholdDays: 6, // 11.3 days left -> GREEN
    supplierName: "First Milling Co.",
    supplierContact: "dispatch@firstmill.sa",
    leadTimeDays: 4,
    unitPriceSAR: 34.0,
    icon: "🥖",
    color: "#10b981",
    storageType: "Dry Store",
  },
  {
    id: "milk",
    name: "Full Cream Milk",
    category: "Dairy & Eggs",
    currentStock: 360,
    unit: "liters",
    avgDailyUsage: 40,
    thresholdDays: 4, // 9.0 days left -> GREEN
    supplierName: "Almarai Dairy",
    supplierContact: "enterprise@almarai.com",
    leadTimeDays: 1,
    unitPriceSAR: 5.5,
    icon: "🥛",
    color: "#10b981",
    storageType: "Chilled",
  },
  {
    id: "eggs",
    name: "Table Eggs Grade A",
    category: "Dairy & Eggs",
    currentStock: 27,
    unit: "crates (30ct)",
    avgDailyUsage: 18,
    thresholdDays: 4, // 1.5 days left -> RED (CRITICAL STOCKOUT RISK!)
    supplierName: "Al-Watania Poultry",
    supplierContact: "supply@alwatania.com.sa",
    leadTimeDays: 2,
    unitPriceSAR: 22.0,
    icon: "🥚",
    color: "#ef4444",
    storageType: "Chilled",
  },
  {
    id: "spices",
    name: "Aramco Mess Spice Mix",
    category: "Oils & Spices",
    currentStock: 75,
    unit: "kg",
    avgDailyUsage: 6,
    thresholdDays: 6, // 12.5 days left -> GREEN
    supplierName: "Mehran Spices KSA",
    supplierContact: "corporate@mehranspices.sa",
    leadTimeDays: 5,
    unitPriceSAR: 36.0,
    icon: "🧂",
    color: "#10b981",
    storageType: "Dry Store",
  },
];

// ----------------------------------------------------------------------------
// 2. 10 UPCOMING MENU DISHES (Next 3 Days)
// ----------------------------------------------------------------------------
export const UPCOMING_DISHES: UpcomingDish[] = [
  {
    id: "dish_biryani",
    name: "Chicken Dum Biryani",
    mealSession: "Lunch",
    scheduledDay: "Today",
    expectedPortions: 950,
    keyIngredientIds: ["chicken", "rice", "cooking_oil", "onions", "spices"],
  },
  {
    id: "dish_dal_tadka",
    name: "Yellow Dal Tadka",
    mealSession: "Dinner",
    scheduledDay: "Today",
    expectedPortions: 800,
    keyIngredientIds: ["lentils", "cooking_oil", "onions", "tomatoes", "spices"],
  },
  {
    id: "dish_kabsa",
    name: "Saudi Lamb Kabsa",
    mealSession: "Lunch",
    scheduledDay: "Tomorrow",
    expectedPortions: 1100,
    keyIngredientIds: ["lamb", "rice", "cooking_oil", "tomatoes", "spices"],
  },
  {
    id: "dish_fish_curry",
    name: "Gulf Fish Curry",
    mealSession: "Dinner",
    scheduledDay: "Tomorrow",
    expectedPortions: 750,
    keyIngredientIds: ["fish", "cooking_oil", "tomatoes", "onions", "spices"],
  },
  {
    id: "dish_shakshuka",
    name: "Mediterranean Shakshuka",
    mealSession: "Breakfast",
    scheduledDay: "Tomorrow",
    expectedPortions: 900,
    keyIngredientIds: ["eggs", "tomatoes", "onions", "cooking_oil", "spices"],
  },
  {
    id: "dish_hummus_falafel",
    name: "Hummus & Falafel Platter",
    mealSession: "Breakfast",
    scheduledDay: "Day +2",
    expectedPortions: 850,
    keyIngredientIds: ["chickpeas", "cooking_oil", "flour", "spices"],
  },
  {
    id: "dish_mutton_potato",
    name: "Aloo Gosht (Mutton Potato Stew)",
    mealSession: "Dinner",
    scheduledDay: "Day +2",
    expectedPortions: 920,
    keyIngredientIds: ["lamb", "potatoes", "onions", "tomatoes", "cooking_oil"],
  },
  {
    id: "dish_egg_fried_rice",
    name: "Egg Fried Rice",
    mealSession: "Lunch",
    scheduledDay: "Day +3",
    expectedPortions: 800,
    keyIngredientIds: ["eggs", "rice", "cooking_oil", "onions"],
  },
  {
    id: "dish_fish_sayadieh",
    name: "Traditional Fish Sayadieh",
    mealSession: "Dinner",
    scheduledDay: "Day +3",
    expectedPortions: 780,
    keyIngredientIds: ["fish", "rice", "onions", "spices", "cooking_oil"],
  },
  {
    id: "dish_breakfast_platter",
    name: "Camp Breakfast Pancakes & Milk",
    mealSession: "Breakfast",
    scheduledDay: "Day +3",
    expectedPortions: 950,
    keyIngredientIds: ["eggs", "milk", "flour", "cooking_oil"],
  },
];

/**
 * Maps any dish and its ingredient names to Pantry Ingredient IDs
 */
export function mapRecipeToPantryIngredientIds(dishName: string, ingredientNames?: string[]): string[] {
  const ids = new Set<string>();
  const lowerName = dishName.toLowerCase();

  // Keyword-based detection from dish name
  if (lowerName.includes("biryani") || lowerName.includes("rice") || lowerName.includes("kabsa") || lowerName.includes("dosa") || lowerName.includes("idli")) {
    ids.add("rice");
  }
  if (lowerName.includes("chicken")) ids.add("chicken");
  if (lowerName.includes("lamb") || lowerName.includes("mutton") || lowerName.includes("meat")) ids.add("lamb");
  if (lowerName.includes("fish") || lowerName.includes("seafood")) ids.add("fish");
  if (lowerName.includes("egg") || lowerName.includes("omelette") || lowerName.includes("pancake") || lowerName.includes("waffle") || lowerName.includes("french toast")) {
    ids.add("eggs");
  }
  if (lowerName.includes("dal") || lowerName.includes("lentil") || lowerName.includes("foul") || lowerName.includes("ful")) {
    ids.add("lentils");
  }
  if (lowerName.includes("chickpea") || lowerName.includes("falafel") || lowerName.includes("hummus")) {
    ids.add("chickpeas");
  }
  if (lowerName.includes("parota") || lowerName.includes("bread") || lowerName.includes("toast") || lowerName.includes("croissant") || lowerName.includes("roti") || lowerName.includes("chapati") || lowerName.includes("naan") || lowerName.includes("pasta") || lowerName.includes("spaghetti")) {
    ids.add("flour");
  }
  if (lowerName.includes("milk") || lowerName.includes("cheese") || lowerName.includes("butter") || lowerName.includes("paneer") || lowerName.includes("tea") || lowerName.includes("coffee")) {
    ids.add("milk");
  }
  if (lowerName.includes("potato") || lowerName.includes("aloo")) {
    ids.add("potatoes");
  }

  // Ingredient list detection
  if (ingredientNames && ingredientNames.length > 0) {
    for (const ing of ingredientNames) {
      const l = ing.toLowerCase();
      if (l.includes("rice") || l.includes("batter")) ids.add("rice");
      if (l.includes("chicken") || l.includes("poultry")) ids.add("chicken");
      if (l.includes("lamb") || l.includes("meat") || l.includes("mutton")) ids.add("lamb");
      if (l.includes("fish")) ids.add("fish");
      if (l.includes("oil") || l.includes("ghee")) ids.add("cooking_oil");
      if (l.includes("onion")) ids.add("onions");
      if (l.includes("tomato")) ids.add("tomatoes");
      if (l.includes("egg")) ids.add("eggs");
      if (l.includes("dal") || l.includes("lentil") || l.includes("bean")) ids.add("lentils");
      if (l.includes("chickpea") || l.includes("tahini")) ids.add("chickpeas");
      if (l.includes("potato")) ids.add("potatoes");
      if (l.includes("flour") || l.includes("parota") || l.includes("bread") || l.includes("pita") || l.includes("semolina")) ids.add("flour");
      if (l.includes("milk") || l.includes("cheese") || l.includes("butter") || l.includes("yogurt")) ids.add("milk");
      if (l.includes("spice") || l.includes("chilli") || l.includes("pepper") || l.includes("salt") || l.includes("masala")) ids.add("spices");
    }
  }

  // Kitchen staples
  ids.add("cooking_oil");
  ids.add("spices");
  if (!ids.has("onions") && !ids.has("eggs") && !ids.has("flour")) ids.add("onions");

  return Array.from(ids).slice(0, 5);
}

/**
 * Builds upcoming dishes from both database menu dishes and the complete DISH_RECIPES catalog
 */
export function buildCatalogUpcomingDishes(
  dbDishes: any[] = [],
  campHeadcount: number = 1000,
  campName?: string
): UpcomingDish[] {
  const result: UpcomingDish[] = [];
  const seenNames = new Set<string>();

  // Days progression for scheduling
  const days = ["Today", "Tomorrow", "Day +2", "Day +3", "Day +4", "Day +5", "Day +6"];

  // 1. First add all dishes saved in database
  dbDishes.forEach((d, idx) => {
    const name = d.name || "Custom Dish";
    seenNames.add(name.toLowerCase());
    const session = (d.meal_type || "Lunch") as "Breakfast" | "Lunch" | "Dinner";
    const day = days[idx % days.length];

    const portionsMultiplier = session === "Breakfast" ? 0.85 : session === "Lunch" ? 0.55 : 0.92;
    const expectedPortions = Math.max(50, Math.round(campHeadcount * portionsMultiplier));

    const ingNames = (d.menu_dish_ingredients || []).map((di: any) => di.ingredients?.name || "");
    const keyIngredientIds = mapRecipeToPantryIngredientIds(name, ingNames);

    result.push({
      id: d.id || `db_dish_${idx}`,
      name: d.name,
      mealSession: session,
      scheduledDay: day,
      expectedPortions,
      keyIngredientIds,
    });
  });

  // 2. Add catalog dishes from DISH_RECIPES that aren't already added
  let catIndex = 0;
  Object.entries(DISH_RECIPES).forEach(([dishKey, ings]) => {
    if (seenNames.has(dishKey.toLowerCase())) return;
    seenNames.add(dishKey.toLowerCase());

    const name = dishKey
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    // Infer meal session
    let session: "Breakfast" | "Lunch" | "Dinner" = "Lunch";
    const lKey = dishKey.toLowerCase();
    if (
      lKey.includes("parota") || lKey.includes("dosa") || lKey.includes("omelette") ||
      lKey.includes("toast") || lKey.includes("croissant") || lKey.includes("falafel") ||
      lKey.includes("idli") || lKey.includes("pancake") || lKey.includes("poori") ||
      lKey.includes("shakshuka") || lKey.includes("upma") || lKey.includes("waffle") ||
      lKey.includes("ful") || lKey.includes("cheese")
    ) {
      session = "Breakfast";
    } else if (
      lKey.includes("biryani") || lKey.includes("kabsa") || lKey.includes("curry") ||
      lKey.includes("bolognese") || lKey.includes("stroganoff") || lKey.includes("sayadieh")
    ) {
      session = "Lunch";
    } else {
      session = "Dinner";
    }

    const day = days[catIndex % days.length];
    catIndex++;

    const portionsMultiplier = session === "Breakfast" ? 0.85 : session === "Lunch" ? 0.55 : 0.92;
    const expectedPortions = Math.max(50, Math.round(campHeadcount * portionsMultiplier));

    const ingNames = ings.map((i) => i.name);
    const keyIngredientIds = mapRecipeToPantryIngredientIds(name, ingNames);

    result.push({
      id: `cat_${dishKey.replace(/[^a-z0-9]/g, "_")}`,
      name,
      mealSession: session,
      scheduledDay: day,
      expectedPortions,
      keyIngredientIds,
    });
  });

  return result.length > 0 ? result : UPCOMING_DISHES;
}

// ----------------------------------------------------------------------------
// 3. WHAT-IF SCENARIOS CONFIGURATION
// ----------------------------------------------------------------------------
export interface WhatIfState {
  extraWorkers200: boolean; // +20% consumption
  ramadanMode: boolean; // Increases rice/lamb/oil/spices/lentils consumption
  delayDelivery3Days: boolean; // Adds +3 days safety buffer to threshold
}

export const INITIAL_WHAT_IF_STATE: WhatIfState = {
  extraWorkers200: false,
  ramadanMode: false,
  delayDelivery3Days: false,
};

// ----------------------------------------------------------------------------
// 4. COMPUTED INGREDIENT & DISH SIMULATION
// ----------------------------------------------------------------------------
export interface ComputedIngredientStatus {
  item: IngredientStockItem;
  effectiveDailyUsage: number;
  remainingStock: number;
  daysOfCoverLeft: number;
  effectiveThreshold: number;
  status: "green" | "amber" | "red";
  hoursUntilExhausted: number;
  daysUntilExhausted: number;
  exhaustionDateStr: string;
  isOrderRequired: boolean;
  suggestedReorderQty: number;
  reorderCostSAR: number;
  urgencyLabel: string;
}

export interface ComputedDishHealth {
  dish: UpcomingDish;
  overallStatus: "green" | "amber" | "red";
  weakestIngredient: ComputedIngredientStatus;
  keyIngredientStatuses: ComputedIngredientStatus[];
  canServeMessage: string;
}

export interface SupplierOrderGroup {
  supplierName: string;
  contactEmail: string;
  leadTimeDays: number;
  items: Array<{
    id: string;
    name: string;
    suggestedQty: number;
    unit: string;
    unitPriceSAR: number;
    subtotalSAR: number;
    urgency: "critical" | "warning";
  }>;
  totalSAR: number;
}

export interface PantrySimulationResult {
  daysAhead: number;
  whatIfs: WhatIfState;
  ingredients: ComputedIngredientStatus[];
  dishes: ComputedDishHealth[];
  supplierGroups: SupplierOrderGroup[];
  kpis: {
    itemsToBuyToday: number;
    dishesAtRiskThisWeek: number;
    estimatedPurchaseValueSAR: number;
    stockoutsAvoidedThisMonth: number;
  };
}

/**
 * Calculates real-time 3D Pantry Skyline & Dish Health state
 */
export function calculatePantrySimulation(
  daysAhead: number,
  whatIfs: WhatIfState,
  customDishes?: UpcomingDish[],
  campHeadcount?: number
): PantrySimulationResult {
  const workerMultiplier = whatIfs.extraWorkers200 ? 1.2 : 1.0;
  const headcountScale = campHeadcount && campHeadcount > 0 ? campHeadcount / 1000 : 1.0;

  // 1. Compute each ingredient's dynamic state
  const ingredients: ComputedIngredientStatus[] = PANTRY_INGREDIENTS.map((item) => {
    let ramadanMultiplier = 1.0;
    if (whatIfs.ramadanMode) {
      if (["rice", "cooking_oil", "lentils", "spices"].includes(item.id)) ramadanMultiplier = 1.35;
      else if (["lamb", "chicken"].includes(item.id)) ramadanMultiplier = 1.25;
      else if (item.id === "milk") ramadanMultiplier = 1.20;
    }

    const effectiveDailyUsage = Number((item.avgDailyUsage * headcountScale * workerMultiplier * ramadanMultiplier).toFixed(1));
    const consumedSoFar = effectiveDailyUsage * daysAhead;
    const remainingStock = Math.max(0, Number((item.currentStock - consumedSoFar).toFixed(1)));
    
    // Days of cover remaining from selected timeline date
    const daysOfCoverLeft = effectiveDailyUsage > 0 
      ? Number((remainingStock / effectiveDailyUsage).toFixed(1))
      : 99.0;

    // Threshold adjustment: if deliveries are delayed 3 days, buffer must be 3 days larger!
    const effectiveThreshold = item.thresholdDays + (whatIfs.delayDelivery3Days ? 3 : 0);

    // Determine Status
    let status: "green" | "amber" | "red" = "green";
    if (daysOfCoverLeft < effectiveThreshold) {
      status = "red";
    } else if (daysOfCoverLeft <= effectiveThreshold + 2.0) {
      status = "amber";
    }

    // Exhaustion timer
    const totalDaysAvailable = item.avgDailyUsage > 0 ? item.currentStock / effectiveDailyUsage : 99;
    const daysUntilExhausted = Math.max(0, Number((totalDaysAvailable - daysAhead).toFixed(1)));
    const hoursUntilExhausted = Math.round(daysUntilExhausted * 24);

    const exhaustionDate = new Date();
    exhaustionDate.setDate(exhaustionDate.getDate() + Math.round(daysUntilExhausted));
    const exhaustionDateStr = exhaustionDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

    // Reorder calculations (Target 12 days buffer)
    const targetBufferDays = 12;
    const targetStock = targetBufferDays * effectiveDailyUsage;
    const suggestedReorderQty = Math.max(0, Math.ceil(targetStock - remainingStock));
    const reorderCostSAR = Math.round(suggestedReorderQty * item.unitPriceSAR);

    const isOrderRequired = status === "red" || status === "amber";

    let urgencyLabel = "Healthy Buffer";
    if (status === "red") {
      urgencyLabel = daysUntilExhausted <= 1 ? "Depleted in <24h" : `Runs out in ${Math.floor(daysUntilExhausted)}d ${hoursUntilExhausted % 24}h`;
    } else if (status === "amber") {
      urgencyLabel = `Order within ${Math.max(1, Math.round(daysOfCoverLeft - item.leadTimeDays))}d`;
    }

    return {
      item,
      effectiveDailyUsage,
      remainingStock,
      daysOfCoverLeft,
      effectiveThreshold,
      status,
      hoursUntilExhausted,
      daysUntilExhausted,
      exhaustionDateStr,
      isOrderRequired,
      suggestedReorderQty,
      reorderCostSAR,
      urgencyLabel,
    };
  });

  // Map by ID for quick lookups
  const ingredientMap = new Map<string, ComputedIngredientStatus>();
  ingredients.forEach((ing) => ingredientMap.set(ing.item.id, ing));

  // 2. Compute Dish Health Rings
  const dishesList = customDishes && customDishes.length > 0 ? customDishes : UPCOMING_DISHES;
  const dishes: ComputedDishHealth[] = dishesList.map((dish) => {
    const keyStatuses = dish.keyIngredientIds
      .map((id) => ingredientMap.get(id))
      .filter((s): s is ComputedIngredientStatus => Boolean(s));

    // Find the weakest ingredient (lowest days of cover)
    const sortedByCover = [...keyStatuses].sort((a, b) => a.daysOfCoverLeft - b.daysOfCoverLeft);
    const weakestIngredient = sortedByCover[0] || ingredients[0];

    // Overall dish status is limited by its weakest key ingredient
    const hasRed = keyStatuses.some((k) => k.status === "red");
    const hasAmber = keyStatuses.some((k) => k.status === "amber");

    const overallStatus: "green" | "amber" | "red" = hasRed ? "red" : (hasAmber ? "amber" : "green");

    let canServeMessage = "All ingredients stocked";
    if (overallStatus === "red") {
      canServeMessage = `Blocked by: ${weakestIngredient.item.name} (${weakestIngredient.daysOfCoverLeft}d left)`;
    } else if (overallStatus === "amber") {
      canServeMessage = `Low stock on: ${weakestIngredient.item.name} (${weakestIngredient.daysOfCoverLeft}d left)`;
    }

    return {
      dish,
      overallStatus,
      weakestIngredient,
      keyIngredientStatuses: keyStatuses,
      canServeMessage,
    };
  });

  // 3. Smart Buy List grouped by Supplier
  const supplierMap = new Map<string, SupplierOrderGroup>();

  ingredients
    .filter((ing) => ing.isOrderRequired)
    .forEach((ing) => {
      const sName = ing.item.supplierName;
      if (!supplierMap.has(sName)) {
        supplierMap.set(sName, {
          supplierName: sName,
          contactEmail: ing.item.supplierContact,
          leadTimeDays: ing.item.leadTimeDays,
          items: [],
          totalSAR: 0,
        });
      }

      const group = supplierMap.get(sName)!;
      const subtotalSAR = ing.reorderCostSAR;
      group.items.push({
        id: ing.item.id,
        name: ing.item.name,
        suggestedQty: ing.suggestedReorderQty,
        unit: ing.item.unit,
        unitPriceSAR: ing.item.unitPriceSAR,
        subtotalSAR,
        urgency: ing.status === "red" ? "critical" : "warning",
      });
      group.totalSAR += subtotalSAR;
    });

  const supplierGroups = Array.from(supplierMap.values()).sort((a, b) => b.totalSAR - a.totalSAR);

  // 4. KPIs
  const itemsToBuyToday = ingredients.filter((ing) => ing.status === "red").length;
  const dishesAtRiskThisWeek = dishes.filter((d) => d.overallStatus !== "green").length;
  const estimatedPurchaseValueSAR = supplierGroups.reduce((acc, g) => acc + g.totalSAR, 0);
  const stockoutsAvoidedThisMonth = 14 + (whatIfs.delayDelivery3Days ? 6 : 0) + (whatIfs.extraWorkers200 ? 4 : 0);

  return {
    daysAhead,
    whatIfs,
    ingredients,
    dishes,
    supplierGroups,
    kpis: {
      itemsToBuyToday,
      dishesAtRiskThisWeek,
      estimatedPurchaseValueSAR,
      stockoutsAvoidedThisMonth,
    },
  };
}
