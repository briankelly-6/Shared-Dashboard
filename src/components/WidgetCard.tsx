import type { ReactNode } from 'react';

interface WidgetCardProps {
  title: string;
  children: ReactNode;
}

/**
 * Shared card shell for every widget: a header with the title and a
 * placeholder ⋯ menu (disabled — drag/drop + per-widget actions are
 * intentionally out of scope), plus a scrollable body.
 */
export function WidgetCard({ title, children }: WidgetCardProps) {
  return (
    <section className="flex h-full min-h-0 flex-col border border-neutral-300 bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-700">
          {title}
        </h2>
        <button
          type="button"
          disabled
          aria-label="Widget menu (coming soon)"
          title="Coming soon"
          className="-mr-1 cursor-not-allowed px-1 text-base leading-none text-neutral-300"
        >
          ⋯
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}
