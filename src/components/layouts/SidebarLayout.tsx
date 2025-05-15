
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  User, 
  Settings,
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const { signOut } = useAuth();
  const location = useLocation();
  
  const navItems = [
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: 'Dashboard',
      href: '/dashboard',
    },
    {
      icon: <User className="h-5 w-5" />,
      label: 'Profile',
      href: '/profile', // Not implemented yet
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: 'Settings',
      href: '/settings', // Not implemented yet
    },
  ];

  return (
    <div className="flex min-h-screen bg-aviation-lightGray">
      {/* Sidebar */}
      <div
        className={cn(
          "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
          collapsed ? "w-[70px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center">
              <div className="h-8 w-8 rounded-md bg-aviation-blue flex items-center justify-center">
                <span className="text-white font-bold">IR</span>
              </div>
              <span className="ml-2 font-medium text-lg">IntelliReach</span>
            </Link>
          )}
          {collapsed && (
            <div className="h-8 w-8 rounded-md bg-aviation-blue mx-auto flex items-center justify-center">
              <span className="text-white font-bold">IR</span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  location.pathname === item.href
                    ? "bg-aviation-lightBlue text-aviation-blue"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <div className="flex items-center">
                  {item.icon}
                  {!collapsed && <span className="ml-3">{item.label}</span>}
                </div>
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="p-4 border-t border-gray-200">
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex justify-center text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full text-gray-600"
            >
              Sign Out
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SidebarLayout;
