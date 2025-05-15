
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
    const { cohortId, campaignId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const openAIKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAIKey) {
      throw new Error("Missing OpenAI API key");
    }

    if (!cohortId || !campaignId) {
      throw new Error("Missing required parameters: cohortId and campaignId");
    }

    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch cohort data
    const { data: cohortData, error: cohortError } = await supabase
      .from("micro_cohorts")
      .select("*")
      .eq("id", cohortId)
      .single();

    if (cohortError) {
      throw new Error(`Cohort fetch error: ${cohortError.message}`);
    }

    // Fetch campaign data
    const { data: campaignData, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError) {
      throw new Error(`Campaign fetch error: ${campaignError.message}`);
    }

    // Fetch brand guidelines
    const { data: brandData, error: brandError } = await supabase
      .from("brand_guidelines")
      .select("*")
      .eq("user_id", campaignData.user_id)
      .single();

    if (brandError && brandError.code !== "PGRST116") {
      console.error("Error fetching brand guidelines:", brandError);
    }

    // Format brand guidelines for the OpenAI prompt
    const brandInfo = brandData
      ? `
Brand Guidelines:
- Brand Name: ${brandData.brand_name}
- Tone: ${brandData.brand_tone}
- Brand Colors: ${brandData.primary_color}, ${brandData.secondary_color}
- Tagline: ${brandData.sample_tagline || "None provided"}
- Do Not Use Phrases: ${brandData.do_not_use_phrases || "None specified"}
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
You are a marketing creative director with expertise in the aviation industry. Based on the following campaign and cohort information, generate creative recommendations.

---
${brandInfo}

Campaign Brief:
${campaignData.prompt}

Target Cohort:
- Name: ${cohortData.title}
- Description: ${cohortData.description}
- Demographics: ${cohortData.demographics}

---

Your task:

Generate creative recommendation for this cohort including:
- Headline (catchy, concise headline for the ad)
- Description (compelling ad copy, 1-2 sentences)
- Call-to-Action (brief action text like "Book Now" or "Learn More")
- Image Prompt: Create a detailed visual prompt for AI image generation that represents this cohort and campaign.

For the image prompt, include:
- The setting/environment
- The main subject(s)
- Camera angle
- Lighting and time of day
- Style/mood
- Branding details
- Negative space guidance

Output as JSON with this structure:
{
  "headline": "Headline text",
  "description": "Description text",
  "cta": "Call to action text",
  "imagePrompt": "Detailed image generation prompt"
}

Only return the JSON result, no other text. Ensure the JSON is valid and properly formatted.
`;

    // Call OpenAI API to generate creative
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
            content: "You generate structured marketing creative recommendations in JSON format only.",
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
    let creativeData;
    
    try {
      // Extract the JSON part from the response
      const jsonMatch = content.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      creativeData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Error parsing OpenAI JSON response:", e);
      console.log("Raw content:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Save the generated creative to the database
    if (creativeData) {
      const { data: insertedCreative, error: insertError } = await supabase
        .from("campaign_creatives")
        .insert({
          cohort_id: cohortId,
          headline: creativeData.headline,
          description: creativeData.description,
          cta: creativeData.cta,
          image_prompt: creativeData.imagePrompt
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting creative:", insertError);
        throw new Error(`Failed to save creative: ${insertError.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        creative: insertedCreative 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Failed to generate creative content");
    }
  } catch (error) {
    console.error("Error in generate-creatives function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
