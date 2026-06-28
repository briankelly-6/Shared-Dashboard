import { useEffect, useState } from 'react';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import type { Pipeline, PipelineCompany, WorkPlanItem } from '../lib/types';
import { InlineText } from '../components/InlineText';
import { Checklist } from '../components/Checklist';

interface PipelineWidgetProps {
  pipeline: Pipeline;
}

/**
 * Long / Short Pipeline — Active Work. Master-detail: a company list on the
 * left, the selected company's Work Plan checklist on the right. The two
 * pipelines share this component but read/write fully separate data.
 */
export function PipelineWidget({ pipeline }: PipelineWidgetProps) {
  const companies = useRealtimeTable<PipelineCompany>('pipeline_companies', {
    column: 'pipeline',
    value: pipeline,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
        <ul className="min-h-0 flex-1 divide-y divide-neutral-100 overflow-auto">
          {!companies.loading && companies.rows.length === 0 && (
            <li className="px-2 py-2 text-xs italic text-neutral-400">
              No companies yet.
            </li>
          )}
          {companies.rows.map((company) => {
            const active = company.id === selectedId;
            return (
              <li
                key={company.id}
                className={`group flex items-center gap-1 px-1 ${
                  active ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(company.id)}
                  className="shrink-0 px-1 py-1 text-left text-[11px] text-neutral-400"
                  aria-label={`Select ${company.name || 'company'}`}
                  title="Select"
                >
                  {active ? '▸' : '·'}
                </button>
                <InlineText
                  value={company.name}
                  placeholder="Company"
                  ariaLabel="Company name"
                  onCommit={(name) => companies.update(company.id, { name })}
                  className={`text-[13px] ${
                    active
                      ? 'text-white placeholder:text-neutral-400 focus:bg-neutral-700'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  aria-label="Delete company"
                  title="Delete company"
                  onClick={() => companies.remove(company.id)}
                  className={`shrink-0 px-1 opacity-0 transition group-hover:opacity-100 hover:text-red-500 ${
                    active ? 'text-neutral-300' : 'text-neutral-300'
                  }`}
                >
                  ✕
                </button>
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
        />
      </div>
    </div>
  );
}
