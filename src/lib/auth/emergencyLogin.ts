import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const performEmergencySignIn = async (
  email: string,
  role: 'admin' | 'manager',
  otp: string
): Promise<{
  error: any;
  mockUser?: User;
  mockSession?: Session;
  profile?: any;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-emergency-otp', {
      body: { otp, role }
    });

    if (error) {
      return { error: { message: 'Emergency service unreachable. Please try again later.' } };
    }

    if (!data?.success) {
      return { error: { message: data?.error || 'Invalid emergency access code.' } };
    }

    const mockId = `emergency_${role}_${Date.now()}`;
    const mockUser = {
      id: mockId,
      email: email,
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      user_metadata: {
        full_name: email.split('@')[0],
        role: role,
        user_type: 'staff',
        emergency_session: true,
      }
    } as User;

    const expAt = Date.now() + 8 * 60 * 60 * 1000;
    const mockSession = {
      user: mockUser,
      access_token: data.session_token || crypto.randomUUID(),
      refresh_token: '',
      expires_in: Math.floor((expAt - Date.now()) / 1000),
      expires_at: Math.floor(expAt / 1000),
      token_type: 'bearer'
    } as Session;

    window.localStorage.setItem('emergency_session', 'true');

    return {
      error: null,
      mockUser,
      mockSession,
      profile: {
        role: role,
        full_name: email.split('@')[0],
        id: mockId,
        user_type: 'staff',
        emergency_session: true,
      }
    };
  } catch (error: any) {
    console.error('Emergency sign-in error:', error);
    return { error: { message: 'Emergency login failed. Please try again.' } };
  }
};
