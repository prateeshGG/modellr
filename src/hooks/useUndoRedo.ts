/**
 * Hook to access zundo temporal state (undo/redo) for the schema store.
 * Zundo v2 stores the temporal state on `store.temporal` as a vanilla Zustand store.
 */
import { useSyncExternalStore, useCallback } from 'react';
import { useSchemaStore } from '../store/schema';

type TemporalState = {
  pastStates: unknown[];
  futureStates: unknown[];
  undo: (steps?: number) => void;
  redo: (steps?: number) => void;
  clear: () => void;
};

function getTemporalStore() {
  // zundo attaches the temporal store to the Zustand store's `.temporal` property
  return (useSchemaStore as any).temporal as {
    getState: () => TemporalState;
    subscribe: (listener: () => void) => () => void;
  };
}

export function useUndoRedo() {
  const temporal = getTemporalStore();

  const pastCount = useSyncExternalStore(
    temporal.subscribe,
    () => temporal.getState().pastStates.length
  );
  const futureCount = useSyncExternalStore(
    temporal.subscribe,
    () => temporal.getState().futureStates.length
  );

  const undo = useCallback(() => temporal.getState().undo(), [temporal]);
  const redo = useCallback(() => temporal.getState().redo(), [temporal]);
  const clear = useCallback(() => temporal.getState().clear(), [temporal]);

  return {
    undo,
    redo,
    clear,
    canUndo: pastCount > 0,
    canRedo: futureCount > 0,
    pastCount,
    futureCount,
  };
}
