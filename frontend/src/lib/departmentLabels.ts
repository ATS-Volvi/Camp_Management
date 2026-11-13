export interface DepartmentMasterRow {
  name: string;
  code?: string | null;
}

export interface DepartmentLabel {
  /** Short form shown on charts and tables, e.g. "HERD". */
  short: string;
  /** Full department name, e.g. "Heavy Equipment Rental Department". */
  name: string;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Short forms for the department values that arrive from workforce spreadsheets.
 * Anything the Department Master already knows (code or name) wins over this table.
 */
const ALIASES: Record<string, DepartmentLabel> = {
  herd: { short: "HERD", name: "Heavy Equipment Rental Department" },
  equipmentservi: { short: "HERD", name: "Heavy Equipment Rental Department" },
  equipmentservices: { short: "HERD", name: "Heavy Equipment Rental Department" },
  heavyequipment: { short: "HERD", name: "Heavy Equipment Rental Department" },
  heavyequipmentrental: { short: "HERD", name: "Heavy Equipment Rental Department" },
  embs: { short: "MBS", name: "Modular Building Services" },
  trnslgstdep: { short: "T&L", name: "Transport & Logistics Department" },
  transport: { short: "T&L", name: "Transport & Logistics Department" },
  logistics: { short: "T&L", name: "Transport & Logistics Department" },
  internalfacili: { short: "IF", name: "Internal Facilities" },
  technicalsuppt: { short: "TSSD", name: "Technical Service Support Division" },
  projectservice: { short: "PSD", name: "Project Support Division" },
  peopledepartmn: { short: "HR", name: "Human Resources" },
  operations: { short: "OPS", name: "Operations" },
  elctrclinstr: { short: "EI", name: "Electrical and Instrumentation Division" },
  maintenance: { short: "MAINT", name: "Maintenance" },
  facilitycate: { short: "F&C", name: "Facility & Catering" },
  campaccommod: { short: "C&A", name: "Camp & Accommodation" },
  informationtec: { short: "IT", name: "Information Technology" },
  rigging: { short: "RIG", name: "Rigging" },
  mechanical: { short: "MECH", name: "Mechanical" },
  businesdevelop: { short: "BD", name: "Business Development" },
  wastemanagement: { short: "WM", name: "Waste Management" },
  safety: { short: "SAF", name: "Safety" },
  ccdcivilconst: { short: "CCD", name: "Civil Construction Department" },
  hse: { short: "HSE", name: "Health, Safety & Environment" },
  hlthsftyenv: { short: "HSE", name: "Health, Safety & Environment" },
  warehouse: { short: "WHSE", name: "Warehouse" },
  engineering: { short: "ENG", name: "Engineering" },
  financedept: { short: "FIN", name: "Finance" },
  construction: { short: "CONST", name: "Construction" },
  management: { short: "MGMT", name: "Management" },
  qaqcdept: { short: "QAQC", name: "Quality Assurance & Quality Control" },
  administration: { short: "ADMIN", name: "Administration" },
  projects: { short: "PROJ", name: "Projects" },
  fabrication: { short: "FAB", name: "Fabrication" },
  legaldepartmnt: { short: "LEGAL", name: "Legal Department" },
  auditdepartmnt: { short: "AUDIT", name: "Audit Department" },
  scm: { short: "SCM", name: "Supply Chain Management" },
};

const initials = (value: string) => {
  const letters = value
    .split(/[^A-Za-z0-9]+/)
    .filter(word => /[A-Za-z]/.test(word))
    .map(word => word[0].toUpperCase())
    .join("");
  return letters.slice(0, 5) || value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5);
};

/** Resolve a raw department value into a short form plus its full name. */
export function departmentLabel(raw: string | null | undefined, master: DepartmentMasterRow[] = []): DepartmentLabel {
  const value = (raw ?? "").trim();
  if (!value) return { short: "Not recorded", name: "Not recorded" };
  const key = normalize(value);
  const alias = ALIASES[key];
  if (alias) return alias;
  const byCode = master.find(row => normalize(row.code ?? "") === key);
  if (byCode) return { short: (byCode.code ?? byCode.name).toUpperCase(), name: byCode.name };
  const byName = master.find(row => normalize(row.name) === key);
  if (byName) return { short: (byName.code ?? byName.name).toUpperCase(), name: byName.name };
  return { short: initials(value), name: value };
}

/** "HERD — Heavy Equipment Rental Department", or just the name when there is no short form. */
export function departmentDisplayName(label: DepartmentLabel) {
  return label.short === label.name ? label.name : `${label.short} — ${label.name}`;
}

/**
 * Checks whether an employee record belongs to a target department code or name,
 * taking into account SAP truncations (e.g. "Equipment Servi" -> "HERD") and project/division mappings.
 */
export function matchesDepartment(
  record: { department?: string | null; project?: string | null } | null | undefined,
  targetDept: string | null | undefined
): boolean {
  if (!targetDept || targetDept === "(All)" || targetDept === "all") return true;
  if (!record) return false;
  const target = targetDept.toUpperCase().trim();
  const dept = (record.department || "").toUpperCase().trim();
  const proj = (record.project || "").toUpperCase().trim();

  if (target === "HERD") {
    return (
      dept === "HERD" ||
      dept.includes("EQUIPMENT SERVI") ||
      dept.includes("EQUIPMENT SERVICES") ||
      dept.includes("HEAVY EQUIPMENT") ||
      proj === "HERD"
    );
  }
  if (target === "EMBS" || target === "MBS") {
    return (
      dept.includes("EMBS") ||
      dept.includes("MBS") ||
      proj.includes("EMBS") ||
      proj.includes("MBS")
    );
  }
  if (target === "PMTA") {
    return (
      dept.includes("PMTA") ||
      dept.includes("PLANT MAINT") ||
      proj.includes("PMTA")
    );
  }
  if (target === "VSD") {
    return (
      dept.includes("VSD") ||
      dept.includes("VALVE") ||
      proj.includes("VSD")
    );
  }
  if (target === "RSD") {
    return (
      dept.includes("RSD") ||
      dept.includes("ROTATING") ||
      proj.includes("RSD")
    );
  }
  return dept.includes(target) || proj.includes(target);
}
