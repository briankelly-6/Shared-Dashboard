interface ReorderButtonsProps {
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  /** Lighter styling for use on a dark (selected) row. */
  dark?: boolean;
}

/**
 * A compact stacked ▲ / ▼ pair for moving a list item up or down one spot.
 * Always visible (not hover-only) so it works on touch devices.
 */
export function ReorderButtons({
  canUp,
  canDown,
  onUp,
  onDown,
  dark = false,
}: ReorderButtonsProps) {
  const base =
    'flex h-3 w-4 items-center justify-center text-[8px] leading-none disabled:opacity-25 disabled:cursor-default';
  const tone = dark
    ? 'text-neutral-400 enabled:hover:text-white'
    : 'text-neutral-400 enabled:hover:text-neutral-800';

  return (
    <span className="flex shrink-0 flex-col">
      <button
        type="button"
        aria-label="Move up"
        title="Move up"
        disabled={!canUp}
        onClick={onUp}
        className={`${base} ${tone}`}
      >
        ▲
      </button>
      <button
        type="button"
        aria-label="Move down"
        title="Move down"
        disabled={!canDown}
        onClick={onDown}
        className={`${base} ${tone}`}
      >
        ▼
      </button>
    </span>
  );
}
