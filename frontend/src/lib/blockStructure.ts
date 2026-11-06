/** Display name for a floor: saved custom name, else "Floor N". */
export function floorLabel(floor: number, names: Record<number, string> = {}) {
  return names[floor]?.trim() || `Floor ${floor}`;
}

/** Include configured empty floors and saved room/name floors without remapping floor zero. */
export function blockFloorNumbers(count: number, rooms: { floor: number | null }[], names: Record<number, string> = {}) {
  return [...new Set([
    ...Array.from({ length: Math.max(1, count) }, (_, i) => i + 1),
    ...rooms.map((room) => room.floor ?? 1),
    ...Object.keys(names).map(Number),
  ])].sort((a, b) => a - b);
}

/**
 * Next free room numbers for a floor, e.g. block "Alpha", floor 2 → A-201, A-202…
 * Skips numbers already used in the block so existing rooms are never duplicated.
 */
export function nextRoomNumbers(blockName: string, floor: number, count: number, existing: string[]) {
  const prefix = (blockName.trim().charAt(0) || "R").toUpperCase();
  const used = new Set(existing.map((n) => n.trim().toUpperCase()));
  const out: string[] = [];
  let seq = 1;
  while (out.length < count && seq < 1000) {
    const num = `${prefix}-${floor * 100 + seq}`;
    if (!used.has(num.toUpperCase())) out.push(num);
    seq++;
  }
  return out;
}
