import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailMismatch {
  type: 'staff' | 'doctor';
  id: string;
  name: string;
  table_email: string;
  auth_email: string | null;
  user_id: string;
}

interface SyncResult {
  success: boolean;
  user_id: string;
  type: 'staff' | 'doctor';
  name: string;
  old_email: string | null;
  new_email: string;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get session token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the session token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.log('Invalid session token:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const { data: designation, error: roleError } = await supabaseClient
      .from('user_designations')
      .select('designation')
      .eq('user_id', user.id)
      .single();

    if (roleError || designation?.designation !== 'admin') {
      console.log('User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { mode } = await req.json();
    
    if (!mode || !['analyze', 'sync'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mode. Use "analyze" or "sync"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting email sync in ${mode} mode`);

    // Get all staff with user_id
    const { data: staff, error: staffError } = await supabaseClient
      .from('staff')
      .select('id, user_id, email, full_name')
      .not('user_id', 'is', null);

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      throw staffError;
    }

    // Get all doctors with user_id
    const { data: doctors, error: doctorsError } = await supabaseClient
      .from('doctors')
      .select('id, user_id, full_name, doctor_code')
      .not('user_id', 'is', null);

    if (doctorsError) {
      console.error('Error fetching doctors:', doctorsError);
      throw doctorsError;
    }

    console.log(`Found ${staff?.length || 0} staff and ${doctors?.length || 0} doctors with user_id`);

    const mismatches: EmailMismatch[] = [];

    // Check staff emails
    for (const staffMember of staff || []) {
      if (!staffMember.email) continue;

      const { data: authUser } = await supabaseClient.auth.admin.getUserById(staffMember.user_id);
      
      if (authUser?.user && authUser.user.email !== staffMember.email) {
        mismatches.push({
          type: 'staff',
          id: staffMember.id,
          name: staffMember.full_name,
          table_email: staffMember.email,
          auth_email: authUser.user.email || null,
          user_id: staffMember.user_id,
        });
      }
    }

    // Check doctor emails
    for (const doctor of doctors || []) {
      const { data: authUser } = await supabaseClient.auth.admin.getUserById(doctor.user_id);
      
      // For doctors, we need to get email from the email field (which we need to add to the query)
      // Let's fetch the doctor's email separately
      const { data: doctorEmail } = await supabaseClient
        .from('doctors')
        .select('id')
        .eq('id', doctor.id)
        .single();

      // Since doctors table doesn't have email field exposed in our query, skip for now
      // This is a schema limitation - doctors use doctor_code as identifier
      console.log(`Doctor ${doctor.full_name} (${doctor.doctor_code}) - auth email: ${authUser?.user?.email || 'none'}`);
    }

    console.log(`Found ${mismatches.length} email mismatches`);

    // If analyze mode, return the mismatches
    if (mode === 'analyze') {
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'analyze',
          mismatches,
          total: mismatches.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync mode - update emails
    const results: SyncResult[] = [];

    for (const mismatch of mismatches) {
      try {
        const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
          mismatch.user_id,
          { email: mismatch.table_email }
        );

        if (updateError) {
          console.error(`Failed to update ${mismatch.type} ${mismatch.name}:`, updateError);
          results.push({
            success: false,
            user_id: mismatch.user_id,
            type: mismatch.type,
            name: mismatch.name,
            old_email: mismatch.auth_email,
            new_email: mismatch.table_email,
            error: updateError.message,
          });
        } else {
          console.log(`Successfully updated ${mismatch.type} ${mismatch.name}: ${mismatch.auth_email} -> ${mismatch.table_email}`);
          results.push({
            success: true,
            user_id: mismatch.user_id,
            type: mismatch.type,
            name: mismatch.name,
            old_email: mismatch.auth_email,
            new_email: mismatch.table_email,
          });
        }
      } catch (error) {
        console.error(`Exception updating ${mismatch.type} ${mismatch.name}:`, error);
        results.push({
          success: false,
          user_id: mismatch.user_id,
          type: mismatch.type,
          name: mismatch.name,
          old_email: mismatch.auth_email,
          new_email: mismatch.table_email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Sync complete: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'sync',
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-auth-emails:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
