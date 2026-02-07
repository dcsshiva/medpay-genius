import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toISOStringIST } from '@/lib/dateUtils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  userProfile: any | null;
  userDesignation: 'super_admin' | 'admin' | 'manager' | 'supervisor' | 'doctor' | 'staff' | null;
  signInWithUsername: (username: string, password: string) => Promise<{ error: any }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signInWithOTP: (email: string) => Promise<{ error: any }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: any }>;
  sendMobileOTP: (mobile: string) => Promise<{ error: any }>;
  verifyMobileOTP: (mobile: string, otp: string) => Promise<{ error: any }>;
  getUserEmail: (username: string, userType: 'staff' | 'doctor') => Promise<{ email: string | null; error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session storage functions - all data stored in Supabase
const createUserSession = async (sessionData: {
  user_type: string;
  original_id: string;
  user_id: string;  // Added: auth user id
  username: string;
  full_name: string;
  role: string;
}) => {
  const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  // Set timeout duration based on role
  const timeoutDuration = ['admin', 'manager'].includes(sessionData.role) ? 300 : 180;

  // Store user_id (auth user id) instead of original_id to match RLS policies
  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      user_id: sessionData.user_id,  // Changed: Use auth user_id from verify_user_login
      user_type: sessionData.user_type,
      original_id: sessionData.original_id,
      session_token: sessionToken,
      refresh_token: refreshToken,
      username: sessionData.username,
      full_name: sessionData.full_name,
      role: sessionData.role,
      expires_at: expiresAt.toISOString(),
      idle_timeout_seconds: timeoutDuration,
      last_activity_at: toISOStringIST(),
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  
  // Store session token in localStorage so it persists across page refreshes
  window.localStorage.setItem('supabase_session_token', sessionToken);
  return data;
};

const getActiveSession = async () => {
  const sessionToken = window.localStorage.getItem('supabase_session_token');
  if (!sessionToken) return null;

  // Use SECURITY DEFINER RPC to bypass RLS - works even without auth.uid()
  const { data, error } = await supabase
    .rpc('get_session_by_token', { _token: sessionToken });

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    window.localStorage.removeItem('supabase_session_token');
    return null;
  }

  // RPC returns a table (array), take first row
  return Array.isArray(data) ? data[0] : data;
};

const invalidateSession = async (sessionToken?: string) => {
  const token = sessionToken || window.localStorage.getItem('supabase_session_token');
  if (!token) return;

  // Use SECURITY DEFINER RPC to bypass RLS
  await supabase.rpc('invalidate_session_by_token', { _token: token });

  window.localStorage.removeItem('supabase_session_token');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userDesignation, setUserDesignation] = useState<'super_admin' | 'admin' | 'manager' | 'supervisor' | 'doctor' | 'staff' | null>(null);

  // Fetch user designation from user_designations table
  const fetchDesignation = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_designations')
        .select('designation')
        .eq('user_id', userId)
        .single();
      
      if (!error && data) {
        return data.designation;
      }
    } catch (error) {
      console.error('Error fetching designation:', error);
    }
    return null;
  };

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
              original_id: sessionData.original_id,
              auth_user_id: sessionData.user_id // Store auth_user_id for RPC calls
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

          // Fetch designation
          const designation = await fetchDesignation(sessionData.user_id);

          setUser(mockUser);
          setSession(mockSession);
          setUserRole(sessionData.role);
          setUserDesignation(designation);
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
          user_id?: string;
          full_name?: string; 
          role?: string; 
        };

        if (!loginResult.error && loginResult?.user_type && loginResult.id) {
          // Try to create a tracked session in DB; if it fails, fall back to local mock session
          try {
            const sessionData = await createUserSession({
              user_type: loginResult.user_type,
              original_id: loginResult.id,
              user_id: loginResult.user_id || loginResult.id,  // Changed: Pass auth user_id
              username: username,
              full_name: loginResult.full_name || username,
              role: loginResult.role || 'staff'
            });

            // Create user and session objects from DB session
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
                original_id: sessionData.original_id,
                auth_user_id: loginResult.user_id // Store auth_user_id for RPC calls
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

            // Fetch designation
            const designation = await fetchDesignation(sessionData.user_id);
            
            setUser(mockUser);
            setSession(mockSession);
            setUserRole(sessionData.role);
            setUserDesignation(designation);
            setUserProfile({
              role: sessionData.role,
              full_name: sessionData.full_name,
              id: sessionData.original_id,
              user_type: sessionData.user_type
            });

            return { error: null };
          } catch (e: any) {
            console.error('createUserSession failed:', e?.message || e);
            // Fallback: still log the user in locally so the app is usable
            const fallbackUser = {
              id: loginResult.id,
              email: `${username}@westmed.local`,
              app_metadata: {},
              aud: 'authenticated',
              created_at: toISOStringIST(),
              user_metadata: {
                full_name: loginResult.full_name || username,
                role: loginResult.role || 'staff',
                user_type: loginResult.user_type,
                original_id: loginResult.id,
                auth_user_id: loginResult.user_id // Store auth_user_id for RPC calls
              }
            } as User;

            const expAt = Date.now() + 24 * 60 * 60 * 1000;
            const fallbackSession = {
              user: fallbackUser,
              access_token: `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
              refresh_token: `refresh_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
              expires_in: Math.floor((expAt - Date.now()) / 1000),
              expires_at: Math.floor(expAt / 1000),
              token_type: 'bearer'
            } as Session;

            setUser(fallbackUser);
            setSession(fallbackSession);
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
              user_id: authData.user.id,  // Changed: Pass auth user_id
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

      if (data.user && data.session) {
        // Set user and session immediately
        setUser(data.user);
        setSession(data.session);
        
        // Priority 1: Check user_designations (source of truth)
        const { data: designation } = await supabase
          .from('user_designations')
          .select('designation')
          .eq('user_id', data.user.id)
          .maybeSingle();

      if (designation?.designation) {
        // Use designation for both role and designation
        setUserRole(designation.designation);
        setUserDesignation(designation.designation);
        setUserProfile({
          id: data.user.id,
          user_id: data.user.id,
          full_name: email,
          role: designation.designation
        });
          
          try {
            await createUserSession({
              user_type: 'supabase_auth',
              original_id: data.user.id,
              user_id: data.user.id,
              username: email,
              full_name: email,
              role: designation.designation
            });
          } catch (e: any) {
            console.error('createUserSession (email) failed:', e?.message || e);
          }
        } else {
          // Priority 2: Check profiles table as fallback
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (profile) {
            // Profile exists, use it
            setUserRole(profile.role);
            setUserDesignation(null);
            setUserProfile(profile);

            try {
              await createUserSession({
                user_type: 'supabase_auth',
                original_id: data.user.id,
                user_id: data.user.id,
                username: email,
                full_name: profile.full_name || email,
                role: profile.role || 'staff'
              });
            } catch (e: any) {
              console.error('createUserSession (email) failed:', e?.message || e);
            }
          } else {
            // Priority 3: Default to staff
            console.warn('No designation or profile found for user, using defaults');
            setUserRole('staff');
            setUserProfile({
              id: data.user.id,
              user_id: data.user.id,
              full_name: email,
              role: 'staff'
            });
            
            try {
              await createUserSession({
                user_type: 'supabase_auth',
                original_id: data.user.id,
                user_id: data.user.id,
                username: email,
                full_name: email,
                role: 'staff'
              });
            } catch (e: any) {
              console.error('createUserSession (email, no profile) failed:', e?.message || e);
            }
          }
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error('Email sign in error:', error);
      return { error: { message: 'Sign in failed' } };
    }
  };

  const getUserEmail = async (username: string, userType: 'staff' | 'doctor') => {
    try {
      if (userType === 'staff') {
        const { data, error } = await supabase
          .rpc('get_staff_auth_email', { _username: username });
        
        if (error) return { email: null, error };
        if (!data) return { email: null, error: { message: 'No email found for this user' } };
        
        return { email: data, error: null };
      } else {
        const { data, error } = await supabase
          .rpc('get_doctor_auth_email', { _doctor_code: username });
        
        if (error) return { email: null, error };
        if (!data) return { email: null, error: { message: 'No email found for this user' } };
        
        return { email: data, error: null };
      }
    } catch (error: any) {
      return { email: null, error: { message: error.message || 'Failed to fetch email' } };
    }
  };

  const signInWithOTP = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: { 
          shouldCreateUser: false
        }
      });
      
      if (error) return { error };
      return { error: null };
    } catch (error: any) {
      return { error: { message: 'Failed to send OTP' } };
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    try {
      await invalidateSession();
      
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });
      
      if (error) return { error };
      
      if (data.user && data.session) {
        // Set user and session immediately
        setUser(data.user);
        setSession(data.session);
        console.log('OTP verified, user set:', data.user.id);
        
        // Priority 1: Check user_designations (source of truth)
        const { data: designation } = await supabase
          .from('user_designations')
          .select('designation')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (designation?.designation) {
          // Use designation as role
          setUserRole(designation.designation);
          setUserProfile({
            id: data.user.id,
            user_id: data.user.id,
            full_name: email,
            role: designation.designation
          });
          
          try {
            await createUserSession({
              user_type: 'supabase_auth',
              original_id: data.user.id,
              user_id: data.user.id,
              username: email,
              full_name: email,
              role: designation.designation
            });
          } catch (e: any) {
            console.error('createUserSession failed (OTP):', e?.message || e);
          }
        } else {
          // Priority 2: Check profiles table as fallback
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();
          
          if (profile) {
            // Profile exists, use it
            setUserRole(profile.role);
            setUserProfile(profile);
            
            try {
              await createUserSession({
                user_type: 'supabase_auth',
                original_id: data.user.id,
                user_id: data.user.id,
                username: email,
                full_name: profile.full_name || email,
                role: profile.role || 'staff'
              });
            } catch (e: any) {
              console.error('createUserSession failed (OTP):', e?.message || e);
            }
          } else {
            // Priority 3: Default to staff
            console.warn('No designation or profile found for user, using defaults');
            setUserRole('staff');
            setUserProfile({
              id: data.user.id,
              user_id: data.user.id,
              full_name: email,
              role: 'staff'
            });
            
            try {
              await createUserSession({
                user_type: 'supabase_auth',
                original_id: data.user.id,
                user_id: data.user.id,
                username: email,
                full_name: email,
                role: 'staff'
              });
            } catch (e: any) {
              console.error('createUserSession failed (OTP, no profile):', e?.message || e);
            }
          }
        }
      }
      
      return { error: null };
    } catch (error: any) {
      return { error: { message: 'OTP verification failed' } };
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

  const sendMobileOTP = async (mobile: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { mobile }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send OTP');

      return { error: null };
    } catch (error: any) {
      console.error('Send mobile OTP error:', error);
      return { error: { message: error.message || 'Failed to send OTP' } };
    }
  };

  const verifyMobileOTP = async (mobile: string, otp: string) => {
    try {
      await invalidateSession();

      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { mobile, otp }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to verify OTP');

      const userData = data.user;
      
      // Create session using the returned user data
      if (userData) {
        // Set a pseudo user object for our session
        const pseudoUser: any = {
          id: userData.user_id,
          email: userData.email || `${mobile}@westmed.local`,
          user_metadata: {
            full_name: userData.full_name,
            role: userData.role
          }
        };
        
        setUser(pseudoUser);
        setSession({ user: pseudoUser } as Session);
        setUserRole(userData.role);
        setUserProfile({
          id: userData.id,
          user_id: userData.user_id,
          full_name: userData.full_name,
          role: userData.role
        });

        try {
          await createUserSession({
            user_type: userData.user_type,
            original_id: userData.id,
            user_id: userData.user_id,
            username: mobile,
            full_name: userData.full_name,
            role: userData.role
          });
        } catch (e: any) {
          console.error('createUserSession failed (mobile OTP):', e?.message || e);
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error('Verify mobile OTP error:', error);
      return { error: { message: error.message || 'Failed to verify OTP' } };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRole,
      userProfile,
      userDesignation,
      signInWithUsername,
      signInWithEmail,
      signInWithOTP,
      verifyOTP,
      sendMobileOTP,
      verifyMobileOTP,
      getUserEmail,
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