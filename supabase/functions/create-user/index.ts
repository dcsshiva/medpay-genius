import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-session-token, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, function: 'create-user' }), {
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
      throw new Error('Only admins and managers can create users');
    }

    const { email, password, userData, doctorData, staffData, designation } = await req.json();

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

    const userId = authData.user.id;
    console.log('Auth user created with email:', email, 'user_id:', userId);
    
    // Verify email was set correctly
    if (authData.user.email !== email) {
      console.warn('Email mismatch detected! Expected:', email, 'Got:', authData.user.email);
    }

    // Insert into user_designations table
    const { error: designationError } = await supabaseClient
      .from('user_designations')
      .insert({
        user_id: userId,
        designation: designation || 'doctor'
      });

    if (designationError) {
      console.error('Error creating user designation:', designationError);
      throw new Error('Failed to assign user designation');
    }

    let doctorId = null;
    let staffId = null;

    // Create doctor entry if doctorData is provided
    if (doctorData) {
      // Hash the password
      const { data: hashData, error: hashError } = await supabaseClient.rpc('simple_hash', {
        password: doctorData.password || password
      });

      if (hashError) {
        console.error('Error hashing password:', hashError);
        throw new Error('Failed to hash password');
      }

      const { data: doctor, error: doctorError } = await supabaseClient
        .from('doctors')
        .insert({
          user_id: userId,
          full_name: userData.full_name,
          password_hash: hashData,
          doctor_code: doctorData.doctor_code,
          specialization: doctorData.specialization,
          pan_number: doctorData.pan_number || null,
          mobile_number: doctorData.mobile_number || null,
          bank_name: doctorData.bank_name,
          bank_account_number: doctorData.bank_account_number,
          ifsc_code: doctorData.ifsc_code,
          branch_name: doctorData.branch_name,
          account_holder_name: doctorData.account_holder_name,
          is_active: true
        })
        .select()
        .single();

      if (doctorError) {
        console.error('Error creating doctor:', doctorError);
        throw new Error('Failed to create doctor record');
      }
      doctorId = doctor.id;
    }

    // Create staff entry if staffData is provided
    if (staffData) {
      // Hash the password
      const { data: hashData, error: hashError } = await supabaseClient.rpc('simple_hash', {
        password: staffData.password || password
      });

      if (hashError) {
        console.error('Error hashing password:', hashError);
        throw new Error('Failed to hash password');
      }

      const { data: staff, error: staffError } = await supabaseClient
        .from('staff')
        .insert({
          user_id: userId,
          full_name: userData.full_name,
          password_hash: hashData,
          staff_code: staffData.staff_code,
          username: staffData.username,
          role: staffData.role || 'nurse',
          department: staffData.department,
          phone: staffData.phone,
          email: email,
          staff_category_id: staffData.staff_category_id,
          is_active: true
        })
        .select()
        .single();

      if (staffError) {
        console.error('Error creating staff:', staffError);
        throw new Error('Failed to create staff record');
      }
      staffId = staff.id;
    }

    // Final verification
    console.log('User creation completed successfully:', {
      user_id: userId,
      email_set: email,
      designation,
      doctor_id: doctorId,
      staff_id: staffId,
    });

    return new Response(JSON.stringify({ 
      user: authData.user,
      doctor_id: doctorId,
      staff_id: staffId,
      success: true,
      email_confirmed: email
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