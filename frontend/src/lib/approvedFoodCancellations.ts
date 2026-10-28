// Checkout already ends billing through saved occupancy events. Legacy checkout
// requests are not meal credits and must never cancel food in a later stay.
export function approvedFoodCancellations<T extends { status?: string | null; source?: string | null }>(requests: readonly T[]): T[] {
  return requests.filter(request => request.status === "approved" && request.source !== "auto_checkout");
}