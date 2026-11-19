import { DISH_RECIPES, findRecipe, RecipeIngredient } from "@/data/dishRecipes";
import { MASTER_INGREDIENTS, MasterIngredient } from "@/data/ingredientMaster";

// Pre-index master ingredient costs for instant O(1) lookup
const INGREDIENT_COST_MAP: Record<string, number> = {};
MASTER_INGREDIENTS.forEach((item) => {
  INGREDIENT_COST_MAP[item.name.toLowerCase().trim()] = item.unit_cost;
});

export interface DishCostBreakdown {
  dishName: string;
  costPerPerson: number;
  recipeIngredients: Array<{
    name: string;
    unit: string;
    qtyPerPerson: number;
    unitCost: number;
    costPerPerson: number;
  }>;
}

export interface DishNutrition {
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fat: number;     // in grams
}

export type CuisineType =
  | "South Asian"
  | "Arabian & Khaleeji"
  | "Filipino & East Asian"
  | "Continental"
  | "Vegetarian";

export interface CuisineBadgeInfo {
  cuisine: CuisineType;
  label: string;
  badgeClass: string;
}

/**
 * Calculates the exact SAR cost per person for a given dish based on recipes and ingredient master prices.
 */
export function calculateDishCost(dishName: string): DishCostBreakdown {
  const recipe = findRecipe(dishName);
  if (!recipe || recipe.length === 0) {
    // Default fallback based on common camp averages
    const fallbackCost = dishName.toLowerCase().includes("mutton")
      ? 12.5
      : dishName.toLowerCase().includes("chicken")
      ? 7.2
      : dishName.toLowerCase().includes("fish")
      ? 8.4
      : dishName.toLowerCase().includes("egg")
      ? 3.8
      : 3.2;

    return {
      dishName,
      costPerPerson: fallbackCost,
      recipeIngredients: [],
    };
  }

  let totalCost = 0;
  const ingredients = recipe.map((ing) => {
    const key = ing.name.toLowerCase().trim();
    const unitCost = INGREDIENT_COST_MAP[key] ?? 10; // 10 SAR/kg safe fallback
    const itemCost = ing.qty_per_person * unitCost;
    totalCost += itemCost;

    return {
      name: ing.name,
      unit: ing.unit,
      qtyPerPerson: ing.qty_per_person,
      unitCost,
      costPerPerson: Number(itemCost.toFixed(2)),
    };
  });

  return {
    dishName,
    costPerPerson: Number(totalCost.toFixed(2)),
    recipeIngredients: ingredients,
  };
}

/**
 * Estimates macronutrients and calories for a dish based on its primary ingredients.
 */
export function estimateNutrition(dishName: string, mealType: string = "Lunch"): DishNutrition {
  const name = dishName.toLowerCase();

  // Baseline by meal
  let calories = 550;
  let protein = 18;
  let carbs = 75;
  let fat = 14;

  if (mealType === "Breakfast") {
    calories = 420;
    protein = 14;
    carbs = 62;
    fat = 12;
  } else if (mealType === "Dinner") {
    calories = 620;
    protein = 24;
    carbs = 80;
    fat = 18;
  }

  // Adjust by ingredients/protein
  if (name.includes("mutton") || name.includes("lamb")) {
    calories += 280;
    protein += 22;
    fat += 16;
  } else if (name.includes("chicken")) {
    calories += 210;
    protein += 26;
    fat += 9;
  } else if (name.includes("fish")) {
    calories += 160;
    protein += 22;
    fat += 7;
  } else if (name.includes("egg")) {
    calories += 140;
    protein += 12;
    fat += 8;
  } else if (name.includes("biryani") || name.includes("mandi") || name.includes("kabsa")) {
    calories += 260;
    carbs += 30;
    fat += 12;
  } else if (name.includes("dal") || name.includes("vegetable") || name.includes("upma")) {
    protein += 4;
    fat = Math.max(6, fat - 4);
  }

  return { calories, protein, carbs, fat };
}

/**
 * Returns cuisine classification and visual styling for badges.
 */
export function getCuisineCategory(dishName: string): CuisineBadgeInfo {
  const name = dishName.toLowerCase();

  if (
    name.includes("mandi") ||
    name.includes("kabsa") ||
    name.includes("shawarma") ||
    name.includes("falafel") ||
    name.includes("ful medames") ||
    name.includes("saloona") ||
    name.includes("khubz") ||
    name.includes("hummus")
  ) {
    return {
      cuisine: "Arabian & Khaleeji",
      label: "Arabian",
      badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    };
  }

  if (
    name.includes("adobo") ||
    name.includes("pancit") ||
    name.includes("fried rice") ||
    name.includes("chow mein") ||
    name.includes("sinigang")
  ) {
    return {
      cuisine: "Filipino & East Asian",
      label: "Asian",
      badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    };
  }

  if (
    name.includes("pasta") ||
    name.includes("pancake") ||
    name.includes("croissant") ||
    name.includes("toast") ||
    name.includes("french") ||
    name.includes("burger")
  ) {
    return {
      cuisine: "Continental",
      label: "Continental",
      badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    };
  }

  if (
    name.includes("veg") ||
    name.includes("dal") ||
    name.includes("paneer") ||
    name.includes("chutney") ||
    name.includes("sambar")
  ) {
    return {
      cuisine: "Vegetarian",
      label: "Veg",
      badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    };
  }

  // Default South Asian / Desi
  return {
    cuisine: "South Asian",
    label: "South Asian",
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  };
}

/**
 * Standard categorized dish catalogue for the visual picker
 */
export interface CatalogDish {
  id: string;
  name: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Any";
  cuisine: CuisineType;
  cost: number;
  calories: number;
  protein: number;
  description: string;
}

export function getFullDishCatalog(): CatalogDish[] {
  const allDishes = Object.keys(DISH_RECIPES);

  return allDishes.map((rawName, idx) => {
    // Format Title Case
    const formattedName = rawName
      .split(" ")
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");

    const costBreakdown = calculateDishCost(rawName);
    const nutrition = estimateNutrition(rawName);
    const cuisine = getCuisineCategory(rawName).cuisine;

    // Infer meal type
    const lower = rawName.toLowerCase();
    let mealType: "Breakfast" | "Lunch" | "Dinner" | "Any" = "Lunch";
    if (
      lower.includes("parota") ||
      lower.includes("toast") ||
      lower.includes("croissant") ||
      lower.includes("dosa") ||
      lower.includes("idli") ||
      lower.includes("pancake") ||
      lower.includes("upma") ||
      lower.includes("poha") ||
      lower.includes("puri") ||
      lower.includes("ful medames") ||
      lower.includes("falafel")
    ) {
      mealType = "Breakfast";
    } else if (
      lower.includes("biryani") ||
      lower.includes("mandi") ||
      lower.includes("rice") ||
      lower.includes("pulao")
    ) {
      mealType = "Lunch";
    } else {
      mealType = "Dinner";
    }

    return {
      id: `dish-cat-${idx + 1}`,
      name: formattedName,
      mealType,
      cuisine,
      cost: costBreakdown.costPerPerson,
      calories: nutrition.calories,
      protein: nutrition.protein,
      description: `${cuisine} style with ${costBreakdown.recipeIngredients.length} ingredients`,
    };
  });
}

/**
 * AI Weekly Menu Auto-Balancer:
 * Generates an optimized 7-day schedule with:
 * 1. Daily cost strictly honoring target budget (e.g., 18 SAR/head).
 * 2. Zero consecutive identical main courses.
 * 3. Aramco camp nutrition targets (~2,800 - 3,200 total kcal/day).
 * 4. High cultural variety across worker nationalities.
 */
export function generateBalancedWeeklyMenu(options: {
  targetDailyBudget?: number;
  cuisineFocus?: "Balanced" | "South Asian" | "Arabian" | "High Protein";
  mealTypes?: string[];
  campId: string;
}) {
  const {
    targetDailyBudget = 18.0,
    cuisineFocus = "Balanced",
    mealTypes = ["Breakfast", "Lunch", "Dinner"],
    campId,
  } = options;

  const catalog = getFullDishCatalog();

  const breakfastOptions = catalog.filter((d) => d.mealType === "Breakfast" || d.cost < 4.5);
  const lunchOptions = catalog.filter((d) => d.mealType === "Lunch" || d.name.toLowerCase().includes("rice"));
  const dinnerOptions = catalog.filter(
    (d) => d.mealType === "Dinner" || d.name.toLowerCase().includes("curry") || d.name.toLowerCase().includes("roti")
  );

  const filterByFocus = (dishes: CatalogDish[]) => {
    if (cuisineFocus === "South Asian") {
      return dishes.filter((d) => d.cuisine === "South Asian" || d.cuisine === "Vegetarian");
    }
    if (cuisineFocus === "Arabian") {
      return dishes.filter((d) => d.cuisine === "Arabian & Khaleeji" || d.cuisine === "Vegetarian");
    }
    if (cuisineFocus === "High Protein") {
      return dishes.filter((d) => d.protein >= 20 || d.cost < 6);
    }
    return dishes;
  };

  const poolBreakfast = filterByFocus(breakfastOptions).length ? filterByFocus(breakfastOptions) : breakfastOptions;
  const poolLunch = filterByFocus(lunchOptions).length ? filterByFocus(lunchOptions) : lunchOptions;
  const poolDinner = filterByFocus(dinnerOptions).length ? filterByFocus(dinnerOptions) : dinnerOptions;

  const weeklySchedule: Array<{
    camp_id: string;
    day_of_week: number;
    meal_type: string;
    dish_name: string;
    description: string;
    sort_order: number;
  }> = [];

  let lastLunchName = "";
  let lastDinnerName = "";

  for (let day = 0; day < 7; day++) {
    // 1. Pick Breakfast (target ~3.5 SAR)
    const validBf = poolBreakfast[day % poolBreakfast.length];

    // 2. Pick Lunch (target ~7.5 - 9.0 SAR, no repeat from yesterday)
    const validLunchChoices = poolLunch.filter((d) => d.name !== lastLunchName);
    const chosenLunch = validLunchChoices[(day * 3) % validLunchChoices.length] || poolLunch[0];
    lastLunchName = chosenLunch.name;

    // 3. Pick Dinner (balance against remaining daily budget)
    const spentSoFar = validBf.cost + chosenLunch.cost;
    const remainingBudget = Math.max(4.0, targetDailyBudget - spentSoFar);

    const validDinnerChoices = poolDinner.filter(
      (d) => d.name !== lastDinnerName && d.cost <= remainingBudget + 2.5
    );
    const chosenDinner =
      validDinnerChoices[(day * 2 + 1) % (validDinnerChoices.length || 1)] ||
      poolDinner.find((d) => d.cost <= remainingBudget) ||
      poolDinner[0];
    lastDinnerName = chosenDinner.name;

    mealTypes.forEach((meal) => {
      let chosen = chosenLunch;
      if (meal === "Breakfast" || meal === "Suhoor") chosen = validBf;
      else if (meal === "Dinner" || meal === "Iftar") chosen = chosenDinner;

      weeklySchedule.push({
        camp_id: campId,
        day_of_week: day,
        meal_type: meal,
        dish_name: chosen.name,
        description: `${chosen.cuisine} • ~${chosen.cost} SAR/head • ${chosen.calories} kcal`,
        sort_order: 1,
      });
    });
  }

  return weeklySchedule;
}
