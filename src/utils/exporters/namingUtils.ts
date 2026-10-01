import type { Field } from '../../types/schema';
import { isOneToOne, type ResolvedRel } from './sqlUtils';

/** Naming helpers shared by the ORM exporters (Prisma / Drizzle). */

export function splitWords(name: string): string[] {
  return String(name ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

export function toPascalCase(name: string): string {
  const words = splitWords(name).map((w) =>
    w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)
  );
  const out = words.join('');
  return out || 'Model';
}

export function toCamelCase(name: string): string {
  const p = toPascalCase(name);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** Make a valid identifier ([A-Za-z_][A-Za-z0-9_]*) keeping the name as close as possible. */
export function toIdentifier(name: string, fallback = 'field'): string {
  let id = String(name ?? '').replace(/[^A-Za-z0-9_]/g, '_');
  if (id === '') id = fallback;
  if (/^[0-9]/.test(id)) id = `_${id}`;
  return id;
}

export const isValidIdentifier = (s: string): boolean => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s);

/** Escape for a single-quoted TypeScript string literal. */
export function tsString(s: string): string {
  return `'${String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}'`;
}

/** Escape for a TypeScript template literal body. */
export function tsTemplate(s: string): string {
  return `\`${String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``;
}

export function uniqueIdent(base: string, used: Set<string>): string {
  let name = base;
  let n = 2;
  while (used.has(name)) name = `${base}_${n++}`;
  used.add(name);
  return name;
}

function stripIdSuffix(col: string): string {
  const s = col.replace(/_?id$/i, '').replace(/_+$/, '');
  return s;
}

export interface RelNames {
  /** Name of the relation field on the FK-owning (source) table */
  forward: string;
  /** Name of the back-relation field on the referenced (target) table */
  back: string;
  /** Relation name used on both sides to disambiguate */
  relationName: string;
  oneToOne: boolean;
}

/**
 * Compute unique relation field names for every resolved relationship.
 * `fieldKey(field)` gives the property name a scalar field has in the
 * generated code, so relation fields never collide with columns.
 */
export function buildRelationNames(
  rels: ResolvedRel[],
  fieldKey: (f: Field) => string = (f) => f.name
): Map<ResolvedRel, RelNames> {
  const used = new Map<string, Set<string>>(); // tableId -> names in use
  const usedFor = (tableId: string, tableFields: Field[]) => {
    let s = used.get(tableId);
    if (!s) {
      s = new Set(tableFields.map(fieldKey));
      used.set(tableId, s);
    }
    return s;
  };

  const relNamesUsed = new Set<string>();
  const result = new Map<ResolvedRel, RelNames>();

  // Count incoming relations per (target, source table) to decide on suffixes.
  const incomingCount = new Map<string, number>();
  for (const r of rels) {
    const k = `${r.targetTable.id}\u0000${r.sourceTable.id}`;
    incomingCount.set(k, (incomingCount.get(k) ?? 0) + 1);
  }

  for (const r of rels) {
    const fk = fieldKey(r.sourceField);
    let fwdBase = toIdentifier(stripIdSuffix(r.sourceField.name) || r.targetTable.name);
    if (fwdBase === fk) fwdBase = `${fwdBase}_rel`;
    const srcUsed = usedFor(r.sourceTable.id, r.sourceTable.fields);
    const forward = uniqueIdent(fwdBase, srcUsed);

    const multiple = (incomingCount.get(`${r.targetTable.id}\u0000${r.sourceTable.id}`) ?? 0) > 1;
    const srcName = toIdentifier(r.sourceTable.name);
    const backBase = multiple
      ? `${srcName}_${toIdentifier(stripIdSuffix(r.sourceField.name) || r.sourceField.name)}`
      : srcName;
    const tgtUsed = usedFor(r.targetTable.id, r.targetTable.fields);
    const back = uniqueIdent(backBase, tgtUsed);

    const relationName = uniqueIdent(`${srcName}_${toIdentifier(r.sourceField.name)}`, relNamesUsed);
    result.set(r, { forward, back, relationName, oneToOne: isOneToOne(r) });
  }
  return result;
}
