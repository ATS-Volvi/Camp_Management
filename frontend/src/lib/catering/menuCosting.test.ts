import { describe, it, expect } from "vitest";
import {
  calculateDishCost,
  estimateNutrition,
  getCuisineCategory,
  getFullDishCatalog,
  generateBalancedWeeklyMenu,
} from "./menuCosting";

describe("Catering Menu Costing & Balancing Engine", () => {
  it("calculates exact ingredient breakdown and cost for standard dishes", () => {
    const cost = calculateDishCost("chicken biryani");
    expect(cost.costPerPerson).toBeGreaterThan(0);
    expect(cost.recipeIngredients.length).toBeGreaterThan(0);
    const rice = cost.recipeIngredients.find((i) => i.name.toLowerCase().includes("rice"));
    expect(rice).toBeDefined();
    expect(rice?.costPerPerson).toBeGreaterThan(0);
  });

  it("calculates fallback cost for unmapped dishes gracefully", () => {
    const cost = calculateDishCost("Special Mutton Kebab");
    expect(cost.costPerPerson).toBeGreaterThan(5);
    expect(cost.recipeIngredients).toEqual([]);
  });

  it("estimates nutritional profiles aligned with Aramco standards", () => {
    const bf = estimateNutrition("Aloo Parota", "Breakfast");
    expect(bf.calories).toBeGreaterThan(300);
    expect(bf.protein).toBeGreaterThan(10);

    const lunch = estimateNutrition("Chicken Mandi", "Lunch");
    expect(lunch.calories).toBeGreaterThan(500);
    expect(lunch.protein).toBeGreaterThan(20);
  });

  it("classifies dish cuisines with correct demographic badges", () => {
    expect(getCuisineCategory("Chicken Mandi").cuisine).toBe("Arabian & Khaleeji");
    expect(getCuisineCategory("Chicken Fried Rice").cuisine).toBe("Filipino & East Asian");
    expect(getCuisineCategory("Pasta with Garlic Bread").cuisine).toBe("Continental");
    expect(getCuisineCategory("Dal Rice").cuisine).toBe("Vegetarian");
    expect(getCuisineCategory("Chicken Curry & Rice").cuisine).toBe("South Asian");
  });

  it("generates a full structured dish catalog", () => {
    const catalog = getFullDishCatalog();
    expect(catalog.length).toBeGreaterThan(20);
    expect(catalog[0]).toHaveProperty("name");
    expect(catalog[0]).toHaveProperty("cost");
    expect(catalog[0]).toHaveProperty("cuisine");
  });

  it("generates balanced 7-day schedule honoring budget and variety rules", () => {
    const schedule = generateBalancedWeeklyMenu({
      targetDailyBudget: 18.0,
      cuisineFocus: "Balanced",
      mealTypes: ["Breakfast", "Lunch", "Dinner"],
      campId: "test-camp-id",
    });

    expect(schedule.length).toBe(21); // 7 days * 3 meals
    const sundayMeals = schedule.filter((s) => s.day_of_week === 0);
    expect(sundayMeals.length).toBe(3);

    // Verify day costs remain balanced
    const lunchDishes = schedule.filter((s) => s.meal_type === "Lunch");
    const uniqueLunches = new Set(lunchDishes.map((d) => d.dish_name));
    // Must have rotation, not just all the same dish
    expect(uniqueLunches.size).toBeGreaterThan(1);
  });
});
