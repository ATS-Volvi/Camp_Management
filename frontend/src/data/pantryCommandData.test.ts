import { describe, it, expect } from "vitest";
import {
  calculatePantrySimulation,
  INITIAL_WHAT_IF_STATE,
  PANTRY_INGREDIENTS,
  UPCOMING_DISHES,
} from "./pantryCommandData";

describe("Pantry Command Center - Simulation Logic", () => {
  it("initializes with 14 ingredients and exactly 3 red and 3 amber items", () => {
    const sim = calculatePantrySimulation(0, INITIAL_WHAT_IF_STATE);
    expect(sim.ingredients).toHaveLength(14);

    const redItems = sim.ingredients.filter((i) => i.status === "red");
    const amberItems = sim.ingredients.filter((i) => i.status === "amber");
    const greenItems = sim.ingredients.filter((i) => i.status === "green");

    expect(redItems).toHaveLength(3); // Cooking Oil, Onions, Eggs
    expect(amberItems).toHaveLength(3); // Chicken, Rice, Tomatoes
    expect(greenItems).toHaveLength(8);

    // Verify critical items are specifically the ones below threshold
    const redIds = redItems.map((r) => r.item.id);
    expect(redIds).toContain("cooking_oil");
    expect(redIds).toContain("onions");
    expect(redIds).toContain("eggs");
  });

  it("decreases days of cover as Time Machine slider advances", () => {
    const day0 = calculatePantrySimulation(0, INITIAL_WHAT_IF_STATE);
    const day4 = calculatePantrySimulation(4, INITIAL_WHAT_IF_STATE);

    const rice0 = day0.ingredients.find((i) => i.item.id === "rice")!;
    const rice4 = day4.ingredients.find((i) => i.item.id === "rice")!;

    expect(rice4.daysOfCoverLeft).toBeLessThan(rice0.daysOfCoverLeft);
    expect(rice4.remainingStock).toBeLessThan(rice0.remainingStock);
  });

  it("applies +200 workers what-if to burn stock 20% faster", () => {
    const normal = calculatePantrySimulation(0, INITIAL_WHAT_IF_STATE);
    const extraWorkers = calculatePantrySimulation(0, {
      ...INITIAL_WHAT_IF_STATE,
      extraWorkers200: true,
    });

    const lambNormal = normal.ingredients.find((i) => i.item.id === "lamb")!;
    const lambExtra = extraWorkers.ingredients.find((i) => i.item.id === "lamb")!;

    expect(lambExtra.effectiveDailyUsage).toBe(lambNormal.effectiveDailyUsage * 1.2);
    expect(lambExtra.daysOfCoverLeft).toBeLessThan(lambNormal.daysOfCoverLeft);
  });

  it("applies delivery delayed 3 days what-if by expanding safety threshold buffer", () => {
    const normal = calculatePantrySimulation(0, INITIAL_WHAT_IF_STATE);
    const delayed = calculatePantrySimulation(0, {
      ...INITIAL_WHAT_IF_STATE,
      delayDelivery3Days: true,
    });

    const redCountNormal = normal.kpis.itemsToBuyToday;
    const redCountDelayed = delayed.kpis.itemsToBuyToday;

    expect(redCountDelayed).toBeGreaterThanOrEqual(redCountNormal);
  });

  it("identifies dishes blocked by depleted key ingredients", () => {
    const sim = calculatePantrySimulation(0, INITIAL_WHAT_IF_STATE);
    expect(sim.dishes).toHaveLength(10);

    // Shakshuka requires Eggs, Onions, Cooking Oil (all 3 are red!)
    const shakshuka = sim.dishes.find((d) => d.dish.id === "dish_shakshuka")!;
    expect(shakshuka.overallStatus).toBe("red");

    // Biryani requires Chicken, Rice, Cooking Oil, Onions, Spices (Oil & Onions are red)
    const biryani = sim.dishes.find((d) => d.dish.id === "dish_biryani")!;
    expect(biryani.overallStatus).toBe("red");
  });

  it("aggregates Smart Buy List by supplier with accurate totals", () => {
    const sim = calculatePantrySimulation(0, INITIAL_WHAT_IF_STATE);
    expect(sim.supplierGroups.length).toBeGreaterThan(0);

    const totalFromGroups = sim.supplierGroups.reduce((acc, g) => acc + g.totalSAR, 0);
    expect(totalFromGroups).toBe(sim.kpis.estimatedPurchaseValueSAR);
    expect(totalFromGroups).toBeGreaterThan(0);
  });
});
