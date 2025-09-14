import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  userProfile: any | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithUsername: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, 'session:', session);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
        setLoading(false);
        console.log('Auth state after change - loading set to false');
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserRole(session.user.id);
        }, 0);
      }
      setLoading(false);
      console.log('Initial session check - loading set to false');
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
        setUserProfile(null);
        return;
      }
      
      setUserRole(data?.role || null);
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      setUserProfile(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, role: string = 'doctor') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role
        }
      }
    });
    return { error };
  };

  const signInWithUsername = async (username: string, password: string) => {
    try {
      // First, try to find staff member with this username
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*, profiles!inner(*)')
        .eq('username', username)
        .eq('is_active', true)
        .maybeSingle();

      if (staffError || !staffData) {
        // Try to find doctor with this username (doctor_code)
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('*, profiles!inner(*)')
          .eq('doctor_code', username)
          .eq('is_active', true)
          .maybeSingle();

        if (doctorError || !doctorData) {
          return { error: { message: 'Invalid username or user not found' } };
        }

        // For doctors, create a temporary auth session
        const mockUser = {
          id: doctorData.profiles.user_id,
          email: `${username}@westmed.local`,
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          user_metadata: {
            full_name: doctorData.profiles.full_name,
            role: 'doctor',
            doctor_id: doctorData.id
          }
        } as User;

        const mockSession = {
          user: mockUser,
          access_token: 'mock_token_doctor',
          refresh_token: 'mock_refresh_doctor',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer'
        } as Session;

        setUser(mockUser);
        setSession(mockSession);
        setUserRole('doctor');
        setUserProfile(doctorData.profiles);
        setLoading(false);

        return { error: null };
      }

      // Verify password for staff (you would implement proper password hashing)
      // Note: This is simplified - in production, use proper password hashing
      if (staffData.password_hash !== password) {
        return { error: { message: 'Invalid password' } };
      }

      // Create a temporary auth session for staff
      const mockUser = {
        id: staffData.profiles.user_id,
        email: `${username}@westmed.local`,
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        user_metadata: {
          full_name: staffData.full_name,
          role: staffData.profiles.role,
          staff_id: staffData.id
        }
      } as User;

      const mockSession = {
        user: mockUser,
        access_token: 'mock_token_staff',
        refresh_token: 'mock_refresh_staff',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer'
      } as Session;

      setUser(mockUser);
      setSession(mockSession);
      setUserRole(staffData.profiles.role);
      setUserProfile(staffData.profiles);
      setLoading(false);

      return { error: null };
    } catch (error) {
      console.error('Username sign in error:', error);
      return { error: { message: 'Sign in failed' } };
    }
  };

  const signOut = async () => {
    if (session?.access_token?.startsWith('mock_token')) {
      // Handle mock session logout
      setUser(null);
      setSession(null);
      setUserRole(null);
      setUserProfile(null);
    } else {
      // Handle Supabase logout
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRole,
      userProfile,
      signIn,
      signInWithUsername,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};