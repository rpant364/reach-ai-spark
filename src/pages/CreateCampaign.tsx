
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  campaignName: z.string().min(3, { message: "Campaign name must be at least 3 characters" }),
  prompt: z.string().min(10, { message: "Please provide a detailed prompt" }),
  budget: z.string().optional(),
  primaryChannel: z.string().min(1, { message: "Please select a primary channel" }),
  contentType: z.string().min(1, { message: "Please select a content type" }),
});

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      campaignName: "",
      prompt: "",
      budget: "",
      primaryChannel: "",
      contentType: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      
      // First, create a campaign record in the database
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          title: values.campaignName,
          prompt: values.prompt,
          budget: values.budget || null,
          primary_channel: values.primaryChannel,
          content_type: values.contentType,
          user_id: user?.id,
          status: "draft"
        })
        .select()
        .single();
      
      if (campaignError) {
        console.error("Error creating campaign:", campaignError);
        toast({
          title: "Error",
          description: "Failed to create campaign: " + campaignError.message,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      console.log("Campaign created successfully:", campaignData);
      
      // Call the generate-campaign Edge Function to generate content
      const { data: generationData, error: generationError } = await supabase.functions.invoke(
        "generate-campaign",
        {
          body: {
            campaignId: campaignData.id,
            prompt: values.prompt,
            primaryChannel: values.primaryChannel,
            contentType: values.contentType,
            budget: values.budget || "Not specified"
          }
        }
      );
      
      if (generationError) {
        console.error("Error generating campaign:", generationError);
        toast({
          title: "Error",
          description: `Failed to generate campaign content: ${generationError.message || 'Unknown error'}`,
          variant: "destructive"
        });
        
        // Navigate to the review page anyway, even if generation failed
        // This allows the user to see what they created and try generating again
        navigate(`/campaign-review/${campaignData.id}`);
        setIsLoading(false);
        return;
      }
      
      // Process the generated content from OpenAI
      console.log("Generated content:", generationData);
      
      if (!generationData || (!generationData.microCohorts && !generationData.rawContent)) {
        console.error("Invalid response from generate-campaign function:", generationData);
        toast({
          title: "Warning",
          description: "Received invalid data from AI. You can try generating again in the review page.",
          variant: "destructive"
        });
        
        // Navigate to the review page anyway
        navigate(`/campaign-review/${campaignData.id}`);
        setIsLoading(false);
        return;
      }
      
      // Create micro-cohorts in the database
      if (generationData.microCohorts && generationData.microCohorts.length > 0) {
        for (const cohort of generationData.microCohorts) {
          // Create cohort
          const { data: cohortData, error: cohortError } = await supabase
            .from("micro_cohorts")
            .insert({
              campaign_id: campaignData.id,
              title: cohort.title,
              description: cohort.description,
              demographics: cohort.demographics,
              recommended_channels: generationData.recommendedChannels || []
            })
            .select()
            .single();
            
          if (cohortError) {
            console.error("Error creating cohort:", cohortError);
            continue; // Continue with next cohort
          }
          
          // Create creatives for each cohort
          if (cohort.creatives && cohort.creatives.length > 0) {
            for (const creative of cohort.creatives) {
              const { data: creativeData, error: creativeError } = await supabase
                .from("campaign_creatives")
                .insert({
                  cohort_id: cohortData.id,
                  headline: creative.headline,
                  description: creative.description,
                  cta: creative.cta,
                  image_prompt: creative.imagePrompt
                })
                .select()
                .single();
                
              if (creativeError) {
                console.error("Error creating creative:", creativeError);
                continue;
              }
              
              // Generate image for the creative if image prompt is available
              if (creative.imagePrompt) {
                // We'll handle image generation in CampaignReview to avoid delays
                console.log("Image will be generated later for creative:", creativeData.id);
              }
            }
          }
        }
      } else if (generationData.rawContent) {
        // If we received rawContent instead of structured data, create a default cohort
        console.log("Handling raw content response");
        
        const { data: cohortData, error: cohortError } = await supabase
          .from("micro_cohorts")
          .insert({
            campaign_id: campaignData.id,
            title: "AI Generated Cohort",
            description: "Generated from your prompt",
            demographics: "Based on your target audience",
            recommended_channels: generationData.recommendedChannels || []
          })
          .select()
          .single();
          
        if (cohortError) {
          console.error("Error creating default cohort:", cohortError);
        } else {
          // Create a single creative with the raw content
          await supabase
            .from("campaign_creatives")
            .insert({
              cohort_id: cohortData.id,
              headline: "AI Generated Content",
              description: generationData.rawContent.substring(0, 1000), // Limit length
              cta: "Learn More",
              image_prompt: "A professional marketing image related to the campaign"
            });
        }
      }
      
      toast({
        title: "Success",
        description: "Campaign created successfully!",
      });
      
      // Navigate to review page
      navigate(`/campaign-review/${campaignData.id}`);
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast({
        title: "Error",
        description: `Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Campaign</h1>
          <p className="text-muted-foreground">
            Describe your campaign goals and our AI will generate custom recommendations
          </p>
        </div>
        
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>
              Provide information about your marketing campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="campaignName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Summer 2023 Promotion" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your campaign goals and target audience. For example: 'Promote monsoon travel packages for young professionals aged 25-35 who live in urban areas'"
                          className="min-h-[120px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Be specific about your objectives, target audience, and desired outcomes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. $5,000" {...field} />
                        </FormControl>
                        <FormDescription>
                          Approximate campaign budget
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="primaryChannel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Channel</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select channel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="social">Social Media</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="search">Search</SelectItem>
                            <SelectItem value="display">Display</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="native">Native</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="image">Image Ads</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="carousel">Carousel</SelectItem>
                            <SelectItem value="story">Stories</SelectItem>
                            <SelectItem value="text">Text Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="bg-aviation-lightBlue/40 border border-aviation-blue/20 rounded-lg p-4 text-sm">
                  <p className="font-medium text-aviation-blue mb-2">How This Works</p>
                  <p className="text-gray-700">
                    Our AI will analyze your input and generate:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700">
                    <li>Three targeted micro-cohorts with descriptions and demographics</li>
                    <li>Recommended marketing channels for each cohort</li>
                    <li>Custom creative recommendations (copy and images)</li>
                  </ul>
                </div>
                
                <div className="flex items-center justify-end space-x-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/dashboard")}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-aviation-blue hover:bg-aviation-indigo min-w-[120px]" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Generating..." : "Generate Campaign"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default CreateCampaign;
