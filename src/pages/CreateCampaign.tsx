
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  campaignName: z.string().min(3, { message: "Campaign name must be at least 3 characters" }),
  prompt: z.string().min(10, { message: "Please provide a detailed prompt for better results" }),
  budget: z.string().optional(),
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
          primary_channel: "social",
          content_type: "image",
          user_id: user?.id,
          status: "draft"
        })
        .select()
        .single();
      
      if (campaignError) {
        console.error("Error creating campaign:", campaignError);
        toast.error("Failed to create campaign: " + campaignError.message);
        return;
      }
      
      console.log("Campaign created successfully:", campaignData);
      
      // Fetch the user's brand guidelines to include in the OpenAI request
      const { data: brandData, error: brandError } = await supabase
        .from("brand_guidelines")
        .select("*")
        .eq("user_id", user?.id)
        .single();
        
      if (brandError) {
        console.error("Error fetching brand guidelines:", brandError);
      }
      
      // Call the generate-campaign Edge Function to generate content
      const { data: generationData, error: generationError } = await supabase.functions.invoke(
        "generate-campaign",
        {
          body: {
            campaignId: campaignData.id,
            prompt: values.prompt,
            brandGuidelines: brandData || null,
            budget: values.budget || "Not specified"
          }
        }
      );
      
      if (generationError) {
        console.error("Error generating campaign:", generationError);
        toast.error(`Failed to generate campaign: ${generationError.message || 'Unknown error'}`);
        
        // Navigate to the micro-cohorts page anyway, even if generation failed
        navigate(`/micro-cohorts/${campaignData.id}`);
        return;
      }
      
      // Process the generated content from OpenAI
      console.log("Generated content:", generationData);
      
      toast.success("Campaign created successfully!");
      
      // Navigate to the micro-cohorts selection page
      navigate(`/micro-cohorts/${campaignData.id}`);
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error(`Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm">
                  <p className="font-medium text-indigo-800 mb-2">How This Works</p>
                  <p className="text-gray-700">
                    Our AI will analyze your input and generate:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700">
                    <li>Two targeted micro-cohorts with descriptions and demographics</li>
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
                    className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]" 
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
