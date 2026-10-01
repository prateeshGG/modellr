import type { Field, Relationship, Table } from '../types/schema';
import type { FieldDiff, RelationshipDiff, TableDiff } from './exporters/migrations';

/** True when a column differs in a way that matters for a migration. */
export function fieldChanged(a: Field, b: Field): boolean {
  return (
    a.type !== b.type ||
    a.nullable !== b.nullable ||
    a.unique !== b.unique ||
    a.isPK !== b.isPK ||
    (a.default ?? null) !== (b.default ?? null) ||
    (a.length ?? null) !== (b.length ?? null) ||
    (a.precision ?? null) !== (b.precision ?? null) ||
    (a.scale ?? null) !== (b.scale ?? null)
  );
}

/**
 * Compare two schemas by table and column NAME (ids are not stable across snapshots/imports).
 * A renamed table or column therefore appears as removed + added.
 */
export function diffSchemas(before: { tables: Table[] }, after: { tables: Table[] }): TableDiff[] {
  const diffs: TableDiff[] = [];
  const beforeMap = new Map(before.tables.map((t) => [t.name, t]));
  const afterMap = new Map(after.tables.map((t) => [t.name, t]));

  for (const [name, table] of beforeMap) {
    if (!afterMap.has(name)) diffs.push({ kind: 'removed', table });
  }
  for (const [name, table] of afterMap) {
    if (!beforeMap.has(name)) diffs.push({ kind: 'added', table });
  }

  for (const [name, afterTable] of afterMap) {
    const beforeTable = beforeMap.get(name);
    if (!beforeTable) continue;

    const fieldDiffs: FieldDiff[] = [];
    const beforeFields = new Map(beforeTable.fields.map((f) => [f.name, f]));
    const afterFields = new Map(afterTable.fields.map((f) => [f.name, f]));

    for (const [fn, f] of beforeFields) {
      if (!afterFields.has(fn)) fieldDiffs.push({ kind: 'removed', field: f });
    }
    for (const [fn, f] of afterFields) {
      const bf = beforeFields.get(fn);
      if (!bf) fieldDiffs.push({ kind: 'added', field: f });
      else if (fieldChanged(bf, f)) fieldDiffs.push({ kind: 'changed', before: bf, after: f });
    }

    if (fieldDiffs.length > 0) diffs.push({ kind: 'changed', tableName: name, fields: fieldDiffs });
  }

  return diffs;
}

interface NamedRel { key: string; rel: RelationshipDiff }

function nameRelationships(tables: Table[], relationships: Relationship[]): NamedRel[] {
  const byId = new Map(tables.map((t) => [t.id, t]));
  const out: NamedRel[] = [];
  for (const r of relationships) {
    const st = byId.get(r.sourceTableId);
    const tt = byId.get(r.targetTableId);
    const sf = st?.fields.find((f) => f.id === r.sourceFieldId);
    const tf = tt?.fields.find((f) => f.id === r.targetFieldId);
    if (!st || !tt || !sf || !tf) continue;
    const rel: RelationshipDiff = {
      kind: 'added',
      sourceTable: st.name,
      sourceColumn: sf.name,
      targetTable: tt.name,
      targetColumn: tf.name,
    };
    out.push({ key: `${st.name}.${sf.name}->${tt.name}.${tf.name}`, rel });
  }
  return out;
}

/** Foreign keys present only in `after` are 'added'; present only in `before` are 'removed'. */
export function diffRelationships(
  before: { tables: Table[]; relationships: Relationship[] },
  after: { tables: Table[]; relationships: Relationship[] },
): RelationshipDiff[] {
  const b = new Map(nameRelationships(before.tables, before.relationships).map((n) => [n.key, n.rel]));
  const a = new Map(nameRelationships(after.tables, after.relationships).map((n) => [n.key, n.rel]));
  const diffs: RelationshipDiff[] = [];
  for (const [key, rel] of b) if (!a.has(key)) diffs.push({ ...rel, kind: 'removed' });
  for (const [key, rel] of a) if (!b.has(key)) diffs.push({ ...rel, kind: 'added' });
  return diffs;
}
