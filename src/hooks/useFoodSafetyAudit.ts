import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface MessFacility {
  id: string;
  camp_id: string;
  name: string;
  facility_type: string;
  contractor_name: string | null;
  capacity: number;
  license_number: string | null;
  license_expiry: string | null;
  hygiene_cert_expiry: string | null;
  status: string;
  created_at: string;
}

export interface AuditTemplate {
  id: string;
  name: string;
  audit_type: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  items?: AuditTemplateItem[];
}

export interface AuditTemplateItem {
  id: string;
  template_id: string;
  category: string;
  question: string;
  response_type: string;
  is_critical: boolean;
  photo_required: boolean;
  sort_order: number;
  weight: number;
  allow_remarks: boolean;
  ncr_enabled: boolean;
  severity_applicable: boolean;
  category_type: string;
}

export interface FoodSafetyAudit {
  id: string;
  template_id: string | null;
  camp_id: string;
  mess_facility_id: string | null;
  auditor_id: string | null;
  audit_date: string;
  audit_type: string;
  status: string;
  total_score: number;
  max_score: number;
  compliance_pct: number;
  risk_grade: string;
  contractor_name: string | null;
  project_name: string | null;
  ai_summary: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  camps?: { name: string };
  mess_facilities?: { name: string } | null;
}

export interface AuditResponse {
  id: string;
  audit_id: string;
  template_item_id: string | null;
  category: string;
  question: string;
  response_type: string;
  response_value: string | null;
  rating: number | null;
  remarks: string | null;
  photo_url: string | null;
  is_compliant: boolean;
  score: number;
  max_score: number;
}

export interface NCRRecord {
  id: string;
  audit_id: string;
  camp_id: string;
  ncr_number: string;
  category: string;
  description: string;
  severity: string;
  assigned_to: string | null;
  target_date: string | null;
  status: string;
  proof_photo_url: string | null;
  correction_notes: string | null;
  created_at: string;
  camps?: { name: string };
}

// Mess Facilities
export function useMessFacilities(campId?: string) {
  return useQuery({
    queryKey: ["mess-facilities", campId],
    queryFn: async () => {
      let q = supabase.from("mess_facilities").select("*").order("name");
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q;
      if (error) throw error;
      return data as MessFacility[];
    },
  });
}

// Audit Templates
export function useAuditTemplates() {
  return useQuery({
    queryKey: ["audit-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_templates")
        .select("*, audit_template_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (AuditTemplate & { audit_template_items: AuditTemplateItem[] })[];
    },
  });
}

// Food Safety Audits
export function useFoodSafetyAudits(campId?: string) {
  return useQuery({
    queryKey: ["food-safety-audits", campId],
    queryFn: async () => {
      let q = supabase
        .from("food_safety_audits")
        .select("*, camps(name), mess_facilities(name)")
        .order("audit_date", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q;
      if (error) throw error;
      return data as FoodSafetyAudit[];
    },
  });
}

// Audit Responses
export function useAuditResponses(auditId?: string) {
  return useQuery({
    queryKey: ["audit-responses", auditId],
    queryFn: async () => {
      if (!auditId) return [];
      const { data, error } = await supabase
        .from("audit_responses")
        .select("*")
        .eq("audit_id", auditId)
        .order("created_at");
      if (error) throw error;
      return data as AuditResponse[];
    },
    enabled: !!auditId,
  });
}

// NCR Records
export function useNCRRecords(campId?: string) {
  return useQuery({
    queryKey: ["ncr-records", campId],
    queryFn: async () => {
      let q = supabase
        .from("ncr_records")
        .select("*, camps(name)")
        .order("created_at", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q;
      if (error) throw error;
      return data as NCRRecord[];
    },
  });
}

// Mutations
export function useCreateAuditTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; audit_type: string; description?: string; items: Omit<AuditTemplateItem, "id" | "template_id">[] }) => {
      const { data: template, error } = await supabase
        .from("audit_templates")
        .insert({ name: data.name, audit_type: data.audit_type, description: data.description })
        .select()
        .single();
      if (error) throw error;

      if (data.items.length > 0) {
        const itemsWithTemplate = data.items.map((item, i) => ({
          ...item,
          template_id: template.id,
          sort_order: i,
        }));
        const { error: itemsError } = await supabase
          .from("audit_template_items")
          .insert(itemsWithTemplate);
        if (itemsError) throw itemsError;
      }

      return template;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-templates"] });
      toast({ title: "Template created successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateAuditTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; name: string; audit_type: string; description?: string; is_active?: boolean }) => {
      const { id, ...updates } = data;
      const { error } = await supabase.from("audit_templates").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-templates"] });
      toast({ title: "Template updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteAuditTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete items first
      await supabase.from("audit_template_items").delete().eq("template_id", id);
      const { error } = await supabase.from("audit_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useAddTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<AuditTemplateItem, "id">) => {
      const { error } = await supabase.from("audit_template_items").insert(item as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-templates"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<AuditTemplateItem> & { id: string }) => {
      const { id, ...updates } = data;
      const { error } = await supabase.from("audit_template_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-templates"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("audit_template_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-templates"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useCreateAudit() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: {
      template_id?: string;
      camp_id: string;
      mess_facility_id?: string;
      audit_type: string;
      contractor_name?: string;
      project_name?: string;
    }) => {
      const { data: audit, error } = await supabase
        .from("food_safety_audits")
        .insert({ ...data, auditor_id: user?.id, status: "draft" })
        .select()
        .single();
      if (error) throw error;

      if (data.template_id) {
        const { data: items } = await supabase
          .from("audit_template_items")
          .select("*")
          .eq("template_id", data.template_id)
          .order("sort_order");

        if (items && items.length > 0) {
          const responses = items.map((item: any) => ({
            audit_id: audit.id,
            template_item_id: item.id,
            category: item.category,
            question: item.question,
            response_type: item.response_type,
            max_score: item.response_type === "rating" ? 5 : 1,
          }));
          await supabase.from("audit_responses").insert(responses);
        }
      }

      return audit;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food-safety-audits"] });
      toast({ title: "Audit created successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateAuditResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; response_value?: string; rating?: number; remarks?: string; is_compliant?: boolean; score?: number }) => {
      const { error } = await supabase
        .from("audit_responses")
        .update(data)
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit-responses"] }),
  });
}

export function useCompleteAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (auditId: string) => {
      const { data: responses } = await supabase
        .from("audit_responses")
        .select("*")
        .eq("audit_id", auditId);

      const totalScore = responses?.reduce((sum: number, r: any) => sum + (r.score || 0), 0) || 0;
      const maxScore = responses?.reduce((sum: number, r: any) => sum + (r.max_score || 0), 0) || 1;
      const pct = Math.round((totalScore / maxScore) * 100);
      const grade = pct >= 90 ? "compliant" : pct >= 70 ? "moderate_risk" : "critical";

      const { error } = await supabase
        .from("food_safety_audits")
        .update({
          status: "completed",
          total_score: totalScore,
          max_score: maxScore,
          compliance_pct: pct,
          risk_grade: grade,
          completed_at: new Date().toISOString(),
        })
        .eq("id", auditId);
      if (error) throw error;

      const failedItems = responses?.filter((r: any) => !r.is_compliant) || [];
      if (failedItems.length > 0) {
        const { data: audit } = await supabase
          .from("food_safety_audits")
          .select("camp_id")
          .eq("id", auditId)
          .single();

        const ncrs = failedItems.map((item: any, i: number) => ({
          audit_id: auditId,
          audit_response_id: item.id,
          camp_id: audit?.camp_id,
          ncr_number: `NCR-${Date.now()}-${i + 1}`,
          category: item.category,
          description: `Non-compliance: ${item.question}${item.remarks ? ` - ${item.remarks}` : ""}`,
          severity: item.response_type === "rating" && (item.rating || 0) <= 2 ? "critical" : "major",
        }));
        await supabase.from("ncr_records").insert(ncrs);
      }

      return { pct, grade, ncrCount: failedItems.length };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["food-safety-audits"] });
      qc.invalidateQueries({ queryKey: ["ncr-records"] });
      toast({
        title: "Audit completed",
        description: `Compliance: ${result.pct}% | Grade: ${result.grade.replace("_", " ")} | ${result.ncrCount} NCRs generated`,
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateNCR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; status?: string; correction_notes?: string; assigned_to?: string; target_date?: string }) => {
      const updates: any = { ...data };
      if (data.status === "closed") updates.closed_at = new Date().toISOString();
      delete updates.id;
      const { error } = await supabase.from("ncr_records").update(updates).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ncr-records"] });
      toast({ title: "NCR updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useCreateMessFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<MessFacility>) => {
      const { error } = await supabase.from("mess_facilities").insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mess-facilities"] });
      toast({ title: "Facility added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
