import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VerifyOTPRequest {
  mobile: string;
  otp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mobile, otp }: VerifyOTPRequest = await req.json();

    // Validate inputs
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      throw new Error('Invalid mobile number');
    }

    if (!otp || !/^[0-9]{6}$/.test(otp)) {
      throw new Error('Invalid OTP format');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the most recent non-verified OTP for this mobile number
    const { data: otpRecord, error: fetchError } = await supabaseClient
      .from('otp_verifications')
      .select('*')
      .eq('mobile_number', mobile)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      throw new Error('No valid OTP found. Please request a new OTP.');
    }

    // Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      throw new Error('OTP has expired. Please request a new OTP.');
    }

    // Check attempt limit (max 3 attempts)
    if (otpRecord.attempts >= 3) {
      throw new Error('Maximum attempts exceeded. Please request a new OTP.');
    }

    // Increment attempt counter
    await supabaseClient
      .from('otp_verifications')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id);

    // Verify OTP
    if (otpRecord.otp_code !== otp) {
      throw new Error('Invalid OTP. Please try again.');
    }

    // Mark OTP as verified
    await supabaseClient
      .from('otp_verifications')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id);

    // Helper: generate a custom session token and insert into user_sessions directly
    const createDirectSession = async (userData: {
      user_type: string;
      original_id: string;
      user_id: string;
      username: string;
      full_name: string;
      role: string;
    }) => {
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const timeoutDuration = ['admin', 'manager'].includes(userData.role) ? 300 : 180;

      const { error: insertError } = await supabaseClient
        .from('user_sessions')
        .insert({
          user_id: userData.user_id,
          user_type: userData.user_type,
          original_id: userData.original_id,
          session_token: sessionToken,
          refresh_token: refreshToken,
          username: userData.username,
          full_name: userData.full_name,
          role: userData.role,
          expires_at: expiresAt.toISOString(),
          idle_timeout_seconds: timeoutDuration,
          last_activity_at: new Date().toISOString(),
          is_active: true
        });

      if (insertError) {
        console.error('Failed to create session:', insertError);
        return null;
      }

      return sessionToken;
    };

    // Find user by mobile number in staff or doctors table
    const { data: staffUser } = await supabaseClient
      .from('staff')
      .select('id, user_id, full_name, role, phone')
      .eq('phone', mobile)
      .eq('is_active', true)
      .single();

    if (staffUser) {
      // Get designation for the user
      let designation = staffUser.role || 'staff';
      if (staffUser.user_id) {
        const { data: desigData } = await supabaseClient
          .from('user_designations')
          .select('designation')
          .eq('user_id', staffUser.user_id)
          .single();
        if (desigData?.designation) {
          designation = desigData.designation;
        }
      }

      // Create direct session
      const sessionToken = await createDirectSession({
        user_type: 'staff',
        original_id: staffUser.id,
        user_id: staffUser.user_id || staffUser.id,
        username: mobile,
        full_name: staffUser.full_name,
        role: designation
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP verified successfully',
          session_token: sessionToken,
          user: {
            user_type: 'staff',
            id: staffUser.id,
            user_id: staffUser.user_id || staffUser.id,
            full_name: staffUser.full_name,
            role: designation,
            designation: designation
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check doctors table
    const { data: doctorUser } = await supabaseClient
      .from('doctors')
      .select('id, user_id, full_name, doctor_code, mobile_number')
      .eq('mobile_number', mobile)
      .eq('is_active', true)
      .single();

    if (doctorUser) {
      // Get designation
      let designation = 'doctor';
      if (doctorUser.user_id) {
        const { data: desigData } = await supabaseClient
          .from('user_designations')
          .select('designation')
          .eq('user_id', doctorUser.user_id)
          .single();
        if (desigData?.designation) {
          designation = desigData.designation;
        }
      }

      // Create direct session
      const sessionToken = await createDirectSession({
        user_type: 'doctor',
        original_id: doctorUser.id,
        user_id: doctorUser.user_id || doctorUser.id,
        username: mobile,
        full_name: doctorUser.full_name || doctorUser.doctor_code,
        role: designation
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP verified successfully',
          session_token: sessionToken,
          user: {
            user_type: 'doctor',
            id: doctorUser.id,
            user_id: doctorUser.user_id || doctorUser.id,
            full_name: doctorUser.full_name || doctorUser.doctor_code,
            role: designation,
            designation: designation
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('No user found with this mobile number');

  } catch (error: any) {
    console.error('Error in verify-otp function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to verify OTP'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
