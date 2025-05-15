
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, hasBrandGuidelines } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // If user is logged in, redirect to the appropriate page
        if (hasBrandGuidelines) {
          navigate("/dashboard");
        } else {
          navigate("/brand-guidelines");
        }
      } else {
        // If no user, redirect to login
        navigate("/login");
      }
    }
  }, [user, loading, hasBrandGuidelines, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-aviation-lightGray">
      <div className="w-16 h-16 border-4 border-t-aviation-blue rounded-full animate-spin"></div>
    </div>
  );
};

export default Index;
