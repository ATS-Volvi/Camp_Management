import { describe, it, expect } from "vitest";
import {
  NEW_ROOM_CATEGORIES,
  getRoomCategoryCapacity,
  getRoomCategoryLabel,
} from "@/constants/roomCategories";

// Room numbering utility
function buildRoomNumber(prefix: string, floor: number, index: number, format: "3digit" | "4digit" | "g_style" | "sequential") {
  const cleanPrefix = prefix.trim() ? `${prefix.trim()}-` : "";
  if (format === "3digit") {
    const num = floor * 100 + index;
    return `${cleanPrefix}${num}`;
  }
  if (format === "4digit") {
    const flrStr = String(floor).padStart(2, "0");
    const idxStr = String(index).padStart(2, "0");
    return `${cleanPrefix}${flrStr}${idxStr}`;
  }
  if (format === "g_style") {
    if (floor === 1) {
      return `${cleanPrefix}G${String(index).padStart(2, "0")}`;
    }
    const num = (floor - 1) * 100 + index;
    return `${cleanPrefix}${num}`;
  }
  return `${cleanPrefix}${index}`;
}

describe("Master Structure & Room Setup", () => {
  describe("Room numbering schema", () => {
    it("generates 3-digit floor numbers correctly (e.g. A-101, A-205)", () => {
      expect(buildRoomNumber("A", 1, 1, "3digit")).toBe("A-101");
      expect(buildRoomNumber("A", 1, 12, "3digit")).toBe("A-112");
      expect(buildRoomNumber("B", 2, 5, "3digit")).toBe("B-205");
      expect(buildRoomNumber("Block-C", 3, 1, "3digit")).toBe("Block-C-301");
    });

    it("generates 4-digit floor numbers correctly (e.g. A-0101, A-0205)", () => {
      expect(buildRoomNumber("A", 1, 1, "4digit")).toBe("A-0101");
      expect(buildRoomNumber("A", 2, 10, "4digit")).toBe("A-0210");
    });

    it("generates Ground floor style correctly (e.g. A-G01 for floor 1, A-101 for floor 2)", () => {
      expect(buildRoomNumber("A", 1, 1, "g_style")).toBe("A-G01");
      expect(buildRoomNumber("A", 1, 8, "g_style")).toBe("A-G08");
      expect(buildRoomNumber("A", 2, 1, "g_style")).toBe("A-101");
    });

    it("generates sequential room numbers correctly", () => {
      expect(buildRoomNumber("A", 1, 1, "sequential")).toBe("A-1");
      expect(buildRoomNumber("A", 1, 20, "sequential")).toBe("A-20");
    });
  });

  describe("Room sharing categories and capacities", () => {
    it("resolves single and twin executive rooms", () => {
      expect(getRoomCategoryCapacity("executive_single")).toBe(1);
      expect(getRoomCategoryCapacity("executive_twin")).toBe(2);
      expect(getRoomCategoryLabel("executive_single")).toBe("Executive Single Room");
      expect(getRoomCategoryLabel("executive_twin")).toBe("Executive Twin Sharing");
    });

    it("resolves supervisor, staff, skilled, and general workforce categories", () => {
      expect(getRoomCategoryCapacity("supervisor_twin")).toBe(2);
      expect(getRoomCategoryCapacity("staff_4bed")).toBe(4);
      expect(getRoomCategoryCapacity("skilled_6bed")).toBe(6);
      expect(getRoomCategoryCapacity("general_8bed")).toBe(8);
    });

    it("calculates total camp structure capacity correctly across multiple blocks and floors", () => {
      const blocks = [
        { name: "Block A", floors: 2, roomsPerFloor: 10, sharing: 4 }, // 2 * 10 * 4 = 80
        { name: "Block B", floors: 3, roomsPerFloor: 8, sharing: 6 },  // 3 * 8 * 6 = 144
      ];
      const totalRooms = blocks.reduce((acc, b) => acc + b.floors * b.roomsPerFloor, 0);
      const totalBeds = blocks.reduce((acc, b) => acc + b.floors * b.roomsPerFloor * b.sharing, 0);

      expect(totalRooms).toBe(44);
      expect(totalBeds).toBe(224);
    });
  });
});
