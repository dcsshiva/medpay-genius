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

// Session storage functions - all data stored in Supabase
const createUserSession = async (sessionData: {
  user_type: string;
  original_id: string;
  username: string;
  full_name: string;
  role: string;
}) => {
  const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  // Set timeout duration based on role
  const timeoutDuration = ['admin', 'manager'].includes(sessionData.role) ? 300 : 180;

  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      user_id: sessionData.original_id,
      user_type: sessionData.user_type,
      original_id: sessionData.original_id,
      session_token: sessionToken,
      refresh_token: refreshToken,
      username: sessionData.username,
      full_name: sessionData.full_name,
      role: sessionData.role,
      expires_at: expiresAt.toISOString(),
      idle_timeout_seconds: timeoutDuration,
      last_activity_at: new Date().toISOString(),
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  
  // Store session token in a way that persists across page refreshes
  window.sessionStorage.setItem('supabase_session_token', sessionToken);
  return data;
};

const getActiveSession = async () => {
  const sessionToken = window.sessionStorage.getItem('supabase_session_token');
  if (!sessionToken) return null;

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    window.sessionStorage.removeItem('supabase_session_token');
    return null;
  }

  return data;
};

const invalidateSession = async (sessionToken?: string) => {
  const token = sessionToken || window.sessionStorage.getItem('supabase_session_token');
  if (!token) return;

  await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('session_token', token);

  window.sessionStorage.removeItem('supabase_session_token');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  // Load session from Supabase on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionData = await getActiveSession();
        if (sessionData) {
          const mockUser = {
            id: sessionData.user_id,
            email: `${sessionData.username}@westmed.local`,
            app_metadata: {},
            aud: 'authenticated',
            created_at: sessionData.created_at,
            user_metadata: {
              full_name: sessionData.full_name,
              role: sessionData.role,
              user_type: sessionData.user_type,
              original_id: sessionData.original_id
            }
          } as User;

          const mockSession = {
            user: mockUser,
            access_token: sessionData.session_token,
            refresh_token: sessionData.refresh_token || '',
            expires_in: Math.floor((new Date(sessionData.expires_at).getTime() - Date.now()) / 1000),
            expires_at: Math.floor(new Date(sessionData.expires_at).getTime() / 1000),
            token_type: 'bearer'
          } as Session;

          setUser(mockUser);
          setSession(mockSession);
          setUserRole(sessionData.role);
          setUserProfile({
            role: sessionData.role,
            full_name: sessionData.full_name,
            id: sessionData.original_id,
            user_type: sessionData.user_type
          });
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      // Clean up any existing sessions first
      await invalidateSession();

      // Try legacy/custom auth via RPC
      const { data, error } = await supabase
        .rpc('verify_user_login', { 
          _username: username, 
          _password: password 
        });

      if (!error && data && typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const loginResult = data as { 
          error?: string;
          user_type?: string; 
          id?: string; 
          full_name?: string; 
          role?: string; 
        };

        if (!loginResult.error && loginResult?.user_type && loginResult.id) {
          // Create session in Supabase
          const sessionData = await createUserSession({
            user_type: loginResult.user_type,
            original_id: loginResult.id,
            username: username,
            full_name: loginResult.full_name || username,
            role: loginResult.role || 'staff'
          });

          // Create user and session objects
          const mockUser = {
            id: sessionData.user_id,
            email: `${username}@westmed.local`,
            app_metadata: {},
            aud: 'authenticated',
            created_at: sessionData.created_at,
            user_metadata: {
              full_name: sessionData.full_name,
              role: sessionData.role,
              user_type: sessionData.user_type,
              original_id: sessionData.original_id
            }
          } as User;

          const mockSession = {
            user: mockUser,
            access_token: sessionData.session_token,
            refresh_token: sessionData.refresh_token || '',
            expires_in: Math.floor((new Date(sessionData.expires_at).getTime() - Date.now()) / 1000),
            expires_at: Math.floor(new Date(sessionData.expires_at).getTime() / 1000),
            token_type: 'bearer'
          } as Session;

          setUser(mockUser);
          setSession(mockSession);
          setUserRole(sessionData.role);
          setUserProfile({
            role: sessionData.role,
            full_name: sessionData.full_name,
            id: sessionData.original_id,
            user_type: sessionData.user_type
          });

          return { error: null };
        }
      }

      // Fallback to Supabase auth for staff with email accounts
      const { data: emailData } = await supabase
        .rpc('get_staff_auth_email', { _username: username });

      if (emailData) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailData,
          password
        });

        if (!authError && authData.user) {
          // For Supabase auth users, we still store session in our table for consistency
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', authData.user.id)
            .maybeSingle();

          if (profile) {
            await createUserSession({
              user_type: 'supabase_auth',
              original_id: authData.user.id,
              username: emailData,
              full_name: profile.full_name || emailData,
              role: profile.role || 'staff'
            });

            setUser(authData.user);
            setSession(authData.session);
            setUserRole(profile.role);
            setUserProfile(profile);
          }

          return { error: null };
        }

        if (authError) {
          return { error: { message: authError.message || 'Authentication failed' } };
        }
      }

      return { error: { message: 'Invalid username or password' } };

    } catch (error) {
      console.error('Username sign in error:', error);
      return { error: { message: 'Sign in failed' } };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await invalidateSession();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profile) {
          await createUserSession({
            user_type: 'supabase_auth',
            original_id: data.user.id,
            username: email,
            full_name: profile.full_name || email,
            role: profile.role || 'staff'
          });

          setUser(data.user);
          setSession(data.session);
          setUserRole(profile.role);
          setUserProfile(profile);
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error('Email sign in error:', error);
      return { error: { message: 'Sign in failed' } };
    }
  };

  const signOut = async () => {
    try {
      await invalidateSession();
      
      // Also sign out from Supabase auth if it's a Supabase user
      if (user?.email && !user.email.includes('@westmed.local')) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setUser(null);
      setSession(null);
      setUserRole(null);
      setUserProfile(null);
    }
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