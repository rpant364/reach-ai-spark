
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasBrandGuidelines: boolean;
  setHasBrandGuidelines: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasBrandGuidelines, setHasBrandGuidelines] = useState(false);

  useEffect(() => {
    // Check for saved session in local storage
    const savedUser = localStorage.getItem('user');
    const savedBrandGuidelines = localStorage.getItem('hasBrandGuidelines');
    
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setHasBrandGuidelines(savedBrandGuidelines === 'true');
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // For demo purposes, simulating Supabase auth functions
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      // In a real app, this would call supabase.auth.signUp
      const newUser = { 
        id: `user_${Math.random().toString(36).substr(2, 9)}`,
        email, 
        createdAt: new Date().toISOString() 
      };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      setHasBrandGuidelines(false);
      localStorage.setItem('hasBrandGuidelines', 'false');
      toast.success("Account created successfully!");
    } catch (error) {
      console.error('Error signing up:', error);
      toast.error("Failed to create account. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      // In a real app, this would call supabase.auth.signInWithPassword
      // Mock authentication - this is for demo only
      const newUser = { 
        id: `user_${Math.random().toString(36).substr(2, 9)}`,
        email, 
        createdAt: new Date().toISOString() 
      };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      // Check if user has completed brand guidelines
      // This would typically be fetched from Supabase
      const mockHasGuidelines = Math.random() > 0.5;
      setHasBrandGuidelines(mockHasGuidelines);
      localStorage.setItem('hasBrandGuidelines', mockHasGuidelines.toString());
      
      toast.success("Logged in successfully!");
    } catch (error) {
      console.error('Error signing in:', error);
      toast.error("Failed to login. Please check your credentials.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      // In a real app, this would call supabase.auth.signOut
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('hasBrandGuidelines');
      toast.success("Logged out successfully");
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error("Failed to log out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signUp, 
      signIn, 
      signOut,
      hasBrandGuidelines,
      setHasBrandGuidelines
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
