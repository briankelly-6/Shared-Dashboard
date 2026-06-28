import { useRealtimeTable } from '../hooks/useRealtimeTable';
import type { FridayTopic } from '../lib/types';
import { Checklist } from '../components/Checklist';

/**
 * Friday Catch Up Topics — a simple shared checklist of topic lines. Checking a
 * topic closes it with a red strikethrough; a separate control deletes it.
 */
export function FridayTopicsWidget() {
  const topics = useRealtimeTable<FridayTopic>('friday_topics');

  return (
    <Checklist
      items={topics.rows}
      loading={topics.loading}
      addPlaceholder="Add topic…"
      emptyLabel="No topics yet."
      onAdd={(text) => void topics.insert({ text, done: false })}
      onToggle={(id, done) => void topics.update(id, { done })}
      onEdit={(id, text) => void topics.update(id, { text })}
      onDelete={(id) => void topics.remove(id)}
      onMove={(id, direction) => void topics.move(id, direction)}
    />
  );
}
