
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const runwareApiKey = Deno.env.get("RUNWARE_API_KEY") || "";

interface RequestBody {
  prompt: string;
  creativeId?: string;
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

    // Parse the request body
    const { prompt, creativeId } = await req.json() as RequestBody;
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing prompt parameter" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check if Runware API key is configured
    if (!runwareApiKey) {
      return new Response(
        JSON.stringify({ error: "Runware API key not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Call Runware API to generate the image
    console.log("Calling Runware API with prompt:", prompt);
    
    const runwareResponse = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          taskType: "authentication",
          apiKey: runwareApiKey
        },
        {
          taskType: "imageInference",
          taskUUID: crypto.randomUUID(),
          positivePrompt: prompt,
          model: "runware:100@1",
          width: 1024,
          height: 768,
          numberResults: 1,
          outputFormat: "WEBP",
          CFGScale: 1,
          scheduler: "FlowMatchEulerDiscreteScheduler",
          strength: 0.8,
        }
      ]),
    });

    if (!runwareResponse.ok) {
      console.error("Runware API error status:", runwareResponse.status);
      const error = await runwareResponse.text();
      console.error("Runware API error:", error);
      return new Response(
        JSON.stringify({ error: "Error calling Runware API", details: error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get the response data
    const runwareData = await runwareResponse.json();
    console.log("Runware response:", runwareData);
    
    if (!runwareData || !runwareData.data) {
      return new Response(
        JSON.stringify({ error: "Invalid response from Runware API" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Find the imageInference task result
    const imageResult = runwareData.data.find(item => item.taskType === "imageInference");
    
    if (!imageResult || !imageResult.imageURL) {
      console.error("No image URL in response:", runwareData);
      return new Response(
        JSON.stringify({ error: "No image URL in response from Runware API" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const imageUrl = imageResult.imageURL;
    console.log("Image URL generated:", imageUrl);

    // If an image was generated successfully and we have a creativeId, update the creative in the database
    if (imageUrl && creativeId) {
      const { error: updateError } = await supabase
        .from("campaign_creatives")
        .update({ image_url: imageUrl })
        .eq("id", creativeId);

      if (updateError) {
        console.error("Error updating creative with image URL:", updateError);
      }
    }

    // Return the image URL
    return new Response(
      JSON.stringify({ success: true, imageUrl }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
