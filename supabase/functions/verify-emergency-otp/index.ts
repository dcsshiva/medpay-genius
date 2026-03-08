import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Server-side emergency OTP codes - never exposed to client
const EMERGENCY_CODES: Record<string, string> = {
  admin: '948693',
  manager: '933892',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { otp, role }: { otp: string; role: string } = await req.json();

    if (!otp || !/^[0-9]{6}$/.test(otp)) {
      throw new Error('Invalid OTP format');
    }

    if (!role || !['admin', 'manager'].includes(role)) {
      throw new Error('Invalid role');
    }

    const expectedCode = EMERGENCY_CODES[role];
    if (!expectedCode || otp !== expectedCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid emergency access code.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Generate a session token for the emergency session
    const sessionToken = crypto.randomUUID();

    return new Response(
      JSON.stringify({
        success: true,
        session_token: sessionToken,
        role,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Verification failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
