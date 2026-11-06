/**
 * Room rate resolution: a camp-specific override (camp_room_rates) wins;
 * otherwise the Room Category Master's default daily rate applies.
 * An explicit 0 override is respected (camp intentionally free).
 */
export function resolveDailyRoomRate(
  campOverride: number | null | undefined,
  masterDefault: number | null | undefined
): number {
  if (campOverride != null) return campOverride;
  return masterDefault ?? 0;
}
