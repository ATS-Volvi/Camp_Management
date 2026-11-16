import { useState } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLunchRates } from "@/hooks/useDepartmentLunch";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table,TableHeader,TableRow,TableHead,TableBody,TableCell } from "@/components/ui/table";

export default function DepartmentLunchRates(){
 const {isSuperAdmin}=usePermissions(); const rates=useLunchRates();const cache=useQueryClient();
 const [draft,setDraft]=useState<Record<string,string>>({});const [saving,setSaving]=useState<string|null>(null);
 const camps=useQuery({queryKey:["department-lunch-camps"],queryFn:async()=>{const {data,error}=await supabase.from("camps").select("id,name").order("name");if(error)throw error;return data;}});
 if(!isSuperAdmin)return <p>Administrator access required</p>;
 const save=async(id:string)=>{const value=draft[id];if(value===undefined||value.trim()===""||!Number.isFinite(Number(value))||Number(value)<0||Number(value)!==Math.round(Number(value)*100)/100){toast.error("Enter a non-negative price with up to two decimals");return;}setSaving(id);try{const {error}=await supabase.from("department_lunch_rates").upsert({camp_id:id,unit_price:Number(value),updated_at:new Date().toISOString()});if(error)throw error;await cache.invalidateQueries({queryKey:["department-lunch-rates"]});setDraft(old=>{const next={...old};delete next[id];return next;});toast.success("Lunch price saved");}catch(e){toast.error((e as {message?:string}).message||"Unable to save price");}finally{setSaving(null);}};
 return <div className="space-y-6"><h1 className="text-2xl font-bold">Department Lunch Rate Master</h1>{rates.isError||camps.isError?<p role="alert">Unable to load lunch prices <Button variant="outline" onClick={()=>{rates.refetch();camps.refetch();}}>Retry</Button></p>:rates.isLoading||camps.isLoading?<p>Loading prices…</p>:<Table><TableHeader><TableRow><TableHead>Supplying Camp</TableHead><TableHead>Lunch Price (SAR)</TableHead><TableHead>Save</TableHead></TableRow></TableHeader><TableBody>{camps.data?.map(c=>{const saved=rates.data?.find(r=>r.camp_id===c.id)?.unit_price;return <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell><Input className="max-w-48" aria-label={`${c.name} lunch price`} type="number" min="0" step="0.01" placeholder="Not configured" value={draft[c.id]??(saved===undefined?"":String(saved))} onChange={e=>setDraft(old=>({...old,[c.id]:e.target.value}))}/></TableCell><TableCell><Button variant="outline" size="icon" aria-label={`Save ${c.name} lunch price`} disabled={saving!==null||draft[c.id]===undefined} onClick={()=>save(c.id)}><Save size={16}/></Button></TableCell></TableRow>;})}</TableBody></Table>}</div>;
}