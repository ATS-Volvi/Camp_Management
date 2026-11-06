import { describe, it, expect } from "vitest";
import {
  NEW_ROOM_CATEGORIES,
  getRoomCategoryCapacity,
  getRoomCategoryLabel,
  mapRawRoomTypeToCategory,
  parseFloorInput,
  getFloorDisplayName,
} from "@/constants/roomCategories";

// Room numbering utility
function buildRoomNumber(
  prefix: string,
  floor: number,
  index: number,
  format: "3digit" | "4digit" | "g_style" | "sequential" | "compact_2digit"
) {
  const cleanPrefix = prefix.trim() ? `${prefix.trim()}-` : "";
  if (format === "compact_2digit") {
    return `${prefix.trim()}${String(index).padStart(2, "0")}`;
  }
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
    it("generates compact 2-digit company numbers correctly (e.g. A01, A14, B23)", () => {
      expect(buildRoomNumber("A", 1, 1, "compact_2digit")).toBe("A01");
      expect(buildRoomNumber("A", 1, 14, "compact_2digit")).toBe("A14");
      expect(buildRoomNumber("B", 2, 23, "compact_2digit")).toBe("B23");
      expect(buildRoomNumber("C", 1, 5, "compact_2digit")).toBe("C05");
    });

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

  describe("Real Camp Room Type Multiplier Mapping (1x1 to 6x1)", () => {
    it("maps 1x1, 2x1, 3x1, 4x1, 5x1, 6x1 codes to standard DB category and bed count", () => {
      const single = mapRawRoomTypeToCategory("1x1");
      expect(single.capacity).toBe(1);
      expect(single.category).toBe("executive_single");

      const twin = mapRawRoomTypeToCategory("2x1");
      expect(twin.capacity).toBe(2);
      expect(twin.category).toBe("supervisor_twin");

      const triple = mapRawRoomTypeToCategory("3x1");
      expect(triple.capacity).toBe(3);
      expect(triple.category).toBe("supervisor_twin");

      const quad = mapRawRoomTypeToCategory("4x1");
      expect(quad.capacity).toBe(4);
      expect(quad.category).toBe("staff_4bed");

      const quint = mapRawRoomTypeToCategory("5x1");
      expect(quint.capacity).toBe(5);
      expect(quint.category).toBe("skilled_6bed");

      const six = mapRawRoomTypeToCategory("6x1");
      expect(six.capacity).toBe(6);
      expect(six.category).toBe("skilled_6bed");
    });
  });

  describe("Floor Code Resolution (G, F, S)", () => {
    it("resolves G, F, S codes to floor numbers and labels", () => {
      const ground = parseFloorInput("G");
      expect(ground.floorNumber).toBe(1);
      expect(ground.floorCode).toBe("G");
      expect(ground.displayName).toBe("Floor G (Ground)");

      const first = parseFloorInput("F");
      expect(first.floorNumber).toBe(2);
      expect(first.floorCode).toBe("F");
      expect(first.displayName).toBe("Floor F (First)");

      const second = parseFloorInput("S");
      expect(second.floorNumber).toBe(3);
      expect(second.floorCode).toBe("S");
      expect(second.displayName).toBe("Floor S (Second)");
    });

    it("resolves integer strings correctly", () => {
      expect(parseFloorInput("1").floorNumber).toBe(1);
      expect(parseFloorInput("2").floorNumber).toBe(2);
      expect(parseFloorInput("3").floorNumber).toBe(3);
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
        { name: "Block B", floors: 3, roomsPerFloor: 8, sharing: 6 }, // 3 * 8 * 6 = 144
      ];
      const totalRooms = blocks.reduce((acc, b) => acc + b.floors * b.roomsPerFloor, 0);
      const totalBeds = blocks.reduce((acc, b) => acc + b.floors * b.roomsPerFloor * b.sharing, 0);

      expect(totalRooms).toBe(44);
      expect(totalBeds).toBe(224);
    });
  });
});
