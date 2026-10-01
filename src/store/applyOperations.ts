import { nanoid } from './nanoid';
import { ACCENT_COLORS } from '../utils/constants';
import type { AccentColor, Cardinality, Field, Relationship, Table } from '../types/schema';

/** One structural change proposed by the AI assistant (already validated by lib/aiPrompts). */
export interface AIOperation {
  action: string;
  tableName?: string;
  fieldName?: string;
  newFields?: Partial<Field>[];
  fieldUpdates?: Partial<Field>;
  relationTargetTable?: string;
  relationTargetField?: string;
  relationCardinality?: Cardinality | string;
}

function nextAccentColor(tables: Table[]): AccentColor {
  return ACCENT_COLORS[tables.length % ACCENT_COLORS.length];
}

/**
 * Apply AI operations to a schema without mutating the inputs (the previous state is also held by
 * the undo history, so mutating it would corrupt undo).
 *
 * Operations address tables by NAME. Tables are kept in an array rather than a name-keyed map on
 * purpose: several tables can share a name (every "New table" starts as `new_table`), and a map
 * silently collapsed them into one, deleting the others. A name lookup resolves to the first match.
 *
 * Returns null when nothing changed.
 */
export function applyOperations(
  tables: Table[],
  relationships: Relationship[],
  ops: AIOperation[],
): { tables: Table[]; relationships: Relationship[] } | null {
  const list: Table[] = tables.map((t) => ({ ...t, fields: [...t.fields] }));
  let rels: Relationship[] = [...relationships];
  const byName = (name: string | undefined) => (name === undefined ? undefined : list.find((t) => t.name === name));

  // Place AI-created tables to the right of everything that already exists.
  let spawnX = tables.length > 0 ? Math.max(...tables.map((t) => t.position.x)) + 340 : 100;
  let changed = false;

  for (const op of ops) {
    switch (op.action) {
      case 'add_table': {
        if (!op.tableName || byName(op.tableName)) break;
        list.push({
          id: nanoid(),
          name: op.tableName,
          fields: (op.newFields ?? []).map((f) => ({ ...(f as Field), id: nanoid() })),
          position: { x: spawnX, y: 100 },
          accentColor: nextAccentColor(list),
        });
        spawnX += 300;
        changed = true;
        break;
      }
      case 'remove_table': {
        const idx = list.findIndex((t) => t.name === op.tableName);
        if (idx === -1) break;
        const [removed] = list.splice(idx, 1);
        rels = rels.filter((r) => r.sourceTableId !== removed.id && r.targetTableId !== removed.id);
        changed = true;
        break;
      }
      case 'add_field': {
        const table = byName(op.tableName);
        const newF = op.newFields?.[0];
        if (table && newF && !table.fields.some((f) => f.name === newF.name)) {
          table.fields.push({ ...(newF as Field), id: nanoid() });
          changed = true;
        }
        break;
      }
      case 'remove_field': {
        const table = byName(op.tableName);
        const removed = table?.fields.find((f) => f.name === op.fieldName);
        if (table && removed) {
          table.fields = table.fields.filter((f) => f.id !== removed.id);
          // Drop relationships that pointed at the removed field so none are left dangling.
          rels = rels.filter((r) => r.sourceFieldId !== removed.id && r.targetFieldId !== removed.id);
          changed = true;
        }
        break;
      }
      case 'modify_field': {
        const table = byName(op.tableName);
        const field = table?.fields.find((f) => f.name === op.fieldName);
        if (table && field) {
          // Never let a model overwrite the field id.
          const updates: Record<string, unknown> = { ...(op.fieldUpdates ?? {}) };
          delete updates.id;
          table.fields = table.fields.map((f) => (f.id === field.id ? { ...f, ...updates } : f));
          changed = true;
        }
        break;
      }
      case 'add_relationship': {
        const sTable = byName(op.tableName);
        const tTable = byName(op.relationTargetTable);
        const sField = sTable?.fields.find((f) => f.name === op.fieldName);
        const tField = tTable?.fields.find((f) => f.name === op.relationTargetField);
        if (!sTable || !tTable || !sField || !tField) break;
        const duplicate = rels.some(
          (r) =>
            r.sourceTableId === sTable.id && r.sourceFieldId === sField.id &&
            r.targetTableId === tTable.id && r.targetFieldId === tField.id,
        );
        if (duplicate) break;
        sTable.fields = sTable.fields.map((f) => (f.id === sField.id ? { ...f, isFK: true } : f));
        rels.push({
          id: nanoid(),
          sourceTableId: sTable.id,
          sourceFieldId: sField.id,
          targetTableId: tTable.id,
          targetFieldId: tField.id,
          cardinality: (op.relationCardinality as Cardinality) || 'one-to-many',
        });
        changed = true;
        break;
      }
    }
  }

  return changed ? { tables: list, relationships: rels } : null;
}
