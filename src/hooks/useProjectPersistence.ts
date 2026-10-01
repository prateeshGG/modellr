import { useEffect, useState } from 'react';
import { useSchemaStore } from '../store/schema';
import { useHistoryStore } from '../store/history';
import { useUIStore } from '../store/ui';
import { getProject, saveProject } from '../lib/projectStore';

const SAVE_DEBOUNCE_MS = 1500;

export type PersistenceStatus = 'loading' | 'ready' | 'missing';

/**
 * Loads a project from local storage into the editor stores and autosaves changes back.
 *
 * Safety properties (each fixes a bug found in the old cloud-sync hook):
 *  - Autosave only starts after a successful load, so a failed load can never overwrite the
 *    stored project with a blank canvas.
 *  - A late response for a previous project is ignored (`cancelled`), so switching projects
 *    can't write A's data into B.
 *  - Only real content changes (tables, relationships, notes, groups, name) trigger a save.
 *    Saving itself updates `isSaving`/`lastSaved`, which must not re-arm the timer.
 *  - Pending edits are flushed on tab hide, page unload and project switch.
 *  - Undo history is cleared after load so Ctrl+Z can't walk back to the pre-load blank state.
 */
export function useProjectPersistence(id: string | undefined): PersistenceStatus {
  // Status is keyed by project id so a lingering 'ready' from the previous project can't
  // arm autosave while the next project is still loading.
  const [result, setResult] = useState<{ id: string; status: PersistenceStatus } | null>(null);
  const status: PersistenceStatus = id && result?.id === id ? result.status : 'loading';

  // ── Load ────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const store = useSchemaStore.getState();
    store.importTables([], []);
    store.setProjectName('Untitled schema');
    store.setLastSaved(0);
    useHistoryStore.setState({ snapshots: [] });

    getProject(id)
      .then((project) => {
        if (cancelled) return;
        if (!project) {
          useUIStore.getState().showToast('That project no longer exists.', 'error');
          setResult({ id, status: 'missing' });
          return;
        }
        store.setProjectName(project.name);
        const state = project.canvas_state;
        if (state && Array.isArray(state.tables)) {
          store.importTables(
            state.tables,
            Array.isArray(state.relationships) ? state.relationships : [],
            Array.isArray(state.notes) ? state.notes : [],
            Array.isArray(state.groups) ? state.groups : [],
          );
        }
        useHistoryStore.setState({ snapshots: Array.isArray(project.snapshots) ? project.snapshots : [] });
        useSchemaStore.temporal.getState().clear();
        setResult({ id, status: 'ready' });
      })
      .catch(() => {
        if (cancelled) return;
        useUIStore.getState().showToast('Could not open this project from browser storage.', 'error');
        setResult({ id, status: 'missing' });
      });

    return () => { cancelled = true; };
  }, [id]);

  // ── Autosave ────────────────────────────────────────
  useEffect(() => {
    if (!id || status !== 'ready') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dirty = false;

    const flush = () => {
      if (!dirty) return;
      dirty = false;
      if (timer) { clearTimeout(timer); timer = undefined; }

      // Capture synchronously: by the time the write resolves the store may hold another project.
      const s = useSchemaStore.getState();
      const patch = {
        name: s.projectName,
        canvas_state: { tables: s.tables, relationships: s.relationships, notes: s.notes, groups: s.groups },
        snapshots: useHistoryStore.getState().snapshots,
      };
      s.setSaving(true);
      saveProject(id, patch)
        .then((saved) => {
          if (!saved) {
            useUIStore.getState().showToast('This project was deleted in another tab; changes were not saved.', 'error');
            return;
          }
          useSchemaStore.getState().setLastSaved(Date.now());
        })
        .catch(() => {
          dirty = true;
          useUIStore.getState().showToast('Auto-save failed (browser storage may be full or blocked).', 'error');
        })
        .finally(() => useSchemaStore.getState().setSaving(false));
    };

    const schedule = () => {
      dirty = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, SAVE_DEBOUNCE_MS);
    };

    const unsubSchema = useSchemaStore.subscribe((state, prev) => {
      if (
        state.tables === prev.tables &&
        state.relationships === prev.relationships &&
        state.notes === prev.notes &&
        state.groups === prev.groups &&
        state.projectName === prev.projectName
      ) return;
      schedule();
    });
    const unsubHistory = useHistoryStore.subscribe((state, prev) => {
      if (state.snapshots !== prev.snapshots) schedule();
    });

    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubSchema();
      unsubHistory();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [id, status]);

  return status;
}
