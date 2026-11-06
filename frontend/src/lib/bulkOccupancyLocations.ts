export interface UploadCamp { id: string; name: string; camp_code: string | null }
export interface UploadBlock { id: string; camp_id: string; name: string; block_code: string | null }
export interface UploadRoom { id: string; camp_id: string; building_id: string; floor: number; room_number: string; status: string }
export interface UploadLocation { campCode: string; campName: string; blockCode: string; blockName: string; floor: string; room: string }
const key = (value: string | null) => (value || "").trim().toLowerCase();

export function resolveUploadLocation(location: UploadLocation, camps: UploadCamp[], blocks: UploadBlock[], rooms: UploadRoom[]) {
  const errors: string[] = [];
  const campMatches = camps.filter(c =>
    (!location.campCode || key(c.camp_code) === key(location.campCode)) &&
    (!location.campName || key(c.name) === key(location.campName)));
  const camp = (location.campCode || location.campName) && campMatches.length === 1 ? campMatches[0] : undefined;
  if (!camp) errors.push("Camp Code / Camp Name must identify the same existing camp");
  const blockMatches = camp ? blocks.filter(b => b.camp_id === camp.id &&
    (!location.blockCode || key(b.block_code) === key(location.blockCode)) &&
    (!location.blockName || key(b.name) === key(location.blockName))) : [];
  const block = (location.blockCode || location.blockName) && blockMatches.length === 1 ? blockMatches[0] : undefined;
  if (camp && !block) errors.push("Block Code / Block Name must identify the same existing block in this camp");
  if (!location.floor) errors.push("Floor Number is required");
  const room = block && location.floor && location.room ? rooms.find(r =>
    r.camp_id === camp?.id && r.building_id === block.id && key(r.room_number) === key(location.room) &&
    String(r.floor) === location.floor.trim()) : undefined;
  if (block && !room) errors.push(`Room '${location.room}' on floor '${location.floor}' does not exist in this block; use the saved Room Number`);
  return { camp, block, room: room || undefined, errors };
}

export function existingRoomTemplateRows(camps: UploadCamp[], blocks: UploadBlock[], rooms: UploadRoom[]) {
  return rooms.flatMap(room => {
    const camp = camps.find(c => c.id === room.camp_id);
    const block = blocks.find(b => b.id === room.building_id && b.camp_id === room.camp_id);
    return camp && block ? [[camp.camp_code || "", camp.name, block.block_code || "", block.name, room.floor, room.room_number]] : [];
  });
}