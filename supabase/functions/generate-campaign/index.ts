
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

interface RequestBody {
  campaignId: string;
  prompt: string;
  primaryChannel: string;
  contentType: string;
  budget: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if the request is authorized
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get the user ID from the session
    const userId = session.user.id;

    // Parse the request body
    const { campaignId, prompt, primaryChannel, contentType, budget } = await req.json() as RequestBody;
    
    if (!campaignId || !prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get the brand guidelines for the user
    const { data: brandData, error: brandError } = await supabase
      .from("brand_guidelines")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (brandError || !brandData) {
      return new Response(
        JSON.stringify({ error: "Brand guidelines not found", details: brandError }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Prepare the system prompt for OpenAI
    const systemPrompt = `
      You are an AI marketing assistant for ${brandData.brand_name}.  
      Generate marketing campaign recommendations based on the given prompt, brand guidelines, and reference data.
      
      Brand Guidelines:
      - Tone: ${brandData.brand_tone || 'Professional'}
      - Voice: ${brandData.brand_voice || 'Clear, helpful'}
      - Brand Colors: Primary: ${brandData.primary_color || 'Not specified'}, Secondary: ${brandData.secondary_color || 'Not specified'}
      - Brand Identity: Premium airline focused on customer comfort
      - Industry Specifics: Aviation, travel, hospitality
      ${brandData.do_not_use_phrases ? `- Do Not Use: ${brandData.do_not_use_phrases}` : ''}
      
      User Prompt:
      Generate a marketing campaign with the following:
      - Campaign brief: ${prompt}
      - Primary channel: ${primaryChannel}
      - Content type: ${contentType}
      - Budget: ${budget || 'Not specified'}
      
      Return:
      - Three micro-cohorts with descriptions and demographics  
      - Three recommended channels  
      - Two creative recommendations per cohort (headline, description, CTA, image prompt)
    `;

    // Call OpenAI API
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      return new Response(
        JSON.stringify({ error: "Error calling OpenAI API", details: error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0].message.content;

    // Parse the generated content and format it
    // This is a simplistic parser - in a real app, you would want more robust parsing
    let parsedContent;
    try {
      // Try to parse as JSON if the response is JSON formatted
      parsedContent = JSON.parse(generatedContent);
    } catch (e) {
      // If not JSON, structure the text output
      parsedContent = {
        rawContent: generatedContent,
        microCohorts: [],
        recommendedChannels: []
      };

      // Basic parsing of the text to extract cohorts (very simplified)
      const cohortMatches = generatedContent.match(/Cohort \d+[\s\S]*?(?=Cohort \d+|$)/g);
      if (cohortMatches) {
        parsedContent.microCohorts = cohortMatches.map((match: string, index: number) => {
          const title = match.match(/Cohort \d+: ([^\n]+)/)?.[1] || `Cohort ${index + 1}`;
          const description = match.match(/Description: ([^\n]+)/)?.[1] || "No description provided";
          const demographics = match.match(/Demographics: ([^\n]+)/)?.[1] || "No demographics provided";
          
          const creatives = [];
          const creativeMatches = match.match(/Creative \d+[\s\S]*?(?=Creative \d+|$)/g);
          if (creativeMatches) {
            creativeMatches.forEach((creative: string) => {
              const headline = creative.match(/Headline: ([^\n]+)/)?.[1] || "No headline provided";
              const description = creative.match(/Description: ([^\n]+)/)?.[1] || "No description provided";
              const cta = creative.match(/CTA: ([^\n]+)/)?.[1] || "Learn More";
              const imagePrompt = creative.match(/Image Prompt: ([^\n]+)/)?.[1] || "No image prompt provided";
              
              creatives.push({
                headline,
                description,
                cta,
                imagePrompt
              });
            });
          }
          
          return {
            title,
            description,
            demographics,
            creatives
          };
        });
      }
      
      // Extract recommended channels
      const channelsMatch = generatedContent.match(/Recommended Channels:[\s\S]*?(?=\n\n|$)/);
      if (channelsMatch) {
        const channelsText = channelsMatch[0];
        const channels = channelsText.match(/\d+\.\s*([^\n]+)/g);
        if (channels) {
          parsedContent.recommendedChannels = channels.map((channel: string) => 
            channel.replace(/^\d+\.\s*/, '').trim()
          );
        }
      }
    }

    // Return the OpenAI response
    return new Response(
      JSON.stringify(parsedContent),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error generating campaign:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
