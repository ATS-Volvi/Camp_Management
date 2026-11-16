export interface DepartmentLunch {
 id: string; department_id: string; camp_id: string; meal_date: string; quantity: number; unit_price: number; total_cost: number; status: string; requested_by: string; remarks: string; decision_note: string;
 departments?: { name: string; code: string; cost_center: string | null } | null;
 camps?: { name: string } | null;
}
const departmentKey = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
const lunchMasterAliases: Record<string,string> = {EMBS:"MBS",ELCTRCLINSTR:"EI",TECHNICALSUPPT:"TSSD"};
/** Preserve employee labels while resolving the saved master UUID. */
export function matchesLunchDepartment(label: string, department: { name: string; code: string }) {
 const key = departmentKey(label);
 return key === departmentKey(department.name) || key === departmentKey(department.code)
  || lunchMasterAliases[key] === departmentKey(department.code);
}
export function lunchDepartmentChoices(departments: {id:string;name:string;code:string}[], labels: (string|null)[]) {
 const names = [...new Set(labels.filter((value): value is string => Boolean(value?.trim())).map(value=>value.trim()))].sort();
 const choices = new Map<string,{id:string;name:string}>();
 for (const label of names) {
  const master = departments.find(d => departmentKey(d.name) === departmentKey(label) || departmentKey(d.code) === departmentKey(label))
   || departments.find(d => matchesLunchDepartment(label,d));
  if(master && (!choices.has(master.id) || departmentKey(label) === departmentKey(master.name))) choices.set(master.id,{id:master.id,name:label});
 }
 for (const master of departments) if(!choices.has(master.id)) choices.set(master.id,{id:master.id,name:master.name});
 return [...choices.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export function lunchDepartmentName(id: string, choices: {id:string;name:string}[], fallback?: {name:string;code:string}|null) {
 return choices.find(d=>d.id===id)?.name || fallback?.name || "—";
}
export function lunchHistoryChoices(choices: {id:string;name:string}[], requests: DepartmentLunch[]) {
 const result=new Map(choices.map(d=>[d.id,d]));
 for(const request of requests) if(!result.has(request.department_id) && request.departments) result.set(request.department_id,{id:request.department_id,name:request.departments.name});
 return [...result.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export function summarizeDepartmentLunch(requests: DepartmentLunch[], from: string, to: string, department = "all", camp = "all") {
 const approved = requests.filter(r => r.status === "approved" && r.meal_date >= from && r.meal_date <= to && (department === "all" || r.department_id === department) && (camp === "all" || r.camp_id === camp));
 const days = new Map<string, { date: string; quantity: number; cost: number }>();
 for (const r of approved) {
  const day = days.get(r.meal_date) || { date: r.meal_date, quantity: 0, cost: 0 };
  day.quantity += r.quantity; day.cost += Number(r.total_cost); days.set(r.meal_date, day);
 }
 return { quantity: approved.reduce((s,r) => s+r.quantity,0), cost: approved.reduce((s,r) => s+Number(r.total_cost),0), daily: [...days.values()].sort((a,b) => a.date.localeCompare(b.date)) };
}