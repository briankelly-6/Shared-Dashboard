// Domain types mirror the Supabase tables (see supabase/migrations).

export type Pipeline = 'long' | 'short';
export type IdeaList = 'on_deck' | 'quick_cut' | 'whacky';
export type Side = 'L' | 'S';

export interface PipelineCompany {
  id: string;
  pipeline: Pipeline;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface WorkPlanItem {
  id: string;
  company_id: string;
  text: string;
  done: boolean;
  sort_order: number;
  created_at: string;
}

export interface IdeaRow {
  id: string;
  list: IdeaList;
  company: string;
  side: Side;
  thesis: string;
  sort_order: number;
  created_at: string;
}

export interface FridayTopic {
  id: string;
  text: string;
  done: boolean;
  sort_order: number;
  created_at: string;
}

// Shared shape every realtime row satisfies — used by the generic table hook.
export interface BaseRow {
  id: string;
  sort_order: number;
  created_at: string;
}
