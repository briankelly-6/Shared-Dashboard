import { isSupabaseConfigured } from './lib/supabase';
import { useSession } from './auth/useSession';
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
          Supabase isn’t configured yet. Copy{' '}
          <code className="bg-neutral-100 px-1">.env.example</code> to{' '}
          <code className="bg-neutral-100 px-1">.env</code> and set{' '}
          <code className="bg-neutral-100 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="bg-neutral-100 px-1">VITE_SUPABASE_ANON_KEY</code>,
          then restart <code className="bg-neutral-100 px-1">npm run dev</code>.
          See the README for full setup steps.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { session, loading } = useSession();

  if (!isSupabaseConfigured) return <SetupNotice />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 text-xs text-neutral-400">
        Loading…
      </div>
    );
  }

  return session ? <Dashboard /> : <CodeGate />;
}
