import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  userProfile: any | null;
  signInWithUsername: (username: string, password: string) => Promise<{ error: any }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
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


  const signInWithUsername = async (username: string, password: string) => {
    try {
      // First try the old verify_user_login method for existing staff
      const { data, error } = await supabase
        .rpc('verify_user_login', { 
          _username: username, 
          _password: password 
        });

      // If old method succeeds, use it
      if (!error && data && typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const loginResult = data as { 
          error?: string;
          user_type?: string; 
          id?: string; 
          full_name?: string; 
          role?: string; 
        };

        // Check if there's no error and we have valid data
        if (!loginResult.error && loginResult?.user_type && loginResult.id) {
          // Create a mock session for our custom auth system
          const mockUser = {
            id: `${loginResult.user_type}_${loginResult.id}`,
            email: `${username}@westmed.local`,
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            user_metadata: {
              full_name: loginResult.full_name || username,
              role: loginResult.role || 'staff',
              user_type: loginResult.user_type,
              original_id: loginResult.id
            }
          } as User;

          const mockSession = {
            user: mockUser,
            access_token: `custom_token_${loginResult.user_type}_${loginResult.id}`,
            refresh_token: `custom_refresh_${loginResult.user_type}_${loginResult.id}`,
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            token_type: 'bearer'
          } as Session;

          setUser(mockUser);
          setSession(mockSession);
          setUserRole(loginResult.role || 'staff');
          setUserProfile({ 
            role: loginResult.role || 'staff', 
            full_name: loginResult.full_name || username, 
            id: loginResult.id,
            user_type: loginResult.user_type
          });

          return { error: null };
        }
      }

      // If old method fails, try Supabase auth for newly created staff
      // Look up their email from staff table
      const { data: staffData } = await supabase
        .from('staff')
        .select('email, profile_id, full_name, role')
        .eq('username', username)
        .maybeSingle();

      if (staffData?.email) {
        // Try Supabase auth with their email
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: staffData.email,
          password
        });

        if (!authError && authData.user) {
          // Successfully signed in with Supabase auth - handled by onAuthStateChange
          return { error: null };
        }

        // Propagate meaningful error if available (e.g., email not confirmed)
        if (authError) {
          return { error: { message: authError.message || 'Authentication failed' } };
        }
      }

      // All methods failed
      return { error: { message: 'Invalid username or password' } };

    } catch (error) {
      console.error('Username sign in error:', error);
      return { error: { message: 'Sign in failed' } };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Email sign in error:', error);
      return { error: { message: 'Sign in failed' } };
    }
  };

  const signOut = async () => {
    // For Supabase auth users, sign out through Supabase
    if (user?.email && !user.email.includes('@westmed.local')) {
      await supabase.auth.signOut();
    }
    
    // Clear our custom session state
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRole,
      userProfile,
      signInWithUsername,
      signInWithEmail,
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