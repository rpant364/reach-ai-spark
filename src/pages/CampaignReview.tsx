
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Type definitions for the data structure
interface Creative {
  id: string;
  headline: string;
  description: string;
  cta: string;
  image_prompt: string | null;
  image_url: string | null;
}

interface Cohort {
  id: string;
  title: string;
  description: string;
  demographics: string;
  recommended_channels: string[] | null;
  creatives: Creative[];
}

interface Campaign {
  id: string;
  title: string;
  prompt: string;
  budget: string | null;
  primary_channel: string;
  content_type: string;
  status: string;
  cohorts: Cohort[];
}

// Helper function to safely convert Json type to string[]
const convertToStringArray = (value: unknown): string[] | null => {
  if (!value) return null;
  
  // If it's already an array, check if all elements are strings
  if (Array.isArray(value)) {
    return value.map(item => String(item));
  }
  
  // If it's a string (JSON encoded array), try to parse it
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item));
      }
      return [String(value)];
    } catch (e) {
      return [String(value)];
    }
  }
  
  // For any other type, convert to string and return as single item array
  return [String(value)];
};

const CampaignReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingPrompt, setEditingPrompt] = useState<{ cohortId: string; value: string } | null>(null);
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !id) {
      setIsLoading(false);
      if (!user) navigate("/login");
      else if (!id) navigate("/dashboard");
      return;
    }

    fetchCampaignData();
  }, [id, user, navigate]);

  const fetchCampaignData = async () => {
    try {
      setIsLoading(true);

      // Fetch the campaign data
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single();

      if (campaignError || !campaignData) {
        console.error("Error fetching campaign:", campaignError);
        toast.error("Failed to load campaign");
        navigate("/dashboard");
        return;
      }

      // Fetch the micro-cohorts for this campaign
      const { data: cohortsData, error: cohortsError } = await supabase
        .from("micro_cohorts")
        .select("*")
        .eq("campaign_id", campaignData.id);

      if (cohortsError) {
        console.error("Error fetching cohorts:", cohortsError);
        toast.error("Failed to load campaign cohorts");
        return;
      }

      const cohorts: Cohort[] = [];

      // For each cohort, fetch its creatives
      for (const cohort of cohortsData) {
        const { data: creativesData, error: creativesError } = await supabase
          .from("campaign_creatives")
          .select("*")
          .eq("cohort_id", cohort.id);

        if (creativesError) {
          console.error("Error fetching creatives for cohort:", cohort.id, creativesError);
          continue;
        }

        cohorts.push({
          id: cohort.id,
          title: cohort.title,
          description: cohort.description,
          demographics: cohort.demographics,
          recommended_channels: convertToStringArray(cohort.recommended_channels),
          creatives: creativesData
        });

        // Generate images for creatives that don't have images yet
        for (const creative of creativesData) {
          if (creative.image_prompt && !creative.image_url) {
            generateImage(creative.id, creative.image_prompt);
          }
        }
      }

      // Build the complete campaign object
      const completeData: Campaign = {
        id: campaignData.id,
        title: campaignData.title,
        prompt: campaignData.prompt,
        budget: campaignData.budget,
        primary_channel: campaignData.primary_channel,
        content_type: campaignData.content_type,
        status: campaignData.status,
        cohorts: cohorts
      };

      setCampaign(completeData);
    } catch (error) {
      console.error("Error loading campaign data:", error);
      toast.error("Failed to load campaign details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!campaign) return;
    
    try {
      setIsSaving(true);
      
      // Update campaign status to active
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "active" })
        .eq("id", campaign.id);
        
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
      setIsSaving(false);
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
      
      // Update the campaign state with the new image URL
      if (imageData && imageData.imageUrl) {
        setCampaign(prevCampaign => {
          if (!prevCampaign) return null;
          
          const updatedCohorts = prevCampaign.cohorts.map(cohort => {
            const updatedCreatives = cohort.creatives.map(creative => {
              if (creative.id === creativeId) {
                return { ...creative, image_url: imageData.imageUrl };
              }
              return creative;
            });
            return { ...cohort, creatives: updatedCreatives };
          });
          
          return { ...prevCampaign, cohorts: updatedCohorts };
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

  const handleGenerateNewImage = (creativeId: string, prompt: string) => {
    generateImage(creativeId, prompt);
  };

  const startEditingPrompt = (creativeId: string, currentPrompt: string) => {
    setEditingPrompt({ cohortId: creativeId, value: currentPrompt || "" });
  };

  const updateImagePrompt = async (creativeId: string) => {
    if (!editingPrompt || !campaign) return;
    
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
      setCampaign(prevCampaign => {
        if (!prevCampaign) return null;
        
        const updatedCohorts = prevCampaign.cohorts.map(cohort => {
          const updatedCreatives = cohort.creatives.map(creative => {
            if (creative.id === creativeId) {
              return { ...creative, image_prompt: editingPrompt.value };
            }
            return creative;
          });
          return { ...cohort, creatives: updatedCreatives };
        });
        
        return { ...prevCampaign, cohorts: updatedCohorts };
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

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-t-aviation-blue rounded-full animate-spin"></div>
          <p className="mt-4 text-aviation-gray">Loading campaign details...</p>
        </div>
      </SidebarLayout>
    );
  }

  if (!campaign) {
    return (
      <SidebarLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-500">Campaign not found</h2>
          <p className="mt-2 text-gray-600">The campaign you are looking for could not be found.</p>
          <Button 
            className="mt-6 bg-aviation-blue hover:bg-aviation-indigo" 
            onClick={() => navigate("/dashboard")}
          >
            Return to Dashboard
          </Button>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{campaign.title}</h1>
            <p className="text-muted-foreground">
              Review and finalize your campaign
            </p>
          </div>
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              className="bg-aviation-blue hover:bg-aviation-indigo" 
              onClick={handleSaveCampaign}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Campaign"}
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">Campaign Overview</TabsTrigger>
            <TabsTrigger value="cohorts">Micro-Cohorts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="mt-1">{campaign.prompt}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Primary Channel</h3>
                      <p className="mt-1 capitalize">{campaign.primary_channel}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Content Type</h3>
                      <p className="mt-1 capitalize">{campaign.content_type}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Budget</h3>
                    <p className="mt-1">{campaign.budget || "Not specified"}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle>Targeting Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Generated Cohorts</h3>
                    <ul className="mt-1 space-y-1">
                      {campaign.cohorts.map((cohort) => (
                        <li key={cohort.id}>{cohort.title}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Key Demographics</h3>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {campaign.cohorts.map((cohort, index) => (
                        <li key={index}>{cohort.demographics.split(',')[0]}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-gray-50 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setActiveTab("cohorts")}
                  >
                    View Detailed Cohorts
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="mt-6">
              <h2 className="text-lg font-medium mb-4">Creative Preview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {campaign.cohorts.flatMap(cohort => 
                  cohort.creatives.map(creative => (
                    <Card key={creative.id} className="border shadow-sm overflow-hidden">
                      <div className="aspect-square relative bg-gray-100">
                        {generatingImages.has(creative.id) ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-t-aviation-blue rounded-full animate-spin"></div>
                          </div>
                        ) : creative.image_url ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img 
                              src={creative.image_url} 
                              alt={creative.headline} 
                              className="w-full h-full object-contain" 
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4">
                            <p className="text-gray-400 text-center mb-2">Image not yet generated</p>
                            <Button 
                              size="sm"
                              onClick={() => generateImage(creative.id, creative.image_prompt || "")}
                              disabled={!creative.image_prompt}
                            >
                              Generate Image
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold">{creative.headline}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{creative.description}</p>
                        <div className="mt-3">
                          <span className="inline-block px-3 py-1 bg-aviation-lightBlue text-aviation-blue text-xs font-medium rounded-full">
                            {creative.cta}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="cohorts" className="mt-6 space-y-8">
            {campaign.cohorts.map((cohort) => (
              <Card key={cohort.id} className="border shadow-sm">
                <CardHeader className="bg-gray-50">
                  <CardTitle>{cohort.title}</CardTitle>
                  <CardDescription>{cohort.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Demographics</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {cohort.demographics.split(',').map((demo, index) => (
                            <li key={index} className="text-gray-700">{demo.trim()}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Recommended Channels</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {(cohort.recommended_channels || []).map((channel, index) => (
                            <li key={index} className="text-gray-700">{channel}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {cohort.creatives.map((creative) => (
                        <div key={creative.id} className="border-t pt-4">
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Creative Copy</h3>
                          <div className="border rounded-md p-4 bg-white">
                            <p className="font-bold text-lg mb-2">{creative.headline}</p>
                            <p className="text-gray-700">{creative.description}</p>
                            <div className="mt-4">
                              <span className="inline-block px-3 py-1 bg-aviation-blue/10 text-aviation-blue text-sm font-medium rounded-full">
                                {creative.cta}
                              </span>
                            </div>
                          </div>
                      
                          <h3 className="text-sm font-medium text-gray-500 mt-4 mb-2">Image Prompt</h3>
                          {editingPrompt && editingPrompt.cohortId === creative.id ? (
                            <div className="space-y-2">
                              <Textarea 
                                value={editingPrompt.value}
                                onChange={(e) => setEditingPrompt({ ...editingPrompt, value: e.target.value })}
                                className="min-h-[80px]"
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
                                  className="bg-aviation-blue hover:bg-aviation-indigo"
                                  onClick={() => updateImagePrompt(creative.id)}
                                >
                                  Save & Generate
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="border rounded-md p-4 bg-gray-50 relative group">
                              <p className="text-gray-700 pr-8">{creative.image_prompt || "No image prompt provided"}</p>
                              <Button 
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => startEditingPrompt(creative.id, creative.image_prompt || "")}
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
                          
                          <div className="mt-6 space-y-4">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Generated Image</h3>
                            <div className="border rounded-md overflow-hidden bg-gray-100">
                              {generatingImages.has(creative.id) ? (
                                <div className="w-full h-[400px] flex items-center justify-center">
                                  <div className="w-10 h-10 border-4 border-t-aviation-blue rounded-full animate-spin"></div>
                                </div>
                              ) : creative.image_url ? (
                                <div className="w-full h-[400px] flex items-center justify-center">
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
                                    onClick={() => generateImage(creative.id, creative.image_prompt || "")}
                                    disabled={!creative.image_prompt || generatingImages.has(creative.id)}
                                  >
                                    Generate Image
                                  </Button>
                                </div>
                              )}
                            </div>
                            {creative.image_url && (
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleGenerateNewImage(creative.id, creative.image_prompt || "")}
                                  disabled={!creative.image_prompt || generatingImages.has(creative.id)}
                                >
                                  {generatingImages.has(creative.id) ? "Generating..." : "Regenerate Image"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
};

export default CampaignReview;
