
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  brandName: z.string().min(2, { message: "Brand name must be at least 2 characters" }),
  brandTone: z.string().min(1, { message: "Please select a brand tone" }),
  brandVoice: z.string().optional(),
  primaryColor: z.string().min(1, { message: "Please select a primary color" }),
  secondaryColor: z.string().min(1, { message: "Please select a secondary color" }),
  sampleTagline: z.string().optional(),
  doNotUse: z.string().optional(),
});

const BrandGuidelines = () => {
  const navigate = useNavigate();
  const { user, setHasBrandGuidelines } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandName: "",
      brandTone: "",
      brandVoice: "",
      primaryColor: "#0EA5E9",
      secondaryColor: "#6E59A5",
      sampleTagline: "",
      doNotUse: "",
    },
  });
  
  const watchPrimaryColor = form.watch("primaryColor");
  const watchSecondaryColor = form.watch("secondaryColor");
  const watchBrandName = form.watch("brandName");
  const watchBrandTone = form.watch("brandTone");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      
      if (!user) {
        toast.error("You must be logged in to save brand guidelines");
        return;
      }
      
      // Save to Supabase brand_guidelines table
      const { error } = await supabase
        .from('brand_guidelines')
        .insert({
          user_id: user.id,
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
        return;
      }
      
      // Update auth context and local storage for immediate UI feedback
      setHasBrandGuidelines(true);
      localStorage.setItem('hasBrandGuidelines', 'true');
      
      // Also save to local storage for demo purposes (this can be removed in a production app)
      localStorage.setItem('brandGuidelines', JSON.stringify(values));
      
      toast.success("Brand guidelines saved successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving brand guidelines:", error);
      toast.error("Failed to save brand guidelines. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-aviation-lightGray py-8">
      <div className="container max-w-4xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 rounded-lg bg-aviation-blue flex items-center justify-center">
            <span className="text-white font-bold text-xl">IR</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">Set Up Your Brand Guidelines</h1>
          <p className="mt-2 text-lg text-gray-600">
            Help us understand your brand to generate more relevant content
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Brand Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="brandName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. AeroVista Airlines" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="brandTone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand Tone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a tone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="friendly">Friendly</SelectItem>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="bold">Bold</SelectItem>
                              <SelectItem value="luxury">Luxury</SelectItem>
                              <SelectItem value="playful">Playful</SelectItem>
                              <SelectItem value="technical">Technical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How should your brand come across to customers?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="brandVoice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand Voice (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your brand's voice in more detail"
                              className="min-h-[80px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Specific language patterns or words that represent your brand
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Color</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  className="w-12 h-9 p-1"
                                  {...field}
                                />
                                <Input 
                                  type="text" 
                                  value={field.value} 
                                  onChange={field.onChange}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="secondaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Color</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  className="w-12 h-9 p-1"
                                  {...field}
                                />
                                <Input 
                                  type="text" 
                                  value={field.value} 
                                  onChange={field.onChange}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="sampleTagline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sample Tagline (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Fly Beyond Expectations" {...field} />
                          </FormControl>
                          <FormDescription>
                            A phrase that captures your brand's essence
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="doNotUse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>"Do Not Use" Phrases (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add phrases or terms to avoid, one per line"
                              className="min-h-[100px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Terms or phrases that should be avoided in your marketing
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-aviation-blue hover:bg-aviation-indigo" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Saving..." : "Save & Continue"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1">
            <Card className="border-none shadow-md h-full">
              <CardHeader>
                <CardTitle>Brand Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-6 rounded-lg border border-gray-200" style={{ 
                    background: `linear-gradient(135deg, ${watchPrimaryColor || '#0EA5E9'} 0%, ${watchSecondaryColor || '#6E59A5'} 100%)`,
                  }}>
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                      <h3 className="text-lg font-bold" style={{ color: watchPrimaryColor || '#0EA5E9' }}>
                        {watchBrandName || 'Your Brand Name'}
                      </h3>
                      <p className="text-sm mt-2" style={{ color: watchSecondaryColor || '#6E59A5' }}>
                        {watchBrandTone ? `${watchBrandTone.charAt(0).toUpperCase() + watchBrandTone.slice(1)} tone` : 'Select a brand tone'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm uppercase text-gray-500">Color Palette</h3>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <div className="h-8 rounded-md" style={{ backgroundColor: watchPrimaryColor || '#0EA5E9' }}></div>
                        <p className="text-xs mt-1 text-center">Primary</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-8 rounded-md" style={{ backgroundColor: watchSecondaryColor || '#6E59A5' }}></div>
                        <p className="text-xs mt-1 text-center">Secondary</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Complete the form to set up your brand guidelines and start creating campaigns
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandGuidelines;
