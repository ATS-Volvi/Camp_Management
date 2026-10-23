// Parse purchase invoice using Lovable AI vision, extract line items,
// then update ingredient prices + insert price history.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error("invoice_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Load invoice
    const { data: invoice, error: invErr } = await supabase
      .from("catering_invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();
    if (invErr || !invoice) throw new Error("Invoice not found");
    if (!invoice.file_url) throw new Error("No file attached to invoice");

    await supabase.from("catering_invoices").update({ parsing_status: "processing" }).eq("id", invoice_id);

    // 2. Download file from storage (file_url is the storage path)
    const { data: fileBlob, error: dlErr } = await supabase.storage.from("invoices").download(invoice.file_url);
    if (dlErr || !fileBlob) throw new Error(`Download failed: ${dlErr?.message}`);

    const buf = await fileBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const mime = fileBlob.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    // 3. Load ingredient master to help LLM match names
    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("id, name, unit")
      .eq("is_active", true);
    const ingredientList = (ingredients || []).map((i) => `${i.name} (${i.unit})`).join(", ");

    // 4. Call Lovable AI Gateway with vision
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You extract grocery purchase invoice line items. Return ONLY valid JSON, no markdown. Match item names to the provided master list when possible.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract line items from this invoice. Return JSON:
{
  "vendor_name": "...",
  "invoice_number": "...",
  "invoice_date": "YYYY-MM-DD",
  "total_amount": 0,
  "items": [
    { "name": "tomato", "quantity": 10, "unit": "kg", "unit_price": 5.5, "total": 55 }
  ]
}
Match names against master list: ${ingredientList}`,
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errTxt = await aiRes.text();
      throw new Error(`AI gateway: ${aiRes.status} ${errTxt}`);
    }
    const aiJson = await aiRes.json();
    let content = aiJson.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
    const parsed = JSON.parse(content);

    // 5. Update each ingredient's unit_cost + insert price history
    const updates: any[] = [];
    for (const item of parsed.items || []) {
      if (!item.name || !item.unit_price) continue;
      // Find matching ingredient by name (case-insensitive)
      const match = (ingredients || []).find(
        (i) => i.name.toLowerCase() === String(item.name).toLowerCase()
      );
      if (!match) {
        updates.push({ name: item.name, status: "unmatched" });
        continue;
      }
      // Insert price history
      await supabase.from("ingredient_price_history").insert({
        ingredient_id: match.id,
        price: item.unit_price,
        effective_date: parsed.invoice_date || new Date().toISOString().split("T")[0],
        source: "invoice",
        invoice_reference: parsed.invoice_number || invoice.invoice_number || "",
        notes: `Auto-parsed from invoice ${invoice.invoice_number || invoice.id}`,
      });
      // Update current price
      await supabase.from("ingredients").update({ unit_cost: item.unit_price }).eq("id", match.id);
      updates.push({ name: item.name, ingredient_id: match.id, new_price: item.unit_price, status: "updated" });
    }

    // 6. Update invoice with parsed data
    await supabase
      .from("catering_invoices")
      .update({
        parsing_status: "parsed",
        parsed_data: { ...parsed, updates },
        vendor_name: parsed.vendor_name || invoice.vendor_name,
        total_amount: parsed.total_amount || invoice.total_amount,
      })
      .eq("id", invoice_id);

    return new Response(
      JSON.stringify({ success: true, items_parsed: parsed.items?.length || 0, updates }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("parse-invoice error:", e);
    try {
      const { invoice_id } = await req.clone().json().catch(() => ({}));
      if (invoice_id) {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supabase.from("catering_invoices").update({ parsing_status: "failed" }).eq("id", invoice_id);
      }
    } catch {}
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
