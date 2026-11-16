import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format,endOfMonth,parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { useDepartmentLunch,useLunchRates,useLunchMutation } from "@/hooks/useDepartmentLunch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { Tabs,TabsList,TabsTrigger,TabsContent } from "@/components/ui/tabs";
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { Table,TableHeader,TableHead,TableRow,TableBody,TableCell } from "@/components/ui/table";
import DepartmentLunchTable from "@/components/reports/DepartmentLunchTable";
import { lunchDepartmentChoices,lunchDepartmentName,lunchHistoryChoices,summarizeDepartmentLunch,type DepartmentLunch as LunchRequest } from "@/lib/departmentLunch";

export default function DepartmentLunch() {
 const {user}=useAuth(); const departmentQuery=useDepartments(); const departments=departmentQuery.data||[];
 const employees=useEmployees();
 const departmentOptions=lunchDepartmentChoices(departments,(employees.data||[]).map(e=>e.department));
 const [month,setMonth]=useState(format(new Date(),"yyyy-MM")); const [dept,setDept]=useState("all"); const [status,setStatus]=useState("all");
 const from=month+"-01",to=format(endOfMonth(parseISO(from)),"yyyy-MM-dd");
 const requests=useDepartmentLunch(from,to);const rates=useLunchRates();const mutation=useLunchMutation();
 const historyOptions=lunchHistoryChoices(departmentOptions,requests.data||[]);
 const [show,setShow]=useState(false);const [requestDept,setRequestDept]=useState("");const [camp,setCamp]=useState("");const [date,setDate]=useState(format(new Date(),"yyyy-MM-dd"));const [count,setCount]=useState("1");const [remarks,setRemarks]=useState("");
 const [decision,setDecision]=useState<{row:LunchRequest;status:string}|null>(null);const [note,setNote]=useState("");
 const camps=useQuery({queryKey:["department-lunch-camps"],queryFn:async()=>{const {data,error}=await supabase.from("camps").select("id,name").order("name");if(error)throw error;return data;}});
 const run=async(action:()=>PromiseLike<{error:unknown}>,success:string)=>{try{await mutation.mutateAsync(action);toast.success(success);return true;}catch(e){toast.error(e instanceof Error?e.message:(e as {message?:string})?.message||"Unable to save");return false;}};
 const options=(value:string,onChange:(v:string)=>void,items:{id:string;name:string}[],label:string)=><Select value={value} onValueChange={onChange} disabled={employees.isLoading||employees.isError||departmentQuery.isLoading||departmentQuery.isError}><SelectTrigger aria-label={label}><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{items.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>;
 const filtered=(requests.data||[]).filter(r=>(dept==="all"||r.department_id===dept)&&(status==="all"||r.status===status));
 const summary=summarizeDepartmentLunch(requests.data||[],from,to,dept);
 const price=rates.data?.find(r=>r.camp_id===camp)?.unit_price;
 return <div className="space-y-6"><div className="flex flex-wrap justify-between items-center gap-3"><h1 className="text-2xl font-bold">Department Lunch Meals</h1><Button disabled={employees.isLoading||employees.isError||departmentQuery.isLoading||departmentQuery.isError} onClick={()=>setShow(true)}><Plus size={16} className="mr-2"/>Request Lunch</Button></div>
 <div className="flex flex-wrap gap-4 items-end"><div><Label>Month</Label><Input aria-label="Lunch month" type="month" value={month} onChange={e=>e.target.value&&setMonth(e.target.value)}/></div><div className="w-64"><Label>Department</Label>{options(dept,setDept,[{id:"all",name:"All Departments"},...historyOptions],"Department filter")}</div><div className="w-48"><Label>Status</Label>{options(status,setStatus,["all","pending","approved","rejected","cancelled"].map(id=>({id,name:id==="all"?"All statuses":id})),"Request status")}</div></div>
 <Tabs defaultValue="requests"><TabsList><TabsTrigger value="requests">Lunch Requests</TabsTrigger><TabsTrigger value="monthly">Monthly Lunch Costs</TabsTrigger></TabsList>
 <TabsContent value="requests">{requests.isError||rates.isError||employees.isError||departmentQuery.isError?<div role="alert">Unable to load lunch requests or master prices. <Button variant="outline" onClick={()=>{requests.refetch();rates.refetch();employees.refetch();departmentQuery.refetch();}}>Retry</Button></div>:requests.isLoading?<p>Loading requests…</p>:<div className="overflow-auto"><Table><TableHeader><TableRow>{["Date","Department","Camp","Lunch count","Master price (SAR)","Cost (SAR)","Status","Remarks / Decision","Actions"].map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{filtered.map(r=><TableRow key={r.id}><TableCell>{r.meal_date}</TableCell><TableCell>{lunchDepartmentName(r.department_id,historyOptions,r.departments)}</TableCell><TableCell>{r.camps?.name}</TableCell><TableCell>{r.quantity}</TableCell><TableCell>{Number(r.unit_price).toFixed(2)}</TableCell><TableCell>{Number(r.total_cost).toFixed(2)}</TableCell><TableCell className="capitalize">{r.status}</TableCell><TableCell>{r.remarks}{r.decision_note&&<div className="text-muted-foreground">{r.decision_note}</div>}</TableCell><TableCell><div className="flex gap-1">{r.status==="pending"&&r.requested_by===user?.id&&<Button variant="outline" size="sm" onClick={()=>{setDecision({row:r,status:"cancelled"});setNote("");}}>Cancel</Button>}</div></TableCell></TableRow>)}{!filtered.length&&<TableRow><TableCell colSpan={9}>No lunch requests for these filters</TableCell></TableRow>}</TableBody></Table></div>}</TabsContent>
 <TabsContent value="monthly">{requests.isError?<p role="alert">Unable to load lunch costs</p>:requests.isLoading?<p>Loading…</p>:<DepartmentLunchTable summary={summary}/>}</TabsContent>
 </Tabs>
 <Dialog open={show} onOpenChange={setShow}><DialogContent><DialogHeader><DialogTitle>Request Department Lunch</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(await run(()=>supabase.rpc("request_department_lunch",{p_department:requestDept,p_camp:camp,p_date:date,p_quantity:Number(count),p_remarks:remarks}),"Lunch request saved")){setShow(false);setMonth(date.slice(0,7));}}}><div><Label>Department</Label>{options(requestDept,setRequestDept,departmentOptions,"Request department")}</div><div><Label>Supplying camp</Label>{options(camp,setCamp,camps.data||[],"Supplying camp")}</div><div><Label htmlFor="lunch-date">Lunch date</Label><Input id="lunch-date" type="date" required value={date} onChange={e=>setDate(e.target.value)}/></div><div className="grid grid-cols-2 gap-4"><div><Label htmlFor="lunch-count">Lunch count</Label><Input id="lunch-count" type="number" min="1" step="1" required value={count} onChange={e=>setCount(e.target.value)}/></div><div><Label>Master price / lunch (SAR)</Label><div className="pt-2 font-semibold">{price===undefined?"Not configured":Number(price).toFixed(2)}</div></div></div><div className="font-semibold">Total: SAR {(Number(count)*Number(price || 0)).toFixed(2)}</div><div><Label htmlFor="lunch-remarks">Remarks</Label><Input id="lunch-remarks" value={remarks} onChange={e=>setRemarks(e.target.value)}/></div><Button type="submit" disabled={mutation.isPending||employees.isLoading||employees.isError||!camp||!requestDept||price===undefined||rates.isLoading||rates.isError}>Submit Request</Button></form></DialogContent></Dialog>
 <Dialog open={!!decision} onOpenChange={open=>{if(!open)setDecision(null);}}><DialogContent><DialogHeader><DialogTitle className="capitalize">{decision?.status=== "approved"?"Approve":decision?.status==="rejected"?"Reject":"Cancel"} Lunch Request</DialogTitle></DialogHeader><p>{decision ? lunchDepartmentName(decision.row.department_id,historyOptions,decision.row.departments) : ""} · {decision?.row.meal_date} · {decision?.row.quantity} lunches · SAR {Number(decision?.row.total_cost||0).toFixed(2)}</p><Label htmlFor="decision-note">Decision note</Label><Input id="decision-note" value={note} onChange={e=>setNote(e.target.value)}/><Button disabled={mutation.isPending||(decision?.status==="rejected"&&!note.trim())} onClick={async()=>{if(decision&&await run(()=>supabase.rpc("decide_department_lunch",{p_request:decision.row.id,p_status:decision.status,p_note:note}),"Lunch request updated"))setDecision(null);}}>Confirm</Button></DialogContent></Dialog>
 </div>;
}