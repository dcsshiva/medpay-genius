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

// Comprehensive auth state cleanup - clears ALL Supabase auth artifacts + SW + caches
const hardResetAuthState = async () => {
  if (typeof window === 'undefined') return;

  // 1. Clear all Supabase auth keys from both localStorage and sessionStorage
  const clearSupabaseKeys = (storage: Storage) => {
    const keysToRemove = Object.keys(storage).filter(
      (key) => key.startsWith('sb-') || key.includes('supabase')
    );
    keysToRemove.forEach((key) => storage.removeItem(key));
  };

  clearSupabaseKeys(window.localStorage);
  clearSupabaseKeys(window.sessionStorage);

  // Also clear our custom session token
  window.localStorage.removeItem('supabase_session_token');

  // 2. Reset in-memory auth state without network call
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (_) {
    // Ignore - we're already cleaning up
  }

  // 3. Unregister ALL service workers (removes stale SW that may intercept/cache auth traffic)
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
      console.log('[hardReset] Unregistered', registrations.length, 'service worker(s)');
    } catch (_) {
      // Ignore SW cleanup failures
    }
  }

  // 4. Clear ALL browser caches (removes stale cached auth/API responses)
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log('[hardReset] Cleared', cacheNames.length, 'cache(s)');
    } catch (_) {
      // Ignore cache cleanup failures
    }
  }
};

// Alias for backward compatibility
const clearCorruptedSupabaseAuthStorage = hardResetAuthState;

// Helper: detect if an error is a fetch/network failure
const isFetchError = (err: any): boolean => {
  if (!err) return false;
  const msg = err?.message || err?.error_description || String(err);
  return /failed to fetch|networkerror|network request failed|load failed/i.test(msg);
};

// Exported repair function for UI "Fix Login" button
export const repairAuthState = async () => {
  await hardResetAuthState();
  window.location.reload();
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
    // Set up onAuthStateChange FIRST (before getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supaSession) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setUserRole(null);
        setUserProfile(null);
        setUserDesignation(null);
        return;
      }

      if (supaSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setUser(supaSession.user);
        setSession(supaSession);

        // Defer designation fetch to avoid deadlock with Supabase auth
        setTimeout(async () => {
          try {
            const designation = await fetchDesignation(supaSession.user.id);
            if (designation) {
              setUserRole(designation);
              setUserDesignation(designation);
              
              // Get profile info from get_user_complete_profile
              const { data: profileData } = await supabase.rpc('get_user_complete_profile', { _user_id: supaSession.user.id });
              if (profileData && typeof profileData === 'object' && !('error' in profileData)) {
                const p = profileData as any;
                setUserProfile({
                  id: p.id,
                  user_id: p.user_id,
                  full_name: p.full_name,
                  role: designation,
                  user_type: p.designation === 'doctor' ? 'doctor' : 'staff',
                  code: p.code
                });
              }
            }
          } catch (err) {
            console.error('Error fetching designation on auth change:', err);
          }
        }, 0);
      }
    });

    const loadSession = async () => {
      try {
        // Guard: detect broken persisted session before getSession triggers refresh loops
        try {
          const storageKey = Object.keys(window.localStorage).find(
            (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
          );
          if (storageKey) {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                // If refresh_token is obviously broken (too short / missing), nuke it
                if (!parsed?.refresh_token || typeof parsed.refresh_token !== 'string' || parsed.refresh_token.length < 10) {
                  console.warn('Detected malformed persisted auth session — clearing before getSession');
                  await hardResetAuthState();
                }
              } catch {
                // Unparseable JSON — clear it
                console.warn('Unparseable auth storage — clearing');
                await hardResetAuthState();
              }
            }
          }
        } catch (_) {
          // Guard itself should never block login
        }

        // Priority 1: Check for a real Supabase auth session
        let supaSession: Session | null = null;

        try {
          const { data } = await supabase.auth.getSession();
          supaSession = data.session;
        } catch (sessionError: any) {
          if (isFetchError(sessionError)) {
            console.warn('Supabase session refresh failed. Clearing persisted auth state and retrying once.');
            await hardResetAuthState();
            try {
              const { data } = await supabase.auth.getSession();
              supaSession = data.session;
            } catch (_) {
              // Give up — user will land on login page with clean state
              console.warn('Session recovery retry also failed. Starting fresh.');
            }
          } else {
            throw sessionError;
          }
        }
        
        if (supaSession?.user) {
          console.log('Restored real Supabase session for user:', supaSession.user.id);
          setUser(supaSession.user);
          setSession(supaSession);

          // Fetch designation & profile
          const designation = await fetchDesignation(supaSession.user.id);
          if (designation) {
            setUserRole(designation);
            setUserDesignation(designation);
            
            const { data: profileData } = await supabase.rpc('get_user_complete_profile', { _user_id: supaSession.user.id });
            if (profileData && typeof profileData === 'object' && !('error' in profileData)) {
              const p = profileData as any;
              setUserProfile({
                id: p.id,
                user_id: p.user_id,
                full_name: p.full_name,
                role: designation,
                user_type: p.designation === 'doctor' ? 'doctor' : 'staff',
                code: p.code
              });
            }
          } else {
            // Fallback to profiles table
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', supaSession.user.id)
              .maybeSingle();
            if (profile) {
              setUserRole(profile.role);
              setUserProfile(profile);
            }
          }
          setLoading(false);
          return;
        }

        // Priority 2: Fall back to custom user_sessions (legacy username/password logins)
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
              auth_user_id: sessionData.user_id
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

    return () => {
      subscription.unsubscribe();
    };
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
      
      if (error) {
        // If it's a fetch error, try recovery once then retry
        if (isFetchError(error)) {
          console.warn('OTP send hit fetch error, running auth recovery and retrying once...');
          await hardResetAuthState();
          const { error: retryError } = await supabase.auth.signInWithOtp({
            email: email,
            options: { shouldCreateUser: false }
          });
          if (retryError) return { error: { message: "Couldn't reach sign-in service. Please check your connection and try again." } };
          return { error: null };
        }
        return { error };
      }
      return { error: null };
    } catch (error: any) {
      if (isFetchError(error)) {
        console.warn('OTP send threw fetch error, running auth recovery and retrying once...');
        await hardResetAuthState();
        try {
          const { error: retryError } = await supabase.auth.signInWithOtp({
            email: email,
            options: { shouldCreateUser: false }
          });
          if (retryError) return { error: { message: "Couldn't reach sign-in service after recovery. Please try again." } };
          return { error: null };
        } catch (_) {
          return { error: { message: "Sign-in service unreachable. Please check your internet connection." } };
        }
      }
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
          setUserDesignation(designation.designation);
          
          // Fetch full profile to determine user_type
          let userType = 'staff';
          let fullName = email;
          try {
            const { data: profileData } = await supabase.rpc('get_user_complete_profile', { _user_id: data.user.id });
            if (profileData && typeof profileData === 'object' && !('error' in profileData)) {
              const p = profileData as any;
              userType = p.designation === 'doctor' ? 'doctor' : 'staff';
              fullName = p.full_name || email;
            }
          } catch (profileErr) {
            console.error('Failed to fetch complete profile:', profileErr);
          }
          
          setUserProfile({
            id: data.user.id,
            user_id: data.user.id,
            full_name: fullName,
            role: designation.designation,
            user_type: userType
          });
          
          try {
            await createUserSession({
              user_type: userType,
              original_id: data.user.id,
              user_id: data.user.id,
              username: email,
              full_name: fullName,
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
      
      // Always sign out from Supabase auth to clear persistent session
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setUser(null);
      setSession(null);
      setUserRole(null);
      setUserProfile(null);
      setUserDesignation(null);
    }
  };

  const sendMobileOTP = async (mobile: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { mobile }
      });

      if (error) {
        if (isFetchError(error)) {
          console.warn('Mobile OTP send hit fetch error, running auth recovery and retrying...');
          await hardResetAuthState();
          const { data: retryData, error: retryError } = await supabase.functions.invoke('send-otp', {
            body: { mobile }
          });
          if (retryError) return { error: { message: "Couldn't reach OTP service. Please check your connection." } };
          if (!retryData?.success) return { error: { message: retryData?.error || 'Failed to send OTP after recovery' } };
          return { error: null };
        }
        throw error;
      }
      if (!data.success) throw new Error(data.error || 'Failed to send OTP');

      return { error: null };
    } catch (error: any) {
      console.error('Send mobile OTP error:', error);
      if (isFetchError(error)) {
        await hardResetAuthState();
        return { error: { message: "OTP service unreachable. Login state has been reset — please try again." } };
      }
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
      const hashedToken = data.hashed_token;

      // If we have a hashed_token, establish a real Supabase Auth session
      if (hashedToken) {
        const { data: authData, error: authError } = await supabase.auth.verifyOtp({
          token_hash: hashedToken,
          type: 'magiclink'
        });

        if (authError) {
          console.error('Failed to establish Supabase auth session:', authError);
          throw new Error('Authentication failed. Please try again.');
        }

        if (authData.user && authData.session) {
          // Real Supabase session established - same flow as email OTP
          setUser(authData.user);
          setSession(authData.session);
          console.log('Mobile OTP: Real Supabase session established for user:', authData.user.id);

          // Fetch designation from user_designations
          const { data: designation } = await supabase
            .from('user_designations')
            .select('designation')
            .eq('user_id', authData.user.id)
            .maybeSingle();

          const role = designation?.designation || userData?.role || 'staff';
          setUserRole(role);
          setUserDesignation(designation?.designation || null);
          setUserProfile({
            id: userData?.id || authData.user.id,
            user_id: authData.user.id,
            full_name: userData?.full_name || authData.user.email || mobile,
            role: role,
            user_type: userData?.user_type
          });

          try {
            await createUserSession({
              user_type: userData?.user_type || 'mobile_otp',
              original_id: userData?.id || authData.user.id,
              user_id: authData.user.id,
              username: mobile,
              full_name: userData?.full_name || authData.user.email || mobile,
              role: role
            });
          } catch (e: any) {
            console.error('createUserSession failed (mobile OTP):', e?.message || e);
          }

          return { error: null };
        }
      }

      // Fallback: if no hashed_token (shouldn't happen normally)
      if (userData) {
        console.warn('Mobile OTP: No hashed_token received, falling back to pseudo-session');
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
          console.error('createUserSession failed (mobile OTP fallback):', e?.message || e);
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