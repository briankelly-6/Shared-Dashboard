import { useRealtimeTable } from '../hooks/useRealtimeTable';
import type { IdeaList, IdeaRow, Side } from '../lib/types';
import { InlineText } from '../components/InlineText';

interface IdeaTableWidgetProps {
  list: IdeaList;
}

/**
 * Flat idea table — Company | L/S | Thesis. Backs three independent widgets
 * (On Deck Circle, Quick Cut Pipeline, Whacky Ideas) over separate data.
 */
export function IdeaTableWidget({ list }: IdeaTableWidgetProps) {
  const rows = useRealtimeTable<IdeaRow>('idea_rows', {
    column: 'list',
    value: list,
  });

  const addRow = () => {
    void rows.insert({ company: '', side: 'L', thesis: '' });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-neutral-200 text-left text-[10px] uppercase tracking-wider text-neutral-400">
              <th className="w-[38%] px-2 py-1 font-semibold">Company</th>
              <th className="w-[64px] px-2 py-1 font-semibold">L/S</th>
              <th className="px-2 py-1 font-semibold">Thesis</th>
              <th className="w-[28px] px-1 py-1" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {!rows.loading && rows.rows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-2 py-2 text-xs italic text-neutral-400"
                >
                  No ideas yet.
                </td>
              </tr>
            )}
            {rows.rows.map((row) => (
              <tr key={row.id} className="group align-top hover:bg-neutral-50">
                <td className="px-1 py-0.5">
                  <InlineText
                    value={row.company}
                    placeholder="Company"
                    ariaLabel="Company"
                    onCommit={(company) => rows.update(row.id, { company })}
                  />
                </td>
                <td className="px-1 py-0.5">
                  <select
                    value={row.side}
                    aria-label="Long or Short"
                    onChange={(e) =>
                      rows.update(row.id, { side: e.target.value as Side })
                    }
                    className="w-full cursor-pointer px-1 py-0.5 text-[13px] text-neutral-900 hover:bg-neutral-100"
                  >
                    <option value="L">Long</option>
                    <option value="S">Short</option>
                  </select>
                </td>
                <td className="px-1 py-0.5">
                  <InlineText
                    value={row.thesis}
                    placeholder="Thesis…"
                    ariaLabel="Thesis"
                    multiline
                    onCommit={(thesis) => rows.update(row.id, { thesis })}
                  />
                </td>
                <td className="px-1 py-0.5 text-right">
                  <button
                    type="button"
                    aria-label="Delete row"
                    title="Delete row"
                    onClick={() => rows.remove(row.id)}
                    className="px-1 text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 border-t border-neutral-200 px-2 py-1.5">
        <button
          type="button"
          onClick={addRow}
          className="border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-100"
        >
          + Add row
        </button>
      </div>
    </div>
  );
}
