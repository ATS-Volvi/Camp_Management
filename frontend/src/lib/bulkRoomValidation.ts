export interface RoomIdentity {
  building_id: string | null;
  room_number: string;
}

export interface UploadRoomIdentity {
  _blockId?: string;
  room_number: string;
  _errors: string[];
}

const duplicatePrefix = "Duplicate room:";
const roomKey = (blockId: string, number: string) => JSON.stringify([blockId, number.trim()]);

export function validateRoomDuplicates<T extends UploadRoomIdentity>(rows: T[], existing: RoomIdentity[]): T[] {
  const saved = new Set(existing.flatMap(r => r.building_id ? [roomKey(r.building_id, r.room_number)] : []));
  const counts = new Map<string, number>();
  rows.forEach(row => {
    if (!row._blockId || !row.room_number) return;
    const key = roomKey(row._blockId, row.room_number);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return rows.map(row => {
    const errors = row._errors.filter(error => !error.startsWith(duplicatePrefix));
    if (row._blockId && row.room_number) {
      const key = roomKey(row._blockId, row.room_number);
      if (saved.has(key)) errors.push(`${duplicatePrefix} ${row.room_number} already exists in this block`);
      if ((counts.get(key) ?? 0) > 1) errors.push(`${duplicatePrefix} ${row.room_number} appears more than once in this block in the file`);
    }
    return { ...row, _errors: errors };
  });
}