import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { BaseRow } from '../lib/types';

interface Filter {
  column: string;
  value: string;
}

/** Stable ordering: sort_order asc, then created_at asc as a tiebreaker. */
function compareRows<T extends BaseRow>(a: T, b: T): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.created_at.localeCompare(b.created_at);
}

function sortRows<T extends BaseRow>(rows: T[]): T[] {
  return [...rows].sort(compareRows);
}

function applyChange<T extends BaseRow>(
  prev: T[],
  payload: RealtimePostgresChangesPayload<T>,
): T[] {
  switch (payload.eventType) {
    case 'INSERT': {
      const row = payload.new as T;
      // Merge by id so an optimistic local row isn't duplicated when its
      // own INSERT echoes back over the realtime channel.
      if (prev.some((r) => r.id === row.id)) {
        return sortRows(prev.map((r) => (r.id === row.id ? row : r)));
      }
      return sortRows([...prev, row]);
    }
    case 'UPDATE': {
      const row = payload.new as T;
      return sortRows(prev.map((r) => (r.id === row.id ? row : r)));
    }
    case 'DELETE': {
      const oldRow = payload.old as Partial<T>;
      return prev.filter((r) => r.id !== oldRow.id);
    }
    default:
      return prev;
  }
}

export interface RealtimeTable<T extends BaseRow> {
  rows: T[];
  loading: boolean;
  error: string | null;
  /** Optimistically insert a row. Caller supplies domain fields; the hook
   *  fills id / sort_order / created_at. Returns the generated row id. */
  insert: (values: Partial<T>) => Promise<string>;
  /** Optimistically patch a row by id. */
  update: (id: string, patch: Partial<T>) => Promise<void>;
  /** Optimistically remove a row by id. */
  remove: (id: string) => Promise<void>;
}

/**
 * Subscribes to a Postgres table (optionally filtered to one column value),
 * keeps a locally-sorted copy of the rows, and applies realtime INSERT /
 * UPDATE / DELETE events. Mutations are optimistic and reconciled by the
 * realtime echo, so all devices converge in ~1–2s without a refresh.
 */
export function useRealtimeTable<T extends BaseRow>(
  table: string,
  filter?: Filter,
): RealtimeTable<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref of current rows for mutation rollback / sort_order math
  // without forcing the mutation callbacks to depend on `rows`.
  const rowsRef = useRef<T[]>([]);
  rowsRef.current = rows;

  const filterColumn = filter?.column;
  const filterValue = filter?.value;

  useEffect(() => {
    let active = true;
    setLoading(true);

    (async () => {
      let query = supabase
        .from(table)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (filterColumn && filterValue !== undefined) {
        query = query.eq(filterColumn, filterValue);
      }
      const { data, error: qError } = await query;
      if (!active) return;
      if (qError) {
        setError(qError.message);
      } else {
        setError(null);
        setRows((data as T[]) ?? []);
      }
      setLoading(false);
    })();

    const channelName =
      filterColumn && filterValue !== undefined
        ? `rt:${table}:${filterColumn}=${filterValue}`
        : `rt:${table}:all`;

    const channel = supabase.channel(channelName).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filterColumn && filterValue !== undefined
          ? { filter: `${filterColumn}=eq.${filterValue}` }
          : {}),
      },
      (payload) => {
        setRows((prev) =>
          applyChange(prev, payload as RealtimePostgresChangesPayload<T>),
        );
      },
    );

    channel.subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [table, filterColumn, filterValue]);

  const insert = useCallback(
    async (values: Partial<T>): Promise<string> => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const maxOrder = rowsRef.current.reduce(
        (m, r) => Math.max(m, r.sort_order),
        0,
      );
      const optimistic = {
        id,
        sort_order: maxOrder + 1,
        created_at: new Date().toISOString(),
        ...(filterColumn && filterValue !== undefined
          ? { [filterColumn]: filterValue }
          : {}),
        ...values,
      } as unknown as T;

      setRows((prev) => sortRows([...prev, optimistic]));

      const { error: insErr } = await supabase.from(table).insert(optimistic);
      if (insErr) {
        // Roll back the optimistic row on failure.
        setRows((prev) => prev.filter((r) => r.id !== id));
        setError(insErr.message);
      }
      return id;
    },
    [table, filterColumn, filterValue],
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>): Promise<void> => {
      const before = rowsRef.current.find((r) => r.id === id);
      setRows((prev) =>
        sortRows(prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
      );
      const { error: updErr } = await supabase
        .from(table)
        .update(patch as Record<string, unknown>)
        .eq('id', id);
      if (updErr) {
        if (before) {
          setRows((prev) =>
            sortRows(prev.map((r) => (r.id === id ? before : r))),
          );
        }
        setError(updErr.message);
      }
    },
    [table],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      const before = rowsRef.current;
      setRows((prev) => prev.filter((r) => r.id !== id));
      const { error: delErr } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      if (delErr) {
        setRows(before);
        setError(delErr.message);
      }
    },
    [table],
  );

  return { rows, loading, error, insert, update, remove };
}
