import { describe, expect, it } from "vitest";
import { foodCancellationDateAllowed } from "./foodCancellationDates";

describe("food cancellation calendar stay limits", () => {
  it("disallows 5 October for a 10–20 October stay", () => {
    expect(foodCancellationDateAllowed("2026-10-05", "2026-10-10", "2026-10-20")).toBe(false);
  });
  it("disallows dates after 20 October", () => {
    expect(foodCancellationDateAllowed("2026-10-21", "2026-10-10", "2026-10-20")).toBe(false);
  });
  it("allows both stay boundary dates", () => {
    expect(foodCancellationDateAllowed("2026-10-10", "2026-10-10", "2026-10-20")).toBe(true);
    expect(foodCancellationDateAllowed("2026-10-20", "2026-10-10", "2026-10-20")).toBe(true);
  });
  it("does not invent a departure date for a current resident", () => {
    expect(foodCancellationDateAllowed("2026-11-01", "2026-10-10", null)).toBe(true);
  });
});