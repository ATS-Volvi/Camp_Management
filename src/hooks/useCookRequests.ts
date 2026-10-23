import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ==========================================
// COOK REQUESTS
// ==========================================
export function useCookRequests(campId?: string, status?: string) {
  return useQuery({
    queryKey: ["cook-requests", campId, status],
    queryFn: async () => {
      let q = supabase
        .from("cook_requests")
        .select("*, camps(name)")
        .order("created_at", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      if (status) q = q.eq("status", status);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useCookRequestItems(requestId: string | null) {
  return useQuery({
    queryKey: ["cook-request-items", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cook_request_items")
        .select("*, ingredients(name, unit, category, unit_cost)")
        .eq("request_id", requestId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCookRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ request, items }: { request: any; items: any[] }) => {
      const { data: req, error: reqErr } = await supabase
        .from("cook_requests")
        .insert(request)
        .select()
        .single();
      if (reqErr) throw reqErr;

      if (items.length > 0) {
        const itemsWithId = items.map((i) => ({ ...i, request_id: req.id }));
        const { error: itemErr } = await supabase.from("cook_request_items").insert(itemsWithId);
        if (itemErr) throw itemErr;
      }
      return req;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cook-requests"] });
      toast({ title: "Cook request created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCookRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      approved_by,
      issued_by,
      rejection_reason,
    }: {
      id: string;
      status: string;
      approved_by?: string;
      issued_by?: string;
      rejection_reason?: string;
    }) => {
      const updates: any = { status };
      if (approved_by) {
        updates.approved_by = approved_by;
        updates.approved_at = new Date().toISOString();
      }
      if (issued_by) {
        updates.issued_by = issued_by;
        updates.issued_at = new Date().toISOString();
      }
      if (rejection_reason) updates.rejection_reason = rejection_reason;
      const { error } = await supabase.from("cook_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cook-requests"] });
      toast({ title: "Request status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCookRequestItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; approved_qty?: number; issued_qty?: number }[]) => {
      for (const item of items) {
        const { id, ...updates } = item;
        const { error } = await supabase.from("cook_request_items").update(updates).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cook-request-items"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ==========================================
// PURCHASE ORDERS
// ==========================================
export function usePurchaseOrders(campId?: string) {
  return useQuery({
    queryKey: ["purchase-orders", campId],
    queryFn: async () => {
      let q = supabase
        .from("purchase_orders")
        .select("*, camps(name)")
        .order("created_at", { ascending: false });
      if (campId) q = q.eq("camp_id", campId);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function usePurchaseOrderItems(poId: string | null) {
  return useQuery({
    queryKey: ["po-items", poId],
    enabled: !!poId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select("*, ingredients(name, unit, category)")
        .eq("po_id", poId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ po, items }: { po: any; items: any[] }) => {
      const { data: poData, error: poErr } = await supabase
        .from("purchase_orders")
        .insert(po)
        .select()
        .single();
      if (poErr) throw poErr;

      if (items.length > 0) {
        const poItems = items.map((i) => ({ ...i, po_id: poData.id }));
        const { error: itemErr } = await supabase.from("purchase_order_items").insert(poItems);
        if (itemErr) throw itemErr;
      }
      return poData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Purchase order created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdatePurchaseOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, approved_by }: { id: string; status: string; approved_by?: string }) => {
      const updates: any = { status };
      if (approved_by) {
        updates.approved_by = approved_by;
        updates.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("purchase_orders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "PO status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useReceivePOItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      poId,
      campId,
      items,
    }: {
      poId: string;
      campId: string;
      items: { id: string; ingredient_id: string; received_qty: number }[];
    }) => {
      // Update PO items with received qty
      for (const item of items) {
        const { error } = await supabase
          .from("purchase_order_items")
          .update({ received_qty: item.received_qty })
          .eq("id", item.id);
        if (error) throw error;

        // Update catering stock
        const { data: existing } = await supabase
          .from("catering_stock")
          .select("id, stock_in")
          .eq("camp_id", campId)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("catering_stock")
            .update({ stock_in: (existing.stock_in || 0) + item.received_qty })
            .eq("id", existing.id);
        } else {
          await supabase.from("catering_stock").insert({
            camp_id: campId,
            ingredient_id: item.ingredient_id,
            stock_in: item.received_qty,
            min_level: 5,
          });
        }
      }

      // Update PO status to received
      await supabase.from("purchase_orders").update({ status: "received" }).eq("id", poId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["po-items"] });
      qc.invalidateQueries({ queryKey: ["catering-stock"] });
      toast({ title: "Items received and stock updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// Issue items from store (deduct stock)
export function useIssueCookRequestItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      campId,
      items,
      issuedBy,
    }: {
      requestId: string;
      campId: string;
      items: { id: string; ingredient_id: string; issued_qty: number }[];
      issuedBy: string;
    }) => {
      let allFullyIssued = true;

      for (const item of items) {
        // Update cook_request_items with issued_qty
        const { error } = await supabase
          .from("cook_request_items")
          .update({ issued_qty: item.issued_qty })
          .eq("id", item.id);
        if (error) throw error;

        // Deduct from catering_stock
        const { data: existing } = await supabase
          .from("catering_stock")
          .select("id, stock_out, balance")
          .eq("camp_id", campId)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("catering_stock")
            .update({ stock_out: (existing.stock_out || 0) + item.issued_qty })
            .eq("id", existing.id);
        }
      }

      // Check if all items are fully issued
      const { data: allItems } = await supabase
        .from("cook_request_items")
        .select("approved_qty, issued_qty, required_qty")
        .eq("request_id", requestId);

      if (allItems) {
        allFullyIssued = allItems.every(
          (i) => (i.issued_qty || 0) >= (i.approved_qty || (i as any).required_qty || 0)
        );
      }

      const newStatus = allFullyIssued ? "completed" : "partially_issued";
      await supabase
        .from("cook_requests")
        .update({ status: newStatus, issued_by: issuedBy, issued_at: new Date().toISOString() })
        .eq("id", requestId);

      // Check for low stock and auto-generate PO
      const shortItems: any[] = [];
      for (const item of items) {
        const { data: stock } = await supabase
          .from("catering_stock")
          .select("*, ingredients(name, unit, unit_cost)")
          .eq("camp_id", campId)
          .eq("ingredient_id", item.ingredient_id)
          .maybeSingle();

        if (stock && (stock.balance || 0) <= stock.min_level) {
          shortItems.push({
            ingredient_id: item.ingredient_id,
            required_qty: stock.min_level * 2 - (stock.balance || 0),
            ordered_qty: stock.min_level * 2 - (stock.balance || 0),
            unit_cost: stock.ingredients?.unit_cost || 0,
            total_cost: (stock.min_level * 2 - (stock.balance || 0)) * (stock.ingredients?.unit_cost || 0),
          });
        }
      }

      if (shortItems.length > 0) {
        const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
        const totalAmount = shortItems.reduce((s, i) => s + i.total_cost, 0);
        const { data: po, error: poErr } = await supabase
          .from("purchase_orders")
          .insert({
            camp_id: campId,
            po_number: poNumber,
            status: "draft",
            total_amount: totalAmount,
            created_by: issuedBy,
            notes: "Auto-generated due to low stock after cook request issuance",
          })
          .select()
          .single();

        if (!poErr && po) {
          const poItems = shortItems.map((i) => ({ ...i, po_id: po.id }));
          await supabase.from("purchase_order_items").insert(poItems);
        }
      }

      return { status: newStatus, shortItems: shortItems.length };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["cook-requests"] });
      qc.invalidateQueries({ queryKey: ["cook-request-items"] });
      qc.invalidateQueries({ queryKey: ["catering-stock"] });
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      const msg =
        data.shortItems > 0
          ? `Items issued. ${data.shortItems} items are low — Purchase Order auto-generated!`
          : "Items issued from store successfully";
      toast({ title: msg });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
