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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mobile }: SendOTPRequest = await req.json();

    // Validate mobile number (10 digits)
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      throw new Error('Invalid mobile number. Please provide a 10-digit mobile number.');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if mobile number belongs to a registered user (staff or doctor)
    const { data: staffUser } = await supabaseClient
      .from('staff')
      .select('id, full_name')
      .eq('phone', mobile)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const { data: doctorUser } = await supabaseClient
      .from('doctors')
      .select('id, full_name')
      .eq('mobile_number', mobile)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!staffUser && !doctorUser) {
      throw new Error('No registered user found with this mobile number.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

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

    // Send OTP via SoftSMS
    const softSmsApiKey = Deno.env.get('SOFTSMS_API_KEY');
    const softSmsSenderId = Deno.env.get('SOFTSMS_SENDER_ID');
    const softSmsPeId = Deno.env.get('SOFTSMS_PE_ID');
    const softSmsTemplateId = Deno.env.get('SOFTSMS_TEMPLATE_ID');

    if (!softSmsApiKey || !softSmsSenderId || !softSmsPeId || !softSmsTemplateId) {
      throw new Error('SoftSMS configuration is incomplete. Please contact the administrator.');
    }

    const message = encodeURIComponent(`Dear user, your verification code is ${otp} Complete verification WestMed Hospital`);
    const smsUrl = `https://softsms.in/app/smsapi/index.php?key=${softSmsApiKey}&type=text&contacts=91${mobile}&senderid=${softSmsSenderId}&peid=${softSmsPeId}&templateid=${softSmsTemplateId}&msg=${message}`;

    const smsResponse = await fetch(smsUrl, { method: 'GET' });
    const smsResult = await smsResponse.text();
    
    console.log('SoftSMS Response:', smsResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 300
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
