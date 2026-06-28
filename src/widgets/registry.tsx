import type { ComponentType } from 'react';
import { PipelineWidget } from './PipelineWidget';
import { IdeaTableWidget } from './IdeaTableWidget';
import { FridayTopicsWidget } from './FridayTopicsWidget';

export interface WidgetDef {
  id: string;
  title: string;
  /** Zero-prop component rendered inside the shared WidgetCard shell. */
  component: ComponentType;
  /** Column span on the desktop grid. Reserved for future drag/drop +
   *  "Add Widget"; all current widgets use span 1 (a 3×2 grid). */
  span: 1 | 2 | 3;
}

// Thin zero-prop wrappers so the registry stays a plain config array.
const LongPipeline = () => <PipelineWidget pipeline="long" />;
const ShortPipeline = () => <PipelineWidget pipeline="short" />;
const OnDeck = () => <IdeaTableWidget list="on_deck" />;
const QuickCut = () => <IdeaTableWidget list="quick_cut" />;
const Whacky = () => <IdeaTableWidget list="whacky" />;

/**
 * The single source of truth for what renders on the dashboard. Widgets are
 * driven from this array (never hard-coded positions) so drag/drop and
 * "Add Widget" can be layered on later without touching layout code.
 */
export const WIDGETS: WidgetDef[] = [
  { id: 'long-pipeline', title: 'Long Pipeline — Active Work', component: LongPipeline, span: 1 },
  { id: 'short-pipeline', title: 'Short Pipeline — Active Work', component: ShortPipeline, span: 1 },
  { id: 'on-deck', title: 'On Deck Circle', component: OnDeck, span: 1 },
  { id: 'quick-cut', title: 'Quick Cut Pipeline', component: QuickCut, span: 1 },
  { id: 'whacky', title: 'Whacky Ideas', component: Whacky, span: 1 },
  { id: 'friday-core', title: 'Friday Catch Up Topics', component: FridayTopicsWidget, span: 1 },
];
