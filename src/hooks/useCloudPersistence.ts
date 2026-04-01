import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSchemaStore } from '../store/schema';
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

    async function loadFromCloud() {
      const { data, error } = await supabase
        .from('schemas')
        .select('canvas_state, name, owner_id')
        .eq('id', id)
        .single();

      if (error || !data) return;

      setSchemaOwnerId(data.owner_id);

      // Set the project name from DB always
      if (data.name) store.setProjectName(data.name);

      // Load canvas state if it exists
      if (data.canvas_state) {
        const state = data.canvas_state as any;
        const allowGuests = state.allowGuestEdits === true;
        store.setAllowGuestEdits(allowGuests);
        
        if (Array.isArray(state.tables)) {
          store.importTables(state.tables, state.relationships || [], allowGuests);
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
        const payload = {
          tables: state.tables,
          relationships: state.relationships,
          allowGuestEdits: state.allowGuestEdits,
        };

        // We do a fire-and-forget update to Supabase
        await supabase
          .from('schemas')
          .update({ 
            canvas_state: payload, 
            name: state.projectName,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

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
