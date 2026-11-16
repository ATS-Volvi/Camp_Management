import {describe,it,expect} from "vitest";
import {lunchDepartmentChoices,lunchDepartmentName,lunchHistoryChoices,matchesLunchDepartment,summarizeDepartmentLunch,type DepartmentLunch} from "./departmentLunch";
const row=(overrides:Partial<DepartmentLunch>={}):DepartmentLunch=>({id:"1",department_id:"ops",camp_id:"camp",meal_date:"2026-11-13",quantity:10,unit_price:8,total_cost:80,status:"approved",requested_by:"requester",remarks:"",decision_note:"",...overrides});
describe("department lunch charges",()=>{
 it("retains saved department IDs in history filters even after a department becomes inactive",()=>{
  const saved=row({department_id:"inactive",departments:{name:"Audit Departmnt",code:"AUDIT",cost_center:null}});
  expect(lunchHistoryChoices([{id:"mbs",name:"EMBS"}],[saved])).toEqual([{id:"inactive",name:"Audit Departmnt"},{id:"mbs",name:"EMBS"}]);
 });
 it("uses employee department labels and retains saved master IDs for lunch submission",()=>{
  const choices=lunchDepartmentChoices([{id:"mbs",name:"Modular Building Services",code:"MBS"},{id:"audit",name:"Audit Departmnt",code:"AUDIT"},{id:"ei",name:"Electrical and Instrumentation Division",code:"EI"}], ["EMBS","Audit Departmnt","Elctrcl & Instr","EMBS"]);
  expect(choices).toEqual([{id:"audit",name:"Audit Departmnt"},{id:"ei",name:"Elctrcl & Instr"},{id:"mbs",name:"EMBS"}]);
 });
 it("matches spacing variants and existing electrical/technical master labels for billing",()=>{
  expect(matchesLunchDepartment("Hlth, Sfty& Env",{name:"Hlth, Sfty & Env",code:"HSE"})).toBe(true);
  expect(matchesLunchDepartment("Elctrcl & Instr",{name:"Electrical and Instrumentation Division",code:"EI"})).toBe(true);
  expect(matchesLunchDepartment("Technical Suppt",{name:"Technical Service Support Division",code:"TSSD"})).toBe(true);
 });
 it("matches imported EMBS to Modular Building Services without matching other departments",()=>{
  const department={name:"Modular Building Services",code:"MBS"};
  expect(matchesLunchDepartment("EMBS",department)).toBe(true);
  expect(matchesLunchDepartment("MBS",department)).toBe(true);
  expect(matchesLunchDepartment("Modular Building Services",department)).toBe(true);
  expect(matchesLunchDepartment("PMTA",department)).toBe(false);
 });
 it("adds daily counts and custom-priced costs to the monthly line item",()=>{const result=summarizeDepartmentLunch([row(),row({id:"2",quantity:5,unit_price:9,total_cost:45}),row({id:"3",meal_date:"2026-11-14",quantity:2,total_cost:16})],"2026-11-01","2026-11-30");expect(result.quantity).toBe(17);expect(result.cost).toBe(141);expect(result.daily[0]).toEqual({date:"2026-11-13",quantity:15,cost:125});});
 it("charges approved requests only",()=>{expect(summarizeDepartmentLunch([row(),...['pending','rejected','cancelled'].map(status=>row({status}))],"2026-11-01","2026-11-30").cost).toBe(80);});
 it("keeps department, camp and month charges separate",()=>{expect(summarizeDepartmentLunch([row(),row({department_id:"hr"}),row({camp_id:"other"}),row({meal_date:"2026-12-01"})],"2026-11-01","2026-11-30","ops","camp").cost).toBe(80);});
});