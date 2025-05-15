
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  brandName: z.string().min(2, { message: "Brand name must be at least 2 characters" }),
  brandTone: z.string().min(1, { message: "Please select a brand tone" }),
  brandVoice: z.string().optional(),
  primaryColor: z.string().regex(/^#([0-9A-F]{6})$/i, { message: "Please enter a valid hex color code" }),
  secondaryColor: z.string().regex(/^#([0-9A-F]{6})$/i, { message: "Please enter a valid hex color code" }),
  sampleTagline: z.string().optional(),
  doNotUse: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const BrandGuidelines = () => {
  const navigate = useNavigate();
  const { user, setHasBrandGuidelines } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandName: "",
      brandTone: "",
      brandVoice: "",
      primaryColor: "#6366F1", // Indigo color
      secondaryColor: "#0EA5E9", // Teal/Sky blue color
      sampleTagline: "",
      doNotUse: "",
    },
  });
  
  async function onSubmit(values: FormValues) {
    try {
      setIsLoading(true);
      
      if (!user) {
        toast.error("You must be logged in to save brand guidelines");
        return;
      }
      
      // Save to Supabase
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
        console.error("Error saving brand guidelines:", error);
        toast.error("Failed to save brand guidelines: " + error.message);
        return;
      }
      
      // Update auth context and local storage for immediate UI feedback
      setHasBrandGuidelines(true);
      localStorage.setItem('hasBrandGuidelines', 'true');
      
      toast.success("Brand guidelines saved successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving brand guidelines:", error);
      toast.error("Failed to save brand guidelines. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Color preview component
  const ColorPreview = ({ color }: { color: string }) => (
    <div
      className="h-6 w-6 rounded-full border border-gray-300"
      style={{ backgroundColor: color }}
    />
  );

  return (
    <div className="min-h-screen bg-[#FAFAFB] py-8">
      <div className="container max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">IR</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">Set Up Your Brand Guidelines</h1>
          <p className="mt-2 text-lg text-gray-600">
            Help us understand your brand to generate more relevant content
          </p>
        </div>
        
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
                        <Input placeholder="e.g. AeroVoyage" {...field} />
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
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                          <SelectItem value="authoritative">Authoritative</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The general tone your brand uses to communicate
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
                          placeholder="e.g. Our brand voice is confident, clear, and approachable" 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Additional details about how your brand communicates
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
                        <FormLabel>Primary Brand Color</FormLabel>
                        <div className="flex gap-3 items-center">
                          <ColorPreview color={field.value} />
                          <FormControl>
                            <Input type="text" {...field} />
                          </FormControl>
                        </div>
                        <FormDescription>
                          Enter a hex color code (e.g. #6366F1)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secondaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Brand Color</FormLabel>
                        <div className="flex gap-3 items-center">
                          <ColorPreview color={field.value} />
                          <FormControl>
                            <Input type="text" {...field} />
                          </FormControl>
                        </div>
                        <FormDescription>
                          Enter a hex color code (e.g. #0EA5E9)
                        </FormDescription>
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
                        <Input placeholder="e.g. Elevate your journey" {...field} />
                      </FormControl>
                      <FormDescription>
                        A typical tagline or slogan your brand uses
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
                          placeholder="e.g. cheap, budget, discount" 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Words or phrases that should be avoided in your marketing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Brand Guidelines"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BrandGuidelines;
