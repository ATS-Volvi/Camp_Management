import { useState, useEffect } from "react";

export type AttributeType = "text" | "number" | "phone" | "email" | "dropdown" | "date" | "boolean";
export type AttributeCategory = "personal" | "contact" | "identity" | "job" | "custom";

export interface EmployeeAttribute {
  id: string;
  name: string;
  key: string;
  category: AttributeCategory;
  type: AttributeType;
  required: boolean;
  system: boolean; // cannot be deleted
  options?: string[]; // for dropdown types
  description?: string;
  placeholder?: string;
  is_active: boolean;
  order: number;
}

const STORAGE_KEY = "camp365_employee_attributes_master";

export const DEFAULT_ATTRIBUTES: EmployeeAttribute[] = [
  {
    id: "attr-empid",
    name: "Employee ID",
    key: "employee_id",
    category: "identity",
    type: "text",
    required: true,
    system: true,
    placeholder: "EMP-001 or 10423",
    description: "Unique employee badge or company identification number",
    is_active: true,
    order: 1,
  },
  {
    id: "attr-name",
    name: "Full Name",
    key: "name",
    category: "personal",
    type: "text",
    required: true,
    system: true,
    placeholder: "e.g. Mohammed Al-Otaibi",
    description: "Legal full name as registered in passport/Iqama",
    is_active: true,
    order: 2,
  },
  {
    id: "attr-nationality",
    name: "Nationality",
    key: "nationality",
    category: "personal",
    type: "dropdown",
    required: false,
    system: true,
    description: "Country of citizenship",
    options: [
      "Saudi",
      "Indian",
      "Filipino",
      "Pakistani",
      "Egyptian",
      "Bangladeshi",
      "Nepalese",
      "Jordanian",
      "Lebanese",
      "Sudanese",
      "Yemeni",
      "Turkish",
      "Sri Lankan",
      "Syrian",
      "British",
      "American",
    ],
    is_active: true,
    order: 3,
  },
  {
    id: "attr-designation",
    name: "Designation / Trade",
    key: "designation",
    category: "job",
    type: "dropdown",
    required: false,
    system: true,
    description: "Job title or trade classification",
    options: [
      "Camp Boss",
      "Warden",
      "Supervisor",
      "Safety Officer",
      "Electrician",
      "Plumber",
      "HVAC Technician",
      "Mason",
      "Welder",
      "Pipe Fitter",
      "Scaffolder",
      "Rigging Foreman",
      "Civil Engineer",
      "Cook",
      "Driver",
      "Cleaner",
      "Security Guard",
      "General Laborer",
    ],
    is_active: true,
    order: 4,
  },
  {
    id: "attr-dept",
    name: "Department",
    key: "department",
    category: "job",
    type: "dropdown",
    required: false,
    system: true,
    description: "Organizational business unit or division",
    options: [
      "Operations",
      "Maintenance & Facilities",
      "Catering & Mess",
      "HSE & Safety",
      "Civil Works",
      "Mechanical & Piping",
      "Electrical & Instrumentation",
      "Logistics & Fleet",
      "Administration & HR",
    ],
    is_active: true,
    order: 5,
  },
  {
    id: "attr-phone",
    name: "Phone Number",
    key: "phone",
    category: "contact",
    type: "phone",
    required: false,
    system: true,
    placeholder: "+966 5X XXX XXXX",
    description: "Primary mobile contact number",
    is_active: true,
    order: 6,
  },
  {
    id: "attr-email",
    name: "Email Address",
    key: "email",
    category: "contact",
    type: "email",
    required: false,
    system: true,
    placeholder: "user@expertise.com",
    description: "Official or personal email address",
    is_active: true,
    order: 7,
  },
  {
    id: "attr-iqama",
    name: "Iqama / National ID",
    key: "iqama_number",
    category: "identity",
    type: "text",
    required: false,
    system: true,
    placeholder: "24XXXXXXXX",
    description: "Saudi National ID or resident Iqama number",
    is_active: true,
    order: 8,
  },
  {
    id: "attr-passport",
    name: "Passport Number",
    key: "passport_number",
    category: "identity",
    type: "text",
    required: false,
    system: true,
    placeholder: "A1234567",
    description: "Passport travel document number",
    is_active: true,
    order: 9,
  },
  {
    id: "attr-company",
    name: "Company / Sponsoring Entity",
    key: "company",
    category: "job",
    type: "dropdown",
    required: false,
    system: true,
    description: "Legal employing corporation or sponsor",
    options: ["Expertise Holding", "Expertise Contracting", "Industrial Support Services", "Subcontractor"],
    is_active: true,
    order: 10,
  },
  {
    id: "attr-blood",
    name: "Blood Group",
    key: "blood_group",
    category: "personal",
    type: "dropdown",
    required: false,
    system: false,
    description: "Blood type for emergency medical records",
    options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    is_active: true,
    order: 11,
  },
  {
    id: "attr-emergency",
    name: "Emergency Contact Phone",
    key: "emergency_contact",
    category: "contact",
    type: "phone",
    required: false,
    system: false,
    placeholder: "+966 5X XXX XXXX",
    description: "Next of kin emergency contact number",
    is_active: true,
    order: 12,
  },
  {
    id: "attr-status",
    name: "Employment Status",
    key: "status",
    category: "job",
    type: "dropdown",
    required: true,
    system: true,
    description: "Current operational roster status",
    options: ["active", "inactive", "transferred", "on_leave"],
    is_active: true,
    order: 13,
  },
];

export function getStoredAttributes(): EmployeeAttribute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ATTRIBUTES));
      return DEFAULT_ATTRIBUTES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_ATTRIBUTES;
  } catch {
    return DEFAULT_ATTRIBUTES;
  }
}

export function saveStoredAttributes(attrs: EmployeeAttribute[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attrs));
    window.dispatchEvent(new Event("camp365_employee_attributes_updated"));
  } catch (e) {
    console.error("Failed to save employee attributes to localStorage", e);
  }
}

export function useEmployeeAttributes() {
  const [attributes, setAttributes] = useState<EmployeeAttribute[]>(getStoredAttributes);

  useEffect(() => {
    const handler = () => {
      setAttributes(getStoredAttributes());
    };
    window.addEventListener("camp365_employee_attributes_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("camp365_employee_attributes_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const addAttribute = (attr: Omit<EmployeeAttribute, "id" | "order" | "system">) => {
    const nextOrder = attributes.length > 0 ? Math.max(...attributes.map((a) => a.order)) + 1 : 1;
    const newAttr: EmployeeAttribute = {
      ...attr,
      id: `attr-custom-${Date.now()}`,
      order: nextOrder,
      system: false,
    };
    const updated = [...attributes, newAttr];
    saveStoredAttributes(updated);
    setAttributes(updated);
    return newAttr;
  };

  const updateAttribute = (id: string, updates: Partial<EmployeeAttribute>) => {
    const updated = attributes.map((a) => (a.id === id ? { ...a, ...updates } : a));
    saveStoredAttributes(updated);
    setAttributes(updated);
  };

  const deleteAttribute = (id: string) => {
    const target = attributes.find((a) => a.id === id);
    if (target?.system) return false;
    const updated = attributes.filter((a) => a.id !== id);
    saveStoredAttributes(updated);
    setAttributes(updated);
    return true;
  };

  const addOptionToAttribute = (attributeKey: string, newOption: string) => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    const updated = attributes.map((a) => {
      if (a.key === attributeKey && a.type === "dropdown") {
        const currentOptions = a.options || [];
        if (!currentOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
          return { ...a, options: [...currentOptions, trimmed] };
        }
      }
      return a;
    });
    saveStoredAttributes(updated);
    setAttributes(updated);
  };

  const removeOptionFromAttribute = (attributeKey: string, optionToRemove: string) => {
    const updated = attributes.map((a) => {
      if (a.key === attributeKey && a.type === "dropdown") {
        return {
          ...a,
          options: (a.options || []).filter((o) => o !== optionToRemove),
        };
      }
      return a;
    });
    saveStoredAttributes(updated);
    setAttributes(updated);
  };

  const resetToDefault = () => {
    saveStoredAttributes(DEFAULT_ATTRIBUTES);
    setAttributes(DEFAULT_ATTRIBUTES);
  };

  // Helper getters for fast access in forms
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

