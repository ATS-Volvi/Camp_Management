import { useState, useEffect } from "react";

export type ProjectAttributeCategory = "contract" | "client" | "site" | "finance" | "custom";
export type ProjectAttributeType = "text" | "number" | "dropdown" | "multiselect" | "boolean" | "date";

export interface ProjectAttribute {
  id: string;
  name: string;
  key: string;
  category: ProjectAttributeCategory;
  type: ProjectAttributeType;
  required: boolean;
  system: boolean;
  options?: string[];
  description?: string;
  placeholder?: string;
  is_active: boolean;
  order: number;
}

const STORAGE_KEY = "camp365_project_attributes_master";

export const DEFAULT_PROJECT_ATTRIBUTES: ProjectAttribute[] = [
  {
    id: "attr-proj-code",
    name: "Project Code / WBS Key",
    key: "project_code",
    category: "contract",
    type: "text",
    required: true,
    system: true,
    placeholder: "PRJ-001 or WBS-9402",
    description: "Unique project accounting code or work breakdown structure reference",
    is_active: true,
    order: 1,
  },
  {
    id: "attr-proj-name",
    name: "Project Name",
    key: "project_name",
    category: "contract",
    type: "text",
    required: true,
    system: true,
    placeholder: "e.g. Berri Gas Plant Expansion",
    description: "Official contractual project title",
    is_active: true,
    order: 2,
  },
  {
    id: "attr-proj-client",
    name: "Client / Project Owner",
    key: "client",
    category: "client",
    type: "dropdown",
    required: true,
    system: true,
    description: "Principal client or procuring governmental / corporate entity",
    options: [
      "Saudi Aramco",
      "SABIC (Saudi Basic Industries Corp)",
      "Ma'aden (Saudi Arabian Mining Company)",
      "SEC (Saudi Electricity Company)",
      "NEOM Company",
      "Red Sea Global",
      "Royal Commission for Jubail & Yanbu (RCJY)",
      "Petro Rabigh",
      "Qiddiya Investment Company",
      "SWCC (Saline Water Conversion Corp)",
      "Ministry of Energy",
      "TRSDC (The Red Sea Development Co)",
      "SATORP (Saudi Aramco Total Refining)",
      "SASREF (Saudi Aramco Shell Refinery)",
    ],
    is_active: true,
    order: 3,
  },
  {
    id: "attr-proj-sector",
    name: "Industry Sector",
    key: "sector",
    category: "contract",
    type: "dropdown",
    required: false,
    system: true,
    description: "Industrial domain or market vertical of the project site",
    options: [
      "Oil & Gas (Upstream / Downstream)",
      "Petrochemical & Refining",
      "Power Generation & Transmission",
      "Renewable Energy (Solar / Wind)",
      "Mining, Minerals & Metallurgy",
      "Industrial Infrastructure & Civil",
      "Water Desalination & Sewage Treatment",
      "Marine, Ports & Offshore",
      "Commercial & Mega-Developments",
    ],
    is_active: true,
    order: 4,
  },
  {
    id: "attr-proj-contract-type",
    name: "Contract Execution Model",
    key: "contract_type",
    category: "contract",
    type: "dropdown",
    required: false,
    system: true,
    description: "Commercial delivery contract type",
    options: [
      "EPC (Engineering, Procurement, Construction)",
      "LSTK (Lump Sum Turnkey)",
      "Turnaround & Inspection (T&I Shutdown)",
      "Operation & Maintenance (O&M)",
      "Long-Term Maintenance Contract (LTC)",
      "Manpower Secondment & Supply",
      "Unit Rate / Call-off Agreement",
    ],
    is_active: true,
    order: 5,
  },
  {
    id: "attr-proj-location",
    name: "Site Location / Operating Zone",
    key: "site_location",
    category: "site",
    type: "dropdown",
    required: true,
    system: true,
    description: "Physical project work site or geographic industrial region",
    options: [
      "Jubail Industrial City (Zone 1 & 2)",
      "Yanbu Industrial City",
      "Ras Al-Khair Industrial Port",
      "Dammam / Dhahran Eastern Area",
      "Neom Industrial Zone (Oxagon / Trojena)",
      "Tanajib Offshore Oil Base",
      "Haradh Gas Plant Zone",
      "Shaybah Deep Desert Complex",
      "Rabigh Petrochemical Complex",
      "Riyadh Metro & Central Region",
      "Jazan Economic City",
      "Turaif Phosphate Hub",
    ],
    is_active: true,
    order: 6,
  },
  {
    id: "attr-proj-status",
    name: "Project Lifecycle Status",
    key: "status",
    category: "contract",
    type: "dropdown",
    required: true,
    system: true,
    description: "Operational deployment and mobilization status",
    options: [
      "Mobilizing / Pre-Start",
      "Active Execution",
      "Maintenance / Ongoing",
      "Commissioning & Handover",
      "Completed / Demobilized",
      "On Hold / Suspended",
    ],
    is_active: true,
    order: 7,
  },
  {
    id: "attr-proj-currency",
    name: "Contract Currency",
    key: "currency",
    category: "finance",
    type: "dropdown",
    required: false,
    system: true,
    description: "Standard currency for contract invoicing and camp per-diem rates",
    options: ["SAR (Saudi Riyal)", "USD (US Dollar)", "EUR (Euro)"],
    is_active: true,
    order: 8,
  },
  {
    id: "attr-proj-billing-model",
    name: "Accommodation Billing Model",
    key: "billing_model",
    category: "finance",
    type: "dropdown",
    required: false,
    system: true,
    description: "Method by which camp stay and catering are accounted for project personnel",
    options: [
      "Direct Client Reimbursable",
      "Contractor Overhead Cost Center",
      "Fixed Daily Per-Diem Included",
      "Unit Rate Man-Day Allocation",
      "Client Provided Camp Free-Issue",
    ],
    is_active: true,
    order: 9,
  },
  {
    id: "attr-proj-hse-tier",
    name: "Safety & HSE Classification",
    key: "hse_tier",
    category: "contract",
    type: "dropdown",
    required: false,
    system: true,
    description: "Health, safety, and environmental compliance tier required on site",
    options: [
      "Tier 1 (High Risk / Critical Petrochem & Refinery)",
      "Tier 2 (Standard Industrial & Civil)",
      "Tier 3 (Light Commercial & Administration)",
      "Offshore Marine Standard (Aramco Marine / IMO)",
    ],
    is_active: true,
    order: 10,
  },
  {
    id: "attr-proj-start-date",
    name: "Contract Start / Mobilization Date",
    key: "start_date",
    category: "contract",
    type: "date",
    required: false,
    system: true,
    description: "Date when site mobilization begins",
    is_active: true,
    order: 11,
  },
  {
    id: "attr-proj-end-date",
    name: "Contract Completion Date",
    key: "end_date",
    category: "contract",
    type: "date",
    required: false,
    system: true,
    description: "Scheduled contract completion or demobilization deadline",
    is_active: true,
    order: 12,
  },
];

export function getStoredProjectAttributes(): ProjectAttribute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROJECT_ATTRIBUTES));
      return DEFAULT_PROJECT_ATTRIBUTES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_PROJECT_ATTRIBUTES;
  } catch {
    return DEFAULT_PROJECT_ATTRIBUTES;
  }
}

export function saveStoredProjectAttributes(attrs: ProjectAttribute[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attrs));
    window.dispatchEvent(new Event("camp365_project_attributes_updated"));
  } catch (e) {
    console.error("Failed to save project attributes to localStorage", e);
  }
}

export function useProjectAttributes() {
  const [attributes, setAttributes] = useState<ProjectAttribute[]>(getStoredProjectAttributes);

  useEffect(() => {
    const handler = () => {
      setAttributes(getStoredProjectAttributes());
    };
    window.addEventListener("camp365_project_attributes_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("camp365_project_attributes_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const addAttribute = (attr: Omit<ProjectAttribute, "id" | "order" | "system">) => {
    const nextOrder = attributes.length > 0 ? Math.max(...attributes.map((a) => a.order)) + 1 : 1;
    const newAttr: ProjectAttribute = {
      ...attr,
      id: `attr-proj-custom-${Date.now()}`,
      order: nextOrder,
      system: false,
    };
    const updated = [...attributes, newAttr];
    saveStoredProjectAttributes(updated);
    setAttributes(updated);
    return newAttr;
  };

  const updateAttribute = (id: string, updates: Partial<ProjectAttribute>) => {
    const updated = attributes.map((a) => (a.id === id ? { ...a, ...updates } : a));
    saveStoredProjectAttributes(updated);
    setAttributes(updated);
  };

  const deleteAttribute = (id: string) => {
    const target = attributes.find((a) => a.id === id);
    if (target?.system) return false;
    const updated = attributes.filter((a) => a.id !== id);
    saveStoredProjectAttributes(updated);
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
    saveStoredProjectAttributes(updated);
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
    saveStoredProjectAttributes(updated);
    setAttributes(updated);
  };

  const resetToDefault = () => {
    saveStoredProjectAttributes(DEFAULT_PROJECT_ATTRIBUTES);
    setAttributes(DEFAULT_PROJECT_ATTRIBUTES);
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

