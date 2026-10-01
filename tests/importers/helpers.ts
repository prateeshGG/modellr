import { readFileSync } from 'fs';
import { join } from 'path';
import type { Table, Field, Relationship } from '../../src/types/schema';

export interface Result { tables: Table[]; relationships: Relationship[]; errors: string[] }

export const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

export function table(r: Result, name: string): Table {
  const t = r.tables.find((x) => x.name === name);
  if (!t) throw new Error(`table ${name} not found in [${r.tables.map((x) => x.name).join(', ')}]`);
  return t;
}

export function field(r: Result, tableName: string, fieldName: string): Field {
  const f = table(r, tableName).fields.find((x) => x.name === fieldName);
  if (!f) throw new Error(`field ${tableName}.${fieldName} not found`);
  return f;
}

/** "orders.user_id -> users.id (one-to-many)" strings for every relationship. */
export function relStrings(r: Result): string[] {
  const names = new Map<string, string>();
  const tnames = new Map<string, string>();
  for (const t of r.tables) {
    tnames.set(t.id, t.name);
    for (const f of t.fields) names.set(f.id, `${t.name}.${f.name}`);
  }
  return r.relationships.map(
    (x) => `${names.get(x.sourceFieldId)} -> ${names.get(x.targetFieldId)} (${x.cardinality})`
  );
}

export const pks = (t: Table) => t.fields.filter((f) => f.isPK).map((f) => f.name);

/** Every relationship must point at real tables and fields. */
export function assertIntegrity(r: Result): void {
  const tableIds = new Set(r.tables.map((t) => t.id));
  const fieldIds = new Set(r.tables.flatMap((t) => t.fields.map((f) => t.id + ':' + f.id)));
  for (const x of r.relationships) {
    if (!tableIds.has(x.sourceTableId) || !tableIds.has(x.targetTableId)) throw new Error('dangling table id');
    if (!fieldIds.has(x.sourceTableId + ':' + x.sourceFieldId)) throw new Error('dangling source field');
    if (!fieldIds.has(x.targetTableId + ':' + x.targetFieldId)) throw new Error('dangling target field');
  }
  const ids = new Set<string>();
  for (const t of r.tables) {
    if (ids.has(t.id)) throw new Error('duplicate table id');
    ids.add(t.id);
  }
}
