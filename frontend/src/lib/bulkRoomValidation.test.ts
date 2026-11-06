import { describe, expect, it } from "vitest";
import { validateRoomDuplicates } from "./bulkRoomValidation";

const row = (block: string, number: string) => ({ _blockId: block, room_number: number, _errors: [] });

describe("bulk room duplicate validation", () => {
  it("flags every repeated number within the same block, including across floors", () => {
    const result = validateRoomDuplicates([{ ...row("a", "A14"), floor: 1 }, { ...row("a", "A14"), floor: 2 }], []);
    expect(result.every(r => r._errors.length === 1)).toBe(true);
  });
  it("allows the same room number in different blocks", () => {
    expect(validateRoomDuplicates([row("a", "101"), row("b", "101")], []).map(r => r._errors)).toEqual([[], []]);
  });
  it("rejects an existing room without changing it", () => {
    const existing = [{ building_id: "a", room_number: "101" }];
    expect(validateRoomDuplicates([row("a", "101"), row("a", "102")], existing).map(r => r._errors.length)).toEqual([1, 0]);
    expect(existing).toEqual([{ building_id: "a", room_number: "101" }]);
  });
  it("clears stale duplicate errors when rechecking but preserves other errors", () => {
    expect(validateRoomDuplicates([{ ...row("a", "101"), _errors: ["Duplicate room: old", "Invalid room type"] }], [])[0]._errors).toEqual(["Invalid room type"]);
  });
});