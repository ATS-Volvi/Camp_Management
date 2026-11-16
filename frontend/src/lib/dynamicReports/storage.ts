import { BUILT_IN_PRESETS } from "./datasets";
import { PresetTemplate, ReportConfig } from "./types";

const STORAGE_KEY = "campm_custom_dynamic_reports";

export function getSavedReports(): PresetTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const custom: PresetTemplate[] = raw ? JSON.parse(raw) : [];
    return [...BUILT_IN_PRESETS, ...custom];
  } catch (err) {
    console.warn("Failed to load custom reports from localStorage", err);
    return BUILT_IN_PRESETS;
  }
}

export function saveCustomReport(name: string, description: string, config: ReportConfig): PresetTemplate {
  const current = getCustomOnlyReports();
  const newReport: PresetTemplate = {
    id: `custom_${Date.now()}`,
    name: name.trim() || "Untitled Custom Report",
    description: description.trim() || "Custom user-generated pivot configuration",
    config,
    isBuiltIn: false,
  };

  const updated = [newReport, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newReport;
}

export function deleteCustomReport(id: string): void {
  const current = getCustomOnlyReports();
  const updated = current.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

function getCustomOnlyReports(): PresetTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
