import { supabase } from '../lib/supabase';
import { WIDGETS } from '../widgets/registry';
import type { WidgetDef } from '../widgets/registry';
import { WidgetCard } from './WidgetCard';

// Literal classes so Tailwind keeps them through purge. span 1 is the default
// cell; 2/3 are reserved for future wider widgets.
const SPAN_CLASS: Record<WidgetDef['span'], string> = {
  1: '',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
};

export function Dashboard() {
  return (
    <div className="flex h-screen min-h-0 flex-col bg-neutral-100">
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-300 bg-white px-4 py-2">
        <h1 className="text-sm font-semibold tracking-tight text-neutral-900">
          BK/AO Dashboard
        </h1>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="text-[11px] uppercase tracking-wider text-neutral-400 hover:text-neutral-700"
          title="Lock this device (sign out)"
        >
          Lock
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-3">
        <div className="grid h-full auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {WIDGETS.map((widget) => {
            const Body = widget.component;
            return (
              <div
                key={widget.id}
                className={`min-h-[260px] ${SPAN_CLASS[widget.span]}`}
              >
                <WidgetCard title={widget.title}>
                  <Body />
                </WidgetCard>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
