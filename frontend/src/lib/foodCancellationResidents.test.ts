import { describe, expect, it } from "vitest";
import { filterCancellationResidents } from "./foodCancellationResidents";

describe("food cancellation department selection", () => {
  const residents = [
    { id: "pmta-person", name: "Thapa", department: "PMTA" },
    { id: "psd-person", name: "Abdul", department: "PSD" },
    { id: "unassigned-person", name: "Sanath", department: null },
  ];
  it("shows only residents of the selected department", () => {
    expect(filterCancellationResidents(residents, "PMTA").map(e => e.id)).toEqual(["pmta-person"]);
  });
  it("includes residents without a department when all departments are selected", () => {
    expect(filterCancellationResidents(residents, "all")).toHaveLength(3);
  });
});