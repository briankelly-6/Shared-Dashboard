import { useEffect, useState } from 'react';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import type { Pipeline, PipelineCompany, WorkPlanItem } from '../lib/types';
import { Checklist } from '../components/Checklist';
import { ReorderButtons } from '../components/ReorderButtons';

interface PipelineWidgetProps {
  pipeline: Pipeline;
}

interface MenuState {
  id: string;
  x: number;
  y: number;
}

/**
 * Long / Short Pipeline — Active Work. Master-detail: a company list on the
 * left, the selected company's Work Plan checklist on the right. The two
 * pipelines share this component but read/write fully separate data.
 *
 * Company rows: left-click selects (opens the work plan); right-click opens a
 * small menu to Edit (rename inline) or Delete.
 */
export function PipelineWidget({ pipeline }: PipelineWidgetProps) {
  const companies = useRealtimeTable<PipelineCompany>('pipeline_companies', {
    column: 'pipeline',
    value: pipeline,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [draftName, setDraftName] = useState('');

  // Keep a valid selection: default to the first company; clear if emptied.
  useEffect(() => {
    if (companies.rows.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !companies.rows.some((c) => c.id === selectedId)) {
      setSelectedId(companies.rows[0].id);
    }
  }, [companies.rows, selectedId]);

  // Close the context menu on Escape.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  const addCompany = async () => {
    const name = draftName.trim();
    if (!name) return;
    setDraftName('');
    const id = await companies.insert({ name });
    setSelectedId(id);
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Master: company list */}
      <div className="flex w-2/5 min-w-[120px] flex-col border-r border-neutral-200">
        <ul className="min-h-0 flex-1 overflow-auto">
          {!companies.loading && companies.rows.length === 0 && (
            <li className="px-2 py-2 text-xs italic text-neutral-400">
              No companies yet.
            </li>
          )}
          {companies.rows.map((company, i) => {
            const active = company.id === selectedId;
            const editing = company.id === editingId;
            return (
              <li
                key={company.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ id: company.id, x: e.clientX, y: e.clientY });
                }}
                className={`group flex items-center gap-1 px-1 ${
                  active
                    ? 'bg-navy-100 text-navy-900'
                    : `${i % 2 ? 'bg-neutral-100' : 'bg-white'} hover:bg-neutral-200`
                }`}
              >
                <ReorderButtons
                  canUp={i > 0}
                  canDown={i < companies.rows.length - 1}
                  onUp={() => companies.move(company.id, 'up')}
                  onDown={() => companies.move(company.id, 'down')}
                />
                {editing ? (
                  <input
                    autoFocus
                    aria-label="Company name"
                    defaultValue={company.name}
                    onBlur={(e) => {
                      if (e.target.value !== company.name) {
                        companies.update(company.id, { name: e.target.value });
                      }
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      } else if (e.key === 'Escape') {
                        e.currentTarget.value = company.name;
                        e.currentTarget.blur();
                      }
                    }}
                    className="min-w-0 flex-1 bg-white px-1 py-1 text-[13px] text-neutral-900"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedId(company.id)}
                    title="Click to open work plan · right-click to edit or delete"
                    className="min-w-0 flex-1 cursor-pointer truncate px-1 py-1 text-left text-[13px]"
                  >
                    {company.name || (
                      <span className="italic text-neutral-400">Unnamed</span>
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex shrink-0 items-center gap-1 border-t border-neutral-200 px-1 py-1.5">
          <input
            type="text"
            value={draftName}
            placeholder="Add company…"
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addCompany();
            }}
            className="w-full min-w-0 px-1 py-0.5 text-[13px] text-neutral-900 placeholder:text-neutral-400"
          />
          <button
            type="button"
            onClick={() => void addCompany()}
            disabled={!draftName.trim()}
            className="shrink-0 border border-neutral-300 px-1.5 py-0.5 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      {/* Detail: work plan for the selected company */}
      <div className="min-h-0 flex-1">
        {selectedId ? (
          <WorkPlan companyId={selectedId} key={selectedId} />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs italic text-neutral-400">
            Select or add a company to build its work plan.
          </div>
        )}
      </div>

      {/* Right-click menu: Edit / Delete */}
      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <div
            className="fixed z-50 min-w-[130px] border border-neutral-300 bg-white py-1 text-[13px] shadow-md"
            style={{ top: menu.y, left: menu.x }}
          >
            <button
              type="button"
              className="block w-full px-3 py-1 text-left text-neutral-800 hover:bg-neutral-100"
              onClick={() => {
                setSelectedId(menu.id);
                setEditingId(menu.id);
                setMenu(null);
              }}
            >
              Edit name
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1 text-left text-red-600 hover:bg-neutral-100"
              onClick={() => {
                companies.remove(menu.id);
                setMenu(null);
              }}
            >
              Delete company
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface WorkPlanProps {
  companyId: string;
}

/** The selected company's Work Plan — a checklist of to-dos. */
function WorkPlan({ companyId }: WorkPlanProps) {
  const items = useRealtimeTable<WorkPlanItem>('work_plan_items', {
    column: 'company_id',
    value: companyId,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-neutral-200 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        Work Plan
      </div>
      <div className="min-h-0 flex-1">
        <Checklist
          items={items.rows}
          loading={items.loading}
          addPlaceholder="Add to-do…"
          emptyLabel="No to-dos yet."
          onAdd={(text) => void items.insert({ text, done: false })}
          onToggle={(id, done) => void items.update(id, { done })}
          onEdit={(id, text) => void items.update(id, { text })}
          onDelete={(id) => void items.remove(id)}
          onMove={(id, direction) => void items.move(id, direction)}
        />
      </div>
    </div>
  );
}
