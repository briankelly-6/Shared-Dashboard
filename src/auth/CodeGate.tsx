import { useRef, useState } from 'react';
import { ACCESS_CODE } from '../lib/config';

interface CodeGateProps {
  onUnlock: () => void;
}

/**
 * First-visit gate. Collects the shared 6-digit code and compares it to the
 * configured access code in the browser. On a match it calls onUnlock(), which
 * remembers this device (localStorage) and reveals the dashboard.
 *
 * This is a low-confidentiality, client-side gate (see README). The code is
 * present in the built site; it keeps the board out of casual view rather than
 * providing strong security.
 */
export function CodeGate({ onUnlock }: CodeGateProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(value: string) {
    if (value === ACCESS_CODE) {
      setError(null);
      onUnlock();
    } else {
      setError('Incorrect code. Try again.');
      setCode('');
      inputRef.current?.focus();
    }
  }

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError(null);
    if (digits.length === 6) submit(digits);
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
            if (code.length === 6) submit(code);
          }}
        >
          <input
            ref={inputRef}
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Access code"
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full border border-neutral-300 px-3 py-2 text-center font-mono text-2xl tracking-[0.5em] text-neutral-900 focus:border-neutral-500"
            placeholder="••••••"
          />

          <button
            type="submit"
            disabled={code.length !== 6}
            className="mt-3 w-full border border-neutral-900 bg-neutral-900 py-2 text-xs font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300"
          >
            Unlock
          </button>

          <div className="mt-2 h-4 text-center text-xs text-red-600">
            {error}
          </div>
        </form>
      </div>
    </div>
  );
}
