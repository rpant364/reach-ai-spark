
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BrandGuidelines from "./pages/BrandGuidelines";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import CreateCampaign from "./pages/CreateCampaign";
import MicroCohorts from "./pages/MicroCohorts";
import GenerateCreatives from "./pages/GenerateCreatives";
import CampaignReview from "./pages/CampaignReview";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/brand-guidelines" element={
              <ProtectedRoute>
                <BrandGuidelines />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/create-campaign" element={
              <ProtectedRoute>
                <CreateCampaign />
              </ProtectedRoute>
            } />
            <Route path="/micro-cohorts/:id" element={
              <ProtectedRoute>
                <MicroCohorts />
              </ProtectedRoute>
            } />
            <Route path="/generate-creatives/:id" element={
              <ProtectedRoute>
                <GenerateCreatives />
              </ProtectedRoute>
            } />
            <Route path="/campaign-review/:id" element={
              <ProtectedRoute>
                <CampaignReview />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
