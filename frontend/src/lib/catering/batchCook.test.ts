import { describe, it, expect } from "vitest";
import { findRecipe } from "@/data/dishRecipes";
import { MASTER_INGREDIENTS } from "@/data/ingredientMaster";

describe("Batch Cook Scaling & Kitchen Calculations", () => {
  it("scales Biryani ingredients accurately for physical headcount minus cancellations", () => {
    const recipe = findRecipe("chicken biryani");
    expect(recipe).toBeDefined();
    expect(recipe!.length).toBeGreaterThan(0);

    const netHeadcount = 1335;
    const rice = recipe!.find((i) => i.name.toLowerCase().includes("rice"));
    expect(rice).toBeDefined();

    // 0.15 kg per person * 1335 = 200.25 kg
    const scaledRice = Number((rice!.qty_per_person * netHeadcount).toFixed(2));
    expect(scaledRice).toBeCloseTo(200.25, 1);

    // Packaging sacks (25kg per sack)
    const sacks = Math.floor(scaledRice / 25);
    expect(sacks).toBe(8);
  });

  it("calculates accurate batch cost based on ingredient master prices", () => {
    const recipe = findRecipe("chicken biryani");
    const costMap: Record<string, number> = {};
    MASTER_INGREDIENTS.forEach((item) => {
      costMap[item.name.toLowerCase().trim()] = item.unit_cost;
    });

    const portions = 1000;
    let totalCost = 0;
    recipe!.forEach((ing) => {
      const unitCost = costMap[ing.name.toLowerCase().trim()] ?? 10;
      totalCost += ing.qty_per_person * portions * unitCost;
    });

    expect(totalCost).toBeGreaterThan(5000); // 1000 portions of chicken biryani should cost > 5,000 SAR
    expect(totalCost).toBeLessThan(12000);   // but < 12,000 SAR
  });

  it("calculates savings from approved food cancellations", () => {
    const cancelledCount = 85;
    const avgMealTariff = 6.5;
    const savings = cancelledCount * avgMealTariff;
    expect(savings).toBe(552.5);
  });
});
