import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { checkSupabaseReachable } from '@/lib/connectivityCheck';
import {
  createUserSession,
  getActiveSession,
  invalidateSession,
  hardResetAuthState,
  isFetchError,
} from '@/lib/auth/sessionManager';
import { fetchDesignation, resolveFullProfile } from '@/lib/auth/resolveProfile';
import { performEmergencySignIn } from '@/lib/auth/emergencyLogin';

export interface ScreenPermission { can_view: boolean; can_edit: boolean; }
export type ScreenPermissions = Record<string, ScreenPermission>;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  userProfile: any | null;
  userDesignation: 'super_admin' | 'admin' | 'manager' | 'supervisor' | 'doctor' | 'staff' | null;
  screenPermissions: ScreenPermissions;
  /** Fully seeded permissions from screen_registry (empty => DB not seeded yet, legacy fallback in effect). */
  permissionsLoaded: boolean;
  canView: (key: string) => boolean;
  canEdit: (key: string) => boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: any }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signInWithOTP: (email: string) => Promise<{ error: any }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: any }>;
  sendMobileOTP: (mobile: string) => Promise<{ error: any }>;
  verifyMobileOTP: (mobile: string, otp: string) => Promise<{ error: any }>;
  emergencySignIn: (email: string, role: 'admin' | 'manager', otp: string) => Promise<{ error: any }>;
  getUserEmail: (username: string, userType: 'staff' | 'doctor') => Promise<{ email: string | null; error: any }>;
  signOut: () => Promise<void>;
}

// Legacy fallback: matches the pre-migration hardcoded role gates. Used ONLY
// when the DB has no screen_registry seed yet (permissionsLoaded=false), so
// nobody loses access before the SQL is run.
const LEGACY_VIEW: Record<string, string[]> = {
  'admin-dashboard': ['admin', 'manager', 'super_admin'],
  'doctor-dashboard': ['doctor', 'admin', 'super_admin'],
  'staff-dashboard': ['staff', 'nurse', 'technician', 'receptionist', 'pharmacist', 'cleaner', 'security'],
  'staff-management': ['admin', 'manager', 'super_admin'],
  'doctors': ['admin', 'manager', 'super_admin'],
  'settings-auth-sync': ['super_admin'],
};
const LEGACY_EDIT: Record<string, string[]> = {
  'doctors': ['admin', 'manager'],
  'doctor-management-reactivate': ['admin'],
  'staff-management': ['admin', 'manager'],
  'doctor-hub-delete-unpaid-visit': ['admin', 'manager'],
};
const legacyAllowed = (map: Record<string, string[]>, key: string, role: string | null) =>
  !!role && !!map[key] && map[key].includes(role);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [screenPermissions, setScreenPermissions] = useState<ScreenPermissions>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Load per-user screen permissions whenever the user or designation changes,
  // and subscribe to Realtime so Configure Access toggles take effect immediately.
  useEffect(() => {
    const authUserId: string | null =
      (userProfile?.auth_user_id as string | undefined) ||
      (userProfile?.user_id as string | undefined) ||
      user?.id ||
      null;

    if (!authUserId) {
      setScreenPermissions({});
      setPermissionsLoaded(false);
      return;
    }

    // super_admin bypass — no need to load, canView/canEdit shortcircuit true.
    if (userDesignation === 'super_admin' || userRole === 'super_admin') {
      setScreenPermissions({});
      setPermissionsLoaded(true);
      return;
    }

    const isAdminTier = userDesignation === 'admin' || userRole === 'admin';
    const table = isAdminTier ? 'admin_screen_permissions' : 'staff_screen_permissions';
    const idColumn = isAdminTier ? 'admin_user_id' : 'staff_id';
    // staff_screen_permissions.staff_id references public.staff.id — prefer that.
    const targetId: string = isAdminTier
      ? authUserId
      : ((userProfile?.id as string | undefined) || authUserId);

    let cancelled = false;
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('screen_key, can_view, can_edit')
        .eq(idColumn, targetId);
      if (cancelled) return;
      if (error || !data) {
        setScreenPermissions({});
        setPermissionsLoaded(false);
        return;
      }
      const map: ScreenPermissions = {};
      (data as any[]).forEach((r) => {
        map[r.screen_key] = { can_view: !!r.can_view, can_edit: !!r.can_edit };
      });
      setScreenPermissions(map);
      setPermissionsLoaded(true);
    };
    load();

    const ch = supabase
      .channel(`auth_perms_${table}_${targetId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `${idColumn}=eq.${targetId}` },
        (payload: any) => {
          const row = (payload.new || payload.old) as any;
          if (!row?.screen_key) return;
          setScreenPermissions((prev) => {
            const next = { ...prev };
            if (payload.eventType === 'DELETE') delete next[row.screen_key];
            else next[row.screen_key] = { can_view: !!row.can_view, can_edit: !!row.can_edit };
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user?.id, userProfile?.id, userProfile?.user_id, userProfile?.auth_user_id, userRole, userDesignation]);

  const isSuper = userDesignation === 'super_admin' || userRole === 'super_admin';
  const canView = (key: string): boolean => {
    if (isSuper) return true;
    if (permissionsLoaded && screenPermissions[key]) return screenPermissions[key].can_view;
    // Fallback while DB not yet seeded — preserve legacy behavior.
    return legacyAllowed(LEGACY_VIEW, key, userRole || userDesignation);
  };
  const canEdit = (key: string): boolean => {
    if (isSuper) return true;
    if (permissionsLoaded && screenPermissions[key]) return screenPermissions[key].can_edit;
    return legacyAllowed(LEGACY_EDIT, key, userRole || userDesignation);
  };

  useEffect(() => {
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

        setTimeout(async () => {
          try {
            const designation = await fetchDesignation(supaSession.user.id);
            if (designation) {
              setUserRole(designation);
              setUserDesignation(designation);
              
              const p = await resolveFullProfile(supaSession.user.id);
              if (p) {
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
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', supaSession.user.id)
                .maybeSingle();
              if (profile) {
                setUserRole(profile.role);
                setUserDesignation(profile.role as any);
                setUserProfile(profile);
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
        // Check for emergency session and auto-invalidate if connectivity restored
        if (window.localStorage.getItem('emergency_session') === 'true') {
          const reachable = await checkSupabaseReachable();
          if (reachable) {
            console.log('Supabase reachable again — invalidating emergency session');
            window.localStorage.removeItem('emergency_session');
            await hardResetAuthState();
            setLoading(false);
            return;
          }
        }

        // Guard: detect broken persisted session
        try {
          const storageKey = Object.keys(window.localStorage).find(
            (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
          );
          if (storageKey) {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (!parsed?.refresh_token || typeof parsed.refresh_token !== 'string' || parsed.refresh_token.length < 10) {
                  console.warn('Detected malformed persisted auth session — clearing');
                  await hardResetAuthState();
                }
              } catch {
                await hardResetAuthState();
              }
            }
          }
        } catch (_) {}

        // Priority 1: Check for a real Supabase auth session
        let supaSession: Session | null = null;

        try {
          const { data } = await supabase.auth.getSession();
          supaSession = data.session;
        } catch (sessionError: any) {
          if (isFetchError(sessionError)) {
            console.warn('Supabase session refresh failed. Clearing and retrying.');
            await hardResetAuthState();
            try {
              const { data } = await supabase.auth.getSession();
              supaSession = data.session;
            } catch (_) {
              console.warn('Session recovery retry also failed.');
            }
          } else {
            throw sessionError;
          }
        }
        
        if (supaSession?.user) {
          console.log('Restored real Supabase session for user:', supaSession.user.id);
          setUser(supaSession.user);
          setSession(supaSession);

          const designation = await fetchDesignation(supaSession.user.id);
          if (designation) {
            setUserRole(designation);
            setUserDesignation(designation);
            
            const p = await resolveFullProfile(supaSession.user.id);
            if (p) {
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
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', supaSession.user.id)
              .maybeSingle();
            if (profile) {
              setUserRole(profile.role);
              setUserDesignation(profile.role as any);
              setUserProfile(profile);
            }
          }
          setLoading(false);
          return;
        }

        // Priority 2: Fall back to custom user_sessions
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

          // Resolve doctor table ID and code via profile RPC
          let resolvedId = sessionData.original_id;
          let resolvedCode: string | undefined;
          if (sessionData.user_type === 'doctor' || designation === 'doctor') {
            const p = await resolveFullProfile(sessionData.user_id);
            if (p && p.designation === 'doctor' && p.id) {
              resolvedId = p.id;
              resolvedCode = p.code;
            }
          }

          setUserProfile({
            role: sessionData.role,
            full_name: sessionData.full_name,
            id: resolvedId,
            user_id: sessionData.user_id,
            user_type: sessionData.user_type,
            code: resolvedCode
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
      await invalidateSession();

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
          try {
            const sessionData = await createUserSession({
              user_type: loginResult.user_type,
              original_id: loginResult.id,
              user_id: loginResult.user_id || loginResult.id,
              username: username,
              full_name: loginResult.full_name || username,
              role: loginResult.role || 'staff'
            });

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
                auth_user_id: loginResult.user_id
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

            return { error: null };
          } catch (e: any) {
            console.error('createUserSession failed:', e?.message || e);
            const fallbackUser = {
              id: loginResult.id,
              email: `${username}@westmed.local`,
              app_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              user_metadata: {
                full_name: loginResult.full_name || username,
                role: loginResult.role || 'staff',
                user_type: loginResult.user_type,
                original_id: loginResult.id,
                auth_user_id: loginResult.user_id
              }
            } as User;

            const expAt = new Date('2099-12-31T23:59:59.000Z').getTime();
            const fallbackSession = {
              user: fallbackUser,
              access_token: crypto.randomUUID(),
              refresh_token: crypto.randomUUID(),
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

      const { data: emailData } = await supabase
        .rpc('get_staff_auth_email', { _username: username });

      if (emailData) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailData,
          password
        });

        if (!authError && authData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', authData.user.id)
            .maybeSingle();

          if (profile) {
            await createUserSession({
              user_type: 'supabase_auth',
              original_id: authData.user.id,
              user_id: authData.user.id,
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
        setUser(data.user);
        setSession(data.session);
        
        const { data: designation } = await supabase
          .from('user_designations')
          .select('designation')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (designation?.designation) {
          setUserRole(designation.designation);
          setUserDesignation(designation.designation);

          const p = await resolveFullProfile(data.user.id);
          const userType = p?.designation === 'doctor' ? 'doctor' : 'staff';
          const resolvedId = (userType === 'doctor' && p?.id) ? p.id : data.user.id;
          const fullName = p?.full_name || email;

          setUserProfile({
            id: resolvedId,
            user_id: data.user.id,
            full_name: fullName,
            role: designation.designation,
            user_type: userType,
            code: p?.code
          });
          
          try {
            await createUserSession({
              user_type: userType,
              original_id: resolvedId,
              user_id: data.user.id,
              username: email,
              full_name: fullName,
              role: designation.designation
            });
          } catch (e: any) {
            console.error('createUserSession (email) failed:', e?.message || e);
          }
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (profile) {
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
        options: { shouldCreateUser: false }
      });
      
      if (error) {
        if (isFetchError(error)) {
          console.warn('OTP send hit fetch error, retrying...');
          await hardResetAuthState();
          const { error: retryError } = await supabase.auth.signInWithOtp({
            email: email,
            options: { shouldCreateUser: false }
          });
          if (retryError) return { error: { message: "Couldn't reach sign-in service. Please check your connection." } };
          return { error: null };
        }
        return { error };
      }
      return { error: null };
    } catch (error: any) {
      if (isFetchError(error)) {
        await hardResetAuthState();
        try {
          const { error: retryError } = await supabase.auth.signInWithOtp({
            email: email,
            options: { shouldCreateUser: false }
          });
          if (retryError) return { error: { message: "Couldn't reach sign-in service after recovery." } };
          return { error: null };
        } catch (_) {
          return { error: { message: "Sign-in service unreachable." } };
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
        setUser(data.user);
        setSession(data.session);
        console.log('OTP verified, user set:', data.user.id);
        
        const { data: designation } = await supabase
          .from('user_designations')
          .select('designation')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (designation?.designation) {
          setUserRole(designation.designation);
          setUserDesignation(designation.designation);
          
          let userType = 'staff';
          let fullName = email;
          let doctorTableId: string | undefined;
          let doctorCode: string | undefined;
          const p = await resolveFullProfile(data.user.id);
          if (p) {
            userType = p.designation === 'doctor' ? 'doctor' : 'staff';
            fullName = p.full_name || email;
            doctorTableId = p.id;
            doctorCode = p.code;
          }
          
          setUserProfile({
            id: (userType === 'doctor' && doctorTableId) ? doctorTableId : data.user.id,
            user_id: data.user.id,
            full_name: fullName,
            role: designation.designation,
            user_type: userType,
            code: doctorCode
          });
          
          try {
            await createUserSession({
              user_type: userType,
              original_id: (userType === 'doctor' && doctorTableId) ? doctorTableId : data.user.id,
              user_id: data.user.id,
              username: email,
              full_name: fullName,
              role: designation.designation
            });
          } catch (e: any) {
            console.error('createUserSession failed (OTP):', e?.message || e);
          }
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();
          
          if (profile) {
            setUserRole(profile.role);
            setUserDesignation(profile.role as any);
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
            console.warn('No designation or profile found, using defaults');
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
      window.localStorage.removeItem('emergency_session');
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
          await hardResetAuthState();
          const { data: retryData, error: retryError } = await supabase.functions.invoke('send-otp', {
            body: { mobile }
          });
          if (retryError) return { error: { message: "Couldn't reach OTP service." } };
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
        return { error: { message: "OTP service unreachable. Please try again." } };
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
      const sessionToken = data.session_token;
      const hashedToken = data.hashed_token;

      // Priority 1: Use hashed_token to establish real Supabase auth session
      if (hashedToken) {
        try {
          console.log('Mobile OTP: Attempting real Supabase auth via magic link token');
          const { data: authData, error: authError } = await supabase.auth.verifyOtp({
            token_hash: hashedToken,
            type: 'magiclink'
          });

          if (!authError && authData?.user && authData?.session) {
            console.log('Mobile OTP: Real Supabase auth session established');
            setUser(authData.user);
            setSession(authData.session);

            const { data: designation } = await supabase
              .from('user_designations')
              .select('designation')
              .eq('user_id', authData.user.id)
              .maybeSingle();

            const role = designation?.designation || userData?.role || 'staff';
            setUserRole(role);
            setUserDesignation(designation?.designation || null);

            let resolvedId = userData?.id || authData.user.id;
            let resolvedCode: string | undefined;
            const p = await resolveFullProfile(authData.user.id);
            if (p && p.designation === 'doctor' && p.id) {
              resolvedId = p.id;
              resolvedCode = p.code;
            }

            setUserProfile({
              id: resolvedId,
              user_id: authData.user.id,
              full_name: userData?.full_name || authData.user.email || mobile,
              role: role,
              user_type: userData?.user_type,
              code: resolvedCode
            });

            try {
              await createUserSession({
                user_type: userData?.user_type || 'mobile_otp',
                original_id: resolvedId,
                user_id: authData.user.id,
                username: mobile,
                full_name: userData?.full_name || authData.user.email || mobile,
                role: role
              });
            } catch (e: any) {
              console.error('createUserSession failed (mobile OTP auth):', e?.message || e);
            }

            return { error: null };
          } else {
            console.warn('Mobile OTP: Magic link auth failed, falling back:', authError?.message);
          }
        } catch (magicLinkErr) {
          console.warn('Mobile OTP: Magic link auth error, falling back:', magicLinkErr);
        }
      }

      // Priority 2: Direct session (fallback)
      if (sessionToken && userData) {
        console.log('Mobile OTP: Direct session established (fallback mode)');
        
        window.localStorage.setItem('supabase_session_token', sessionToken);

        const mockUser = {
          id: userData.user_id,
          email: `${mobile}@westmed.local`,
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          user_metadata: {
            full_name: userData.full_name,
            role: userData.role,
            user_type: userData.user_type,
            original_id: userData.id,
            auth_user_id: userData.user_id
          }
        } as User;

        const mockSession = {
          user: mockUser,
          access_token: sessionToken,
          refresh_token: '',
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          token_type: 'bearer'
        } as Session;

        setUser(mockUser);
        setSession(mockSession);
        setUserRole(userData.role || userData.designation || 'staff');
        setUserDesignation(userData.designation || null);
        setUserProfile({
          id: userData.id,
          user_id: userData.user_id,
          full_name: userData.full_name,
          role: userData.role || userData.designation || 'staff',
          user_type: userData.user_type
        });

        return { error: null };
      }

      // Final fallback
      if (userData) {
        console.warn('Mobile OTP: No token received, pseudo-session');
        const pseudoUser: any = {
          id: userData.user_id,
          email: `${mobile}@westmed.local`,
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

  const emergencySignIn = async (email: string, role: 'admin' | 'manager', otp: string): Promise<{ error: any }> => {
    const result = await performEmergencySignIn(email, role, otp);
    if (result.error) return { error: result.error };

    setUser(result.mockUser!);
    setSession(result.mockSession!);
    setUserRole(role);
    setUserDesignation(role as any);
    setUserProfile(result.profile);

    return { error: null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRole,
      userProfile,
      userDesignation,
      screenPermissions,
      permissionsLoaded,
      canView,
      canEdit,
      signInWithUsername,
      signInWithEmail,
      signInWithOTP,
      verifyOTP,
      sendMobileOTP,
      verifyMobileOTP,
      emergencySignIn,
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
