import type { Table, Relationship, Field } from '../../types/schema';
import {
  analyzeDefault,
  commentText,
  isOneToOne,
  orderTables,
  parseType,
  resolveRelationships,
  type DefaultInfo,
  type ParsedType,
  type ResolvedRel,
} from './sqlUtils';
import {
  buildRelationNames,
  isValidIdentifier,
  toCamelCase,
  toIdentifier,
  tsString,
  tsTemplate,
  uniqueIdent,
} from './namingUtils';

/**
 * Generate Drizzle ORM (pg-core) TypeScript definitions.
 *
 * - Column property names equal the database column names.
 * - Composite primary keys use primaryKey({ columns: [...] }) in the table's
 *   extra config; foreign keys use .references() (self/forward references are
 *   typed with AnyPgColumn).
 * - Only the pg-core dialect is generated.
 */
export function exportDrizzle(tables: Table[], relationships: Relationship[]): string {
  const resolved = resolveRelationships(tables, relationships);
  const ordered = orderTables(tables, resolved);

  // Names for tables
  const usedConsts = new Set<string>();
  const constOf = new Map<string, string>();
  for (const t of tables) {
    constOf.set(t.id, uniqueIdent(`${toCamelCase(t.name)}Table`, usedConsts));
  }
  const orderIndex = new Map(ordered.map((t, i) => [t.id, i]));

  const imports = new Set<string>(['pgTable']);
  const customTypes = new Map<string, string>(); // db type -> const name
  const usedCustomConsts = new Set<string>();
  let usesSql = false;
  let usesRelations = false;

  const member = (obj: string, key: string) => (isValidIdentifier(key) ? `${obj}.${key}` : `${obj}[${tsString(key)}]`);
  const propKey = (key: string) => (isValidIdentifier(key) ? key : tsString(key));

  const customTsTypes = new Map<string, string>();
  const customType = (dbType: string, tsType = 'string'): string => {
    let name = customTypes.get(dbType);
    if (!name) {
      name = uniqueIdent(`custom_${toIdentifier(dbType.toLowerCase(), 'type')}`, usedCustomConsts);
      customTypes.set(dbType, name);
      customTsTypes.set(dbType, tsType);
    }
    imports.add('customType');
    return name;
  };

  const sqlTag = (expr: string) => {
    usesSql = true;
    return `sql${tsTemplate(expr)}`;
  };

  // Which FKs go inline vs foreignKey()
  const inlineFkByField = new Map<string, ResolvedRel>();
  const extraFks: ResolvedRel[] = [];
  for (const r of resolved) {
    const key = `${r.sourceTable.id}:${r.sourceField.id}`;
    if (!inlineFkByField.has(key)) inlineFkByField.set(key, r);
    else extraFks.push(r);
  }

  const buildColumn = (table: Table, field: Field, compositePk: boolean): string => {
    const p = parseType(field.type);
    const name = tsString(field.name);
    const { builder, jsKind, auto } = columnBuilder(p, field, name, imports, customType);
    let def = builder;

    if (field.isPK && !compositePk) def += '.primaryKey()';
    if (!field.nullable && !(field.isPK && !compositePk) && !auto) def += '.notNull()';
    if (field.isPK && compositePk && auto) def += '.notNull()';
    if (field.unique && !field.isPK) def += '.unique()';

    if (!auto) {
      const d = defaultCall(analyzeDefault(field.default), p, jsKind, sqlTag);
      if (d) def += d;
    }

    const fk = inlineFkByField.get(`${table.id}:${field.id}`);
    if (fk) {
      const targetConst = constOf.get(fk.targetTable.id)!;
      const target = member(targetConst, fk.targetField.name);
      const needsAnnotation =
        fk.targetTable.id === table.id ||
        (orderIndex.get(fk.targetTable.id) ?? 0) >= (orderIndex.get(table.id) ?? 0);
      if (needsAnnotation) {
        imports.add('type AnyPgColumn');
        def += `.references((): AnyPgColumn => ${target})`;
      } else {
        def += `.references(() => ${target})`;
      }
    }
    return def;
  };

  // ── Tables ──────────────────────────────────────────────────────────────
  const tableBlocks: string[] = [];
  for (const table of ordered) {
    const constName = constOf.get(table.id)!;
    const pkFields = table.fields.filter((f) => f.isPK);
    const composite = pkFields.length > 1;
    const lines: string[] = [];
    const comment = commentText(table.comment);
    if (comment) lines.push(`/** ${comment.replace(/\*\//g, '* /')} */`);

    const cols: string[] = [];
    const seenKeys = new Set<string>();
    for (const field of table.fields) {
      if (seenKeys.has(field.name)) continue; // duplicate keys are invalid in an object literal
      seenKeys.add(field.name);
      const c = commentText(field.comment);
      if (c) cols.push(`  /** ${c.replace(/\*\//g, '* /')} */`);
      cols.push(`  ${propKey(field.name)}: ${buildColumn(table, field, composite)},`);
    }

    const extras: string[] = [];
    if (composite) {
      imports.add('primaryKey');
      extras.push(`primaryKey({ columns: [${pkFields.map((f) => member('t', f.name)).join(', ')}] })`);
    }
    const myExtraFks = extraFks.filter((r) => r.sourceTable.id === table.id);
    for (const r of myExtraFks) {
      imports.add('foreignKey');
      extras.push(
        `foreignKey({ columns: [${member('t', r.sourceField.name)}], foreignColumns: [${member(constOf.get(r.targetTable.id)!, r.targetField.name)}] })`
      );
    }
    for (const field of table.fields) {
      const chk = field.check?.trim();
      if (chk && !/[;]|--|\/\*/.test(chk)) {
        imports.add('check');
        const chkName = `${table.name}_${field.name}_check`.replace(/[^A-Za-z0-9_]/g, '_');
        extras.push(`check(${tsString(chkName)}, ${sqlTag(chk.replace(/\s+/g, ' '))})`);
      }
    }

    lines.push(`export const ${constName} = pgTable(${tsString(table.name)}, {`);
    lines.push(...cols);
    if (extras.length) {
      lines.push('}, (t) => [');
      for (const e of extras) lines.push(`  ${e},`);
      lines.push(']);');
    } else {
      lines.push('});');
    }
    tableBlocks.push(lines.join('\n'));
  }

  // ── Relations ───────────────────────────────────────────────────────────
  const relBlocks: string[] = [];
  if (resolved.length > 0) {
    const names = buildRelationNames(resolved);
    for (const table of ordered) {
      const outgoing = resolved.filter((r) => r.sourceTable.id === table.id);
      const incoming = resolved.filter((r) => r.targetTable.id === table.id);
      if (!outgoing.length && !incoming.length) continue;

      const helpers = new Set<string>();
      const entries: string[] = [];
      const myConst = constOf.get(table.id)!;

      for (const r of outgoing) {
        const n = names.get(r)!;
        helpers.add('one');
        entries.push(
          `  ${propKey(n.forward)}: one(${constOf.get(r.targetTable.id)}, {\n` +
            `    fields: [${member(myConst, r.sourceField.name)}],\n` +
            `    references: [${member(constOf.get(r.targetTable.id)!, r.targetField.name)}],\n` +
            `    relationName: ${tsString(n.relationName)},\n` +
            `  }),`
        );
      }
      for (const r of incoming) {
        const n = names.get(r)!;
        const many = !isOneToOne(r);
        helpers.add(many ? 'many' : 'one');
        entries.push(
          `  ${propKey(n.back)}: ${many ? 'many' : 'one'}(${constOf.get(r.sourceTable.id)}, { relationName: ${tsString(n.relationName)} }),`
        );
      }

      usesRelations = true;
      const destructure = ['one', 'many'].filter((h) => helpers.has(h)).join(', ');
      relBlocks.push(
        `export const ${myConst}Relations = relations(${myConst}, ({ ${destructure} }) => ({\n${entries.join('\n')}\n}));`
      );
    }
  }

  // ── Assemble ────────────────────────────────────────────────────────────
  const out: string[] = ['// Generated by Modellr', '// https://Modellr.dev', ''];

  const pgImports = [...imports].sort((a, b) => a.replace('type ', '').localeCompare(b.replace('type ', '')));
  out.push(`import { ${pgImports.join(', ')} } from 'drizzle-orm/pg-core';`);
  const coreImports: string[] = [];
  if (usesRelations) coreImports.push('relations');
  if (usesSql) coreImports.push('sql');
  if (coreImports.length) out.push(`import { ${coreImports.join(', ')} } from 'drizzle-orm';`);
  out.push('');

  for (const [dbType, constName] of customTypes) {
    out.push(
      `const ${constName} = customType<{ data: ${customTsTypes.get(dbType) ?? 'string'} }>({\n  dataType() {\n    return ${tsString(dbType)};\n  },\n});`
    );
  }
  if (customTypes.size) out.push('');

  out.push(tableBlocks.join('\n\n'));
  if (relBlocks.length) {
    out.push('');
    out.push('/** Relations */');
    out.push(relBlocks.join('\n\n'));
  }
  out.push('');
  return out.join('\n');
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type JsKind = 'string' | 'number' | 'boolean' | 'bigint' | 'json' | 'date' | 'other';

interface ColumnBuilder {
  builder: string;
  jsKind: JsKind;
  auto: boolean;
}

function columnBuilder(
  p: ParsedType,
  field: Field,
  name: string,
  imports: Set<string>,
  customType: (dbType: string, tsType?: string) => string
): ColumnBuilder {
  const imp = (b: string) => { imports.add(b); return b; };
  const lengthArg = (): number | undefined => {
    const fromType = p.args[0] && /^\d+$/.test(p.args[0]) ? parseInt(p.args[0], 10) : undefined;
    return fromType ?? (field.length && field.length > 0 ? Math.floor(field.length) : undefined);
  };
  const arr = p.arrayDims > 0 ? '.array()' : '';
  const done = (builder: string, jsKind: JsKind, auto = false): ColumnBuilder => ({
    builder: builder + arr,
    jsKind: p.arrayDims > 0 ? 'other' : jsKind,
    auto,
  });

  switch (p.category) {
    case 'smallint': case 'tinyint':
      return done(`${imp('smallint')}(${name})`, 'number');
    case 'mediumint': case 'int':
      return done(`${imp('integer')}(${name})`, 'number');
    case 'bigint':
      return done(`${imp('bigint')}(${name}, { mode: 'number' })`, 'number');
    case 'serial':
      return done(`${imp('serial')}(${name})`, 'number', true);
    case 'smallserial':
      return done(`${imp('smallserial')}(${name})`, 'number', true);
    case 'bigserial':
      return done(`${imp('bigserial')}(${name}, { mode: 'number' })`, 'number', true);
    case 'real':
      return done(`${imp('real')}(${name})`, 'number');
    case 'float': case 'double':
      return done(`${imp('doublePrecision')}(${name})`, 'number');
    case 'decimal': {
      const precision = p.args[0] && /^\d+$/.test(p.args[0]) ? parseInt(p.args[0], 10) : field.precision;
      const scaleStr = p.args[1] && /^\d+$/.test(p.args[1]) ? parseInt(p.args[1], 10) : field.scale;
      const opts: string[] = [];
      if (precision && precision > 0) opts.push(`precision: ${Math.floor(precision)}`);
      if (precision && precision > 0 && scaleStr != null && scaleStr >= 0) opts.push(`scale: ${Math.floor(scaleStr)}`);
      return done(`${imp('numeric')}(${name}${opts.length ? `, { ${opts.join(', ')} }` : ''})`, 'string');
    }
    case 'money':
      return done(`${imp('numeric')}(${name}, { precision: 19, scale: 4 })`, 'string');
    case 'char': {
      const l = lengthArg();
      return done(`${imp('char')}(${name}${l ? `, { length: ${l} }` : ''})`, 'string');
    }
    case 'varchar': {
      const l = lengthArg();
      return done(`${imp('varchar')}(${name}${l ? `, { length: ${l} }` : ''})`, 'string');
    }
    case 'text':
      return done(`${imp('text')}(${name})`, 'string');
    case 'bool': case 'bit':
      return done(`${imp('boolean')}(${name})`, 'boolean');
    case 'timestamp':
      return done(`${imp('timestamp')}(${name})`, 'date');
    case 'timestamptz':
      return done(`${imp('timestamp')}(${name}, { withTimezone: true })`, 'date');
    case 'date':
      return done(`${imp('date')}(${name})`, 'string');
    case 'time':
      return done(`${imp('time')}(${name}${p.base.includes('tz') || p.base.includes('with time') ? ', { withTimezone: true }' : ''})`, 'string');
    case 'uuid':
      return done(`${imp('uuid')}(${name})`, 'string');
    case 'json':
      return done(`${imp(p.base === 'json' ? 'json' : 'jsonb')}(${name})`, 'json');
    case 'bytes':
      return done(`${customType('bytea', 'Buffer')}(${name})`, 'other');
    default: {
      if (['inet', 'interval', 'cidr', 'macaddr', 'macaddr8'].includes(p.base) && p.args.length === 0) {
        return done(`${imp(p.base)}(${name})`, 'string');
      }
      return done(`${customType(p.raw.replace(/\[\s*\d*\s*\]/g, ''))}(${name})`, 'string');
    }
  }
}

function defaultCall(
  info: DefaultInfo | undefined,
  p: ParsedType,
  jsKind: JsKind,
  sqlTag: (expr: string) => string
): string {
  if (!info) return '';
  const q = (s: string) => tsString(s);
  const isTime = p.category === 'timestamp' || p.category === 'timestamptz';
  switch (info.kind) {
    case 'null':
      return '';
    case 'now':
      if (isTime || p.category === 'date') return '.defaultNow()';
      return `.default(${sqlTag(info.text)})`;
    case 'uuid':
      if (p.category === 'uuid') return '.defaultRandom()';
      return `.default(${sqlTag(info.text)})`;
    case 'keyword':
    case 'expr':
      return `.default(${sqlTag(info.text)})`;
    case 'bool':
      if (jsKind === 'boolean') return `.default(${info.value})`;
      return `.default(${sqlTag(String(info.value))})`;
    case 'number':
      if (jsKind === 'boolean' && (info.text === '0' || info.text === '1')) return `.default(${info.text === '1'})`;
      if (jsKind === 'number') return `.default(${info.text})`;
      if (jsKind === 'string') return `.default(${q(info.text)})`;
      return `.default(${sqlTag(info.text)})`;
    case 'string': {
      if (jsKind === 'string') return `.default(${q(info.value)})`;
      if (jsKind === 'json') {
        try {
          const parsed: unknown = JSON.parse(info.value);
          if (parsed !== null && typeof parsed === 'object') return `.default(${JSON.stringify(parsed)})`;
        } catch { /* fall through */ }
        return `.default(${sqlTag(`'${info.value.replace(/'/g, "''")}'`)})`;
      }
      if (jsKind === 'number' && info.value.trim() !== '' && !isNaN(Number(info.value))) return `.default(${Number(info.value)})`;
      if (jsKind === 'boolean' && /^(true|false)$/i.test(info.value)) return `.default(${info.value.toLowerCase()})`;
      return `.default(${sqlTag(`'${info.value.replace(/'/g, "''")}'`)})`;
    }
  }
}
