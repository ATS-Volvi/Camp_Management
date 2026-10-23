import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Play, CheckCircle, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useFoodSafetyAudits, useAuditTemplates, useMessFacilities,
  useCreateAudit, useAuditResponses, useUpdateAuditResponse, useCompleteAudit,
  type AuditResponse,
} from "@/hooks/useFoodSafetyAudit";

export default function AuditExecutionTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [executeAuditId, setExecuteAuditId] = useState<string | null>(null);
  const [campId, setCampId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [auditType, setAuditType] = useState("daily");

  const { data: camps = [] } = useQuery({
    queryKey: ["camps-list"],
    queryFn: async () => {
      const { data } = await supabase.from("camps").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: audits = [] } = useFoodSafetyAudits();
  const { data: templates = [] } = useAuditTemplates();
  const { data: facilities = [] } = useMessFacilities(campId || undefined);
  const createAudit = useCreateAudit();

  const handleCreate = () => {
    if (!campId) return;
    createAudit.mutate(
      { camp_id: campId, template_id: templateId || undefined, mess_facility_id: facilityId || undefined, audit_type: auditType },
      {
        onSuccess: (audit: any) => {
          setCreateOpen(false);
          setExecuteAuditId(audit.id);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Audit Execution</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New Audit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Start New Audit</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Camp *</Label>
                <Select value={campId} onValueChange={setCampId}>
                  <SelectTrigger><SelectValue placeholder="Select Camp" /></SelectTrigger>
                  <SelectContent>{camps.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Select Template (optional)" /></SelectTrigger>
                  <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mess Facility</Label>
                <Select value={facilityId} onValueChange={setFacilityId}>
                  <SelectTrigger><SelectValue placeholder="Select Facility (optional)" /></SelectTrigger>
                  <SelectContent>{facilities.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audit Type</Label>
                <Select value={auditType} onValueChange={setAuditType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="surprise">Surprise Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!campId || createAudit.isPending}>
                {createAudit.isPending ? "Creating..." : "Start Audit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Audit Execution */}
      {executeAuditId && <AuditExecutor auditId={executeAuditId} onClose={() => setExecuteAuditId(null)} />}

      {/* Audit List */}
      <div className="space-y-2">
        {audits.map(audit => (
          <Card key={audit.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${audit.risk_grade === "compliant" ? "bg-green-500" : audit.risk_grade === "moderate_risk" ? "bg-amber-500" : audit.risk_grade === "critical" ? "bg-red-500" : "bg-gray-400"}`} />
                <div>
                  <p className="text-sm font-medium">{(audit as any).camps?.name} — {audit.audit_type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(audit.audit_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {audit.status === "completed" && (
                  <span className={`text-sm font-bold ${audit.compliance_pct >= 90 ? "text-green-600" : audit.compliance_pct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                    {audit.compliance_pct}%
                  </span>
                )}
                <Badge variant={audit.status === "completed" ? "default" : "secondary"}>{audit.status}</Badge>
                {audit.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => setExecuteAuditId(audit.id)}>
                    <Play className="h-3 w-3 mr-1" /> Execute
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {audits.length === 0 && <p className="text-center text-muted-foreground py-8">No audits yet. Create one to get started.</p>}
      </div>
    </div>
  );
}

function AuditExecutor({ auditId, onClose }: { auditId: string; onClose: () => void }) {
  const { data: responses = [] } = useAuditResponses(auditId);
  const updateResponse = useUpdateAuditResponse();
  const completeAudit = useCompleteAudit();

  const categories = [...new Set(responses.map(r => r.category))];

  const handleYesNo = (resp: AuditResponse, value: "yes" | "no") => {
    updateResponse.mutate({
      id: resp.id,
      response_value: value,
      is_compliant: value === "yes",
      score: value === "yes" ? resp.max_score : 0,
    });
  };

  const handleRating = (resp: AuditResponse, rating: number) => {
    updateResponse.mutate({
      id: resp.id,
      rating,
      response_value: String(rating),
      is_compliant: rating >= 3,
      score: rating,
    });
  };

  const handleRemarks = (resp: AuditResponse, remarks: string) => {
    updateResponse.mutate({ id: resp.id, remarks });
  };

  const handleComplete = () => {
    completeAudit.mutate(auditId, { onSuccess: onClose });
  };

  const answeredCount = responses.filter(r => r.response_value).length;
  const progress = responses.length > 0 ? Math.round((answeredCount / responses.length) * 100) : 0;

  return (
    <Card className="border-2 border-primary">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Live Audit Execution</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{answeredCount}/{responses.length} answered ({progress}%)</span>
            <Button size="sm" onClick={handleComplete} disabled={completeAudit.isPending || answeredCount === 0}>
              <CheckCircle className="h-4 w-4 mr-1" /> Complete Audit
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent className="max-h-[60vh] overflow-y-auto space-y-6">
        {categories.map(cat => (
          <div key={cat}>
            <h3 className="text-sm font-semibold mb-2 text-primary">{cat}</h3>
            <div className="space-y-2">
              {responses.filter(r => r.category === cat).map(resp => (
                <div key={resp.id} className={`p-3 rounded-lg border ${resp.response_value && !resp.is_compliant ? "border-destructive bg-red-50 dark:bg-red-950/20" : "bg-muted/30"}`}>
                  <p className="text-sm font-medium mb-2">{resp.question}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {resp.response_type === "yes_no" && (
                      <>
                        <Button
                          size="sm"
                          variant={resp.response_value === "yes" ? "default" : "outline"}
                          className={resp.response_value === "yes" ? "bg-green-600 hover:bg-green-700" : ""}
                          onClick={() => handleYesNo(resp, "yes")}
                        >✓ Yes</Button>
                        <Button
                          size="sm"
                          variant={resp.response_value === "no" ? "destructive" : "outline"}
                          onClick={() => handleYesNo(resp, "no")}
                        >✗ No</Button>
                      </>
                    )}
                    {resp.response_type === "rating" && (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Button
                            key={star}
                            size="sm"
                            variant="ghost"
                            className="p-1 h-8 w-8"
                            onClick={() => handleRating(resp, star)}
                          >
                            <Star className={`h-5 w-5 ${(resp.rating || 0) >= star ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
                          </Button>
                        ))}
                      </div>
                    )}
                    <Input
                      className="flex-1 h-8 text-xs"
                      placeholder="Remarks..."
                      defaultValue={resp.remarks || ""}
                      onBlur={e => handleRemarks(resp, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {responses.length === 0 && <p className="text-center text-muted-foreground py-8">No checklist items. Use a template when creating the audit.</p>}
      </CardContent>
    </Card>
  );
}
