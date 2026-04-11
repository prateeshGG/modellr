import { create } from 'zustand';
import { nanoid } from '../store/nanoid';
import { useSchemaStore } from './schema';
import type { Snapshot } from '../types/schema';

interface HistoryState {
  snapshots: Snapshot[];
}

interface HistoryActions {
  createSnapshot: (label?: string) => string;
  deleteSnapshot: (id: string) => void;
  restoreSnapshot: (id: string) => void;
}

type HistoryStore = HistoryState & HistoryActions;

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  snapshots: [],

  createSnapshot: (label) => {
    // Fix #3: capture notes and groups in addition to tables and relationships
    const { tables, relationships, notes, groups } = useSchemaStore.getState();
    const id = nanoid();
    const autoLabel = label ?? `Snapshot at ${new Date().toLocaleTimeString()}`;
    const snapshot: Snapshot = {
      id,
      label: autoLabel,
      timestamp: Date.now(),
      tables:        JSON.parse(JSON.stringify(tables)),
      relationships: JSON.parse(JSON.stringify(relationships)),
      notes:         JSON.parse(JSON.stringify(notes)),
      groups:        JSON.parse(JSON.stringify(groups)),
    };
    set((s) => ({ snapshots: [snapshot, ...s.snapshots].slice(0, 50) }));
    return id;
  },

  deleteSnapshot: (id) =>
    set((s) => ({ snapshots: s.snapshots.filter((snap) => snap.id !== id) })),

  restoreSnapshot: (id) => {
    const snapshot = get().snapshots.find((s) => s.id === id);
    if (!snapshot) return;
    useSchemaStore.getState().loadSnapshot(snapshot);
  },
}));
