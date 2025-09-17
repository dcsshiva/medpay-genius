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

    // Verify the requesting user is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check if user is admin or manager
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      throw new Error('Only admins and managers can create users');
    }

    const { email, password, userData } = await req.json();

    // Create the auth user
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
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