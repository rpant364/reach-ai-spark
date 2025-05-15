
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

// Mock data type for a cohort
interface Cohort {
  id: string;
  title: string;
  description: string;
  demographics: string[];
  cta: string;
  headline: string;
  copy: string;
  imagePrompt: string;
  imageUrl: string;
}

// Mock data type for a campaign
interface Campaign {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  status: "draft" | "active" | "completed" | "archived";
  channel: string;
  contentType: string;
  budget: string;
  cohorts: Cohort[];
}

const CampaignReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingPrompt, setEditingPrompt] = useState<{ cohortId: string; value: string } | null>(null);

  useEffect(() => {
    // Fetch campaign - in a real app, this would call Supabase
    const fetchCampaign = async () => {
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Mock data - in a real app, this would come from Supabase
        // Generate cohorts based on the campaign ID to ensure they're different for each campaign
        const mockCohorts: Cohort[] = [
          {
            id: `cohort_1_${id}`,
            title: "Adventure-Seeking Professionals",
            description: "Young professionals who prioritize unique travel experiences",
            demographics: ["25-34 years", "Urban", "Income $75k+", "Tech-savvy"],
            cta: "Book Your Adventure",
            headline: "Escape the Ordinary",
            copy: "Discover breathtaking destinations with our exclusive monsoon packages designed for the bold explorer in you.",
            imagePrompt: "A young professional standing on a mountain peak during monsoon, overlooking a misty valley with rays of sunshine breaking through clouds",
            imageUrl: "https://replicate.delivery/pbxt/GXyHyQLHSnJ7wCQCMVXaGnKJkEh2OiPfO7qdZxAUmn9vw4TIA/out-0.png",
          },
          {
            id: `cohort_2_${id}`,
            title: "Family Memory Makers",
            description: "Parents looking to create lasting family memories through travel",
            demographics: ["30-45 years", "Suburban", "Parents of young children", "Value-conscious"],
            cta: "Create Family Memories",
            headline: "Moments That Last a Lifetime",
            copy: "Our family-friendly monsoon packages combine adventure and comfort, perfect for creating stories your children will tell for years to come.",
            imagePrompt: "A happy family with children playing in light rain, laughing under colorful umbrellas in a lush green resort setting",
            imageUrl: "https://replicate.delivery/pbxt/JeQHHkTQSqMQjcNZqyGmgLFKLQPy6Jkpk10Inuj7OqkTnTHE/out-0.png",
          },
          {
            id: `cohort_3_${id}`,
            title: "Luxury Relaxation Seekers",
            description: "Affluent individuals seeking premium relaxation experiences",
            demographics: ["35-60 years", "High-income", "Urban professionals", "Luxury-oriented"],
            cta: "Indulge in Luxury",
            headline: "Monsoon Serenity Awaits",
            copy: "Experience the magic of monsoon from the comfort of our premium accommodations, where every detail is crafted for your ultimate relaxation.",
            imagePrompt: "A luxurious infinity pool overlooking rainforest during gentle monsoon rain, with a covered area where someone is enjoying a spa treatment",
            imageUrl: "https://replicate.delivery/pbxt/4NyfW7fU3PeECxqYUFh9GHEgWgkQnplQoRQEWbTHZbgg8TIA/out-0.png",
          },
        ];

        const mockCampaign: Campaign = {
          id: id || "unknown",
          title: "Monsoon Travel Promotion",
          description: "Promote monsoon travel packages for young professionals aged 25-35 who live in urban areas",
          createdAt: new Date().toISOString(),
          status: "draft",
          channel: "social",
          contentType: "image",
          budget: "$5,000",
          cohorts: mockCohorts,
        };

        setCampaign(mockCampaign);
      } catch (error) {
        console.error("Error fetching campaign:", error);
        toast.error("Failed to load campaign details");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchCampaign();
    } else {
      setIsLoading(false);
      toast.error("Campaign ID not provided");
      navigate("/dashboard");
    }
  }, [id, navigate]);

  const handleSaveCampaign = async () => {
    try {
      setIsSaving(true);
      // In a real app, this would call Supabase
      console.log("Saving campaign:", campaign);
      
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast.success("Campaign saved successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error("Failed to save campaign");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateNewImage = async (cohortId: string, prompt: string) => {
    if (!campaign) return;
    
    // Find the cohort to update
    const cohortIndex = campaign.cohorts.findIndex((c) => c.id === cohortId);
    if (cohortIndex === -1) return;
    
    try {
      // Show loading state
      const updatedCohorts = [...campaign.cohorts];
      updatedCohorts[cohortIndex] = {
        ...updatedCohorts[cohortIndex],
        imageUrl: "",
      };
      setCampaign({ ...campaign, cohorts: updatedCohorts });
      
      toast.info("Generating new image...");
      
      // In a real app, this would call Replicate AI API via Supabase
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      // Mock new image URL - in a real app, this would come from Replicate
      const newImageUrl = `https://replicate.delivery/pbxt/${Math.random().toString(36).substring(2, 15)}/out-0.png`;
      
      // Update cohort with new image
      updatedCohorts[cohortIndex] = {
        ...updatedCohorts[cohortIndex],
        imageUrl: newImageUrl,
      };
      setCampaign({ ...campaign, cohorts: updatedCohorts });
      
      toast.success("New image generated successfully!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate new image");
      
      // Reset to original image
      const originalCohort = campaign.cohorts[cohortIndex];
      const updatedCohorts = [...campaign.cohorts];
      updatedCohorts[cohortIndex] = originalCohort;
      setCampaign({ ...campaign, cohorts: updatedCohorts });
    }
  };

  const startEditingPrompt = (cohortId: string, currentPrompt: string) => {
    setEditingPrompt({ cohortId, value: currentPrompt });
  };

  const updateImagePrompt = (cohortId: string) => {
    if (!editingPrompt || !campaign) return;
    
    const cohortIndex = campaign.cohorts.findIndex((c) => c.id === cohortId);
    if (cohortIndex === -1) return;
    
    const updatedCohorts = [...campaign.cohorts];
    updatedCohorts[cohortIndex] = {
      ...updatedCohorts[cohortIndex],
      imagePrompt: editingPrompt.value,
    };
    
    setCampaign({ ...campaign, cohorts: updatedCohorts });
    setEditingPrompt(null);
    
    toast.success("Image prompt updated");
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
                    <p className="mt-1">{campaign.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Primary Channel</h3>
                      <p className="mt-1 capitalize">{campaign.channel}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Content Type</h3>
                      <p className="mt-1 capitalize">{campaign.contentType}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Budget</h3>
                    <p className="mt-1">{campaign.budget}</p>
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
                      {[...new Set(campaign.cohorts.flatMap(c => c.demographics).slice(0, 5))].map((demo, index) => (
                        <li key={index}>{demo}</li>
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
                {campaign.cohorts.map((cohort) => (
                  <Card key={cohort.id} className="border shadow-sm overflow-hidden">
                    <div className="aspect-[4/3] relative bg-gray-100">
                      {cohort.imageUrl ? (
                        <img 
                          src={cohort.imageUrl} 
                          alt={cohort.title} 
                          className="object-cover w-full h-full" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-10 h-10 border-4 border-t-aviation-blue rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold">{cohort.headline}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{cohort.copy}</p>
                      <div className="mt-3">
                        <span className="inline-block px-3 py-1 bg-aviation-lightBlue text-aviation-blue text-xs font-medium rounded-full">
                          {cohort.cta}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                          {cohort.demographics.map((demo, index) => (
                            <li key={index} className="text-gray-700">{demo}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Creative Copy</h3>
                        <div className="border rounded-md p-4 bg-white">
                          <p className="font-bold text-lg mb-2">{cohort.headline}</p>
                          <p className="text-gray-700">{cohort.copy}</p>
                          <div className="mt-4">
                            <span className="inline-block px-3 py-1 bg-aviation-blue/10 text-aviation-blue text-sm font-medium rounded-full">
                              {cohort.cta}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Image Prompt</h3>
                        {editingPrompt && editingPrompt.cohortId === cohort.id ? (
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
                                onClick={() => updateImagePrompt(cohort.id)}
                              >
                                Save Prompt
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="border rounded-md p-4 bg-gray-50 relative group">
                            <p className="text-gray-700 pr-8">{cohort.imagePrompt}</p>
                            <Button 
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => startEditingPrompt(cohort.id, cohort.imagePrompt)}
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
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Generated Image</h3>
                      <div className="border rounded-md overflow-hidden bg-gray-100">
                        {cohort.imageUrl ? (
                          <img 
                            src={cohort.imageUrl} 
                            alt={cohort.title} 
                            className="object-contain w-full h-64" 
                          />
                        ) : (
                          <div className="w-full h-64 flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-t-aviation-blue rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleGenerateNewImage(cohort.id, cohort.imagePrompt)}
                        >
                          Regenerate Image
                        </Button>
                      </div>
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
