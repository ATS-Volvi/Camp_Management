import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dishName, headcount, availableIngredients } = await req.json();
    if (!dishName || !headcount) {
      return new Response(JSON.stringify({ error: "dishName and headcount are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which API to use: OpenRouter (local dev) or Lovable AI Gateway (production)
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let apiUrl: string;
    let apiKey: string;
    let model: string;

    if (OPENROUTER_API_KEY) {
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      apiKey = OPENROUTER_API_KEY;
      model = "anthropic/claude-3.5-sonnet";
      console.log("Using OpenRouter API");
    } else if (LOVABLE_API_KEY) {
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = LOVABLE_API_KEY;
      model = "google/gemini-3-flash-preview";
      console.log("Using Lovable AI Gateway");
    } else {
      throw new Error("No API key configured. Set OPENROUTER_API_KEY (local) or LOVABLE_API_KEY (production).");
    }

    const systemPrompt = `You are a professional camp kitchen manager in Saudi Arabia. 
You must return ONLY a valid JSON array, no explanation, no markdown, no code fences.
Accuracy is critical for food cost management. Sugget ONLY the essential ingredients for the specific dish name provided. 
DO NOT include side dishes, condiments, or extras (like Jam, Cucumber, or extra bread types) unless they are explicitly part of the dish name or fundamental to it.

Portions must follow standard worker camp guidelines:
- Rice: 150g - 180g per person
- Meat/Chicken (with bone): 200g - 250g per person
- Meat/Chicken (boneless): 120g - 150g per person
- Bread/Khubz: 1.5 - 2 pieces per person
- Vegetables (Side/Salad): 50g - 80g per person
- Dairy/Butter/Jam: 10g - 20g per person
- Oil/Fats: 15ml - 20ml per person`;

    let userPrompt = `For the dish "${dishName}" being prepared for ${headcount} people, return a JSON array of all ingredients needed. 
Each object must have: 
"ingredient" (name), 
"unit" (one of: kg, litres, pieces, g, ml), 
"qtyPerPerson" (number), 
"totalQty" (qtyPerPerson × ${headcount}), 
"estimatedCostSAR" (realistic Saudi market price per unit in SAR).

STRICTNESS IS KEY: If the user asks for "Bread and Cheese", return ONLY bread and cheese (and maybe butter if standard). Do NOT add vegetables or other breads.`;

    if (availableIngredients && availableIngredients.length > 0) {
      userPrompt += `\n\nCRITICAL: Please try to map the ingredients to the following list of available items from our inventory. 
If an item matches, include its "ingredientId" in the response.
Available Ingredients:
${JSON.stringify(availableIngredients)}`;
    }

    userPrompt += `\n\nReturn only the JSON array.`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    // Add OpenRouter-specific headers
    if (OPENROUTER_API_KEY) {
      headers["HTTP-Referer"] = "https://lodgix-hub.lovable.app";
      headers["X-Title"] = "Lodgix Hub";
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI API error:", response.status, t);
      throw new Error(`AI service error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    let ingredients;
    try {
      const start = content.indexOf('[');
      const end = content.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        ingredients = JSON.parse(content.substring(start, end + 1));
      } else {
        ingredients = JSON.parse(content);
      }
    } catch {
      console.error("Failed to parse content:", content);
      throw new Error("Could not parse AI response as JSON");
    }

    return new Response(JSON.stringify({ ingredients }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-dish-ingredients error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
