interface LoadErrorProps {
  /** The hook's `error` string; renders nothing when null. */
  message: string | null;
}

/**
 * The one line every widget shows when its data could not be loaded.
 *
 * Before this existed, a failed load rendered exactly like an empty table
 * ("No ideas yet."), which is how a paused Supabase project (free plan, seven
 * idle days) read as "the board was blanked" on 2026-09-10. A load failure is a
 * connection problem, not an empty board, and the line says so in plain words
 * first; the raw message follows for whoever debugs it.
 */
export function LoadError({ message }: LoadErrorProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700"
    >
      <span className="font-semibold">Can’t reach the database.</span> This is
      a connection problem, not an empty board. If the Supabase project is
      paused (free plan, seven idle days), resume it in the Supabase dashboard
      and reload this page.{' '}
      <span className="text-red-500">({message})</span>
    </div>
  );
}
