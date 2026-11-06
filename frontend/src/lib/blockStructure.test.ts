import { describe, it, expect } from "vitest";
import { blockFloorNumbers, floorLabel, nextRoomNumbers } from "./blockStructure";

describe("block structure", () => {
  it("includes empty configured floors and preserves saved ground floor rooms", () => {
    expect(blockFloorNumbers(3, [{ floor: 0 }, { floor: 2 }], { 4: "Annex" })).toEqual([0, 1, 2, 3, 4]);
  });
  it("skips room numbers already used in the block", () => {
    expect(nextRoomNumbers("Alpha", 2, 3, ["A-201", "A-203"])).toEqual(["A-202", "A-204", "A-205"]);
  });
  it("uses saved floor names, else Floor N", () => {
    expect(floorLabel(1, { 1: "Ground" })).toBe("Ground");
    expect(floorLabel(2, { 1: "Ground" })).toBe("Floor 2");
  });
});
