
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, prompt, brandGuidelines, budget } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const openAIKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAIKey) {
      throw new Error("Missing OpenAI API key");
    }

    if (!campaignId || !prompt) {
      throw new Error("Missing required parameters: campaignId and prompt");
    }

    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch campaign data
    const { data: campaignData, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError) {
      throw new Error(`Campaign fetch error: ${campaignError.message}`);
    }

    // Format brand guidelines for the OpenAI prompt
    const brandInfo = brandGuidelines
      ? `
Brand Guidelines:
- Brand Name: ${brandGuidelines.brand_name}
- Tone: ${brandGuidelines.brand_tone}
- Brand Colors: ${brandGuidelines.primary_color}, ${brandGuidelines.secondary_color}
- Tagline: ${brandGuidelines.sample_tagline || "None provided"}
- Do Not Use Phrases: ${brandGuidelines.do_not_use_phrases || "None specified"}
`
      : `
Brand Guidelines:
- Brand Name: Unknown
- Tone: Professional and friendly
- Brand Colors: #6366F1, #0EA5E9
- Tagline: None provided
- Do Not Use Phrases: None specified
`;

    // Construct the prompt for OpenAI
    const openAIPrompt = `
You are a marketing strategist veteran working with the aviation sector for the last 25 years. You follow David Ogilvy advertising principles.

Based on the following brand guidelines and campaign brief, generate intelligent campaign recommendations.

---
${brandInfo}

Campaign Brief:
${prompt}

Budget: ${budget}

---

Your task:

1. Generate 2 micro-cohorts likely to perform well for this campaign.
For each cohort, provide:
- Title
- Description (who they are and what motivates them)
- Demographic info (age, location, traits)
- Estimated reach (use placeholder if unknown)

Output the results as JSON with the following structure:
{
  "microCohorts": [
    {
      "title": "Cohort title",
      "description": "Detailed description",
      "demographics": "Age, location, traits list",
      "estimatedReach": "Reach estimate"
    }
  ]
}

Only return the JSON result, no other text. Ensure the JSON is valid and properly formatted.
`;

    // Call OpenAI API to generate recommendations
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You generate structured marketing recommendations in JSON format only.",
          },
          {
            role: "user",
            content: openAIPrompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    const openAIResponse = await response.json();
    
    if (!openAIResponse.choices || openAIResponse.choices.length === 0) {
      throw new Error("Invalid response from OpenAI");
    }

    // Parse the JSON response from OpenAI
    const content = openAIResponse.choices[0].message.content;
    let generatedData;
    
    try {
      // Extract the JSON part from the response
      const jsonMatch = content.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      generatedData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Error parsing OpenAI JSON response:", e);
      console.log("Raw content:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Save the generated micro-cohorts to the database
    if (generatedData && generatedData.microCohorts) {
      for (const cohort of generatedData.microCohorts) {
        const { error: cohortError } = await supabase.from("micro_cohorts").insert({
          campaign_id: campaignId,
          title: cohort.title,
          description: cohort.description,
          demographics: cohort.demographics,
          recommended_channels: ["social", "email", "display"]
        });

        if (cohortError) {
          console.error("Error inserting cohort:", cohortError);
        }
      }
    }

    // Return the generated data
    return new Response(JSON.stringify(generatedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-campaign function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
