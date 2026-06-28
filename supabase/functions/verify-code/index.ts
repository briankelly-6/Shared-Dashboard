// Supabase Edge Function: verify-code
// ---------------------------------------------------------------------------
// Gates the dashboard behind the shared 6-digit code WITHOUT shipping the code
// (or the shared account password) to the browser. On a correct code it signs
// into the single shared Supabase Auth account server-side and returns that
// session to the client, which installs it via supabase.auth.setSession().
//
// Required secrets (set with `supabase secrets set …`, see README):
//   APP_ACCESS_CODE       the shared 6-digit numeric code, e.g. 482915
//   SHARED_USER_EMAIL     email of the one shared auth account
//   SHARED_USER_PASSWORD  password for that account
//
// SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.
// ---------------------------------------------------------------------------

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Constant-time-ish string comparison to avoid trivial timing leaks.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const expected = Deno.env.get('APP_ACCESS_CODE');
  const email = Deno.env.get('SHARED_USER_EMAIL');
  const password = Deno.env.get('SHARED_USER_PASSWORD');
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!expected || !email || !password || !url || !anonKey) {
    return json({ error: 'Server is not configured.' }, 500);
  }

  let code: unknown;
  try {
    const body = await req.json();
    code = body?.code;
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  if (typeof code !== 'string' || !safeEqual(code, expected)) {
    return json({ error: 'Invalid code.' }, 401);
  }

  // Code is correct — mint a session for the shared account.
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return json({ error: 'Could not establish a session.' }, 500);
  }

  return json(
    {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    },
    200,
  );
});
