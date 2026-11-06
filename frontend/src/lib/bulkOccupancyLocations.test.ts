import { describe, expect, it } from "vitest";
import { existingRoomTemplateRows, resolveUploadLocation } from "./bulkOccupancyLocations";

const camps = [{ id: "c1", camp_code: "CAMP-01", name: "Ad-Dilam Camp" }, { id: "c2", camp_code: "CAMP-02", name: "Other Camp" }];
const blocks = [{ id: "b1", camp_id: "c1", block_code: "BLK-01", name: "Block A" }];
const rooms = [{ id: "r1", camp_id: "c1", building_id: "b1", floor: 1, room_number: "A-101", status: "vacant" }];
const location = { campCode: "CAMP-01", campName: "Ad-Dilam Camp", blockCode: "BLK-01", blockName: "Block A", floor: "1", room: "A-101" };
describe("existing-room occupancy uploads", () => {
  it("accepts an existing room in the matching camp, block and floor", () => {
    const result = resolveUploadLocation(location, camps, blocks, rooms);
    expect(result.errors).toEqual([]);
    expect(result.room?.id).toBe("r1");
  });
  it("rejects 101 when the saved room number is A-101", () => {
    expect(resolveUploadLocation({ ...location, room: "101" }, camps, blocks, rooms).room).toBeUndefined();
    expect(resolveUploadLocation({ ...location, room: "101" }, camps, blocks, rooms).errors.length).toBeGreaterThan(0);
  });
  it("rejects a room on a different floor", () => {
    expect(resolveUploadLocation({ ...location, floor: "2" }, camps, blocks, rooms).room).toBeUndefined();
  });
  it("rejects conflicting camp code and camp name", () => {
    expect(resolveUploadLocation({ ...location, campName: "Other Camp" }, camps, blocks, rooms).camp).toBeUndefined();
  });
  it("rejects conflicting block code and block name", () => {
    expect(resolveUploadLocation({ ...location, blockName: "Block B" }, camps, blocks, rooms).block).toBeUndefined();
  });
  it("templates contain saved room numbers, not invented numbers", () => {
    expect(existingRoomTemplateRows(camps, blocks, rooms)).toEqual([["CAMP-01", "Ad-Dilam Camp", "BLK-01", "Block A", 1, "A-101"]]);
  });
  it("rejects rooms removed after file validation", () => {
    expect(resolveUploadLocation(location, camps, blocks, []).room).toBeUndefined();
  });
});