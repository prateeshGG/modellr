import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSchemaStore } from '../store/schema';
import { useUIStore } from '../store/ui';
import { supabase } from '../lib/supabase';

const SAVE_DEBOUNCE_MS = 2000;

export function useCloudPersistence(isSandbox: boolean = false) {
  const { id } = useParams();
  const [schemaOwnerId, setSchemaOwnerId] = useState<string | null>(null);

  // Track the last schema id we loaded so we can detect route changes
  const loadedId = useRef<string | undefined>(undefined);

  // ── Restore on mount / route change ─────────────────
  useEffect(() => {
    if (!id || isSandbox) return;
    // If we already loaded this exact schema id, skip (avoid double-loading)
    if (loadedId.current === id) return;
    loadedId.current = id;

    // Reset store to blank slate before loading new schema
    const store = useSchemaStore.getState();
    store.importTables([], []);
    store.setProjectName('Untitled schema');
    // Fix #14: reset lastSaved so StatusBar doesn't show stale "Saved" from previous schema
    store.setLastSaved(0);  // 0 is falsy → StatusBar renders nothing

    async function loadFromCloud() {
      const { data, error } = await supabase
        .from('schemas')
        .select('canvas_state, name, owner_id')
        .eq('id', id)
        .single();

      // Fix #7: surface load failure as a toast instead of silently leaving canvas blank
      if (error || !data) {
        useUIStore.getState().showToast(
          'Failed to load schema. Check your connection and try again.',
          'error'
        );
        return;
      }

      setSchemaOwnerId(data.owner_id);

      if (data.name) store.setProjectName(data.name);

      // Fix #2 + #44: load notes and groups from canvas_state
      if (data.canvas_state) {
        const state = data.canvas_state as any;
        store.setAllowGuestEdits(state.allowGuestEdits === true);

        if (Array.isArray(state.tables)) {
          store.importTables(
            state.tables,
            state.relationships || [],
            Array.isArray(state.notes)  ? state.notes  : [],
            Array.isArray(state.groups) ? state.groups : []
          );
        }
      }
    }
    loadFromCloud();
  }, [id, isSandbox]);

  // ── Subscribe and persist on change ───────────────
  useEffect(() => {
    if (!id || isSandbox) return;
    let timer: ReturnType<typeof setTimeout>;

    const unsub = useSchemaStore.subscribe((state) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        // Fix #67: set isSaving so StatusBar shows "Saving…"
        useSchemaStore.getState().setSaving(true);

        // Fix #2: include notes and groups in save payload
        const payload = {
          tables:          state.tables,
          relationships:   state.relationships,
          notes:           state.notes,
          groups:          state.groups,
          allowGuestEdits: state.allowGuestEdits,
        };

        // Fix #45: omit updated_at — let Supabase set it server-side
        const { error } = await supabase
          .from('schemas')
          .update({
            canvas_state: payload,
            name: state.projectName,
          })
          .eq('id', id);

        // Fix #67: clear saving state regardless of outcome
        useSchemaStore.getState().setSaving(false);

        // Fix #43: only mark saved on success; show toast on failure
        if (error) {
          useUIStore.getState().showToast('Auto-save failed. Changes may not be persisted.', 'error');
          return;
        }

        state.setLastSaved(Date.now());
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [id, isSandbox]);

  return { schemaOwnerId };
}
