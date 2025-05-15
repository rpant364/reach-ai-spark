
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasBrandGuidelines, setHasBrandGuidelines] = useState(false);

  useEffect(() => {
    // Check localStorage for brand guidelines status first (for immediate UI feedback)
    const storedBrandGuidelines = localStorage.getItem('hasBrandGuidelines');
    if (storedBrandGuidelines === 'true') {
      setHasBrandGuidelines(true);
    }

    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Always check Supabase for the source of truth
          checkBrandGuidelines(session.user.id);
        } else {
          // Reset brand guidelines status when signed out
          setHasBrandGuidelines(false);
          localStorage.removeItem('hasBrandGuidelines');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkBrandGuidelines(session.user.id);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check if user has completed brand guidelines
  const checkBrandGuidelines = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('brand_guidelines')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {  // PGRST116 is "no rows returned"
        console.error('Error checking brand guidelines:', error);
        setHasBrandGuidelines(false);
      } else {
        const hasGuidelines = !!data;
        setHasBrandGuidelines(hasGuidelines);
        // Set localStorage for immediate UI feedback on page reloads
        localStorage.setItem('hasBrandGuidelines', hasGuidelines.toString());
      }
    } catch (error) {
      console.error('Error checking brand guidelines:', error);
      setHasBrandGuidelines(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        toast.error(error.message);
        throw error;
      }
      
      toast.success("Account created successfully! Please check your email for verification.");
    } catch (error: any) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error(error.message);
        throw error;
      }
      
      toast.success("Logged in successfully!");
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(error.message);
        throw error;
      }
      
      setHasBrandGuidelines(false);
      toast.success("Logged out successfully");
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
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
