
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, hasBrandGuidelines } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-subtle text-aviation-indigo">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If user hasn't completed brand guidelines and trying to access a different page
  if (!hasBrandGuidelines && location.pathname !== '/brand-guidelines') {
    console.log("Redirecting to brand guidelines. Current path:", location.pathname);
    return <Navigate to="/brand-guidelines" replace />;
  }
  
  // If user has completed brand guidelines and tries to access brand-guidelines page
  if (hasBrandGuidelines && location.pathname === '/brand-guidelines') {
    console.log("User already has brand guidelines, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
