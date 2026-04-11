import { create } from 'zustand';
import { temporal } from 'zundo';
import { nanoid } from '../store/nanoid';
import { useUIStore } from './ui';
import type {
  Table, Field, Relationship, Dialect, AccentColor, Snapshot, Note, Group
} from '../types/schema';
import { ACCENT_COLORS } from '../utils/constants';

interface SchemaState {
  tables: Table[];
  relationships: Relationship[];
  notes: Note[];
  groups: Group[];
  dialect: Dialect;
  projectName: string;
  isSaving: boolean;
  lastSaved: number | null;
  allowGuestEdits: boolean;
}

interface SchemaActions {
  setProjectName: (name: string) => void;
  setDialect: (dialect: Dialect) => void;
  setAllowGuestEdits: (allow: boolean) => void;

  addTable: (position: { x: number; y: number }) => string;
  removeTable: (id: string) => void;
  updateTable: (id: string, patch: Partial<Omit<Table, 'id'>>) => void;
  moveTable: (id: string, position: { x: number; y: number }) => void;

  addField: (tableId: string) => string;
  removeField: (tableId: string, fieldId: string) => void;
  updateField: (tableId: string, fieldId: string, patch: Partial<Omit<Field, 'id'>>) => void;
  reorderFields: (tableId: string, fromIndex: number, toIndex: number) => void;

  addRelationship: (rel: Omit<Relationship, 'id'>) => string;
  removeRelationship: (id: string) => void;
  updateRelationship: (id: string, patch: Partial<Omit<Relationship, 'id'>>) => void;

  addNote: (position: { x: number; y: number }) => string;
  removeNote: (id: string) => void;
  updateNote: (id: string, patch: Partial<Omit<Note, 'id'>>) => void;

  addGroup: (position: { x: number; y: number }) => string;
  removeGroup: (id: string) => void;
  updateGroup: (id: string, patch: Partial<Omit<Group, 'id'>>) => void;

  importTables: (tables: Table[], relationships: Relationship[], notes?: Note[], groups?: Group[], allowGuestEdits?: boolean) => void;
  loadSnapshot: (snapshot: Pick<Snapshot, 'tables' | 'relationships' | 'notes' | 'groups'>) => void;

  setSaving: (saving: boolean) => void;
  setLastSaved: (ts: number) => void;
  applyAIOperations: (ops: any[]) => void;
}

type SchemaStore = SchemaState & SchemaActions;

function nextAccentColor(tables: Table[]): AccentColor {
  return ACCENT_COLORS[tables.length % ACCENT_COLORS.length];
}

export type { SchemaState, SchemaActions, SchemaStore };

export const createSchemaLogic = (set: any, _get: any): SchemaStore => ({
  tables: [],
  relationships: [],
  notes: [],
  groups: [],
  dialect: 'postgres',
  projectName: 'Untitled schema',
  isSaving: false,
  lastSaved: null,
  allowGuestEdits: false,

  setProjectName: (name: string) => set({ projectName: name }),
  setDialect: (dialect: Dialect) => set({ dialect }),
  setAllowGuestEdits: (allow: boolean) => set({ allowGuestEdits: allow }),

  addTable: (position: {x: number, y: number}) => {
    if (useUIStore.getState().readOnly) return '';
    const id = nanoid();
    const defaultField: Field = {
      id: nanoid(),
      name: 'id',
      type: 'bigserial',
      nullable: false,
      unique: true,
      isPK: true,
      isFK: false,
    };
    set((s: SchemaStore) => ({
      tables: [
        ...s.tables,
        {
          id,
          name: 'new_table',
          fields: [defaultField],
          position,
          accentColor: nextAccentColor(s.tables),
        },
      ],
    }));
    return id;
  },

  removeTable: (id: string) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      tables: s.tables.filter((t: Table) => t.id !== id),
      relationships: s.relationships.filter(
        (r: Relationship) => r.sourceTableId !== id && r.targetTableId !== id
      ),
    }));
  },

  updateTable: (id: string, patch: Partial<Omit<Table, 'id'>>) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      tables: s.tables.map((t: Table) =>
        t.id === id ? { ...t, ...patch } : t
      ),
    }));
  },

  moveTable: (id: string, position: { x: number; y: number }) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      tables: s.tables.map((t: Table) =>
        t.id === id ? { ...t, position } : t
      ),
    }));
  },

  addField: (tableId: string) => {
    if (useUIStore.getState().readOnly) return '';
    const id = nanoid();
    set((s: SchemaStore) => ({
      tables: s.tables.map((t: Table) =>
        t.id === tableId
          ? {
              ...t,
              fields: [
                ...t.fields,
                {
                  id,
                  name: '',
                  type: 'text',
                  nullable: true,
                  unique: false,
                  isPK: false,
                  isFK: false,
                },
              ],
            }
          : t
      ),
    }));
    return id;
  },

  removeField: (tableId: string, fieldId: string) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      tables: s.tables.map((t: Table) =>
        t.id === tableId
          ? { ...t, fields: t.fields.filter((f: Field) => f.id !== fieldId) }
          : t
      ),
      relationships: s.relationships.filter(
        (r: Relationship) =>
          !(r.sourceTableId === tableId && r.sourceFieldId === fieldId) &&
          !(r.targetTableId === tableId && r.targetFieldId === fieldId)
      ),
    }));
  },

  updateField: (tableId: string, fieldId: string, patch: Partial<Omit<Field, 'id'>>) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      tables: s.tables.map((t: Table) =>
        t.id === tableId
          ? {
              ...t,
              fields: t.fields.map((f: Field) =>
                f.id === fieldId ? { ...f, ...patch } : f
              ),
            }
          : t
      ),
    }));
  },

  reorderFields: (tableId: string, fromIndex: number, toIndex: number) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      tables: s.tables.map((t: Table) => {
        if (t.id !== tableId) return t;
        const fields = [...t.fields];
        const [moved] = fields.splice(fromIndex, 1);
        fields.splice(toIndex, 0, moved);
        return { ...t, fields };
      }),
    }));
  },

  addRelationship: (rel: Omit<Relationship, 'id'>) => {
    if (useUIStore.getState().readOnly) return '';
    const id = nanoid();
    set((s: SchemaStore) => ({
      relationships: [...s.relationships, { id, ...rel }],
    }));
    return id;
  },

  removeRelationship: (id: string) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      relationships: s.relationships.filter((r: Relationship) => r.id !== id),
    }));
  },

  updateRelationship: (id: string, patch: Partial<Omit<Relationship, 'id'>>) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      relationships: s.relationships.map((r: Relationship) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    }));
  },

  addNote: (position: { x: number; y: number }) => {
    if (useUIStore.getState().readOnly) return '';
    const id = nanoid();
    set((s: SchemaStore) => ({
      notes: [
        ...s.notes,
        {
          id,
          content: '',
          position,
          color: 'amber' as AccentColor,  // Fix #39/#66: 'yellow' is not in AccentColor; 'amber' is the intended warm default
          width: 200,
          height: 150
        }
      ]
    }));
    return id;
  },

  removeNote: (id: string) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      notes: s.notes.filter((n: Note) => n.id !== id)
    }));
  },

  updateNote: (id: string, patch: Partial<Omit<Note, 'id'>>) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      notes: s.notes.map((n: Note) => n.id === id ? { ...n, ...patch } : n)
    }));
  },

  addGroup: (position: { x: number; y: number }) => {
    if (useUIStore.getState().readOnly) return '';
    const id = nanoid();
    set((s: SchemaStore) => ({
      groups: [
        ...s.groups,
        {
          id,
          name: 'New Table Group',
          position,
          color: 'gray' as AccentColor,
          width: 300,
          height: 300
        }
      ]
    }));
    return id;
  },

  removeGroup: (id: string) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      groups: s.groups.filter((g: Group) => g.id !== id),
      // Also release any tables that were assigned to this group
      tables: s.tables.map((t: Table) => t.groupId === id ? { ...t, groupId: undefined } : t)
    }));
  },

  updateGroup: (id: string, patch: Partial<Omit<Group, 'id'>>) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => ({
      groups: s.groups.map((g: Group) => g.id === id ? { ...g, ...patch } : g)
    }));
  },

  importTables: (tables: Table[], relationships: Relationship[], notes?: Note[], groups?: Group[], allowGuestEdits?: boolean) =>
    set((s: SchemaStore) => ({ tables, relationships, notes: notes || [], groups: groups || [], allowGuestEdits: allowGuestEdits ?? s.allowGuestEdits })),

  loadSnapshot: (snapshot: Pick<Snapshot, 'tables' | 'relationships' | 'notes' | 'groups'>) =>
    set({ tables: snapshot.tables, relationships: snapshot.relationships, notes: snapshot.notes || [], groups: snapshot.groups || [] }),

  setSaving: (isSaving: boolean) => set({ isSaving }),
  setLastSaved: (ts: number) => set({ lastSaved: ts }),
  applyAIOperations: (ops: any[]) => {
    if (useUIStore.getState().readOnly) return;
    set((s: SchemaStore) => {
      let currentTables = [...s.tables];
      let currentRelationships = [...s.relationships];
      
      let spawnX = 100;

      for (const op of ops) {
        if (op.action === 'add_table') {
          if (currentTables.find(t => t.name === op.tableName)) continue;
          const id = nanoid();
          currentTables.push({
            id,
            name: op.tableName,
            fields: (op.newFields || []).map((f: any) => ({ ...f, id: nanoid() })),
            position: { x: spawnX, y: 100 },
            accentColor: nextAccentColor(currentTables)
          });
          spawnX += 300;
        } 
        else if (op.action === 'remove_table') {
          currentTables = currentTables.filter(t => t.name !== op.tableName);
          const tId = s.tables.find(t => t.name === op.tableName)?.id;
          if (tId) {
            currentRelationships = currentRelationships.filter(r => r.sourceTableId !== tId && r.targetTableId !== tId);
          }
        }
        else if (op.action === 'add_field') {
          currentTables = currentTables.map(t => {
            if (t.name !== op.tableName) return t;
            const newF = op.newFields?.[0];
            if (!newF || t.fields.find(f => f.name === newF.name)) return t;
            return { ...t, fields: [...t.fields, { ...newF, id: nanoid() }] };
          });
        }
        else if (op.action === 'remove_field') {
          currentTables = currentTables.map(t => {
            if (t.name !== op.tableName) return t;
            return { ...t, fields: t.fields.filter(f => f.name !== op.fieldName) };
          });
        }
        else if (op.action === 'modify_field') {
          currentTables = currentTables.map(t => {
            if (t.name !== op.tableName) return t;
            return { 
              ...t, 
              fields: t.fields.map(f => f.name === op.fieldName ? { ...f, ...op.fieldUpdates } : f) 
            };
          });
        }
        else if (op.action === 'add_relationship') {
          const sTable = currentTables.find(t => t.name === op.tableName);
          const tTable = currentTables.find(t => t.name === op.relationTargetTable);
          if (sTable && tTable) {
            const sField = sTable.fields.find(f => f.name === op.fieldName);
            const tField = tTable.fields.find(f => f.name === op.relationTargetField);
            if (sField && tField) {
              currentRelationships.push({
                id: nanoid(),
                sourceTableId: sTable.id,
                sourceFieldId: sField.id,
                targetTableId: tTable.id,
                targetFieldId: tField.id,
                cardinality: op.relationCardinality || 'one-to-many'
              });
            }
          }
        }
      }
      return { tables: currentTables, relationships: currentRelationships };
    });
  }
});

export const useSchemaStore = create<SchemaStore>()(
  temporal(createSchemaLogic, {
    limit: 50,
    partialize: (state) => ({
      tables: state.tables,
      relationships: state.relationships,
      notes: state.notes,
      groups: state.groups,
    }),
  })
);
