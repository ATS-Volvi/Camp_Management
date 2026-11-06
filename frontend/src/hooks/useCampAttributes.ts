import { useState, useEffect } from "react";

export type CampAttributeScope = "camp" | "block" | "room" | "custom";
export type CampAttributeType = "text" | "number" | "dropdown" | "multiselect" | "boolean" | "date";

export interface CampAttribute {
  id: string;
  name: string;
  key: string;
  scope: CampAttributeScope;
  type: CampAttributeType;
  required: boolean;
  system: boolean;
  options?: string[];
  description?: string;
  placeholder?: string;
  is_active: boolean;
  order: number;
}

const STORAGE_KEY = "camp365_camp_attributes_master";

export const DEFAULT_CAMP_ATTRIBUTES: CampAttribute[] = [
  // ── CAMP LEVEL ATTRIBUTES ──
  {
    id: "attr-camp-type",
    name: "Camp Classification / Type",
    key: "camp_type",
    scope: "camp",
    type: "dropdown",
    required: true,
    system: true,
    description: "Classification of camp accommodation standard and target workforce tier",
    options: ["Executive", "Staff", "Worker", "Mixed Facility", "Remote Site Mobilization", "Contractor Base"],
    is_active: true,
    order: 1,
  },
  {
    id: "attr-camp-location",
    name: "Region / Operating City",
    key: "location",
    scope: "camp",
    type: "dropdown",
    required: true,
    system: true,
    description: "Geographic location or municipality across Saudi Arabia",
    options: [
      "Jubail Industrial City",
      "Yanbu Industrial City",
      "Dammam",
      "Riyadh",
      "Ras Al-Khair",
      "Turaif",
      "Neom",
      "Jazan",
      "Al-Khobar",
      "Haradh",
      "Tanajib",
      "Rabigh",
      "Udhailiyah",
    ],
    is_active: true,
    order: 2,
  },
  {
    id: "attr-camp-facilities",
    name: "Camp Facilities & Amenities",
    key: "camp_facilities",
    scope: "camp",
    type: "multiselect",
    required: false,
    system: true,
    description: "Standard on-site amenities, recreation, and welfare infrastructure",
    options: [
      "Central Mess & Dining Hall",
      "Recreation Room & TV Lounge",
      "Gymnasium & Fitness Center",
      "Commercial Laundry Facility",
      "Medical Clinic & First Aid Post",
      "Mosque / Prayer Hall",
      "Campus Wi-Fi Internet",
      "24/7 Security Gate & CCTV",
      "Outdoor Sports Ground",
      "Barbershop & Grooming",
      "Minimarket / Commissary",
      "ATM Cash Dispenser",
      "Water Reverse Osmosis Plant",
      "Backup Power Generators",
    ],
    is_active: true,
    order: 3,
  },
  {
    id: "attr-camp-ownership",
    name: "Camp Ownership Model",
    key: "ownership_type",
    scope: "camp",
    type: "dropdown",
    required: false,
    system: true,
    description: "Legal ownership or lease arrangement for the camp asset",
    options: ["Company Owned", "Leased / Rented Facility", "Client / Sponsor Provided", "Joint Venture"],
    is_active: true,
    order: 4,
  },
  {
    id: "attr-camp-status",
    name: "Camp Operational Status",
    key: "status",
    scope: "camp",
    type: "dropdown",
    required: true,
    system: true,
    description: "Current facility lifecycle and mobilization state",
    options: ["active", "under_expansion", "seasonal_shutdown", "maintenance", "decommissioned"],
    is_active: true,
    order: 5,
  },

  // ── BLOCK LEVEL ATTRIBUTES ──
  {
    id: "attr-block-type",
    name: "Block Functional Type",
    key: "block_type",
    scope: "block",
    type: "dropdown",
    required: true,
    system: true,
    description: "Purpose of the building structure within the camp perimeter",
    options: [
      "Residential Living Block",
      "Mess & Kitchen Facility",
      "Administration & Offices",
      "Recreation Center",
      "Clinic & Medical Station",
      "Laundry & Maintenance Block",
      "Security & Guardhouse",
    ],
    is_active: true,
    order: 6,
  },
  {
    id: "attr-block-construction",
    name: "Block Construction Type",
    key: "construction_type",
    scope: "block",
    type: "dropdown",
    required: false,
    system: true,
    description: "Structural engineering and fabric type of the block",
    options: ["Pre-fabricated Portacabin", "RCC / Concrete Structure", "Modular Container Unit", "Steel Structure"],
    is_active: true,
    order: 7,
  },
  {
    id: "attr-block-allocation",
    name: "Workforce Allocation Category",
    key: "allocation_category",
    scope: "block",
    type: "dropdown",
    required: false,
    system: true,
    description: "Target demographic or project tier housed in this block",
    options: ["Male Workforce", "Senior Staff & Supervisors", "Executive Singles", "Subcontractor Crews", "Mixed Operations"],
    is_active: true,
    order: 8,
  },

  // ── ROOM LEVEL ATTRIBUTES ──
  {
    id: "attr-room-category",
    name: "Room Category & Capacity",
    key: "room_category",
    scope: "room",
    type: "dropdown",
    required: true,
    system: true,
    description: "Standard room occupancy tier from 1x1 single executive to 6x1 quad dormitories",
    options: [
      "1x1 (Single Executive)",
      "2x1 (Double / Supervisor)",
      "3x1 (Triple Room)",
      "4x1 (Standard Quad)",
      "5x1 (Five Occupancy)",
      "6x1 (Six Occupancy)",
      "VIP Executive Suite",
      "Guest / Transit Room",
    ],
    is_active: true,
    order: 9,
  },
  {
    id: "attr-floor-code",
    name: "Floor Designations",
    key: "floor_code",
    scope: "room",
    type: "dropdown",
    required: true,
    system: true,
    description: "Building level codes used for room numbering convention",
    options: ["G (Ground Floor / Level 0)", "F (First Floor / Level 1)", "S (Second Floor / Level 2)", "T (Third Floor / Level 3)"],
    is_active: true,
    order: 10,
  },
  {
    id: "attr-room-amenities",
    name: "In-Room Amenities",
    key: "room_amenities",
    scope: "room",
    type: "multiselect",
    required: false,
    system: true,
    description: "Individual fixtures and comfort equipment installed inside room",
    options: [
      "Air Conditioning (AC)",
      "Attached Bathroom / En-suite",
      "Personal Lockable Wardrobe",
      "Work Desk & Chair",
      "Mini Refrigerator",
      "Television & Satellite Receiver",
      "High-speed Wi-Fi Access",
      "Balcony / External Window",
      "Smoke Detector & Fire Alarm",
    ],
    is_active: true,
    order: 11,
  },
  {
    id: "attr-room-status",
    name: "Room Operational Status",
    key: "room_status",
    scope: "room",
    type: "dropdown",
    required: true,
    system: true,
    description: "Bed availability and reservation condition",
    options: ["available", "occupied", "reserved", "maintenance", "deep_cleaning", "blocked"],
    is_active: true,
    order: 12,
  },
];

export function getStoredCampAttributes(): CampAttribute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CAMP_ATTRIBUTES));
      return DEFAULT_CAMP_ATTRIBUTES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_CAMP_ATTRIBUTES;
  } catch {
    return DEFAULT_CAMP_ATTRIBUTES;
  }
}

export function saveStoredCampAttributes(attrs: CampAttribute[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attrs));
    window.dispatchEvent(new Event("camp365_camp_attributes_updated"));
  } catch (e) {
    console.error("Failed to save camp attributes to localStorage", e);
  }
}

export function useCampAttributes() {
  const [attributes, setAttributes] = useState<CampAttribute[]>(getStoredCampAttributes);

  useEffect(() => {
    const handler = () => {
      setAttributes(getStoredCampAttributes());
    };
    window.addEventListener("camp365_camp_attributes_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("camp365_camp_attributes_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const addAttribute = (attr: Omit<CampAttribute, "id" | "order" | "system">) => {
    const nextOrder = attributes.length > 0 ? Math.max(...attributes.map((a) => a.order)) + 1 : 1;
    const newAttr: CampAttribute = {
      ...attr,
      id: `attr-camp-custom-${Date.now()}`,
      order: nextOrder,
      system: false,
    };
    const updated = [...attributes, newAttr];
    saveStoredCampAttributes(updated);
    setAttributes(updated);
    return newAttr;
  };

  const updateAttribute = (id: string, updates: Partial<CampAttribute>) => {
    const updated = attributes.map((a) => (a.id === id ? { ...a, ...updates } : a));
    saveStoredCampAttributes(updated);
    setAttributes(updated);
  };

  const deleteAttribute = (id: string) => {
    const target = attributes.find((a) => a.id === id);
    if (target?.system) return false;
    const updated = attributes.filter((a) => a.id !== id);
    saveStoredCampAttributes(updated);
    setAttributes(updated);
    return true;
  };

  const addOptionToAttribute = (attributeKey: string, newOption: string) => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    const updated = attributes.map((a) => {
      if (a.key === attributeKey && (a.type === "dropdown" || a.type === "multiselect")) {
        const currentOptions = a.options || [];
        if (!currentOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
          return { ...a, options: [...currentOptions, trimmed] };
        }
      }
      return a;
    });
    saveStoredCampAttributes(updated);
    setAttributes(updated);
  };

  const removeOptionFromAttribute = (attributeKey: string, optionToRemove: string) => {
    const updated = attributes.map((a) => {
      if (a.key === attributeKey && (a.type === "dropdown" || a.type === "multiselect")) {
        return {
          ...a,
          options: (a.options || []).filter((o) => o !== optionToRemove),
        };
      }
      return a;
    });
    saveStoredCampAttributes(updated);
    setAttributes(updated);
  };

  const resetToDefault = () => {
    saveStoredCampAttributes(DEFAULT_CAMP_ATTRIBUTES);
    setAttributes(DEFAULT_CAMP_ATTRIBUTES);
  };

  const getOptionsFor = (key: string): string[] => {
    const attr = attributes.find((a) => a.key === key);
    return attr?.options || [];
  };

  return {
    attributes,
    addAttribute,
    updateAttribute,
    deleteAttribute,
    addOptionToAttribute,
    removeOptionFromAttribute,
    resetToDefault,
    getOptionsFor,
  };
}

