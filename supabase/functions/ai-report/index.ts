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

    const { prompt } = await req.json();
    if (!prompt) throw new Error("Prompt is required");

    // Fetch all relevant data summaries for context
    const [
      { data: employees },
      { data: camps },
      { data: rooms },
      { data: checkIns },
      { data: checkOuts },
      { data: buildings },
      { data: maintenanceTickets },
      { data: inventory },
      { data: itemAssignments },
    ] = await Promise.all([
      supabase.from("employees").select("*"),
      supabase.from("camps").select("*"),
      supabase.from("rooms").select("*, buildings(name, block_code)"),
      supabase.from("check_ins").select("*, employees(name, employee_id, supplier_name, employee_type, designation), rooms(room_number), camps(name)"),
      supabase.from("check_outs").select("*, employees(name, employee_id, supplier_name, employee_type, designation, is_blacklisted), rooms(room_number), camps(name)"),
      supabase.from("buildings").select("*"),
      supabase.from("maintenance_tickets").select("*, camps(name), rooms(room_number)"),
      supabase.from("inventory").select("*, camps(name)"),
      supabase.from("item_assignments").select("*, employees(name, employee_id), camps(name)"),
    ]);

    const dataContext = JSON.stringify({
      employees: employees || [],
      camps: camps || [],
      rooms: rooms || [],
      check_ins: checkIns || [],
      check_outs: checkOuts || [],
      buildings: buildings || [],
      maintenance_tickets: maintenanceTickets || [],
      inventory: inventory || [],
      item_assignments: itemAssignments || [],
    });

    const systemPrompt = `You are **Camp-365 AI**, the intelligent reporting engine for an industrial camp management platform.

## YOUR ROLE
Analyze real-time operational data and produce **executive-quality**, well-structured reports. Think like a senior operations analyst presenting to camp management.

## STRICT FORMATTING RULES

### Structure Every Report Like This:
1. **Title** — Use a single # heading summarizing the report topic
2. **📋 Executive Summary** — 2-3 crisp sentences. Lead with the most important finding.
3. **📊 Key Metrics** — Present 3-6 KPIs in a clean markdown table (Metric | Value | Status)
4. **📈 Detailed Analysis** — Use ## subheadings. Each section should have:
   - A brief narrative sentence
   - A well-formatted markdown table with headers
   - Bold important numbers and percentages
5. **💡 Insights & Recommendations** — Actionable bullet points (3-5 max)

### Formatting Standards:
- Use markdown tables for ALL tabular data — always include headers and alignment
- Keep tables to 5-7 columns max; split into multiple tables if needed
- Use ✅ ⚠️ 🔴 emoji indicators for status (Good / Warning / Critical)
- Use **bold** for key values, percentages, and important metrics
- Use bullet points (not numbered lists) for findings
- Use blockquotes (>) for important callouts or warnings
- Add horizontal rules (---) between major sections
- NEVER dump raw JSON or unformatted data
- NEVER say "based on the data provided" — just present findings directly
- Round percentages to 1 decimal place, currency to 2 decimal places
- If data is empty or unavailable, say so clearly and suggest what data to add

### Table Format Example:
| Camp | Occupancy | Capacity | Rate |
|:-----|----------:|---------:|-----:|
| Al Dilan | **85.2%** | 500 | ✅ |

### For Financial/Cost Questions:
- Always show unit costs, totals, and comparisons
- Include cost-per-head calculations where relevant
- Compare across camps when multiple camps exist

### For Distribution/Allocation Questions:
- Show camp-wise breakdown with counts and percentages
- Include a summary total row

Available data includes:
- Employees (own, supplier, camp staff) with name, employee_id, designation, department, supplier_name, status, is_blacklisted, nationality, iqama_number, passport_number, camp_id, room_id
- Camps with name, location, status, camp_type, monthly_rent
- Rooms with room_number, category, max_capacity, current_occupancy, status, building info (block_code), floor
- Check-ins with employee details, room, camp, check_in_date
- Check-outs with employee details, room, camp, check_out_date, assets_returned, damage_remarks, feedback, blacklist info
- Buildings/Blocks with name, block_code, block_type, floors
- Maintenance tickets with description, category, priority, status, cost, assigned_to
- Inventory items with item_name, category, stock levels, camp
- Item assignments with employee, item, quantity, condition, dates

Today's date is ${new Date().toISOString().split("T")[0]}.`;

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
          { role: "user", content: `Here is the current database data:\n${dataContext}\n\nUser request: ${prompt}` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    console.error("ai-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
