
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Creative {
  id: string;
  cohort_id: string;
  headline: string;
  description: string;
  cta: string;
  image_prompt: string;
  image_url: string | null;
}

interface Cohort {
  id: string;
  title: string;
  description: string;
  demographics: string;
  creatives: Creative[];
}

const GenerateCreatives = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<{ id: string; title: string } | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [editingPrompt, setEditingPrompt] = useState<{ creativeId: string; value: string } | null>(null);

  useEffect(() => {
    if (user && id) {
      fetchData();
    }
  }, [user, id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch campaign data
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("id, title")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single();

      if (campaignError) {
        console.error("Error fetching campaign:", campaignError);
        toast.error("Failed to load campaign details");
        navigate("/dashboard");
        return;
      }

      setCampaign(campaignData);

      // Fetch cohorts for this campaign
      const { data: cohortsData, error: cohortsError } = await supabase
        .from("micro_cohorts")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at");

      if (cohortsError) {
        console.error("Error fetching cohorts:", cohortsError);
        toast.error("Failed to load micro cohorts");
        return;
      }

      // Fetch creatives for each cohort
      const enrichedCohorts: Cohort[] = [];

      for (const cohort of cohortsData) {
        // First check if creatives already exist for this cohort
        const { data: existingCreatives, error: existingCreativesError } = await supabase
          .from("campaign_creatives")
          .select("*")
          .eq("cohort_id", cohort.id);

        if (existingCreativesError) {
          console.error("Error fetching existing creatives:", existingCreativesError);
        }

        // If no creatives exist yet, generate them
        if (!existingCreatives || existingCreatives.length === 0) {
          await generateCreatives(cohort.id, campaignData.id);
          
          // Fetch the newly created creatives
          const { data: newCreatives, error: newCreativesError } = await supabase
            .from("campaign_creatives")
            .select("*")
            .eq("cohort_id", cohort.id);
            
          if (newCreativesError) {
            console.error("Error fetching new creatives:", newCreativesError);
            continue;
          }
          
          enrichedCohorts.push({
            ...cohort,
            creatives: newCreatives || []
          });
        } else {
          enrichedCohorts.push({
            ...cohort,
            creatives: existingCreatives
          });
        }

        // Generate images for creatives that don't have images yet
        if (existingCreatives) {
          for (const creative of existingCreatives) {
            if (creative.image_prompt && !creative.image_url) {
              generateImage(creative.id, creative.image_prompt);
            }
          }
        }
      }

      setCohorts(enrichedCohorts);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setIsLoading(false);
    }
  };

  const generateCreatives = async (cohortId: string, campaignId: string) => {
    try {
      // Call the generate-creatives Edge Function
      const { data, error } = await supabase.functions.invoke("generate-creatives", {
        body: {
          cohortId,
          campaignId
        }
      });

      if (error) {
        console.error("Error generating creatives:", error);
        toast.error("Failed to generate creatives");
        return false;
      }

      console.log("Generated creatives:", data);
      return true;
    } catch (error) {
      console.error("Error in generate-creatives function:", error);
      toast.error("Failed to generate creatives");
      return false;
    }
  };

  const generateImage = async (creativeId: string, prompt: string) => {
    if (!prompt) return;
    
    try {
      // Set this creative as generating an image
      setGeneratingImages(prev => new Set([...prev, creativeId]));
      
      // Call the edge function to generate the image
      const { data: imageData, error: imageError } = await supabase.functions.invoke(
        "generate-image",
        {
          body: {
            prompt,
            creativeId
          }
        }
      );
      
      if (imageError) {
        console.error("Error generating image:", imageError);
        toast.error("Failed to generate image. Please try again.");
        return;
      }
      
      console.log("Generated image:", imageData);
      
      // Update the cohorts state with the new image URL
      if (imageData && imageData.imageUrl) {
        setCohorts(prevCohorts => {
          return prevCohorts.map(cohort => {
            const updatedCreatives = cohort.creatives.map(creative => {
              if (creative.id === creativeId) {
                return { ...creative, image_url: imageData.imageUrl };
              }
              return creative;
            });
            return { ...cohort, creatives: updatedCreatives };
          });
        });
        
        toast.success("Image generated successfully!");
      }
    } catch (error) {
      console.error("Error in image generation:", error);
      toast.error("Failed to generate image");
    } finally {
      // Remove this creative from the generating set
      setGeneratingImages(prev => {
        const newSet = new Set([...prev]);
        newSet.delete(creativeId);
        return newSet;
      });
    }
  };

  const handleRegenerateImage = (creativeId: string, prompt: string) => {
    generateImage(creativeId, prompt);
  };

  const startEditingPrompt = (creativeId: string, currentPrompt: string) => {
    setEditingPrompt({ creativeId, value: currentPrompt || "" });
  };

  const updateImagePrompt = async (creativeId: string) => {
    if (!editingPrompt) return;
    
    try {
      // Update the prompt in the database
      const { error } = await supabase
        .from("campaign_creatives")
        .update({ image_prompt: editingPrompt.value })
        .eq("id", creativeId);
        
      if (error) {
        console.error("Error updating image prompt:", error);
        toast.error("Failed to update image prompt");
        return;
      }
      
      // Update the local state
      setCohorts(prevCohorts => {
        return prevCohorts.map(cohort => {
          const updatedCreatives = cohort.creatives.map(creative => {
            if (creative.id === creativeId) {
              return { ...creative, image_prompt: editingPrompt.value };
            }
            return creative;
          });
          return { ...cohort, creatives: updatedCreatives };
        });
      });
      
      setEditingPrompt(null);
      toast.success("Image prompt updated");
      
      // Generate a new image with the updated prompt
      generateImage(creativeId, editingPrompt.value);
    } catch (error) {
      console.error("Error updating image prompt:", error);
      toast.error("Failed to update image prompt");
    }
  };

  const handleSaveCampaign = async () => {
    try {
      setSaving(true);
      
      // Check if all images are generated
      const allImagesGenerated = cohorts.every(cohort => 
        cohort.creatives.every(creative => !!creative.image_url)
      );
      
      if (!allImagesGenerated) {
        const confirm = window.confirm(
          "Some images haven't been generated yet. Do you want to save the campaign anyway?"
        );
        if (!confirm) {
          setSaving(false);
          return;
        }
      }
      
      // Update campaign status to active
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "active" })
        .eq("id", id);
        
      if (error) {
        console.error("Error saving campaign:", error);
        toast.error("Failed to save campaign");
        return;
      }
      
      toast.success("Campaign saved successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error("Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500">Loading creatives...</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{campaign?.title}</h1>
            <p className="text-muted-foreground">
              Review and customize your campaign creatives
            </p>
          </div>
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSaveCampaign}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Campaign"}
            </Button>
          </div>
        </div>

        {cohorts.map((cohort) => (
          <div key={cohort.id} className="space-y-4">
            <h2 className="text-xl font-medium">{cohort.title}</h2>
            <p className="text-gray-600">{cohort.description}</p>
            
            <div className="bg-gray-50 px-4 py-3 rounded-md">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Demographics</h3>
              <div className="flex flex-wrap gap-2">
                {cohort.demographics.split(',').map((demo, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
                  >
                    {demo.trim()}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cohort.creatives.map((creative) => (
                <Card key={creative.id} className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{creative.headline}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-gray-700">{creative.description}</p>
                      <div className="mt-2">
                        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">
                          {creative.cta}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Image Prompt</h4>
                      {editingPrompt && editingPrompt.creativeId === creative.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingPrompt.value}
                            onChange={(e) => setEditingPrompt({ ...editingPrompt, value: e.target.value })}
                            className="min-h-[80px] text-sm"
                          />
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPrompt(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => updateImagePrompt(creative.id)}
                            >
                              Save & Generate
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-md p-3 bg-gray-50 relative group">
                          <p className="text-gray-700 text-sm pr-8">{creative.image_prompt}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => startEditingPrompt(creative.id, creative.image_prompt)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-pencil"
                            >
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                            <span className="sr-only">Edit</span>
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Generated Image</h4>
                      <div className="border rounded-md overflow-hidden bg-gray-100">
                        {generatingImages.has(creative.id) ? (
                          <div className="w-full h-[400px] flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
                          </div>
                        ) : creative.image_url ? (
                          <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden">
                            <img
                              src={creative.image_url}
                              alt={creative.headline}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-[400px] flex flex-col items-center justify-center">
                            <p className="text-gray-400 mb-3">No image generated yet</p>
                            <Button
                              onClick={() => generateImage(creative.id, creative.image_prompt)}
                              className="bg-indigo-600 hover:bg-indigo-700"
                              disabled={generatingImages.has(creative.id)}
                            >
                              Generate Image
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-3 flex justify-end">
                    {creative.image_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerateImage(creative.id, creative.image_prompt)}
                        disabled={generatingImages.has(creative.id)}
                      >
                        {generatingImages.has(creative.id) ? "Generating..." : "Regenerate Image"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SidebarLayout>
  );
};

export default GenerateCreatives;
