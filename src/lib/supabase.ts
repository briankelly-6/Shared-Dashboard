import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True only when both env vars are present. The app shows a friendly setup
 * notice instead of crashing when they are missing (e.g. before `.env` is set).
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[BK/AO] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill them in (see README).',
  );
}

// Falls back to harmless placeholder values so createClient doesn't throw;
// `isSupabaseConfigured` gates the UI before any request is made.
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Remember the shared session per-device under a stable key.
      storageKey: 'bk-ao-dashboard-auth',
    },
  },
);
