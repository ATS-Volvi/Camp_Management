/**
 * Enterprise Catering & Kitchen Operations Suite Data Engine
 * Models the 6 core pillars:
 * 1. Menu & Production Planning (Recipe BOM & Scaling)
 * 2. Inventory & Procurement (Inter-Site Transfers & Redistribution Radar)
 * 3. Food Cost & DMC (3D Financial Skyline & Budget Ceilings)
 * 4. Meal Management (Dining Hall Digital Twin & Zero-Duplicate Shield)
 * 5. Waste & Quality Control (FIFO Shelf-Life Vault & Recipe Rescue)
 * 6. Reporting & Billing (Aramco Audit Cube & SAP Reconciliation)
 */

// ============================================================================
// 1. MENU & PRODUCTION PLANNING (RECIPE BOM & SCALER)
// ============================================================================

export interface RecipeIngredientBOM {
  ingredientId: string;
  name: string;
  category: "Protein" | "Grain" | "Vegetable" | "Dairy" | "Spices" | "Oil";
  unit: string;
  baseQtyPer100Pax: number;
  unitCostSAR: number;
  warehouseStock: number; // Current stock in camp store
  prepStation: "Butchery" | "Rice & Grain Prep" | "Hot Range" | "Cold Larder" | "Bakery";
  colorHex: string;
}

export interface DishRecipeMaster {
  id: string;
  name: string;
  arabicName: string;
  cuisine: string;
  mealSession: "Breakfast" | "Lunch" | "Dinner" | "Suhoor" | "Iftar";
  basePortions: number;
  prepTimeMinutes: number;
  cookingTimeMinutes: number;
  ingredients: RecipeIngredientBOM[];
  chefInstructions: string[];
}

export const ENTERPRISE_RECIPES: DishRecipeMaster[] = [
  {
    id: "dish-biryani",
    name: "Chicken Dum Biryani",
    arabicName: "برياني دجاج دوم",
    cuisine: "Hyderabadi / Gulf",
    mealSession: "Lunch",
    basePortions: 100,
    prepTimeMinutes: 45,
    cookingTimeMinutes: 60,
    ingredients: [
      { ingredientId: "ing-chicken", name: "Fresh Chicken (Clean Cut)", category: "Protein", unit: "kg", baseQtyPer100Pax: 18.0, unitCostSAR: 26, warehouseStock: 210, prepStation: "Butchery", colorHex: "#f97316" },
      { ingredientId: "ing-rice", name: "Basmati Sella Rice", category: "Grain", unit: "kg", baseQtyPer100Pax: 8.5, unitCostSAR: 6, warehouseStock: 140, prepStation: "Rice & Grain Prep", colorHex: "#eab308" },
      { ingredientId: "ing-oil", name: "Corn Cooking Oil", category: "Oil", unit: "L", baseQtyPer100Pax: 2.5, unitCostSAR: 12, warehouseStock: 26, prepStation: "Hot Range", colorHex: "#84cc16" },
      { ingredientId: "ing-onion", name: "Red Onions (Sliced)", category: "Vegetable", unit: "kg", baseQtyPer100Pax: 4.0, unitCostSAR: 3.5, warehouseStock: 55, prepStation: "Cold Larder", colorHex: "#a855f7" },
      { ingredientId: "ing-yogurt", name: "Fresh Plain Yogurt", category: "Dairy", unit: "kg", baseQtyPer100Pax: 3.0, unitCostSAR: 8, warehouseStock: 35, prepStation: "Cold Larder", colorHex: "#06b6d4" },
      { ingredientId: "ing-spices", name: "Biryani Garam Masala & Saffron", category: "Spices", unit: "kg", baseQtyPer100Pax: 0.8, unitCostSAR: 45, warehouseStock: 12, prepStation: "Hot Range", colorHex: "#ec4899" },
    ],
    chefInstructions: [
      "Marinate bone-in chicken in yogurt, ginger-garlic paste, and spices for 45 minutes.",
      "Par-boil basmati rice with whole spices until 70% cooked (approx 6 minutes in rolling boil).",
      "Layer marinated protein at bottom of deg/pot, top with par-boiled rice and caramelized onions.",
      "Seal pot with dough/foil and cook on low dum heat for 40 minutes.",
    ],
  },
  {
    id: "dish-kabsa",
    name: "Saudi Lamb Kabsa",
    arabicName: "كبسة لحم ضأن سعودية",
    cuisine: "Traditional Saudi",
    mealSession: "Dinner",
    basePortions: 100,
    prepTimeMinutes: 40,
    cookingTimeMinutes: 75,
    ingredients: [
      { ingredientId: "ing-lamb", name: "Fresh Local Lamb", category: "Protein", unit: "kg", baseQtyPer100Pax: 20.0, unitCostSAR: 65, warehouseStock: 180, prepStation: "Butchery", colorHex: "#ef4444" },
      { ingredientId: "ing-rice", name: "Long Grain Rice", category: "Grain", unit: "kg", baseQtyPer100Pax: 9.0, unitCostSAR: 6, warehouseStock: 140, prepStation: "Rice & Grain Prep", colorHex: "#eab308" },
      { ingredientId: "ing-oil", name: "Ghee & Vegetable Oil Blend", category: "Oil", unit: "L", baseQtyPer100Pax: 3.0, unitCostSAR: 15, warehouseStock: 30, prepStation: "Hot Range", colorHex: "#84cc16" },
      { ingredientId: "ing-tomato", name: "Crushed Plum Tomatoes", category: "Vegetable", unit: "kg", baseQtyPer100Pax: 5.0, unitCostSAR: 4, warehouseStock: 48, prepStation: "Cold Larder", colorHex: "#f43f5e" },
      { ingredientId: "ing-spices", name: "Loomi (Dried Lime) & Kabsa Spices", category: "Spices", unit: "kg", baseQtyPer100Pax: 1.0, unitCostSAR: 40, warehouseStock: 15, prepStation: "Hot Range", colorHex: "#ec4899" },
    ],
    chefInstructions: [
      "Sear lamb chunks in ghee until golden brown, add chopped onions and whole spices.",
      "Add tomato puree and water, simmer under pressure until lamb is fork tender (45 mins).",
      "Remove lamb pieces to broil in oven for golden crispness.",
      "Cook spiced rice directly in seasoned lamb stock broth.",
    ],
  },
  {
    id: "dish-dal-tadka",
    name: "Yellow Dal Tadka & Jeera Rice",
    arabicName: "عدس تادكا مع أرز كمون",
    cuisine: "Indian Vegetarian",
    mealSession: "Lunch",
    basePortions: 100,
    prepTimeMinutes: 20,
    cookingTimeMinutes: 35,
    ingredients: [
      { ingredientId: "ing-dal", name: "Toor & Moong Lentils", category: "Grain", unit: "kg", baseQtyPer100Pax: 6.0, unitCostSAR: 7, warehouseStock: 95, prepStation: "Rice & Grain Prep", colorHex: "#f59e0b" },
      { ingredientId: "ing-rice", name: "Basmati Rice", category: "Grain", unit: "kg", baseQtyPer100Pax: 8.0, unitCostSAR: 6, warehouseStock: 140, prepStation: "Rice & Grain Prep", colorHex: "#eab308" },
      { ingredientId: "ing-oil", name: "Refined Sunflower Oil", category: "Oil", unit: "L", baseQtyPer100Pax: 2.0, unitCostSAR: 12, warehouseStock: 26, prepStation: "Hot Range", colorHex: "#84cc16" },
      { ingredientId: "ing-tomato", name: "Fresh Tomatoes (Diced)", category: "Vegetable", unit: "kg", baseQtyPer100Pax: 4.0, unitCostSAR: 4, warehouseStock: 48, prepStation: "Cold Larder", colorHex: "#f43f5e" },
      { ingredientId: "ing-spices", name: "Cumin, Garlic & Mustard Tadka", category: "Spices", unit: "kg", baseQtyPer100Pax: 0.6, unitCostSAR: 35, warehouseStock: 10, prepStation: "Hot Range", colorHex: "#ec4899" },
    ],
    chefInstructions: [
      "Pressure cook washed lentils with turmeric and salt until velvety smooth.",
      "In a separate skillet, prepare temper (tadka) with garlic, cumin, green chillies and ghee.",
      "Pour sizzled tadka over hot lentils and garnish with fresh coriander.",
    ],
  },
];

export interface ScaledRecipeResult {
  pax: number;
  scaleFactor: number;
  totalCostSAR: number;
  costPerPersonSAR: number;
  ingredients: Array<{
    bom: RecipeIngredientBOM;
    scaledQty: number;
    subtotalSAR: number;
    hasStockShortage: boolean;
    shortageQty: number;
  }>;
  stationWorkload: Array<{
    station: string;
    totalWeightKg: number;
    itemCount: number;
  }>;
}

export function scaleRecipe(recipe: DishRecipeMaster, pax: number): ScaledRecipeResult {
  const scaleFactor = pax / recipe.basePortions;
  let totalCostSAR = 0;
  const stationMap = new Map<string, { weight: number; count: number }>();

  const scaledIngredients = recipe.ingredients.map((ing) => {
    const scaledQty = Number((ing.baseQtyPer100Pax * scaleFactor).toFixed(2));
    const subtotalSAR = Number((scaledQty * ing.unitCostSAR).toFixed(2));
    totalCostSAR += subtotalSAR;

    const hasStockShortage = scaledQty > ing.warehouseStock;
    const shortageQty = hasStockShortage ? Number((scaledQty - ing.warehouseStock).toFixed(2)) : 0;

    const station = ing.prepStation;
    const current = stationMap.get(station) || { weight: 0, count: 0 };
    stationMap.set(station, {
      weight: current.weight + scaledQty,
      count: current.count + 1,
    });

    return {
      bom: ing,
      scaledQty,
      subtotalSAR,
      hasStockShortage,
      shortageQty,
    };
  });

  const stationWorkload = Array.from(stationMap.entries()).map(([station, val]) => ({
    station,
    totalWeightKg: Number(val.weight.toFixed(1)),
    itemCount: val.count,
  }));

  return {
    pax,
    scaleFactor,
    totalCostSAR: Number(totalCostSAR.toFixed(2)),
    costPerPersonSAR: Number((totalCostSAR / pax).toFixed(2)),
    ingredients: scaledIngredients,
    stationWorkload,
  };
}

// ----------------------------------------------------------------------------
// PORTION CONTROL & MEAL FORECASTING & PLANNED VS ACTUAL PRODUCTION
// ----------------------------------------------------------------------------

export interface PortionControlSpec {
  dishId: string;
  componentName: string;
  targetServingGrams: number;
  toleranceGrams: number;
  ladleScoopSize: string;
  targetTempServingC: number;
}

export const SAMPLE_PORTION_SPECS: Record<string, PortionControlSpec[]> = {
  "dish-biryani": [
    { dishId: "dish-biryani", componentName: "Marinated Cooked Chicken", targetServingGrams: 180, toleranceGrams: 10, ladleScoopSize: "Tongs (2 pieces)", targetTempServingC: 72 },
    { dishId: "dish-biryani", componentName: "Aromatic Basmati Rice", targetServingGrams: 220, toleranceGrams: 15, ladleScoopSize: "No. 4 Grey Handle Dishers (250ml)", targetTempServingC: 68 },
    { dishId: "dish-biryani", componentName: "Mint Cucumber Raita", targetServingGrams: 80, toleranceGrams: 5, ladleScoopSize: "3oz Ladle", targetTempServingC: 4 },
  ],
  "dish-kabsa": [
    { dishId: "dish-kabsa", componentName: "Slow Cooked Lamb Chunks", targetServingGrams: 200, toleranceGrams: 10, ladleScoopSize: "Tongs / Slotted Spoon", targetTempServingC: 74 },
    { dishId: "dish-kabsa", componentName: "Spiced Kabsa Rice", targetServingGrams: 240, toleranceGrams: 15, ladleScoopSize: "No. 4 Grey Dishers (250ml)", targetTempServingC: 68 },
    { dishId: "dish-kabsa", componentName: "Daqaq Salsa Dip", targetServingGrams: 60, toleranceGrams: 5, ladleScoopSize: "2oz Ladle", targetTempServingC: 4 },
  ],
  "dish-dal-tadka": [
    { dishId: "dish-dal-tadka", componentName: "Yellow Dal Tadka", targetServingGrams: 180, toleranceGrams: 10, ladleScoopSize: "6oz Soup Ladle", targetTempServingC: 75 },
    { dishId: "dish-dal-tadka", componentName: "Steamed Jeera Rice", targetServingGrams: 200, toleranceGrams: 15, ladleScoopSize: "No. 5 Dishers", targetTempServingC: 68 },
    { dishId: "dish-dal-tadka", componentName: "Mixed Pickles & Salad", targetServingGrams: 50, toleranceGrams: 5, ladleScoopSize: "Tongs (Standard)", targetTempServingC: 5 },
  ],
};

export interface ProductionVarianceRecord {
  id: string;
  date: string;
  mealSession: "Breakfast" | "Lunch" | "Dinner";
  dishId: string;
  dishName: string;
  forecastPax: number;
  plannedPax: number;
  safetyBufferPct: number;
  targetCookPax: number;
  actualCookedPax: number;
  actualConsumedPax: number;
  leftoverPax: number;
  leftoverPct: number;
  costPerHeadSAR: number;
  varianceSAR: number;
  disposition: "blast_chill_reuse" | "consumed_perfect" | "haccp_discard";
  dispositionNotes: string;
  headChefSignOff: string;
  status: "reconciled" | "in_service" | "prep";
}

export const SAMPLE_PRODUCTION_LOGS: ProductionVarianceRecord[] = [
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
    id: "PROD-2026-1122-D01",
    date: "2026-11-22",
    mealSession: "Dinner",
    dishId: "dish-kabsa",
    dishName: "Saudi Lamb Kabsa",
    forecastPax: 1100,
    plannedPax: 550,
    safetyBufferPct: 5.0,
    targetCookPax: 577,
    actualCookedPax: 580,
    actualConsumedPax: 562,
    leftoverPax: 18,
    leftoverPct: 3.1,
    costPerHeadSAR: 15.55,
    varianceSAR: 279.90,
    disposition: "blast_chill_reuse",
    dispositionNotes: "Portioned into HACCP GN-pans and labeled for cold storage holding at 2°C.",
    headChefSignOff: "Chef de Cuisine Joseph",
    status: "reconciled",
  },
];

// ============================================================================
// 2. INVENTORY & PROCUREMENT (INTER-CAMP REDISTRIBUTION RADAR)
// ============================================================================

export interface CampClusterNode {
  id: string;
  name: string;
  code: string;
  occupancy: number;
  coords: [number, number]; // 3D coordinates on terrain [x, z]
  distanceKmFromBase: number;
  oilDaysCover: number; // e.g. Cooking Oil days of cover left
  chickenDaysCover: number;
  riceDaysCover: number;
}

export const CAMP_CLUSTER_NODES: CampClusterNode[] = [
  { id: "camp-01", name: "Camp-01 Tanajib Main", code: "TAN-01", occupancy: 1250, coords: [0, 0], distanceKmFromBase: 0, oilDaysCover: 1.8, chickenDaysCover: 2.2, riceDaysCover: 8.5 },
  { id: "camp-02", name: "Camp-02 Marjan Coastal", code: "MRJ-02", occupancy: 820, coords: [18, -12], distanceKmFromBase: 21.6, oilDaysCover: 7.4, chickenDaysCover: 6.0, riceDaysCover: 12.0 },
  { id: "camp-03", name: "Camp-03 Berri Base", code: "BER-03", occupancy: 650, coords: [-16, 14], distanceKmFromBase: 21.2, oilDaysCover: 5.0, chickenDaysCover: 5.5, riceDaysCover: 9.0 },
  { id: "camp-04", name: "Camp-04 Rig Central Hub", code: "RIG-04", occupancy: 1100, coords: [24, 20], distanceKmFromBase: 31.2, oilDaysCover: 14.5, chickenDaysCover: 12.0, riceDaysCover: 18.0 },
  { id: "camp-05", name: "Camp-05 EPC North Facility", code: "EPC-05", occupancy: 490, coords: [-22, -18], distanceKmFromBase: 28.4, oilDaysCover: 9.0, chickenDaysCover: 8.0, riceDaysCover: 11.5 },
];

export interface InterCampTransferManifest {
  id: string;
  transferNumber: string;
  sourceCamp: CampClusterNode;
  destCamp: CampClusterNode;
  item: string;
  qty: number;
  unit: string;
  valueSAR: number;
  distanceKm: number;
  estimatedDriveMins: number;
  driverName: string;
  plateNumber: string;
  status: "proposed" | "in_transit" | "delivered";
  savingsVsSupplierSAR: number;
}

export const SAMPLE_TRANSFERS: InterCampTransferManifest[] = [
  {
    id: "tr-001",
    transferNumber: "TR-2026-ARAMCO-0042",
    sourceCamp: CAMP_CLUSTER_NODES[3], // Rig Central Hub
    destCamp: CAMP_CLUSTER_NODES[0], // Tanajib Main
    item: "Corn Cooking Oil",
    qty: 40,
    unit: "L",
    valueSAR: 480,
    distanceKm: 31.2,
    estimatedDriveMins: 38,
    driverName: "Mansour Al-Harbi",
    plateNumber: "KSA-7741-KBL",
    status: "in_transit",
    savingsVsSupplierSAR: 1450,
  },
  {
    id: "tr-002",
    transferNumber: "TR-2026-ARAMCO-0043",
    sourceCamp: CAMP_CLUSTER_NODES[1], // Marjan
    destCamp: CAMP_CLUSTER_NODES[0], // Tanajib Main
    item: "Fresh Chicken (Clean Cut)",
    qty: 60,
    unit: "kg",
    valueSAR: 1560,
    distanceKm: 21.6,
    estimatedDriveMins: 26,
    driverName: "Zaid Tariq",
    plateNumber: "KSA-9122-NRD",
    status: "proposed",
    savingsVsSupplierSAR: 2100,
  },
];

// ----------------------------------------------------------------------------
// STOCK ISSUANCE & CONSUMPTION TRACKING & PHYSICAL RECONCILIATION
// ----------------------------------------------------------------------------

export interface KitchenStockIssuanceRecord {
  id: string;
  sapReservationDoc: string;
  sapMovementType: "MIGO 201 (Kitchen Cost Center)";
  date: string;
  mealSession: "Breakfast" | "Lunch" | "Dinner";
  targetDish: string;
  requestedByChef: string;
  issuedByStorekeeper: string;
  items: Array<{
    materialCode: string;
    name: string;
    qty: number;
    unit: string;
    storageZone: string;
    unitCostSAR: number;
    subtotalSAR: number;
  }>;
  totalValueSAR: number;
  status: "issued_to_kitchen" | "draft" | "returned_surplus";
}

export const SAMPLE_STOCK_ISSUANCES: KitchenStockIssuanceRecord[] = [
  {
    id: "ISSUE-2026-1123-01",
    sapReservationDoc: "RES-90048210",
    sapMovementType: "MIGO 201 (Kitchen Cost Center)",
    date: "2026-11-23 09:30",
    mealSession: "Lunch",
    targetDish: "Chicken Dum Biryani (680 Pax)",
    requestedByChef: "Executive Chef Tariq Al-Sayed",
    issuedByStorekeeper: "Chief Storekeeper Salem Al-Ghamdi",
    items: [
      { materialCode: "MAT-CHK-01", name: "Fresh Chicken (Clean Cut)", qty: 122.4, unit: "kg", storageZone: "Walk-in Chiller 1", unitCostSAR: 26, subtotalSAR: 3182.4 },
      { materialCode: "MAT-RIC-02", name: "Basmati Sella Rice", qty: 57.8, unit: "kg", storageZone: "Dry Pantry 3", unitCostSAR: 6, subtotalSAR: 346.8 },
      { materialCode: "MAT-OIL-03", name: "Corn Cooking Oil", qty: 17.0, unit: "L", storageZone: "Dry Store A", unitCostSAR: 12, subtotalSAR: 204.0 },
      { materialCode: "MAT-YOG-04", name: "Fresh Plain Yogurt", qty: 20.4, unit: "kg", storageZone: "Walk-in Chiller 1", unitCostSAR: 8, subtotalSAR: 163.2 },
      { materialCode: "MAT-SPC-05", name: "Biryani Garam Masala & Saffron", qty: 5.4, unit: "kg", storageZone: "Spices Vault", unitCostSAR: 45, subtotalSAR: 243.0 },
    ],
    totalValueSAR: 4139.4,
    status: "issued_to_kitchen",
  },
  {
    id: "ISSUE-2026-1123-02",
    sapReservationDoc: "RES-90048215",
    sapMovementType: "MIGO 201 (Kitchen Cost Center)",
    date: "2026-11-23 10:15",
    mealSession: "Lunch",
    targetDish: "Yellow Dal Tadka (435 Pax)",
    requestedByChef: "Sous Chef Ramanathan",
    issuedByStorekeeper: "Storekeeper Fahad Al-Dossary",
    items: [
      { materialCode: "MAT-LEN-08", name: "Toor & Moong Lentils", qty: 26.1, unit: "kg", storageZone: "Dry Pantry 3", unitCostSAR: 7, subtotalSAR: 182.7 },
      { materialCode: "MAT-RIC-02", name: "Basmati Sella Rice", qty: 34.8, unit: "kg", storageZone: "Dry Pantry 3", unitCostSAR: 6, subtotalSAR: 208.8 },
      { materialCode: "MAT-TOM-11", name: "Fresh Tomatoes (Diced)", qty: 17.4, unit: "kg", storageZone: "Walk-in Chiller 2", unitCostSAR: 4, subtotalSAR: 69.6 },
    ],
    totalValueSAR: 461.1,
    status: "issued_to_kitchen",
  },
];

export interface InventoryConsumptionVelocity {
  materialCode: string;
  name: string;
  category: "Protein" | "Grain" | "Produce" | "Dairy" | "Oils" | "Spices";
  currentStock: number;
  unit: string;
  dailyBurnRate: number;
  daysCoverRemaining: number;
  reorderPoint: number;
  safetyStock: number;
  status: "healthy" | "reorder_warning" | "critical_stockout";
  lastSapPoRef: string;
}

export const SAMPLE_CONSUMPTION_VELOCITY: InventoryConsumptionVelocity[] = [
  { materialCode: "MAT-CHK-01", name: "Fresh Chicken (Clean Cut)", category: "Protein", currentStock: 210, unit: "kg", dailyBurnRate: 95.0, daysCoverRemaining: 2.2, reorderPoint: 250, safetyStock: 100, status: "reorder_warning", lastSapPoRef: "SAP-PO-45009182" },
  { materialCode: "MAT-RIC-02", name: "Basmati Sella Rice (50kg)", category: "Grain", currentStock: 650, unit: "kg", dailyBurnRate: 72.0, daysCoverRemaining: 9.0, reorderPoint: 300, safetyStock: 150, status: "healthy", lastSapPoRef: "SAP-PO-45009144" },
  { materialCode: "MAT-OIL-03", name: "Corn Cooking Oil (20L)", category: "Oils", currentStock: 36, unit: "L", dailyBurnRate: 20.0, daysCoverRemaining: 1.8, reorderPoint: 80, safetyStock: 40, status: "critical_stockout", lastSapPoRef: "SAP-PO-45009190" },
  { materialCode: "MAT-TOM-11", name: "Plum Tomatoes (Vine Ripe)", category: "Produce", currentStock: 85, unit: "kg", dailyBurnRate: 35.0, daysCoverRemaining: 2.4, reorderPoint: 100, safetyStock: 30, status: "reorder_warning", lastSapPoRef: "SAP-PO-45009167" },
  { materialCode: "MAT-LMB-07", name: "Local Fresh Lamb", category: "Protein", currentStock: 180, unit: "kg", dailyBurnRate: 60.0, daysCoverRemaining: 3.0, reorderPoint: 120, safetyStock: 50, status: "healthy", lastSapPoRef: "SAP-PO-45009170" },
];

export interface PhysicalInventoryReconciliationRecord {
  itemCode: string;
  name: string;
  storageLocation: string;
  bookStock: number;
  physicalCount: number;
  unit: string;
  varianceQty: number;
  variancePct: number;
  unitCostSAR: number;
  varianceSAR: number;
  reasonCode: "Moisture / Thawing Loss" | "Trimming / Preparation" | "Counting Discrepancy" | "Normal Shelf Evaporation" | "Damaged / Spoilage";
  sapAdjustmentDoc: string;
  status: "reconciled_posted" | "audit_pending";
}

export const SAMPLE_PHYSICAL_RECONCILIATIONS: PhysicalInventoryReconciliationRecord[] = [
  { itemCode: "MAT-CHK-01", name: "Fresh Chicken (Clean Cut)", storageLocation: "Walk-in Chiller 1", bookStock: 214.0, physicalCount: 210.0, unit: "kg", varianceQty: -4.0, variancePct: -1.9, unitCostSAR: 26.0, varianceSAR: -104.0, reasonCode: "Moisture / Thawing Loss", sapAdjustmentDoc: "MI07-DOC-2026-7719", status: "reconciled_posted" },
  { itemCode: "MAT-RIC-02", name: "Basmati Sella Rice", storageLocation: "Dry Pantry 3", bookStock: 650.0, physicalCount: 650.0, unit: "kg", varianceQty: 0.0, variancePct: 0.0, unitCostSAR: 6.0, varianceSAR: 0.0, reasonCode: "Counting Discrepancy", sapAdjustmentDoc: "MI07-DOC-2026-7720", status: "reconciled_posted" },
  { itemCode: "MAT-TOM-11", name: "Plum Tomatoes", storageLocation: "Walk-in Chiller 2", bookStock: 88.0, physicalCount: 85.0, unit: "kg", varianceQty: -3.0, variancePct: -3.4, unitCostSAR: 4.0, varianceSAR: -12.0, reasonCode: "Trimming / Preparation", sapAdjustmentDoc: "MI07-DOC-2026-7721", status: "reconciled_posted" },
  { itemCode: "MAT-OIL-03", name: "Corn Cooking Oil", storageLocation: "Dry Store A", bookStock: 36.0, physicalCount: 36.0, unit: "L", varianceQty: 0.0, variancePct: 0.0, unitCostSAR: 12.0, varianceSAR: 0.0, reasonCode: "Counting Discrepancy", sapAdjustmentDoc: "MI07-DOC-2026-7722", status: "reconciled_posted" },
];

// ============================================================================
// 3. FOOD COST & DMC (3D FINANCIAL SKYLINE & CPH BUDGET CEILING)
// ============================================================================

export interface ProjectDmcRecord {
  projectCode: string;
  projectName: string;
  contractClient: string;
  headcount: number;
  sessions: {
    breakfast: { cph: number; totalCostSAR: number };
    lunch: { cph: number; totalCostSAR: number };
    dinner: { cph: number; totalCostSAR: number };
    fieldPack: { cph: number; totalCostSAR: number };
  };
  totalDailyDmcSAR: number;
  overallCphSAR: number;
  budgetCeilingCphSAR: number; // Contractual cap, e.g. 18.50 SAR
  status: "under_budget" | "over_budget";
  varianceSAR: number;
  topCostDriver: string;
}

export const PROJECT_DMC_DATA: ProjectDmcRecord[] = [
  {
    projectCode: "MRJ-EXP",
    projectName: "Aramco Marjan Expansion",
    contractClient: "Saudi Aramco Offshore",
    headcount: 420,
    sessions: {
      breakfast: { cph: 4.2, totalCostSAR: 1764 },
      lunch: { cph: 8.8, totalCostSAR: 3696 },
      dinner: { cph: 8.5, totalCostSAR: 3570 },
      fieldPack: { cph: 2.1, totalCostSAR: 882 },
    },
    totalDailyDmcSAR: 9912,
    overallCphSAR: 23.6,
    budgetCeilingCphSAR: 20.0,
    status: "over_budget",
    varianceSAR: 3.6,
    topCostDriver: "Fresh Mutton & Premium Basmati",
  },
  {
    projectCode: "TAN-GAS",
    projectName: "Tanajib Gas Plant Project",
    contractClient: "Aramco / EPC JV",
    headcount: 380,
    sessions: {
      breakfast: { cph: 3.8, totalCostSAR: 1444 },
      lunch: { cph: 6.9, totalCostSAR: 2622 },
      dinner: { cph: 6.5, totalCostSAR: 2470 },
      fieldPack: { cph: 1.5, totalCostSAR: 570 },
    },
    totalDailyDmcSAR: 7106,
    overallCphSAR: 18.7,
    budgetCeilingCphSAR: 19.5,
    status: "under_budget",
    varianceSAR: -0.8,
    topCostDriver: "Standard Poultry & Lentils",
  },
  {
    projectCode: "HERD-RIG",
    projectName: "Heavy Equipment Rental (HERD)",
    contractClient: "Contractor Fleet",
    headcount: 240,
    sessions: {
      breakfast: { cph: 3.2, totalCostSAR: 768 },
      lunch: { cph: 6.1, totalCostSAR: 1464 },
      dinner: { cph: 5.8, totalCostSAR: 1392 },
      fieldPack: { cph: 2.4, totalCostSAR: 576 },
    },
    totalDailyDmcSAR: 4200,
    overallCphSAR: 17.5,
    budgetCeilingCphSAR: 18.0,
    status: "under_budget",
    varianceSAR: -0.5,
    topCostDriver: "Packed Field Lunches",
  },
  {
    projectCode: "PMTA-PIPE",
    projectName: "Plant Maint. Tech Assistance (PMTA)",
    contractClient: "Aramco Pipeline Division",
    headcount: 310,
    sessions: {
      breakfast: { cph: 4.0, totalCostSAR: 1240 },
      lunch: { cph: 7.9, totalCostSAR: 2449 },
      dinner: { cph: 7.8, totalCostSAR: 2418 },
      fieldPack: { cph: 1.8, totalCostSAR: 558 },
    },
    totalDailyDmcSAR: 6665,
    overallCphSAR: 21.5,
    budgetCeilingCphSAR: 19.0,
    status: "over_budget",
    varianceSAR: 2.5,
    topCostDriver: "Unscheduled VIP Dinner Guests",
  },
  {
    projectCode: "MBS-MOD",
    projectName: "Modular Building Services (MBS)",
    contractClient: "Civil Camp Infrastructure",
    headcount: 150,
    sessions: {
      breakfast: { cph: 3.1, totalCostSAR: 465 },
      lunch: { cph: 5.8, totalCostSAR: 870 },
      dinner: { cph: 5.5, totalCostSAR: 825 },
      fieldPack: { cph: 1.2, totalCostSAR: 180 },
    },
    totalDailyDmcSAR: 2340,
    overallCphSAR: 15.6,
    budgetCeilingCphSAR: 17.5,
    status: "under_budget",
    varianceSAR: -1.9,
    topCostDriver: "Vegetarian Diet Ratio",
  },
];

// ============================================================================
// 4. MEAL MANAGEMENT (DINING HALL DIGITAL TWIN & ZERO-DUPLICATE SHIELD)
// ============================================================================

export interface ServingLineStatus {
  lineId: string;
  lineName: string;
  category: "Dietary" | "Arabic Regular" | "Asian Regular" | "Continental / VIP";
  currentThroughputPaxPerHour: number;
  queueCount: number;
  estWaitMins: number;
  status: "optimal" | "busy" | "congested";
  activeServerStaff: string;
}

export const SERVING_LINES: ServingLineStatus[] = [
  { lineId: "line-1", lineName: "Line 1 - Arabic Traditional", category: "Arabic Regular", currentThroughputPaxPerHour: 480, queueCount: 18, estWaitMins: 2.5, status: "optimal", activeServerStaff: "Chef Tariq & 2 Servers" },
  { lineId: "line-2", lineName: "Line 2 - Asian & Curry Buffet", category: "Asian Regular", currentThroughputPaxPerHour: 620, queueCount: 42, estWaitMins: 7.0, status: "congested", activeServerStaff: "Chef Rahman & 3 Servers" },
  { lineId: "line-3", lineName: "Line 3 - Continental / Grill", category: "Continental / VIP", currentThroughputPaxPerHour: 340, queueCount: 14, estWaitMins: 2.0, status: "optimal", activeServerStaff: "Chef Joseph & 2 Servers" },
  { lineId: "line-4", lineName: "Line 4 - Express Takeaway", category: "Dietary", currentThroughputPaxPerHour: 510, queueCount: 28, estWaitMins: 4.0, status: "busy", activeServerStaff: "Supervisor Al-Otaibi" },
];

export interface EmployeeMealScanRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  campId: string;
  scanTime: string;
  mealSession: "Breakfast" | "Lunch" | "Dinner";
  hasApprovedPackedLunch: boolean;
  packedLunchRef?: string;
  scanResult: "granted" | "blocked_duplicate" | "override_allowed";
  overrideReason?: string;
}

export const SIMULATED_RECENT_SCANS: EmployeeMealScanRecord[] = [
  { employeeId: "11009837", employeeName: "Rajesh Kumar", department: "PMTA", campId: "camp-01", scanTime: "12:14:02", mealSession: "Lunch", hasApprovedPackedLunch: true, packedLunchRef: "PL-2026-0814", scanResult: "blocked_duplicate" },
  { employeeId: "11004521", employeeName: "Ali Al-Ghamdi", department: "HERD", campId: "camp-01", scanTime: "12:14:15", mealSession: "Lunch", hasApprovedPackedLunch: false, scanResult: "granted" },
  { employeeId: "11007890", employeeName: "Mohammed Farooq", department: "PMTA", campId: "camp-01", scanTime: "12:14:32", mealSession: "Lunch", hasApprovedPackedLunch: true, packedLunchRef: "PL-2026-0819", scanResult: "override_allowed", overrideReason: "Field shift cancelled by Foreman" },
  { employeeId: "11003412", employeeName: "Sultan Al-Shammari", department: "MBS", campId: "camp-01", scanTime: "12:15:01", mealSession: "Lunch", hasApprovedPackedLunch: false, scanResult: "granted" },
];

// ============================================================================
// 5. WASTE & QUALITY CONTROL (FIFO EXPIRY VAULT & RECIPE RESCUE)
// ============================================================================

export interface InventoryBatchLot {
  lotId: string;
  ingredientName: string;
  category: "Dairy" | "Meat" | "Vegetable" | "Dry Store";
  supplierName: string;
  invoiceRef: string;
  storageZone: "Walk-in Chiller 1" | "Walk-in Chiller 2" | "Deep Freeze A" | "Dry Pantry 3";
  receivedDate: string;
  expiryDate: string;
  hoursUntilExpiry: number;
  initialQty: number;
  remainingQty: number;
  unit: string;
  status: "critical_rescue" | "warning" | "fresh";
  suggestedRescueRecipe?: string;
  haccpChillerTempC: number;
}

export const INVENTORY_BATCH_LOTS: InventoryBatchLot[] = [
  {
    lotId: "LOT-2026-CHK-092",
    ingredientName: "Fresh Chicken (Clean Cut)",
    category: "Meat",
    supplierName: "Al-Watania Poultry",
    invoiceRef: "INV-WAT-8819",
    storageZone: "Walk-in Chiller 1",
    receivedDate: "2026-11-20",
    expiryDate: "2026-11-24",
    hoursUntilExpiry: 36,
    initialQty: 180,
    remainingQty: 55,
    unit: "kg",
    status: "critical_rescue",
    suggestedRescueRecipe: "Chicken Dum Biryani (Cook tomorrow lunch)",
    haccpChillerTempC: 1.8,
  },
  {
    lotId: "LOT-2026-TOM-141",
    ingredientName: "Vine Ripe Tomatoes",
    category: "Vegetable",
    supplierName: "Eastern Produce Co.",
    invoiceRef: "INV-EPC-3041",
    storageZone: "Walk-in Chiller 2",
    receivedDate: "2026-11-19",
    expiryDate: "2026-11-25",
    hoursUntilExpiry: 48,
    initialQty: 120,
    remainingQty: 45,
    unit: "kg",
    status: "critical_rescue",
    suggestedRescueRecipe: "Yellow Dal Tadka / Shakshuka Prep",
    haccpChillerTempC: 3.4,
  },
  {
    lotId: "LOT-2026-YOG-055",
    ingredientName: "Plain Yogurt (10kg bucket)",
    category: "Dairy",
    supplierName: "Almarai Dairy Logistics",
    invoiceRef: "INV-ALM-9021",
    storageZone: "Walk-in Chiller 1",
    receivedDate: "2026-11-18",
    expiryDate: "2026-11-27",
    hoursUntilExpiry: 96,
    initialQty: 60,
    remainingQty: 25,
    unit: "kg",
    status: "warning",
    suggestedRescueRecipe: "Tandoori Chicken Marinade & Raita",
    haccpChillerTempC: 2.1,
  },
  {
    lotId: "LOT-2026-RIC-303",
    ingredientName: "Basmati Sella Rice (50kg bags)",
    category: "Dry Store",
    supplierName: "Al-Kabeer Grain Mills",
    invoiceRef: "INV-AKB-7711",
    storageZone: "Dry Pantry 3",
    receivedDate: "2026-11-01",
    expiryDate: "2027-11-01",
    hoursUntilExpiry: 8760,
    initialQty: 500,
    remainingQty: 320,
    unit: "kg",
    status: "fresh",
    haccpChillerTempC: 22.0,
  },
];

// ============================================================================
// 6. REPORTING & BILLING (ARAMCO AUDIT CUBE & SAP RECONCILIATION)
// ============================================================================

export interface AramcoBillingSummary {
  billingMonth: string;
  contractNumber: string;
  clientName: string;
  campLocation: string;
  layers: {
    inmateBedNights: { count: number; rateSAR: number; subtotalSAR: number };
    scannedDiningMeals: { count: number; rateSAR: number; subtotalSAR: number };
    approvedFieldPacks: { count: number; rateSAR: number; subtotalSAR: number };
    deductedCancellations: { count: number; creditSAR: number; subtotalSAR: number };
  };
  netInvoicedSAR: number;
  sapPostingDocument: string;
  sapStatus: "posted_verified" | "pending_review" | "variance_flagged";
  varianceSAR: number;
  auditSignOff: {
    campManager: string;
    clientRepresentative: string;
    timestamp: string;
  };
}

export const CURRENT_ARAMCO_BILLING_PACK: AramcoBillingSummary = {
  billingMonth: "November 2026",
  contractNumber: "ARAMCO-CON-660004921",
  clientName: "Saudi Aramco Community Services & Contractor Affairs",
  campLocation: "Tanajib Contractor Residential Complex (Cluster 4)",
  layers: {
    inmateBedNights: { count: 34500, rateSAR: 45.0, subtotalSAR: 1552500 },
    scannedDiningMeals: { count: 72400, rateSAR: 12.0, subtotalSAR: 868800 },
    approvedFieldPacks: { count: 18200, rateSAR: 14.5, subtotalSAR: 263900 },
    deductedCancellations: { count: 2150, creditSAR: -10.0, subtotalSAR: -21500 },
  },
  netInvoicedSAR: 2663700,
  sapPostingDocument: "SAP-DOC-2026-11-9004821",
  sapStatus: "posted_verified",
  varianceSAR: 0.0,
  auditSignOff: {
    campManager: "Eng. Fahad Al-Mutairi (Camp 365 Operations Director)",
    clientRepresentative: "Mr. Scott Harrison (Aramco Lead Site Auditor)",
    timestamp: "2026-11-23 09:30 UTC+3",
  },
};
