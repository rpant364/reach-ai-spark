
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const replicateApiKey = Deno.env.get("REPLICATE_API_KEY") || "";

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

    // Check if Replicate API key is configured
    if (!replicateApiKey) {
      return new Response(
        JSON.stringify({ error: "Replicate API key not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Call Replicate API to generate the image
    // Using Stable Diffusion model
    const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf", // Stable Diffusion v1.5
        input: {
          prompt: prompt,
          negative_prompt: "blurry, bad quality, distorted, disfigured",
          width: 768,
          height: 512,
          num_inference_steps: 40
        }
      }),
    });

    if (!replicateResponse.ok) {
      const error = await replicateResponse.json();
      return new Response(
        JSON.stringify({ error: "Error calling Replicate API", details: error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get the prediction ID and status URL
    const replicateData = await replicateResponse.json();
    const predictionId = replicateData.id;
    const statusUrl = replicateData.urls.get;

    // Function to check the status of the prediction
    const checkPrediction = async (statusUrl: string): Promise<any> => {
      const response = await fetch(statusUrl, {
        headers: {
          "Authorization": `Token ${replicateApiKey}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to check prediction status");
      }
      
      const data = await response.json();
      
      if (data.status === "succeeded") {
        return data;
      } else if (data.status === "failed") {
        throw new Error("Prediction failed: " + (data.error || "Unknown error"));
      } else {
        // Still processing, wait and check again
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkPrediction(statusUrl);
      }
    };

    // Wait for the prediction to complete
    const predictionResult = await checkPrediction(statusUrl);
    const imageUrl = predictionResult.output && predictionResult.output[0];

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
