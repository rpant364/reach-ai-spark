
import { supabase } from "@/integrations/supabase/client";
import { BrandGuidelinesFormValues } from "@/components/brand/BrandGuidelinesSchema";
import { toast } from "sonner";

export const saveBrandGuidelines = async (userId: string, values: BrandGuidelinesFormValues) => {
  try {
    const { error } = await supabase
      .from('brand_guidelines')
      .insert({
        user_id: userId,
        brand_name: values.brandName,
        brand_tone: values.brandTone,
        brand_voice: values.brandVoice || null,
        primary_color: values.primaryColor,
        secondary_color: values.secondaryColor,
        sample_tagline: values.sampleTagline || null,
        do_not_use_phrases: values.doNotUse || null
      });
    
    if (error) {
      console.error("Error saving to Supabase:", error);
      toast.error("Failed to save brand guidelines. Please try again.");
      throw error;
    }
    
    // Save to local storage for demo purposes (this can be removed in a production app)
    localStorage.setItem('brandGuidelines', JSON.stringify(values));
    
    return true;
  } catch (error) {
    console.error("Error saving brand guidelines:", error);
    throw error;
  }
};
