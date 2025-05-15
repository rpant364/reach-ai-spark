
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Replicate from "https://esm.sh/replicate@0.25.2";

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
    const { prompt, creativeId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const replicateApiKey = Deno.env.get("REPLICATE_API_KEY");

    if (!replicateApiKey) {
      throw new Error("Missing Replicate API key");
    }

    if (!prompt || !creativeId) {
      throw new Error("Missing required parameters: prompt and creativeId");
    }

    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the creative to get headline and CTA for overlay text
    const { data: creative, error: creativeError } = await supabase
      .from("campaign_creatives")
      .select("headline, cta")
      .eq("id", creativeId)
      .single();

    if (creativeError) {
      throw new Error(`Failed to fetch creative: ${creativeError.message}`);
    }

    // Initialize Replicate client
    const replicate = new Replicate({
      auth: replicateApiKey,
    });

    console.log("Generating image with prompt:", prompt);
    console.log("Headline for overlay:", creative.headline);
    console.log("CTA for overlay:", creative.cta);

    // Create the input for the Ideogram model
    const modelInput = {
      prompt: prompt,
      width: 768,
      height: 768,
      negative_prompt: "low quality, blurry, distorted, ugly, deformed",
      style_preset: "photographic",
      steps: 40,
      cfg_scale: 7.5,
    };

    // Add overlay text only if headline exists
    if (creative.headline) {
      modelInput.overlay_text = creative.headline;
    }

    // Add button text only if CTA exists
    if (creative.cta) {
      modelInput.button_text = creative.cta;
    }

    console.log("Model input:", modelInput);

    // Call Replicate API with verbose logging
    console.log("Calling Replicate API with model: ideogram-ai/ideogram-v2");
    const output = await replicate.run(
      "ideogram-ai/ideogram-v2",
      {
        input: modelInput
      }
    );

    console.log("Replicate API response:", output);

    // Fix: Properly handle the response from Replicate API
    // The API returns a string URL for a single image or an array of URLs for multiple images
    let imageUrl;
    
    if (typeof output === 'string') {
      // If output is directly a string URL
      imageUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      // If output is an array of URLs, take the first one
      imageUrl = output[0];
    } else {
      console.error("Unexpected response format from Replicate API:", output);
      throw new Error("Invalid response format from Replicate API");
    }

    if (!imageUrl) {
      console.error("No image URL found in Replicate API response:", output);
      throw new Error("No image URL in Replicate API response");
    }

    console.log("Generated image URL:", imageUrl);

    // Update the campaign creative with the generated image URL
    const { error: updateError } = await supabase
      .from("campaign_creatives")
      .update({ image_url: imageUrl })
      .eq("id", creativeId);

    if (updateError) {
      console.error("Error updating creative with image URL:", updateError);
      throw new Error(`Failed to update creative: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl: imageUrl 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
