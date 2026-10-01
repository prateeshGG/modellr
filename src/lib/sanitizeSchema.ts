/**
 * Validation for schema data that comes from outside the editor: share links, embed links,
 * imported JSON files. Anything malformed is repaired or dropped instead of reaching the
 * canvas, where a missing `fields` array or non-numeric position would crash rendering.
 */
import type { AccentColor, Cardinality, Field, Group, Note, Relationship, Table } from '../types/schema';
import type { CanvasState } from './projectStore';

const ACCENTS: AccentColor[] = ['blue', 'teal', 'coral', 'purple', 'amber', 'green', 'pink', 'gray'];
const CARDINALITIES: Cardinality[] = ['one-to-one', 'one-to-many', 'many-to-many'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const optStr = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const optNum = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const accent = (v: unknown, fallback: AccentColor = 'blue'): AccentColor =>
  ACCENTS.includes(v as AccentColor) ? (v as AccentColor) : fallback;

function position(v: unknown, index: number): { x: number; y: number } {
  const p = isObj(v) ? v : {};
  return { x: num(p.x, (index % 6) * 300), y: num(p.y, Math.floor(index / 6) * 360) };
}

function cleanField(raw: unknown, tableIdx: number, fieldIdx: number): Field | null {
  if (!isObj(raw)) return null;
  const field: Field = {
    id: str(raw.id) || `f${tableIdx}_${fieldIdx}`,
    name: str(raw.name, 'column'),
    type: str(raw.type, 'text'),
    nullable: typeof raw.nullable === 'boolean' ? raw.nullable : true,
    unique: raw.unique === true,
    isPK: raw.isPK === true,
    isFK: raw.isFK === true,
  };
  const def = optStr(raw.default);
  if (def !== undefined) field.default = def;
  const check = optStr(raw.check);
  if (check !== undefined) field.check = check;
  const comment = optStr(raw.comment);
  if (comment !== undefined) field.comment = comment;
  if (raw.aiGenerated === true) field.aiGenerated = true;
  const length = optNum(raw.length);
  if (length !== undefined) field.length = length;
  const precision = optNum(raw.precision);
  if (precision !== undefined) field.precision = precision;
  const scale = optNum(raw.scale);
  if (scale !== undefined) field.scale = scale;
  return field;
}

/** Returns a safe CanvasState, or null when the input has no usable `tables` array. */
export function sanitizeCanvasState(input: unknown): CanvasState | null {
  if (!isObj(input) || !Array.isArray(input.tables)) return null;

  const tableIds = new Set<string>();
  const fieldIds = new Set<string>();
  const tables: Table[] = [];

  input.tables.forEach((raw, i) => {
    if (!isObj(raw)) return;
    let id = str(raw.id) || `t${i}`;
    if (tableIds.has(id)) id = `${id}_${i}`;
    tableIds.add(id);
    const fields: Field[] = [];
    (Array.isArray(raw.fields) ? raw.fields : []).forEach((f, j) => {
      const field = cleanField(f, i, j);
      if (!field) return;
      if (fieldIds.has(field.id)) field.id = `${field.id}_${i}_${j}`;
      fieldIds.add(field.id);
      fields.push(field);
    });
    const table: Table = {
      id,
      name: str(raw.name, `table_${i}`),
      fields,
      position: position(raw.position, i),
      accentColor: accent(raw.accentColor, ACCENTS[i % ACCENTS.length]),
    };
    const comment = optStr(raw.comment);
    if (comment !== undefined) table.comment = comment;
    const groupId = optStr(raw.groupId);
    if (groupId !== undefined) table.groupId = groupId;
    tables.push(table);
  });

  const fieldTable = new Map<string, string>();
  for (const t of tables) for (const f of t.fields) fieldTable.set(f.id, t.id);

  const relationships: Relationship[] = [];
  const relIds = new Set<string>();
  (Array.isArray(input.relationships) ? input.relationships : []).forEach((raw, i) => {
    if (!isObj(raw)) return;
    const r: Relationship = {
      id: str(raw.id) || `r${i}`,
      sourceTableId: str(raw.sourceTableId),
      sourceFieldId: str(raw.sourceFieldId),
      targetTableId: str(raw.targetTableId),
      targetFieldId: str(raw.targetFieldId),
      cardinality: CARDINALITIES.includes(raw.cardinality as Cardinality) ? (raw.cardinality as Cardinality) : 'one-to-many',
    };
    // Drop relationships whose endpoints don't exist; they would render as broken edges.
    if (fieldTable.get(r.sourceFieldId) !== r.sourceTableId || fieldTable.get(r.targetFieldId) !== r.targetTableId) return;
    if (relIds.has(r.id)) r.id = `${r.id}_${i}`;
    relIds.add(r.id);
    relationships.push(r);
  });

  const notes: Note[] = [];
  (Array.isArray(input.notes) ? input.notes : []).forEach((raw, i) => {
    if (!isObj(raw)) return;
    notes.push({
      id: str(raw.id) || `n${i}`,
      content: str(raw.content),
      position: position(raw.position, i),
      color: accent(raw.color, 'amber'),
      width: num(raw.width, 220),
      height: num(raw.height, 140),
    });
  });

  const groups: Group[] = [];
  (Array.isArray(input.groups) ? input.groups : []).forEach((raw, i) => {
    if (!isObj(raw)) return;
    groups.push({
      id: str(raw.id) || `g${i}`,
      name: str(raw.name, 'Group'),
      color: accent(raw.color, 'gray'),
      position: position(raw.position, i),
      width: num(raw.width, 600),
      height: num(raw.height, 400),
    });
  });

  return { tables, relationships, notes, groups };
}
