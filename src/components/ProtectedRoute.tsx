
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
  
  // If user is not logged in, redirect to login
  if (!user) {
    console.log("Protected route: User not logged in, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  // If user hasn't completed brand guidelines and trying to access a route other than brand-guidelines
  if (!hasBrandGuidelines && location.pathname !== '/brand-guidelines') {
    console.log("Protected route: User hasn't completed brand guidelines, redirecting to brand guidelines");
    return <Navigate to="/brand-guidelines" replace />;
  }
  
  // Special case: If user has completed brand guidelines and tries to access brand-guidelines page
  if (hasBrandGuidelines && location.pathname === '/brand-guidelines') {
    console.log("Protected route: User already has brand guidelines, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }
  
  // User is authenticated and has appropriate access
  return <>{children}</>;
};

export default ProtectedRoute;
