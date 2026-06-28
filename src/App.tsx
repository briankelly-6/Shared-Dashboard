import { useCallback, useState } from 'react';
import { isSupabaseConfigured } from './lib/supabase';
import { isAccessCodeConfigured, UNLOCK_KEY } from './lib/config';
import { CodeGate } from './auth/CodeGate';
import { Dashboard } from './components/Dashboard';

function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-md border border-neutral-300 bg-white p-5 text-sm text-neutral-700">
        <h1 className="text-sm font-semibold text-neutral-900">
          BK/AO Dashboard — setup needed
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">
          The app isn’t configured yet. Set{' '}
          <code className="bg-neutral-100 px-1">VITE_SUPABASE_URL</code>,{' '}
          <code className="bg-neutral-100 px-1">VITE_SUPABASE_ANON_KEY</code>,
          and a 6-digit{' '}
          <code className="bg-neutral-100 px-1">VITE_APP_ACCESS_CODE</code> in
          your environment (copy{' '}
          <code className="bg-neutral-100 px-1">.env.example</code> to{' '}
          <code className="bg-neutral-100 px-1">.env</code> locally, or add them
          in your host’s settings), then reload. See the README.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const configured = isSupabaseConfigured && isAccessCodeConfigured;

  const [unlocked, setUnlocked] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(UNLOCK_KEY) === '1',
  );

  const unlock = useCallback(() => {
    localStorage.setItem(UNLOCK_KEY, '1');
    setUnlocked(true);
  }, []);

  const lock = useCallback(() => {
    localStorage.removeItem(UNLOCK_KEY);
    setUnlocked(false);
  }, []);

  if (!configured) return <SetupNotice />;

  return unlocked ? (
    <Dashboard onLock={lock} />
  ) : (
    <CodeGate onUnlock={unlock} />
  );
}
