
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
    const { prompt, creativeId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const runwareApiKey = Deno.env.get("RUNWARE_API_KEY");

    if (!runwareApiKey) {
      throw new Error("Missing Runware API key");
    }

    if (!prompt || !creativeId) {
      throw new Error("Missing required parameters: prompt and creativeId");
    }

    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, make a request to the Runware API to generate an image
    const runwareResponse = await fetch("https://api.runware.ai/v1/image/generation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${runwareApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt,
        width: 768,
        height: 768,
        model: "stable-diffusion-xl"
      })
    });

    if (!runwareResponse.ok) {
      const errorText = await runwareResponse.text();
      throw new Error(`Runware API error: ${errorText}`);
    }

    const runwareData = await runwareResponse.json();
    
    if (!runwareData.images || runwareData.images.length === 0) {
      throw new Error("No images returned from Runware API");
    }

    // Get the generated image URL
    const imageUrl = runwareData.images[0];

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
