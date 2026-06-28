import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * First-visit gate. Collects the shared 6-digit code, sends it to the
 * `verify-code` Edge Function, and — on success — installs the returned
 * shared session. `onAuthStateChange` (see useSession) then unlocks the app.
 */
export function CodeGate() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(value: string) {
    setBusy(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'verify-code',
        { body: { code: value } },
      );

      if (fnError || !data?.session) {
        setError('Incorrect code. Try again.');
        setCode('');
        inputRef.current?.focus();
        return;
      }

      const { access_token, refresh_token } = data.session;
      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (setErr) {
        setError('Could not start a session. Try again.');
        setCode('');
      }
      // On success, onAuthStateChange flips the app to the dashboard.
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError(null);
    if (digits.length === 6 && !busy) {
      void submit(digits);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-xs border border-neutral-300 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h1 className="text-sm font-semibold tracking-tight text-neutral-900">
            BK/AO Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Enter the 6-digit access code.
          </p>
        </div>

        <form
          className="px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) void submit(code);
          }}
        >
          <input
            ref={inputRef}
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Access code"
            value={code}
            disabled={busy}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full border border-neutral-300 px-3 py-2 text-center font-mono text-2xl tracking-[0.5em] text-neutral-900 focus:border-neutral-500 disabled:opacity-50"
            placeholder="••••••"
          />

          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="mt-3 w-full border border-neutral-900 bg-neutral-900 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300"
          >
            {busy ? 'Checking…' : 'Unlock'}
          </button>

          <div className="mt-2 h-4 text-center text-xs text-red-600">
            {error}
          </div>
        </form>
      </div>
    </div>
  );
}
