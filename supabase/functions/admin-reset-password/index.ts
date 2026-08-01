// Edge Function: admin-reset-password
//
// Lets an admin set a new password for any user, without needing SMS/email
// infrastructure (the app's login is phone+password with a synthetic
// email — there's no real inbox to send a reset link to).
//
// The service-role key never leaves this server-side function. The caller's
// JWT is verified by the platform (verify_jwt config, see README) AND,
// inside this function, checked against profiles.role === 'admin'.
//
// Deploy with the Supabase CLI:
//   supabase functions deploy admin-reset-password
// (or via the Management API — see README.md "Redeploying the Edge Function")

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerJwt = authHeader.replace('Bearer ', '');
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller is a signed-in admin.
    const asCaller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await asCaller.auth.getUser(callerJwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    const admin = createClient(url, serviceKey);
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: cors });
    }

    const { targetUserId, newPassword } = await req.json();
    if (!targetUserId || !newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: cors });
    }

    const { error } = await admin.auth.admin.updateUserById(targetUserId, { password: newPassword });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
