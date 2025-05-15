
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Cohort {
  id: string;
  title: string;
  description: string;
  demographics: string;
  estimated_reach: string;
  selected: boolean;
}

interface Campaign {
  id: string;
  title: string;
  prompt: string;
}

const MicroCohorts = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
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
        .select("*")
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
      
      // Format cohorts with selection state
      const formattedCohorts = cohortsData.map(cohort => ({
        ...cohort,
        estimated_reach: getRandomReach(), // Placeholder for estimated reach
        selected: true // Default all cohorts to selected initially
      }));
      
      setCohorts(formattedCohorts);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate a random reach number for demonstration purposes
  const getRandomReach = () => {
    const ranges = [
      "~50K potential reach",
      "~120K potential reach",
      "~200K potential reach",
      "~350K potential reach",
    ];
    return ranges[Math.floor(Math.random() * ranges.length)];
  };
  
  const toggleCohortSelection = (cohortId: string) => {
    setCohorts(prev => 
      prev.map(cohort => 
        cohort.id === cohortId 
          ? { ...cohort, selected: !cohort.selected } 
          : cohort
      )
    );
  };
  
  const handleProceed = async () => {
    const selectedCohorts = cohorts.filter(cohort => cohort.selected);
    
    if (selectedCohorts.length === 0) {
      toast.error("Please select at least one micro cohort");
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Mark which cohorts are selected for further processing
      for (const cohort of cohorts) {
        if (!cohort.selected) {
          // Delete unselected cohorts
          const { error } = await supabase
            .from("micro_cohorts")
            .delete()
            .eq("id", cohort.id);
            
          if (error) {
            console.error("Error deleting cohort:", error);
          }
        }
      }
      
      // Proceed to the image generation page
      navigate(`/generate-creatives/${id}`);
    } catch (error) {
      console.error("Error saving cohort selections:", error);
      toast.error("Failed to save your selections");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500">Loading micro cohorts...</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{campaign?.title}</h1>
          <p className="text-muted-foreground">
            Select the micro cohorts to target in your campaign
          </p>
        </div>
        
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            <span className="font-medium text-indigo-800">Campaign Brief: </span>
            {campaign?.prompt}
          </p>
        </div>
        
        {cohorts.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="bg-yellow-50 p-3 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-yellow-500"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No cohorts generated</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                It looks like we couldn't generate any micro cohorts for this campaign.
              </p>
              <Button 
                onClick={() => navigate("/create-campaign")}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Create New Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cohorts.map((cohort) => (
                <Card 
                  key={cohort.id} 
                  className={`border shadow-sm transition-shadow hover:shadow-md cursor-pointer ${
                    cohort.selected ? 'border-indigo-600 ring-1 ring-indigo-600' : ''
                  }`}
                  onClick={() => toggleCohortSelection(cohort.id)}
                >
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Checkbox
                          checked={cohort.selected}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCohortSelection(cohort.id);
                          }}
                        />
                        <span>{cohort.title}</span>
                      </CardTitle>
                    </div>
                    <div className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                      {cohort.estimated_reach}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">{cohort.description}</p>
                    
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Demographics</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {cohort.demographics.split(',').map((demo, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
                        >
                          {demo.trim()}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-3 flex justify-between text-sm text-gray-500">
                    <div>
                      {cohort.selected ? (
                        <span className="text-indigo-600 font-medium">Selected for campaign</span>
                      ) : (
                        <span>Click to select</span>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-end space-x-4 pt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 min-w-[160px]" 
                onClick={handleProceed}
                disabled={isSaving || cohorts.filter(c => c.selected).length === 0}
              >
                {isSaving ? "Processing..." : "Create Creatives"}
              </Button>
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
};

export default MicroCohorts;
