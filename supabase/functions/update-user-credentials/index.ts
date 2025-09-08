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

    // Verify the requesting user is an admin or manager
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