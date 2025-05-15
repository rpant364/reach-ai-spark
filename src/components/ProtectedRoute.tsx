
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, hasBrandGuidelines } = useAuth();
  
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
  
  // If user hasn't completed brand guidelines, redirect them
  if (!hasBrandGuidelines && window.location.pathname !== '/brand-guidelines') {
    return <Navigate to="/brand-guidelines" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
