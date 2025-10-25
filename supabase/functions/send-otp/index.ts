import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendOTPRequest {
  mobile: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mobile }: SendOTPRequest = await req.json();

    // Validate mobile number (10 digits)
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      throw new Error('Invalid mobile number. Please provide a 10-digit mobile number.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Cleanup expired OTPs for this mobile number
    await supabaseClient
      .from('otp_verifications')
      .delete()
      .eq('mobile_number', mobile)
      .lt('expires_at', new Date().toISOString());

    // Store OTP in database
    const { error: dbError } = await supabaseClient
      .from('otp_verifications')
      .insert({
        mobile_number: mobile,
        otp_code: otp,
        expires_at: expiresAt,
        is_verified: false,
        attempts: 0
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store OTP');
    }

    // Send OTP via MSG91
    const msg91AuthKey = Deno.env.get('MSG91_AUTH_KEY');
    if (!msg91AuthKey) {
      throw new Error('MSG91_AUTH_KEY not configured');
    }

    // MSG91 API call
    const msg91Response = await fetch(
      `https://control.msg91.com/api/v5/otp?mobile=91${mobile}&authkey=${msg91AuthKey}&otp=${otp}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: Deno.env.get('MSG91_TEMPLATE_ID') || '',
          otp: otp,
          otp_length: 6,
          otp_expiry: 5
        })
      }
    );

    const msg91Result = await msg91Response.json();
    
    console.log('MSG91 Response:', msg91Result);

    if (!msg91Response.ok) {
      throw new Error(`MSG91 Error: ${msg91Result.message || 'Failed to send OTP'}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 300 // 5 minutes in seconds
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in send-otp function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send OTP'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
