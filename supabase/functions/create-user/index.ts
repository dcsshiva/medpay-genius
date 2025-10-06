import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract session token from Authorization header
    const sessionToken = authHeader.replace('Bearer ', '');

    // Validate session using custom user_sessions table
    const { data: session, error: sessionError } = await supabaseClient
      .from('user_sessions')
      .select('user_id, role, is_active, expires_at')
      .eq('session_token', sessionToken)
      .single();
    
    if (sessionError || !session) {
      throw new Error('Invalid session token');
    }

    // Check if session is active and not expired
    if (!session.is_active || new Date(session.expires_at) < new Date()) {
      throw new Error('Session expired or inactive');
    }

    // Check if user has admin or manager role
    if (!['admin', 'manager'].includes(session.role)) {
      throw new Error('Only admins and managers can create users');
    }

    const { email, password, userData } = await req.json();

    // Create the auth user
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData
    });

    if (createError) {
      // Provide more specific error messages
      if (createError.message?.includes('already been registered')) {
        throw new Error('A user with this email address already exists. Please use a different email.');
      }
      throw createError;
    }

    return new Response(JSON.stringify({ 
      user: authData.user,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-user function:', error);
    const anyErr: any = error;
    const code = anyErr?.code || (anyErr?.message?.toLowerCase().includes('already') ? 'email_exists' : undefined);
    const status = code === 'email_exists' ? 409 : 400;
    return new Response(JSON.stringify({ 
      error: anyErr?.message || 'Unexpected error',
      code
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});