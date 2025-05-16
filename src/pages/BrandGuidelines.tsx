
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BrandGuidelinesForm from "@/components/brand/BrandGuidelinesForm";
import BrandPreview from "@/components/brand/BrandPreview";
import { brandGuidelinesSchema, BrandGuidelinesFormValues, defaultFormValues } from "@/components/brand/BrandGuidelinesSchema";

const BrandGuidelines = () => {
  const navigate = useNavigate();
  const { user, setHasBrandGuidelines } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelinesFormValues>(defaultFormValues);
  const [isNewUser, setIsNewUser] = useState(true);
  
  // Fetch existing brand guidelines when component mounts
  useEffect(() => {
    const fetchBrandGuidelines = async () => {
      try {
        if (!user) return;
        
        const { data, error } = await supabase
          .from('brand_guidelines')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching brand guidelines:", error);
          return;
        }
        
        if (data) {
          setIsNewUser(false);
          // Map database fields to form fields
          setBrandGuidelines({
            brandName: data.brand_name || '',
            brandTone: data.brand_tone || '',
            brandVoice: data.brand_voice || '',
            primaryColor: data.primary_color || defaultFormValues.primaryColor,
            secondaryColor: data.secondary_color || defaultFormValues.secondaryColor,
            sampleTagline: data.sample_tagline || '',
            doNotUse: data.do_not_use_phrases || '',
          });
        }
      } catch (error) {
        console.error("Error fetching brand guidelines:", error);
      }
    };
    
    fetchBrandGuidelines();
  }, [user]);
  
  async function handleSubmit(values: BrandGuidelinesFormValues) {
    try {
      setIsLoading(true);
      
      if (!user) {
        toast.error("You must be logged in to save brand guidelines");
        return;
      }
      
      // Update or create brand guidelines based on whether the user is new
      const operation = isNewUser ? 'insert' : 'update';
      const query = isNewUser 
        ? supabase.from('brand_guidelines').insert({
            user_id: user.id,
            brand_name: values.brandName,
            brand_tone: values.brandTone,
            brand_voice: values.brandVoice || null,
            primary_color: values.primaryColor,
            secondary_color: values.secondaryColor,
            sample_tagline: values.sampleTagline || null,
            do_not_use_phrases: values.doNotUse || null
          })
        : supabase.from('brand_guidelines').update({
            brand_name: values.brandName,
            brand_tone: values.brandTone,
            brand_voice: values.brandVoice || null,
            primary_color: values.primaryColor,
            secondary_color: values.secondaryColor,
            sample_tagline: values.sampleTagline || null,
            do_not_use_phrases: values.doNotUse || null
          }).eq('user_id', user.id);
      
      const { error } = await query;
      
      if (error) {
        console.error(`Error ${operation === 'insert' ? 'saving' : 'updating'} brand guidelines:`, error);
        toast.error(`Failed to ${operation === 'insert' ? 'save' : 'update'} brand guidelines: ${error.message}`);
        return;
      }
      
      // Update auth context and local storage for immediate UI feedback
      setHasBrandGuidelines(true);
      localStorage.setItem('hasBrandGuidelines', 'true');
      
      toast.success(`Brand guidelines ${operation === 'insert' ? 'saved' : 'updated'} successfully!`);
      if (isNewUser) {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error handling brand guidelines:", error);
      toast.error("Failed to save brand guidelines. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // If rendering inside SidebarLayout, wrap with it
  if (window.location.pathname === '/brand-guidelines') {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Brand Guidelines</h1>
            <p className="text-muted-foreground">
              {isNewUser ? "Set up your brand guidelines to generate better content" : "Update your brand guidelines"}
            </p>
          </div>
          
          <Tabs defaultValue="guidelines" className="space-y-4">
            <TabsList>
              <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="guidelines" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{isNewUser ? "Create your brand guidelines" : "Update your brand guidelines"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BrandGuidelinesForm 
                    onSubmit={handleSubmit} 
                    isLoading={isLoading} 
                    initialValues={brandGuidelines}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="preview" className="space-y-4">
              <BrandPreview 
                brandName={brandGuidelines.brandName}
                brandTone={brandGuidelines.brandTone}
                primaryColor={brandGuidelines.primaryColor}
                secondaryColor={brandGuidelines.secondaryColor}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarLayout>
    );
  }

  // Rendering for new users (without sidebar)
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
            <BrandGuidelinesForm 
              onSubmit={handleSubmit} 
              isLoading={isLoading}
              initialValues={brandGuidelines}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BrandGuidelines;
