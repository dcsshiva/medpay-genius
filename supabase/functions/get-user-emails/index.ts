import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-session-token, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, function: 'get-user-emails' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client for user_sessions validation
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate session using custom session token. Avoid Authorization here so
    // Supabase gateway auth does not confuse custom sessions with JWTs.
    const sessionToken = req.headers.get('X-Session-Token') ||
      req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Missing session token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate session token
    const { data: session, error: sessionError } = await supabaseClient
      .from('user_sessions')
      .select('user_id, role')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      console.error('Session validation error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin or manager role
    if (!['admin', 'manager'].includes(session.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userIds } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching emails for ${userIds.length} users`);

    // Fetch emails from auth.users using service role
    const emails = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const { data, error } = await supabaseClient.auth.admin.getUserById(userId);
          if (error) {
            console.error(`Error fetching email for user ${userId}:`, error);
            return { user_id: userId, email: null };
          }
          return { user_id: userId, email: data.user?.email || null };
        } catch (err) {
          console.error(`Exception fetching email for user ${userId}:`, err);
          return { user_id: userId, email: null };
        }
      })
    );

    console.log(`Successfully fetched ${emails.filter(e => e.email).length} emails`);

    return new Response(
      JSON.stringify({ emails }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-user-emails function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
