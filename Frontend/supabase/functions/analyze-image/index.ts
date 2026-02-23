// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a sanitation inspection AI. Analyze the toilet/restroom image and return ONLY a JSON object with these fields:
- litter_count: integer (number of pieces of litter/trash visible)
- wet_floor_detected: boolean (true if floor appears wet)
- overflow_detected: boolean (true if any toilet/urinal/sink is overflowing)
Return ONLY valid JSON, no markdown, no explanation.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: imageUrl },
                },
                {
                  type: "text",
                  text: "Analyze this restroom image for cleanliness issues.",
                },
              ],
            },
          ],
          max_tokens: 200,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Gateway error: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const detection = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(detection), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
