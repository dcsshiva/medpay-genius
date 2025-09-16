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
      // First verify login credentials using our RPC function
      const { data, error } = await supabase
        .rpc('verify_user_login', { 
          _username: username, 
          _password: password 
        });

      if (error) {
        console.error('RPC error:', error);
        return { error: { message: 'Authentication failed' } };
      }

      // Type assertion for the returned data
      const loginResult = data as { 
        error?: string; 
        user_type?: string; 
        id?: string; 
        full_name?: string; 
        role?: string; 
      } | null;

      if (loginResult?.error) {
        if (loginResult.error === 'not_found') {
          return { error: { message: 'Invalid username or user not found' } };
        } else if (loginResult.error === 'invalid_password') {
          return { error: { message: 'Invalid password' } };
        }
        return { error: { message: 'Authentication failed' } };
      }

      if (!loginResult?.user_type || !loginResult.id) {
        return { error: { message: 'Invalid response from server' } };
      }

      // Sign in anonymously to create a real auth session
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError || !authData.user) {
        console.error('Anonymous auth error:', authError);
        return { error: { message: 'Failed to create session' } };
      }

      // Link the anonymous user to the profile for RLS access
      const { error: linkError } = await supabase.rpc('link_profile_to_user', {
        _user_type: loginResult.user_type,
        _original_id: loginResult.id,
        _auth_user_id: authData.user.id
      });

      if (linkError) {
        console.error('Profile linking error:', linkError);
        // Still proceed as the auth session is valid
      }

      // Set user metadata for our app
      setUserRole(loginResult.role || 'staff');
      setUserProfile({ 
        role: loginResult.role || 'staff', 
        full_name: loginResult.full_name || username, 
        id: loginResult.id,
        user_type: loginResult.user_type
      });

      return { error: null };
    } catch (error) {
      console.error('Username sign in error:', error);
      return { error: { message: 'Sign in failed' } };
    }
  };

  const signOut = async () => {
    // Sign out from Supabase to clear the session
    await supabase.auth.signOut();
    
    // Clear local state
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