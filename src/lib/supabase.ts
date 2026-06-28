import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True only when both Supabase env vars are present. The app shows a friendly
 * setup notice instead of crashing when they are missing (e.g. before `.env`
 * is set).
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[BK/AO] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill them in (see README).',
  );
}

// The app reads/writes as the anon role; the database RLS policies allow it.
// Falls back to harmless placeholders so createClient never throws before
// configuration — `isSupabaseConfigured` gates the UI first.
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'public-anon-key',
);
