
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
    // Check if OpenAI API key is available
    if (!openaiApiKey) {
      console.error("OpenAI API key not configured");
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check if the request is authorized
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      console.error("Unauthorized access:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get the user ID from the session
    const userId = session.user.id;

    // Parse the request body
    let requestBody: RequestBody;
    try {
      requestBody = await req.json() as RequestBody;
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: e.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const { campaignId, prompt, primaryChannel, contentType, budget } = requestBody;
    
    if (!campaignId || !prompt) {
      console.error("Missing required parameters:", { campaignId, prompt });
      return new Response(
        JSON.stringify({ error: "Missing required parameters (campaignId or prompt)" }),
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
      .eq("user_id", userId);

    if (brandError) {
      console.error("Error fetching brand guidelines:", brandError);
      return new Response(
        JSON.stringify({ error: "Error fetching brand guidelines", details: brandError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check if brand data exists and use defaults if not
    const brand = brandData && brandData.length > 0 
      ? brandData[0] 
      : {
        brand_name: "Your Brand",
        brand_tone: "Professional",
        brand_voice: "Clear, helpful",
        primary_color: "Not specified",
        secondary_color: "Not specified",
        do_not_use_phrases: ""
      };

    // Prepare the system prompt for OpenAI
    const systemPrompt = `
      You are an AI marketing assistant for ${brand.brand_name}.  
      Generate marketing campaign recommendations based on the given prompt, brand guidelines, and reference data.
      
      Brand Guidelines:
      - Tone: ${brand.brand_tone || 'Professional'}
      - Voice: ${brand.brand_voice || 'Clear, helpful'}
      - Brand Colors: Primary: ${brand.primary_color || 'Not specified'}, Secondary: ${brand.secondary_color || 'Not specified'}
      - Brand Identity: Premium airline focused on customer comfort
      - Industry Specifics: Aviation, travel, hospitality
      ${brand.do_not_use_phrases ? `- Do Not Use: ${brand.do_not_use_phrases}` : ''}
      
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

    console.log("Calling OpenAI API with prompt...");

    // Call OpenAI API
    let openaiResponse;
    try {
      openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
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
    } catch (error) {
      console.error("Network error calling OpenAI API:", error);
      return new Response(
        JSON.stringify({ error: "Network error calling OpenAI API", details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("Error from OpenAI API:", errorData);
      return new Response(
        JSON.stringify({ error: "Error calling OpenAI API", details: errorData }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0].message.content;

    // Parse the generated content and format it
    let parsedContent;
    try {
      // Try to parse as JSON if the response is JSON formatted
      parsedContent = JSON.parse(generatedContent);
    } catch (e) {
      console.log("Content is not JSON, parsing as text");
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

    console.log("Successfully generated and parsed content");

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
