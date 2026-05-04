import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, function: 'update-user-credentials' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const sessionToken = req.headers.get('X-Session-Token') ||
      req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      throw new Error('Missing session token');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate session using custom user_sessions table
    const { data: session, error: sessionError } = await supabaseClient
      .from('user_sessions')
      .select('user_id, role, is_active, expires_at')
      .eq('session_token', sessionToken)
      .single();
    
    if (sessionError || !session) {
      throw new Error('Invalid session token');
    }

    // Check if session is active. Expiry is intentionally ignored because
    // WestMed sessions are configured to stay valid indefinitely until logout.
    if (!session.is_active) {
      throw new Error('Session inactive. Please log out and log in again.');
    }

    // Check if user has admin or manager role
    if (!['admin', 'manager'].includes(session.role)) {
      throw new Error('Only admins and managers can update user credentials');
    }

    const { userId, email, password } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    const updates: any = {};
    if (email && email.trim()) {
      updates.email = email.trim();
    }
    if (password && password.trim()) {
      updates.password = password.trim();
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No updates provided'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the auth user
    const { data: updateData, error: updateError } = await supabaseClient.auth.admin.updateUserById(
      userId,
      updates
    );

    if (updateError) {
      console.error('Error updating user credentials:', updateError);
      throw updateError;
    }

    console.log('Successfully updated user credentials:', {
      userId,
      updatedFields: Object.keys(updates)
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'User credentials updated successfully',
      updatedFields: Object.keys(updates)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in update-user-credentials function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});