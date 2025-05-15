
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

// Mock campaign data for demonstration
interface Campaign {
  id: string;
  title: string;
  createdAt: string;
  status: "draft" | "active" | "completed" | "archived";
  description?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch campaigns - in a real app, this would call Supabase
    const fetchCampaigns = async () => {
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock data
        const mockCampaigns: Campaign[] = [
          {
            id: "camp_1",
            title: "Summer Travel Promotion",
            createdAt: "2023-05-10T10:30:00Z",
            status: "active",
            description: "Promoting summer travel packages for young professionals",
          },
          {
            id: "camp_2",
            title: "Business Class Experience",
            createdAt: "2023-04-22T14:15:00Z",
            status: "completed",
            description: "Highlighting premium services for business travelers",
          },
          {
            id: "camp_3",
            title: "Holiday Season Deals",
            createdAt: "2023-06-01T09:45:00Z",
            status: "draft",
            description: "Special offers for the upcoming holiday season",
          },
        ];

        setCampaigns(mockCampaigns);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
        toast.error("Failed to load campaigns");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const handleCreateCampaign = () => {
    navigate("/create-campaign");
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      // In a real app, this would delete from Supabase
      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== id));
      toast.success("Campaign deleted successfully");
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getStatusColor = (status: Campaign["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground">
              Manage and analyze your marketing campaigns
            </p>
          </div>
          <Button 
            onClick={handleCreateCampaign}
            className="bg-aviation-blue hover:bg-aviation-indigo"
          >
            Create New Campaign
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border shadow-sm overflow-hidden">
                <CardHeader className="p-6 bg-gray-50">
                  <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse-subtle"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse-subtle mt-2"></div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-gray-100 rounded animate-pulse-subtle"></div>
                    <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse-subtle"></div>
                    <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse-subtle"></div>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse-subtle"></div>
                    <div className="flex space-x-2">
                      <div className="h-9 w-9 bg-gray-200 rounded animate-pulse-subtle"></div>
                      <div className="h-9 w-9 bg-gray-200 rounded animate-pulse-subtle"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-aviation-lightBlue flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6 text-aviation-blue"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <CardTitle className="text-xl mb-2">No campaigns yet</CardTitle>
              <CardDescription className="mb-6">
                Create your first campaign to get started
              </CardDescription>
              <Button 
                onClick={handleCreateCampaign}
                className="bg-aviation-blue hover:bg-aviation-indigo"
              >
                Create New Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="border shadow-sm overflow-hidden">
                <CardHeader className="p-6 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <CardTitle>{campaign.title}</CardTitle>
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(campaign.status)}`}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </div>
                  </div>
                  <CardDescription>
                    Created on {formatDate(campaign.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-6">
                    {campaign.description || "No description provided."}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/campaign-review/${campaign.id}`)}
                    >
                      View Details
                    </Button>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => navigate(`/create-campaign?edit=${campaign.id}`)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
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
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteCampaign(campaign.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-trash"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default Dashboard;
