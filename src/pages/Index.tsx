
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, hasBrandGuidelines } = useAuth();

  useEffect(() => {
    if (loading) {
      // Don't do anything while authentication is loading
      return;
    }
    
    if (!user) {
      // User is not logged in, redirect to login page
      console.log("User not logged in, redirecting to login");
      navigate("/login");
      return;
    }
    
    // User is logged in, check if they've completed brand guidelines
    console.log("User logged in, hasBrandGuidelines:", hasBrandGuidelines);
    if (hasBrandGuidelines) {
      console.log("User has completed brand guidelines, redirecting to dashboard");
      navigate("/dashboard");
    } else {
      console.log("User has not completed brand guidelines, redirecting to brand guidelines");
      navigate("/brand-guidelines");
    }
  }, [user, loading, hasBrandGuidelines, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-aviation-lightGray">
      <div className="w-16 h-16 border-4 border-t-aviation-blue rounded-full animate-spin"></div>
    </div>
  );
};

export default Index;
