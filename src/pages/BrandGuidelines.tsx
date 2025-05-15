
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import BrandPreview from "@/components/brand/BrandPreview";
import BrandGuidelinesForm from "@/components/brand/BrandGuidelinesForm";
import { BrandGuidelinesFormValues } from "@/components/brand/BrandGuidelinesSchema";
import { saveBrandGuidelines } from "@/services/brandService";

const BrandGuidelines = () => {
  const navigate = useNavigate();
  const { user, setHasBrandGuidelines } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formValues, setFormValues] = useState<BrandGuidelinesFormValues>({
    brandName: "",
    brandTone: "",
    brandVoice: "",
    primaryColor: "#0EA5E9",
    secondaryColor: "#6E59A5",
    sampleTagline: "",
    doNotUse: "",
  });
  
  async function handleSubmit(values: BrandGuidelinesFormValues) {
    try {
      setIsLoading(true);
      setFormValues(values);
      
      if (!user) {
        toast.error("You must be logged in to save brand guidelines");
        return;
      }
      
      await saveBrandGuidelines(user.id, values);
      
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
                <BrandGuidelinesForm onSubmit={handleSubmit} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1">
            <BrandPreview 
              brandName={formValues.brandName}
              brandTone={formValues.brandTone}
              primaryColor={formValues.primaryColor}
              secondaryColor={formValues.secondaryColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandGuidelines;
