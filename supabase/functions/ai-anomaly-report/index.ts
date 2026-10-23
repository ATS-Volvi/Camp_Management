import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { category } = await req.json();

    // Fetch all relevant data
    const [
      { data: employees },
      { data: camps },
      { data: rooms },
      { data: checkIns },
      { data: checkOuts },
      { data: maintenanceTickets },
      { data: inventory },
      { data: cateringStock },
      { data: foodWastage },
    ] = await Promise.all([
      supabase.from("employees").select("*"),
      supabase.from("camps").select("*"),
      supabase.from("rooms").select("*, buildings(name, block_code)"),
      supabase.from("check_ins").select("*, employees(name, employee_id, supplier_name, employee_type), rooms(room_number, max_capacity, current_occupancy), camps(name)"),
      supabase.from("check_outs").select("*, employees(name, employee_id, supplier_name, is_blacklisted), rooms(room_number), camps(name)"),
      supabase.from("maintenance_tickets").select("*, camps(name), rooms(room_number)"),
      supabase.from("inventory").select("*, camps(name)"),
      supabase.from("catering_stock").select("*, ingredients(name, unit), camps(name)"),
      supabase.from("food_wastage").select("*, ingredients(name), camps(name)"),
    ]);

    const dataContext = JSON.stringify({
      employees: employees || [],
      camps: camps || [],
      rooms: rooms || [],
      check_ins: checkIns || [],
      check_outs: checkOuts || [],
      maintenance_tickets: maintenanceTickets || [],
      inventory: inventory || [],
      catering_stock: cateringStock || [],
      food_wastage: foodWastage || [],
    });

    const today = new Date().toISOString().split("T")[0];

    const categoryInstructions: Record<string, string> = {
      all: "Analyze ALL categories below and report anomalies for each.",
      occupancy: "Focus ONLY on occupancy anomalies.",
      maintenance: "Focus ONLY on maintenance anomalies.",
      inventory: "Focus ONLY on inventory and catering anomalies.",
    };

    const focusInstruction = categoryInstructions[category] || categoryInstructions.all;

    const systemPrompt = `You are an AI anomaly detection specialist for a camp management system. Your job is to analyze the provided real-time data and identify anomalies, irregularities, and potential issues that need attention.

${focusInstruction}

## Anomaly Categories to Check:

### 🏠 Occupancy Anomalies
- Rooms where current_occupancy > max_capacity (overcrowded)
- Rooms marked "occupied" but current_occupancy = 0 (ghost rooms)
- Rooms marked "vacant" but current_occupancy > 0 (status mismatch)
- Employees checked in but with no room_id assigned
- Employees with room_id but no matching check-in record
- Multiple active check-ins for the same employee (duplicate check-ins)
- Check-ins without corresponding check-outs for extended periods (>30 days)
- Blacklisted employees who are still checked in

### 🔧 Maintenance Anomalies
- Tickets open for more than 14 days (stale tickets)
- Emergency/high priority tickets still in "open" status
- Same room with 3+ tickets in last 30 days (recurring issues)
- Tickets with unusually high costs vs category average
- Rooms under_maintenance for extended periods with no active tickets

### 📦 Inventory & Catering Anomalies
- Items with balance below min_alert_level (critical stock)
- Items where stock_out > stock_in + opening_stock (impossible outflow)
- Catering stock with negative balance
- Food wastage spikes (items with high wastage vs consumption)
- Expired catering stock items (expiry_date < today)

## Output Format:
Use markdown. For each anomaly found:
1. Use a clear severity indicator: 🔴 Critical, 🟡 Warning, 🟢 Info
2. Group by category with headers
3. Use tables for listing multiple items
4. Provide a brief recommendation for each anomaly type
5. Start with an executive summary count of anomalies found
6. If no anomalies found in a category, say "✅ No anomalies detected"

Today's date is ${today}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze the following camp management data for anomalies:\n${dataContext}` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-anomaly-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
