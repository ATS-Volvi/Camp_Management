import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ==========================================
// INGREDIENTS
// ==========================================
export function useIngredients() {
  return useQuery({
    queryKey: ["ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ingredient: any) => {
      if (ingredient.id) {
        const { id, ...rest } = ingredient;
        const { data, error } = await supabase.from("ingredients").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("ingredients").insert(ingredient).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      toast({ title: "Ingredient saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ==========================================
// MEAL MENU TEMPLATES
// ==========================================
export function useMealMenuTemplates(mealType?: string) {
  return useQuery({
    queryKey: ["meal-menu-templates", mealType],
    queryFn: async () => {
      let q = supabase.from("meal_menu_templates").select("*, ingredients(name, unit, unit_cost, category)").eq("is_active", true);
      if (mealType) q = q.eq("meal_type", mealType);
      const { data, error } = await q.order("meal_type");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertMenuTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: any) => {
      if (template.id) {
        const { id, ...rest } = template;
        const { data, error } = await supabase.from("meal_menu_templates").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("meal_menu_templates").insert(template).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-menu-templates"] });
      toast({ title: "Menu template saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteMenuTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_menu_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-menu-templates"] });
      toast({ title: "Template removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ==========================================
// DAILY MEAL PLANS
// ==========================================
export function useDailyMealPlan(campId: string | null, date: string | null) {
  return useQuery({
    queryKey: ["daily-meal-plan", campId, date],
    enabled: !!campId && !!date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_meal_plans")
        .select("*")
        .eq("camp_id", campId!)
        .eq("plan_date", date!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertDailyMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: any) => {
      // Use upsert with unique constraint
      const { data, error } = await supabase
        .from("daily_meal_plans")
        .upsert(plan, { onConflict: "camp_id,plan_date" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-meal-plan"] });
      toast({ title: "Meal plan saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ==========================================
// GROCERY REQUESTS
// ==========================================
export function useGroceryRequests(campId?: string) {
  return useQuery({
    queryKey: ["grocery-requests", campId],
    queryFn: async () => {
      let q = supabase.from("grocery_requests").select("*, camps(name)").order("created_at", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useGroceryRequestItems(requestId: string | null) {
  return useQuery({
    queryKey: ["grocery-request-items", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grocery_request_items")
        .select("*, ingredients(name, unit, category)")
        .eq("request_id", requestId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGroceryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ request, items }: { request: any; items: any[] }) => {
      const { data: req, error: reqErr } = await supabase
        .from("grocery_requests")
        .insert(request)
        .select()
        .single();
      if (reqErr) throw reqErr;

      if (items.length > 0) {
        const itemsWithRequestId = items.map(i => ({ ...i, request_id: req.id }));
        const { error: itemErr } = await supabase.from("grocery_request_items").insert(itemsWithRequestId);
        if (itemErr) throw itemErr;
      }
      return req;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grocery-requests"] });
      toast({ title: "Grocery request created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, approved_by }: { id: string; status: string; approved_by?: string }) => {
      const updates: any = { status };
      if (approved_by) updates.approved_by = approved_by;
      const { error } = await supabase.from("grocery_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grocery-requests"] });
      toast({ title: "Request status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ==========================================
// CATERING STOCK
// ==========================================
export function useCateringStock(campId?: string) {
  return useQuery({
    queryKey: ["catering-stock", campId],
    queryFn: async () => {
      let q = supabase.from("catering_stock").select("*, ingredients(name, unit, category, unit_cost)");
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q.order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ==========================================
// CATERING GRN
// ==========================================
export function useCateringGRNs(campId?: string) {
  return useQuery({
    queryKey: ["catering-grn", campId],
    queryFn: async () => {
      let q = supabase.from("catering_grn").select("*, camps(name)").order("grn_date", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGRN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ grn, items }: { grn: any; items: any[] }) => {
      const { data: grnData, error: grnErr } = await supabase.from("catering_grn").insert(grn).select().single();
      if (grnErr) throw grnErr;

      if (items.length > 0) {
        const grnItems = items.map(i => ({ ...i, grn_id: grnData.id }));
        const { error: itemErr } = await supabase.from("catering_grn_items").insert(grnItems);
        if (itemErr) throw itemErr;

        // Update stock: increment stock_in for each item
        for (const item of items) {
          // Upsert into catering_stock
          const { data: existing } = await supabase
            .from("catering_stock")
            .select("id, stock_in")
            .eq("camp_id", grn.camp_id)
            .eq("ingredient_id", item.ingredient_id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("catering_stock")
              .update({ stock_in: (existing.stock_in || 0) + item.quantity })
              .eq("id", existing.id);
          } else {
            await supabase.from("catering_stock").insert({
              camp_id: grn.camp_id,
              ingredient_id: item.ingredient_id,
              stock_in: item.quantity,
              min_level: 5,
            });
          }
        }
      }
      return grnData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catering-grn"] });
      qc.invalidateQueries({ queryKey: ["catering-stock"] });
      toast({ title: "GRN recorded and stock updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ==========================================
// CATERING ISSUES
// ==========================================
export function useCateringIssues(campId?: string) {
  return useQuery({
    queryKey: ["catering-issues", campId],
    queryFn: async () => {
      let q = supabase.from("catering_issues").select("*, camps(name)").order("issue_date", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ issue, items }: { issue: any; items: any[] }) => {
      const { data: issueData, error: issueErr } = await supabase.from("catering_issues").insert(issue).select().single();
      if (issueErr) throw issueErr;

      if (items.length > 0) {
        const issueItems = items.map(i => ({ ...i, issue_id: issueData.id }));
        const { error: itemErr } = await supabase.from("catering_issue_items").insert(issueItems);
        if (itemErr) throw itemErr;

        // Update stock: increment stock_out
        for (const item of items) {
          const { data: existing } = await supabase
            .from("catering_stock")
            .select("id, stock_out")
            .eq("camp_id", issue.camp_id)
            .eq("ingredient_id", item.ingredient_id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("catering_stock")
              .update({ stock_out: (existing.stock_out || 0) + item.issued_qty })
              .eq("id", existing.id);
          }
        }
      }

      // If linked to a request, update status to issued
      if (issue.request_id) {
        await supabase.from("grocery_requests").update({ status: "issued" }).eq("id", issue.request_id);
      }

      return issueData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catering-issues"] });
      qc.invalidateQueries({ queryKey: ["catering-stock"] });
      qc.invalidateQueries({ queryKey: ["grocery-requests"] });
      toast({ title: "Issue slip created and stock deducted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ==========================================
// OCCUPANCY HELPER (for daily auto-fetch)
// ==========================================
export function useCampOccupancy(campId: string | null) {
  return useQuery({
    queryKey: ["camp-occupancy", campId],
    queryFn: async () => {
      let q = supabase.from("rooms").select("current_occupancy");
      if (campId && campId !== "all") {
        q = q.eq("camp_id", campId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + (Number(r.current_occupancy) || 0), 0);
    },
  });
}

// ==========================================
// COST REPORTING
// ==========================================
export function useCateringCostSummary(campId?: string) {
  return useQuery({
    queryKey: ["catering-cost-summary", campId],
    queryFn: async () => {
      let q = supabase.from("catering_issues").select("*, camps(name), catering_issue_items(issued_qty, unit_cost, ingredients(name, category))");
      if (campId && campId !== "all") q = q.eq("camp_id", campId);
      const { data, error } = await q.order("issue_date", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
}

// ==========================================
// FOOD WASTAGE
// ==========================================
export function useFoodWastage(campId?: string, date?: string) {
  return useQuery({
    queryKey: ["food-wastage", campId, date],
    queryFn: async () => {
      let q = supabase.from("food_wastage").select("*, ingredients(name, unit, category), camps(name)").order("created_at", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      if (date) q = q.eq("wastage_date", date);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWastage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (wastage: any) => {
      const { data, error } = await supabase.from("food_wastage").insert(wastage).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food-wastage"] });
      toast({ title: "Wastage recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
