export type RoomStatus = "assigned" | "available" | "maintenance" | "reserved";

export interface Room {
  id: string;
  number: string;
  blockId: string;
  floor: number;
  category: string;
  maxCapacity: number;
  currentOccupancy: number;
  status: RoomStatus;
}

export interface Camp {
  id: string;
  name: string;
  location: string;
  totalRooms: number;
  totalOccupants: number;
  vacantRooms: number;
  underMaintenance: number;
  managedBy: string;
  createdOn: string;
  amenities: string[];
  blocks: string[];
}

export interface MaintenanceTicket {
  id: string;
  requestId: string;
  campName: string;
  block: string;
  roomArea: string;
  issueType: string;
  issue: string;
  priority: "High" | "Medium" | "Low";
  status: "In Progress" | "Completed" | "Pending" | "Escalated" | "Under Review";
  assignedTo: string;
  dateReported: string;
}

export interface Asset {
  id: string;
  assetId: string;
  campName: string;
  block: string;
  room: string;
  name: string;
  type: string;
  status: "In Use" | "Available" | "Repair" | "Damaged" | "Expired" | "Completed" | "Pending" | "Escalated" | "In Progress";
  assignedTo: string;
  location: string;
  lastUpdated: string;
}

export interface Activity {
  id: string;
  user: string;
  time: string;
  message: string;
  avatar: string;
}

export interface NewJoiner {
  id: string;
  name: string;
  status: "Assigned" | "Not Assigned";
  avatar: string;
}

export const camps: Camp[] = [
  {
    id: "camp-1",
    name: "Ad-Dilam Camp",
    location: "Ad-Dilam, Saudi Arabia",
    totalRooms: 120,
    totalOccupants: 94,
    vacantRooms: 26,
    underMaintenance: 12,
    managedBy: "Mr. Salman",
    createdOn: "12 Mar 2025",
    amenities: ["Housing", "Canteen", "Gym", "Laundry"],
    blocks: ["Block A", "Block B", "Block C"],
  },
  {
    id: "camp-2",
    name: "Al Bahah Camp",
    location: "Al Bahah, Saudi Arabia",
    totalRooms: 80,
    totalOccupants: 65,
    vacantRooms: 15,
    underMaintenance: 5,
    managedBy: "Mr. Ibrahim",
    createdOn: "5 Jan 2025",
    amenities: ["Housing", "Canteen"],
    blocks: ["Block A", "Block B"],
  },
  {
    id: "camp-3",
    name: "Riyadh Industrial Camp",
    location: "Riyadh, Saudi Arabia",
    totalRooms: 200,
    totalOccupants: 178,
    vacantRooms: 22,
    underMaintenance: 8,
    managedBy: "Mr. Saeed",
    createdOn: "20 Feb 2025",
    amenities: ["Housing", "Canteen", "Medical"],
    blocks: ["Block A", "Block B", "Block C", "Block D"],
  },
];

function generateRooms(blockId: string, count: number, startNum: number): Room[] {
  const statuses: RoomStatus[] = ["assigned", "available", "maintenance", "reserved"];
  const rooms: Room[] = [];
  for (let i = 0; i < count; i++) {
    const num = startNum + i;
    const statusWeights = Math.random();
    let status: RoomStatus;
    if (statusWeights < 0.5) status = "assigned";
    else if (statusWeights < 0.75) status = "available";
    else if (statusWeights < 0.9) status = "maintenance";
    else status = "reserved";
    rooms.push({
      id: `${blockId}-S${num}`,
      number: `S${num}`,
      blockId,
      floor: 1,
      category: "4 Occupants",
      maxCapacity: 4,
      currentOccupancy: status === "assigned" ? Math.ceil(Math.random() * 4) : 0,
      status,
    });
  }
  return rooms;
}

export const campRooms: Record<string, Room[]> = {
  "camp-1": [
    ...generateRooms("Block 01", 15, 1),
    ...generateRooms("Block 02", 15, 16),
    ...generateRooms("Block 03", 15, 31),
  ],
};

export const maintenanceTickets: MaintenanceTicket[] = [
  { id: "1", requestId: "REQ-001", campName: "Ad-Dilam Camp", block: "Block 01", roomArea: "S1", issueType: "AC", issue: "AC not cooling", priority: "High", status: "In Progress", assignedTo: "Amira Abdul Rahman", dateReported: "23 Nov 2022" },
  { id: "2", requestId: "REQ-002", campName: "Al Bahah Camp", block: "Block 01", roomArea: "S2", issueType: "Plumbing", issue: "Ceiling leakage", priority: "Low", status: "Completed", assignedTo: "Ibrahim Abdul Jabbar", dateReported: "NA" },
  { id: "3", requestId: "REQ-003", campName: "Riyadh Industrial Camp", block: "Block 01", roomArea: "S4", issueType: "Electrical", issue: "Washing Machine Error", priority: "Medium", status: "Pending", assignedTo: "Saeed Abdul Raoof", dateReported: "23 Nov 2022" },
  { id: "4", requestId: "REQ-004", campName: "Jeddahh Camp", block: "-", roomArea: "Gym", issueType: "Electrical", issue: "Treadmill malfunction", priority: "High", status: "Escalated", assignedTo: "Abdul Samad", dateReported: "NA" },
  { id: "5", requestId: "REQ-005", campName: "Dammam Camp", block: "-", roomArea: "Laundry", issueType: "Broken door handle", issue: "Broken door handle", priority: "Medium", status: "Under Review", assignedTo: "Ali Abdul Aziz", dateReported: "23 Nov 2022" },
  { id: "6", requestId: "REQ-006", campName: "Khobar Camp", block: "Block 01", roomArea: "S4", issueType: "Electrical", issue: "Flickering Lights", priority: "Low", status: "Completed", assignedTo: "Mohammad Ahmed", dateReported: "NA" },
  { id: "7", requestId: "REQ-007", campName: "Ajman Industrial Camp", block: "Block 01", roomArea: "S7", issueType: "Gas", issue: "Gas leak alert", priority: "Medium", status: "Pending", assignedTo: "Samah Abdul Karim", dateReported: "NA" },
  { id: "8", requestId: "REQ-008", campName: "Fujairah Beach Camp", block: "Block 01", roomArea: "S6", issueType: "Drainage", issue: "Drainage clog", priority: "Medium", status: "Escalated", assignedTo: "Mohammad Ahmed", dateReported: "NA" },
  { id: "9", requestId: "REQ-009", campName: "Riyadh Industrial Camp", block: "Block 01", roomArea: "S9", issueType: "Electrical", issue: "Fan not working", priority: "High", status: "In Progress", assignedTo: "Mohammad Ahmed", dateReported: "NA" },
  { id: "10", requestId: "REQ-0010", campName: "Al Khoba Camp", block: "Block 01", roomArea: "S12", issueType: "Ceiling leakage", issue: "Ceiling leakage", priority: "Low", status: "Completed", assignedTo: "Amira Abdul Rahman", dateReported: "23 Nov 2022" },
];

export const assets: Asset[] = [
  { id: "1", assetId: "AST-001", campName: "Ad-Dilam Camp", block: "Block 01", room: "S1", name: "Mattress", type: "Bedding", status: "In Use", assignedTo: "Amira Abdul Rahman", location: "Ad-Dilam", lastUpdated: "23 Nov 2022" },
  { id: "2", assetId: "AST-002", campName: "Al Bahah Camp", block: "Block 01", room: "S2", name: "Bedsheet", type: "Bedding", status: "Available", assignedTo: "Ibrahim Abdul Jabbar", location: "Al Bahah", lastUpdated: "NA" },
  { id: "3", assetId: "AST-003", campName: "Riyadh Industrial Camp", block: "Block 01", room: "S4", name: "Cleaning Kit", type: "Utility", status: "Repair", assignedTo: "Saeed Abdul Raoof", location: "Riyadh", lastUpdated: "23 Nov 2022" },
  { id: "4", assetId: "AST-004", campName: "Jeddahh Camp", block: "Block 02", room: "S7", name: "Fire Extinguishers", type: "Safety", status: "Damaged", assignedTo: "Abdul Samad Abdul Razaq", location: "Jeddah", lastUpdated: "NA" },
  { id: "5", assetId: "AST-005", campName: "Dammam Camp", block: "Block 02", room: "S8", name: "Pillow", type: "Bedding", status: "Expired", assignedTo: "Ali Abdul Aziz", location: "Dammam", lastUpdated: "23 Nov 2022" },
  { id: "6", assetId: "AST-006", campName: "Khobar Camp", block: "Block 01", room: "S4", name: "Welding Machine", type: "Equipment", status: "Completed", assignedTo: "Mohammad Ahmed", location: "Khobar", lastUpdated: "NA" },
  { id: "7", assetId: "AST-007", campName: "Ajman Industrial Camp", block: "Block 01", room: "S7", name: "Table Fan", type: "Electrical", status: "Pending", assignedTo: "Samah Abdul Karim", location: "Tabuk", lastUpdated: "NA" },
  { id: "8", assetId: "AST-008", campName: "Fujairah Beach Camp", block: "Block 01", room: "S6", name: "Tube Lights", type: "Tube Lights", status: "Escalated", assignedTo: "Mohammad Ahmed", location: "Abha", lastUpdated: "NA" },
];

export const recentActivities: Activity[] = [
  { id: "1", user: "Demi Wilkinson", time: "2 mins ago", message: "Room 212 reported plumbing issue", avatar: "DW" },
  { id: "2", user: "Candice Wu", time: "3 hours ago", message: "Visitor pass approved for Rajesh K", avatar: "CW" },
  { id: "3", user: "Phoenix Baker", time: "Just now", message: "Gym equipment servicing scheduled", avatar: "PB" },
  { id: "4", user: "Natali Craig", time: "6 hours ago", message: "Inventory updated: 40 mattresses added", avatar: "NC" },
  { id: "5", user: "Natali Craig", time: "6 hours ago", message: "Invited Lana Steiner to the team", avatar: "NC" },
];

export const newJoiners: NewJoiner[] = [
  { id: "1", name: "Mohammad Ahmed", status: "Assigned", avatar: "MA" },
  { id: "2", name: "Mohammad Ahmed", status: "Not Assigned", avatar: "MA" },
  { id: "3", name: "Amira Abdul Rahman", status: "Assigned", avatar: "AA" },
  { id: "4", name: "Abdul Samad Abdul Razaq", status: "Not Assigned", avatar: "AS" },
  { id: "5", name: "Abdullah Hussein", status: "Assigned", avatar: "AH" },
  { id: "6", name: "Noor Abdul Hamid", status: "Not Assigned", avatar: "NA" },
  { id: "7", name: "Hebah Abdullah", status: "Assigned", avatar: "HA" },
];

export const recentAllocations = [
  { campName: "Ad-Dilam Camp", location: "Ad-Dilam", room: "S1-001", status: "Active" },
  { campName: "Al Bahah Camp", location: "Al Bahah", room: "S2-002", status: "Active" },
  { campName: "Riyadh Industrial Camp", location: "Riyadh", room: "S2-003", status: "Active" },
  { campName: "Jeddahh Camp", location: "Jeddah", room: "S21-001", status: "Active" },
  { campName: "Dammam Camp", location: "Dammam", room: "S15-001", status: "Active" },
  { campName: "Riyadh Industrial Camp", location: "Riyadh", room: "S2-002", status: "Active" },
  { campName: "Jeddahh Camp", location: "Jeddah", room: "S2-003", status: "Active" },
];

export const weeklyCheckData = [
  { day: "Mon", checkIn: 7, checkOut: 5 },
  { day: "Tue", checkIn: 6, checkOut: 6 },
  { day: "Wed", checkIn: 6, checkOut: 5 },
  { day: "Thu", checkIn: 7, checkOut: 4 },
  { day: "Fri", checkIn: 9, checkOut: 7 },
  { day: "Sat", checkIn: 6, checkOut: 5 },
  { day: "Sun", checkIn: 6, checkOut: 4 },
];
