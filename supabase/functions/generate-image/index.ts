
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

    // Initialize Replicate client
    const replicate = new Replicate({
      auth: replicateApiKey,
    });

    console.log("Generating image with prompt:", prompt);

    // Call Replicate API to generate an image - using the standard format for model ID
    // The format should be: owner/model-name:version
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: prompt,
          width: 768,
          height: 768,
          negative_prompt: "low quality, blurry, distorted, ugly, deformed",
          num_inference_steps: 40,
          guidance_scale: 7.5,
        },
      }
    );

    if (!output || !Array.isArray(output) || output.length === 0) {
      throw new Error("No image generated from Replicate API");
    }

    // Get the generated image URL (first result)
    const imageUrl = output[0];

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
