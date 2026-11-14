import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
export default function AbsenceReasonSettings() {
  const qc = useQueryClient();
  const [name, setName] = useState(""), [status, setStatus] = useState<"vacation" | "on_site" | "away">("away"), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const { data: reasons = [] } = useQuery({ queryKey: ["absence-reasons-admin"], queryFn: async () => {
    const { data, error } = await supabase.from("accommodation_absence_reasons").select("*").order("name"); if (error) throw error; return data;
  } });
  async function change(id?: string, active?: boolean) {
    setBusy(true); setError("");
    const result = id ? await supabase.from("accommodation_absence_reasons").update({ is_active: active }).eq("id", id)
      : await supabase.from("accommodation_absence_reasons").insert({ name: name.trim(), absence_status: status });
    setBusy(false);
    if (result.error) setError(result.error.message); else { setName(""); qc.invalidateQueries({ queryKey: ["absence-reasons"] }); qc.invalidateQueries({ queryKey: ["absence-reasons-admin"] }); }
  }
  return <Dialog><DialogTrigger asChild><Button variant="outline" size="sm"><Settings size={14} className="mr-2" />Absence Reasons</Button></DialogTrigger><DialogContent className="max-h-[85vh] overflow-auto"><DialogHeader><DialogTitle>Temporary Absence Reasons</DialogTitle></DialogHeader>
    {reasons.map(r => <div key={r.id} className="flex items-center justify-between gap-3 border-b py-2"><span>{r.name}<span className="block text-xs text-muted-foreground">{r.absence_status.replace("_", " ")}</span></span><Switch aria-label={`Enable ${r.name}`} checked={r.is_active} disabled={busy} onCheckedChange={active => change(r.id, active)} /></div>)}
    <Input aria-label="New reason" placeholder="Reason name" value={name} onChange={e => setName(e.target.value)} />
    <Select value={status} onValueChange={v => { if (v === "vacation" || v === "on_site" || v === "away") setStatus(v); }}><SelectTrigger aria-label="Reason status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="vacation">In Vacation</SelectItem><SelectItem value="on_site">On Site</SelectItem><SelectItem value="away">Temporarily Checked Out</SelectItem></SelectContent></Select>
    {error && <p role="alert" className="text-destructive">{error}</p>}<Button disabled={busy || !name.trim()} onClick={() => change()}>Add Reason</Button>
  </DialogContent></Dialog>;
}