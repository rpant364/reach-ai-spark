
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, Calendar, Users, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

  // Stats display
  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="bg-white shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded">
              <LayoutDashboard className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-gray-500">Total Campaigns</p>
              <p className="text-2xl font-semibold">{campaigns.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-gray-500">Active Campaigns</p>
              <p className="text-2xl font-semibold">
                {campaigns.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-gray-500">Total Cohorts</p>
              <p className="text-2xl font-semibold">
                {campaigns.reduce((total, campaign) => total + campaign.cohort_count, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
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
        
        <Separator className="my-6" />
        
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
          <>
            <StatsCards />
            
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50 py-4 px-6">
                <CardTitle className="text-lg">Your Campaigns</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-gray-50">
                      <TableHead className="font-medium">Campaign</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium">Created</TableHead>
                      <TableHead className="font-medium">Cohorts</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow 
                        key={campaign.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/campaign-review/${campaign.id}`)}
                      >
                        <TableCell className="font-medium">{campaign.title}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${campaign.status === 'active' ? 'bg-green-100 text-green-800' : 
                              campaign.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'}`}>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(campaign.created_at)}</TableCell>
                        <TableCell>{campaign.cohort_count}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/campaign-review/${campaign.id}`);
                            }}
                          >
                            <ArrowUpRight className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SidebarLayout>
  );
};

export default Dashboard;
