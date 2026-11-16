import { readFileSync, existsSync } from "node:fs";
import { describe,it,expect } from "vitest";
import { summarizeDepartmentLunch,type DepartmentLunch } from "./departmentLunch";

const migrationPath = existsSync("../database/migrations/0036_department_lunch_master_pricing.sql")
  ? "../database/migrations/0036_department_lunch_master_pricing.sql"
  : existsSync("database/migrations/0036_department_lunch_master_pricing.sql")
  ? "database/migrations/0036_department_lunch_master_pricing.sql"
  : "drizzle/migrations/0036_department_lunch_master_pricing.sql";

const migration=readFileSync(migrationPath,"utf8");
const body=migration.split("CREATE FUNCTION public.request_department_lunch")[1].split("END $$;")[0];
describe("department lunch master enforcement",()=>{
 it("loads and snapshots the saved master price instead of accepting a requester price",()=>{
  expect(body.split("RETURNS uuid")[0]).not.toMatch(/p_price/);
  expect(body).toMatch(/SELECT unit_price INTO v_price FROM public.department_lunch_rates WHERE camp_id=p_camp/);
  expect(body).toMatch(/p_quantity,v_price,'approved'/);
  expect(migration).toMatch(/BEGIN RETURN public.request_department_lunch\(p_department,p_camp,p_date,p_quantity,p_remarks\)/);
 });
 it("skips department manager approval on new submissions",()=>{
  expect(body).not.toMatch(/department_lunch_managers/);
  expect(body).toMatch(/'approved',auth.uid\(\),'Approval skipped/);
 });
 it("includes all 31 October days with daily counts between 20 and 30",()=>{
  const quantities=[20,21,30,22,25,20,24,26,22,23,23,21,23,21,20,25,27,23,22,20,27,21,27,26,21,28,26,28,25,29,25];
  const rows:DepartmentLunch[]=quantities.map((quantity,i)=>({id:String(i),department_id:"MBS",camp_id:"Expertise Camp 01",meal_date:`2026-10-${String(i+1).padStart(2,"0")}`,quantity,unit_price:8,total_cost:quantity*8,status:"approved",requested_by:"sample",remarks:"Sample",decision_note:""}));
  const result=summarizeDepartmentLunch(rows,"2026-10-01","2026-10-31","MBS","Expertise Camp 01");
  expect(result.daily).toHaveLength(31);for(const day of result.daily){expect(day.quantity).toBeGreaterThanOrEqual(20);expect(day.quantity).toBeLessThanOrEqual(30);}expect(result.quantity).toBe(741);expect(result.cost).toBe(5928);
 });
});