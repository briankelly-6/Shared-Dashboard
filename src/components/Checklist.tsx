import { useState } from 'react';
import { InlineText } from './InlineText';
import { ReorderButtons } from './ReorderButtons';

export interface ChecklistItemData {
  id: string;
  text: string;
  done: boolean;
}

interface ChecklistProps {
  items: ChecklistItemData[];
  loading?: boolean;
  onAdd: (text: string) => void;
  onToggle: (id: string, done: boolean) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMove?: (id: string, direction: 'up' | 'down') => void;
  addPlaceholder?: string;
  emptyLabel?: string;
}

/**
 * Presentational checklist: checkbox + inline-editable text + delete control.
 * Checking a line strikes it through in red (toggleable). Used by both the
 * pipeline work plans and the Friday Catch Up Topics widget.
 */
export function Checklist({
  items,
  loading = false,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
  onMove,
  addPlaceholder = 'Add item…',
  emptyLabel = 'No items yet.',
}: ChecklistProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ul className="min-h-0 flex-1 overflow-auto">
        {!loading && items.length === 0 && (
          <li className="px-3 py-2 text-xs italic text-neutral-400">
            {emptyLabel}
          </li>
        )}
        {items.map((item, i) => (
          <li
            key={item.id}
            className={`group flex items-center gap-2 px-2 py-1 ${
              i % 2 ? 'bg-neutral-100' : 'bg-white'
            } hover:bg-neutral-200`}
          >
            {onMove && (
              <ReorderButtons
                canUp={i > 0}
                canDown={i < items.length - 1}
                onUp={() => onMove(item.id, 'up')}
                onDown={() => onMove(item.id, 'down')}
              />
            )}
            <input
              type="checkbox"
              checked={item.done}
              aria-label={item.done ? 'Mark not done' : 'Mark done'}
              onChange={(e) => onToggle(item.id, e.target.checked)}
              className="h-3.5 w-3.5 shrink-0 accent-neutral-800"
            />
            <InlineText
              value={item.text}
              strike={item.done}
              ariaLabel="Item text"
              onCommit={(text) => onEdit(item.id, text)}
              className="text-[13px]"
            />
            <button
              type="button"
              aria-label="Delete item"
              title="Delete"
              onClick={() => onDelete(item.id)}
              className="shrink-0 px-1 text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="flex shrink-0 items-center gap-1 border-t border-neutral-200 px-2 py-1.5">
        <input
          type="text"
          value={draft}
          placeholder={addPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          className="flex-1 px-1 py-0.5 text-[13px] text-neutral-900 placeholder:text-neutral-400"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="shrink-0 border border-emerald-600 bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-700"
        >
          Add
        </button>
      </div>
    </div>
  );
}
