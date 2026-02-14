import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Helper: generate magic link token for a user email
    const generateAuthToken = async (email: string) => {
      const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (linkError) {
        console.error('Error generating magic link:', linkError);
        return null;
      }

      return linkData?.properties?.hashed_token || null;
    };

    // Find user by mobile number in staff or doctors table
    const { data: staffUser } = await supabaseClient
      .from('staff')
      .select('id, user_id, full_name, role, phone')
      .eq('phone', mobile)
      .eq('is_active', true)
      .single();

    if (staffUser) {
      // Get email for session creation
      const { data: userData } = await supabaseClient.auth.admin.getUserById(staffUser.user_id);
      const userEmail = userData?.user?.email;

      // Generate auth token for real Supabase session
      let hashed_token = null;
      if (userEmail) {
        hashed_token = await generateAuthToken(userEmail);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP verified successfully',
          hashed_token,
          user: {
            user_type: 'staff',
            id: staffUser.id,
            user_id: staffUser.user_id,
            full_name: staffUser.full_name,
            role: staffUser.role,
            email: userEmail
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
      const { data: userData } = await supabaseClient.auth.admin.getUserById(doctorUser.user_id);
      const userEmail = userData?.user?.email;

      // Generate auth token for real Supabase session
      let hashed_token = null;
      if (userEmail) {
        hashed_token = await generateAuthToken(userEmail);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP verified successfully',
          hashed_token,
          user: {
            user_type: 'doctor',
            id: doctorUser.id,
            user_id: doctorUser.user_id,
            full_name: doctorUser.full_name,
            role: 'doctor',
            email: userEmail
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
