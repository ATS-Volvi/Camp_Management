export function filterCancellationResidents<T extends { name: string; department: string | null }>(residents: T[], department: string) {
  return residents.filter((resident) => department === "all" || resident.department === department)
    .sort((a, b) => a.name.localeCompare(b.name));
}