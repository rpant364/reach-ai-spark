
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Campaign {
  id: string;
  title: string;
  created_at: string;
  status: string;
  cohort_count: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      
      // Fetch campaigns with count of cohorts
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          id, 
          title, 
          created_at, 
          status,
          micro_cohorts (count)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching campaigns:", error);
        return;
      }
      
      // Format the data to include cohort count
      const formattedCampaigns = data.map(campaign => ({
        id: campaign.id,
        title: campaign.title,
        created_at: campaign.created_at,
        status: campaign.status,
        cohort_count: campaign.micro_cohorts.length > 0 ? campaign.micro_cohorts[0].count : 0
      }));
      
      setCampaigns(formattedCampaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    navigate("/create-campaign");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Empty state display
  const EmptyState = () => (
    <div className="text-center py-10">
      <div className="bg-indigo-100 p-3 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
        <LayoutDashboard className="h-6 w-6 text-indigo-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No campaigns yet</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Create your first campaign to get started with AI-powered marketing recommendations.
      </p>
      <Button 
        onClick={handleCreateCampaign}
        className="bg-indigo-600 hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Campaign
      </Button>
    </div>
  );

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your marketing campaigns
            </p>
          </div>
          <Button 
            onClick={handleCreateCampaign}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <EmptyState />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{campaign.title}</CardTitle>
                  <CardDescription className="flex justify-between">
                    <span>Created {formatDate(campaign.created_at)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                      ${campaign.status === 'active' ? 'bg-green-100 text-green-800' : 
                        campaign.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-sm text-gray-500">
                    {campaign.cohort_count} micro {campaign.cohort_count === 1 ? 'cohort' : 'cohorts'}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/campaign-review/${campaign.id}`)}
                  >
                    View
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default Dashboard;
