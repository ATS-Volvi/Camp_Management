import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ==========================================
// INGREDIENTS with latest price & stock
// ==========================================
export function useGroceryItems(search?: string, category?: string) {
  return useQuery({
    queryKey: ["grocery-items", search, category],
    queryFn: async () => {
      let q = supabase
        .from("ingredients")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("name");
      if (category) q = q.eq("category", category);
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useIngredientCategories() {
  return useQuery({
    queryKey: ["ingredient-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("category")
        .eq("is_active", true);
      if (error) throw error;
      const cats = [...new Set((data || []).map((d) => d.category))];
      return cats.sort();
    },
  });
}

// ==========================================
// PRICE HISTORY
// ==========================================
export function usePriceHistory(ingredientId?: string) {
  return useQuery({
    queryKey: ["price-history", ingredientId],
    enabled: !!ingredientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredient_price_history")
        .select("*, ingredients(name, unit)")
        .eq("ingredient_id", ingredientId!)
        .order("effective_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useAllPriceHistory() {
  return useQuery({
    queryKey: ["all-price-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredient_price_history")
        .select("*, ingredients(name, unit, category)")
        .order("effective_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddPriceEntry() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (entry: {
      ingredient_id: string;
      price: number;
      effective_date: string;
      source: string;
      invoice_reference?: string;
      notes?: string;
    }) => {
      // Insert price history
      const { error: histErr } = await supabase
        .from("ingredient_price_history")
        .insert(entry);
      if (histErr) throw histErr;

      // Update ingredient unit_cost to latest price
      const { error: updErr } = await supabase
        .from("ingredients")
        .update({ unit_cost: entry.price })
        .eq("id", entry.ingredient_id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-history"] });
      qc.invalidateQueries({ queryKey: ["all-price-history"] });
      qc.invalidateQueries({ queryKey: ["grocery-items"] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      toast({ title: "Price updated", description: "Price history recorded and current price updated." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

// ==========================================
// CATERING INVOICES
// ==========================================
export function useCateringInvoices(campId?: string) {
  return useQuery({
    queryKey: ["catering-invoices", campId],
    queryFn: async () => {
      let q = supabase
        .from("catering_invoices")
        .select("*, camps(name)")
        .order("created_at", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (invoice: any) => {
      const { data, error } = await supabase
        .from("catering_invoices")
        .insert(invoice)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catering-invoices"] });
      toast({ title: "Invoice uploaded" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

// ==========================================
// CONSUMPTION LOGS
// ==========================================
export function useConsumptionLogs(campId?: string, date?: string) {
  return useQuery({
    queryKey: ["consumption-logs", campId, date],
    queryFn: async () => {
      let q = supabase
        .from("catering_consumption_logs")
        .select("*, ingredients(name, unit, category), camps(name)")
        .order("consumption_date", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      if (date) q = q.eq("consumption_date", date);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data;
    },
  });
}

// ==========================================
// CATERING STOCK SUMMARY (for inventory view)
// ==========================================
export function useCateringStockSummary(campId?: string) {
  return useQuery({
    queryKey: ["catering-stock-summary", campId],
    queryFn: async () => {
      let q = supabase
        .from("catering_stock")
        .select("*, ingredients(name, unit, category, unit_cost, reorder_level)");
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q.order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
