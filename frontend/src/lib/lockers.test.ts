import { describe,it,expect } from 'vitest';
import { lockerCharge,lockerCapacityAvailable } from './lockers';
import { buildRevenueRows } from '@/components/reports/RevenueReportTab';
const a={allocated_on:'2026-10-01',released_on:null,charge_mode:'Daily',charge_rate:5};
const l={id:'l',status:'Available',condition:'Good',capacity:1};
describe('locker allocation and independent charges',()=>{
 it('blocks double allocation of a full individual locker',()=>expect(lockerCapacityAvailable(l,[{locker_id:'l',released_on:null}])).toBe(false));
 it('allows shared capacity only until full',()=>{expect(lockerCapacityAvailable({...l,capacity:2,status:'Allocated'},[{locker_id:'l',released_on:null}])).toBe(true);expect(lockerCapacityAvailable({...l,capacity:2},[{locker_id:'l',released_on:null},{locker_id:'l',released_on:null}])).toBe(false);});
 it.each(['Damaged','Under Maintenance','Decommissioned'])('never allocates unavailable %s',status=>expect(lockerCapacityAvailable({...l,status},[])).toBe(false));
 it('retains allocation during vacation without a release event',()=>expect(lockerCapacityAvailable({...l,status:'Allocated'},[{locker_id:'l',released_on:null}])).toBe(false));
 it('frees usable capacity only after explicit release',()=>expect(lockerCapacityAvailable(l,[{locker_id:'l',released_on:'2026-10-05'}])).toBe(true));
 it('free facilities charge zero',()=>expect(lockerCharge({...a,charge_mode:'Free'},'2026-10-01','2026-10-31','2026-11-01')).toBe(0));
 it('daily charges exclude release day',()=>expect(lockerCharge({...a,released_on:'2026-10-06'},'2026-10-01','2026-10-31','2026-11-01')).toBe(25));
 it('monthly charges use 30 day convention',()=>expect(lockerCharge({...a,charge_mode:'Monthly',charge_rate:300},'2026-10-01','2026-10-05','2026-11-01')).toBe(50));
 it('one time allocation charged once in allocation period',()=>{expect(lockerCharge({...a,charge_mode:'One-time',charge_rate:100},'2026-10-01','2026-10-31','2026-11-01')).toBe(100);expect(lockerCharge({...a,charge_mode:'One-time',charge_rate:100},'2026-11-01','2026-11-30','2026-11-11')).toBe(0);});
 it('does not project charges past today',()=>expect(lockerCharge(a,'2026-10-01','2026-10-31','2026-10-04')).toBe(20));
 it('deposits are never included in earned locker charges',()=>expect(lockerCharge({...a,charge_mode:'Free',deposit:1000} as typeof a,'2026-10-01','2026-10-31','2026-11-01')).toBe(0));
 it('billing adds locker charges separately without changing room or food',()=>{
  const data={checkIns:[{id:'stay',employee_id:'e',camp_id:'c',room_id:'r',check_in_date:'2026-10-01T09:00:00Z',food_required:true,employees:{name:'Employee',employee_id:'1',employee_type:'own'},rooms:{room_number:'1',category:'1x1',daily_food_rate:30}}],checkOuts:[],rates:[{camp_id:'c',room_category:'1x1',daily_rate:100}],cancellations:[],lockerBilling:{lockers:[{id:'l',camp_id:'c'}],allocations:[{...a,employee_id:'e',locker_id:'l',deposit:1000}]}};
  expect(buildRevenueRows(data,'2026-10-01','2026-10-05')[0]).toMatchObject({roomRevenue:500,foodRevenue:150,lockerCost:25,total:675});
 });
});