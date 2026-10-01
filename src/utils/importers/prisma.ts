import { nanoid } from '../../store/nanoid';
import type { Table, Field, Relationship, AccentColor, Cardinality } from '../../types/schema';
import { ACCENT_COLORS } from '../constants';

/**
 * Prisma schema importer.
 *
 * Conventions (kept in sync with the Prisma exporter: PascalCase models + @@map for table names):
 *  - Table name = `@@map("x")` if present, otherwise the model name converted to snake_case
 *    (acronym aware: HTTPLog -> http_log, UserProfile -> user_profile).
 *  - Column name = `@map("x")` if present, otherwise the Prisma field name unchanged.
 *    (i.e. the importer uses the real database names, not the Prisma client names.)
 *  - Enum-typed fields keep the enum's (mapped) name as the column type. Enum VALUES are not
 *    stored (the data model has nowhere to keep them).
 *  - `Field.default` is a ready-to-emit SQL fragment: `'text'` (quoted), `now()`, `gen_random_uuid()`,
 *    `TRUE`, `42`, or the verbatim body of `dbgenerated("...")`. Client-side generators
 *    (cuid(), ulid(), nanoid()) and `autoincrement()` produce no default (autoincrement => serial).
 *  - Relation (virtual) fields and `Model[]` back-relations are not columns. A relation with
 *    `fields: [..], references: [..]` becomes one Relationship per column pair, resolved against the
 *    real referenced field. one-to-one when the FK column is @unique / @@unique([col]) / the sole @id.
 *  - Implicit many-to-many relations (list <-> list without a join model) are not materialised.
 *  - `@db.*` native types are honoured for common Postgres/MySQL types (VarChar(n), Decimal(p,s), Uuid ...).
 */

interface PrismaImportResult {
  tables: Table[];
  relationships: Relationship[];
  errors: string[];
}

// ─────────────────────────────────────────────────────────────
// Scanning helpers
// ─────────────────────────────────────────────────────────────

/** Index just past the closing quote of a "..." string starting at i. */
function skipString(s: string, i: number): number {
  let j = i + 1;
  while (j < s.length) {
    const c = s[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '"') return j + 1;
    if (c === '\n') return j; // unterminated: stop at end of line
    j++;
  }
  return s.length;
}

/** Remove // and /* *\/ comments (string aware), keeping newlines. */
export function stripPrismaComments(text: string): string {
  const out: string[] = [];
  let last = 0;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === '"') { i = skipString(text, i); continue; }
    if (c === '/' && text[i + 1] === '/') {
      out.push(text.slice(last, i));
      let j = text.indexOf('\n', i);
      if (j === -1) j = n;
      i = last = j;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      out.push(text.slice(last, i));
      let j = text.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      out.push(' ');
      i = last = j;
      continue;
    }
    i++;
  }
  out.push(text.slice(last));
  return out.join('');
}

interface Block { kind: string; name: string; body: string }

/** Brace-depth and quote aware scanner for `model X { ... }` style blocks. */
function scanBlocks(text: string, warnings: string[]): Block[] {
  const blocks: Block[] = [];
  const re = /(?:^|[\s;}])(model|enum|type|view|datasource|generator)\s+([A-Za-z_]\w*)\s*\{/g;
  const n = text.length;
  let pos = 0;
  for (;;) {
    re.lastIndex = pos;
    const m = re.exec(text);
    if (!m) break;
    const bodyStart = m.index + m[0].length;
    let depth = 1;
    let j = bodyStart;
    while (j < n && depth > 0) {
      const c = text[j];
      if (c === '"') { j = skipString(text, j); continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      j++;
    }
    if (depth > 0) warnings.push(`Unterminated ${m[1]} block "${m[2]}".`);
    blocks.push({ kind: m[1], name: m[2], body: text.slice(bodyStart, depth > 0 ? n : j - 1) });
    pos = j;
  }
  return blocks;
}

/** Join physical lines so that (), [] and {} spanning several lines form one logical line. */
function logicalLines(body: string): string[] {
  const out: string[] = [];
  let buf = '';
  let depth = 0;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line && depth === 0) continue;
    buf = buf ? `${buf} ${line}` : line;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { i = skipString(line, i) - 1; continue; }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
    }
    if (depth <= 0) { out.push(buf); buf = ''; depth = 0; }
  }
  if (buf) out.push(buf);
  return out;
}

interface Attr { name: string; args: string }

/** Parse `@a @b(...) @@c([x, y])` into name + raw argument text. */
function parseAttributes(s: string): Attr[] {
  const attrs: Attr[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') { i = skipString(s, i); continue; }
    if (c !== '@') { i++; continue; }
    const m = /^@@?[\w.]+/.exec(s.slice(i));
    if (!m) { i++; continue; }
    const name = m[0];
    i += name.length;
    let args = '';
    if (s[i] === '(') {
      let depth = 0;
      const start = i;
      for (; i < s.length; i++) {
        const d = s[i];
        if (d === '"') { i = skipString(s, i) - 1; continue; }
        if (d === '(') depth++;
        else if (d === ')') { depth--; if (depth === 0) { i++; break; } }
      }
      args = s.slice(start + 1, i - 1);
    }
    attrs.push({ name, args });
  }
  return attrs;
}

/** Split on top-level commas (string, (), [] and {} aware). */
function splitArgs(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') { i = skipString(s, i) - 1; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { parts.push(s.slice(start, i)); start = i + 1; }
  }
  const tail = s.slice(start);
  if (tail.trim()) parts.push(tail);
  return parts.map((p) => p.trim());
}

function namedArg(args: string[], name: string): string | undefined {
  for (const a of args) {
    const m = /^(\w+)\s*:\s*([\s\S]*)$/.exec(a);
    if (m && m[1] === name) return m[2].trim();
  }
  return undefined;
}

function positionalArg(args: string[]): string | undefined {
  const a = args[0];
  return a !== undefined && !/^\w+\s*:/.test(a) ? a : undefined;
}

function parseStringLiteral(s: string | undefined): string | undefined {
  if (s === undefined) return undefined;
  const m = /^"((?:[^"\\]|\\.)*)"$/s.exec(s.trim());
  return m ? m[1].replace(/\\(["\\])/g, '$1') : undefined;
}

/** "[a, b(sort: Desc)]" -> ['a', 'b'] */
function parseIdList(s: string | undefined): string[] {
  if (!s) return [];
  const inner = s.trim().replace(/^\[/, '').replace(/\]$/, '');
  return splitArgs(inner).map((x) => /^\w+/.exec(x)?.[0] ?? '').filter(Boolean);
}

// ─────────────────────────────────────────────────────────────
// Naming / types / defaults
// ─────────────────────────────────────────────────────────────

/** PascalCase model -> snake_case table name, acronym aware (HTTPLog -> http_log). */
export function modelNameToTableName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

const PRISMA_SCALARS = new Set([
  'String', 'Boolean', 'Int', 'BigInt', 'Float', 'Decimal',
  'DateTime', 'Json', 'Bytes', 'Unsupported',
]);

function prismaTypeToSQL(type: string): string {
  const map: Record<string, string> = {
    String: 'text',
    Boolean: 'boolean',
    Int: 'integer',
    BigInt: 'bigint',
    Float: 'double precision',
    Decimal: 'numeric',
    DateTime: 'timestamptz',
    Json: 'jsonb',
    Bytes: 'bytea',
  };
  return map[type] ?? 'text';
}

const NATIVE_TYPES: Record<string, string> = {
  varchar: 'varchar', char: 'char', nvarchar: 'nvarchar', nchar: 'nchar',
  text: 'text', mediumtext: 'mediumtext', longtext: 'longtext', tinytext: 'tinytext', citext: 'citext',
  uuid: 'uuid', uniqueidentifier: 'uniqueidentifier',
  decimal: 'decimal', numeric: 'numeric', money: 'money',
  smallint: 'smallint', integer: 'integer', int: 'int', bigint: 'bigint', tinyint: 'tinyint', mediumint: 'mediumint',
  real: 'real', doubleprecision: 'double precision', double: 'double', float: 'float',
  boolean: 'boolean', bit: 'bit',
  timestamp: 'timestamp', timestamptz: 'timestamptz', date: 'date', time: 'time', timetz: 'timetz',
  datetime: 'datetime', datetime2: 'datetime2', year: 'year',
  json: 'json', jsonb: 'jsonb', bytea: 'bytea', inet: 'inet', xml: 'xml',
  blob: 'blob', longblob: 'longblob', binary: 'binary', varbinary: 'varbinary',
};
const LENGTH_NATIVE = new Set(['varchar', 'char', 'nvarchar', 'nchar', 'binary', 'varbinary']);
const PRECISION_NATIVE = new Set(['decimal', 'numeric', 'float', 'double']);

function applyNativeType(field: Field, attr: Attr): void {
  const name = attr.name.replace(/^@db\./, '').toLowerCase();
  const sql = NATIVE_TYPES[name];
  if (!sql) return;
  field.type = sql;
  const nums = splitArgs(attr.args).filter((a) => /^\d+$/.test(a)).map(Number);
  if (LENGTH_NATIVE.has(sql) && nums.length) field.length = nums[0];
  if (PRECISION_NATIVE.has(sql) && nums.length) {
    field.precision = nums[0];
    if (nums.length > 1) field.scale = nums[1];
  }
}

const sqlQuote = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** Convert the argument of @default(...) to a SQL default fragment (undefined = none). */
function convertDefault(expr: string, isEnumField: boolean): string | undefined {
  const e = expr.trim();
  const str = parseStringLiteral(e);
  if (str !== undefined) return sqlQuote(str);
  if (e === 'true') return 'TRUE';
  if (e === 'false') return 'FALSE';
  if (/^[+-]?\d+(\.\d+)?$/.test(e)) return e;
  if (/^now\(\s*\)$/.test(e)) return 'now()';
  if (/^uuid\(.*\)$/.test(e)) return 'gen_random_uuid()';
  const db = /^dbgenerated\(([\s\S]*)\)$/.exec(e);
  if (db) return parseStringLiteral(db[1].trim()) || undefined;
  if (e === '[]') return "'{}'";
  if (/^\w+\(.*\)$/.test(e) || e.startsWith('[')) return undefined; // cuid(), ulid(), autoincrement(), ...
  if (/^\w+$/.test(e) && isEnumField) return sqlQuote(e);
  return undefined;
}

// ─────────────────────────────────────────────────────────────
// Importer
// ─────────────────────────────────────────────────────────────

interface ModelDraft {
  name: string;
  table: Table;
  /** prisma field name -> column field */
  byPrismaName: Map<string, Field>;
  relations: Array<{
    target: string;
    fields: string[];
    references: string[];
    relName?: string;
  }>;
  uniqueSingles: Set<string>;
}

/**
 * Parse a Prisma schema string (schema.prisma) into Modellr tables + relationships.
 */
export function importPrisma(prismaText: string): PrismaImportResult {
  const warnings: string[] = [];
  const cleaned = stripPrismaComments(prismaText ?? '');
  const blocks = scanBlocks(cleaned, warnings);

  // Enums first, so enum-typed fields can be recognised: name -> db type name
  const enums = new Map<string, string>();
  const modelNames = new Set<string>();
  for (const b of blocks) {
    if (b.kind === 'enum') {
      const map = logicalLines(b.body).map(parseAttributes).flat().find((a) => a.name === '@@map');
      enums.set(b.name, parseStringLiteral(map?.args) ?? b.name);
    } else if (b.kind === 'model') {
      modelNames.add(b.name);
    }
  }

  const drafts = new Map<string, ModelDraft>();
  const tables: Table[] = [];
  const explicitType = new Set<string>(); // fields with an @db.* native type

  for (const b of blocks) {
    if (b.kind !== 'model') continue;
    const lines = logicalLines(b.body);
    const blockAttrs: Attr[] = [];
    const fieldLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('@@')) blockAttrs.push(...parseAttributes(line));
      else fieldLines.push(line);
    }

    const mapAttr = blockAttrs.find((a) => a.name === '@@map');
    const tableName = parseStringLiteral(mapAttr ? positionalArg(splitArgs(mapAttr.args)) ?? namedArg(splitArgs(mapAttr.args), 'name') : undefined)
      ?? modelNameToTableName(b.name);

    const draft: ModelDraft = {
      name: b.name,
      byPrismaName: new Map(),
      relations: [],
      uniqueSingles: new Set(),
      table: {
        id: nanoid(),
        name: tableName,
        fields: [],
        position: {
          x: 80 + (tables.length % 4) * 300,
          y: 80 + Math.floor(tables.length / 4) * 200,
        },
        accentColor: ACCENT_COLORS[tables.length % ACCENT_COLORS.length] as AccentColor,
      },
    };

    for (const line of fieldLines) {
      const m = /^(\w+)\s+(\w+)(?:\(("(?:[^"\\]|\\.)*")\))?(\[\])?(\?)?\s*([\s\S]*)$/.exec(line);
      if (!m) {
        warnings.push(`Model ${b.name}: could not parse line "${line.slice(0, 60)}".`);
        continue;
      }
      const [, fieldName, typeName, unsupportedArg, listMark, optMark, rest] = m;
      const attrs = parseAttributes(rest);
      const isList = !!listMark;
      const isEnum = enums.has(typeName);
      const isModel = modelNames.has(typeName);

      if (isModel) {
        // Relation field (not a column). Only the side with fields: [...] owns the FK.
        const rel = attrs.find((a) => a.name === '@relation');
        if (rel) {
          const args = splitArgs(rel.args);
          const fields = parseIdList(namedArg(args, 'fields'));
          const references = parseIdList(namedArg(args, 'references'));
          if (fields.length > 0) {
            draft.relations.push({
              target: typeName, fields, references,
              relName: parseStringLiteral(positionalArg(args) ?? namedArg(args, 'name')),
            });
          }
        }
        continue;
      }
      if (!PRISMA_SCALARS.has(typeName) && !isEnum) {
        warnings.push(`Model ${b.name}: field "${fieldName}" has unknown type "${typeName}", skipped.`);
        continue;
      }

      const colAttr = attrs.find((a) => a.name === '@map');
      const colName = parseStringLiteral(colAttr?.args) ?? fieldName;
      const isPK = attrs.some((a) => a.name === '@id');
      const isUnique = attrs.some((a) => a.name === '@unique');

      let type: string;
      if (isEnum) type = enums.get(typeName)!;
      else if (typeName === 'Unsupported') type = parseStringLiteral(unsupportedArg) ?? 'text';
      else type = prismaTypeToSQL(typeName);

      const field: Field = {
        id: nanoid(),
        name: colName,
        type,
        nullable: !isPK && optMark === '?',
        unique: isUnique,
        isPK,
        isFK: false,
      };

      const native = attrs.find((a) => a.name.startsWith('@db.'));
      if (native) { applyNativeType(field, native); explicitType.add(field.id); }

      const defAttr = attrs.find((a) => a.name === '@default');
      const defExpr = defAttr ? splitArgs(defAttr.args)[0] : undefined;
      if (defExpr !== undefined) {
        if (/^autoincrement\(\s*\)$/.test(defExpr)) {
          if (typeName === 'BigInt') field.type = 'bigserial';
          else if (typeName === 'Int') field.type = 'serial';
        } else {
          field.default = convertDefault(defExpr, isEnum);
          if (/^uuid\(/.test(defExpr) && !native && typeName === 'String') field.type = 'uuid';
        }
      }

      if (isList) {
        field.type = `${field.type}[]`;
        field.nullable = false;
      }

      draft.table.fields.push(field);
      draft.byPrismaName.set(fieldName, field);
    }

    // Block level attributes
    for (const a of blockAttrs) {
      if (a.name !== '@@id' && a.name !== '@@unique') continue;
      const args = splitArgs(a.args);
      const cols = parseIdList(positionalArg(args) ?? namedArg(args, 'fields'));
      if (a.name === '@@id') {
        for (const c of cols) {
          const f = draft.byPrismaName.get(c);
          if (f) { f.isPK = true; f.nullable = false; }
        }
      } else if (cols.length === 1) {
        const f = draft.byPrismaName.get(cols[0]);
        if (f) f.unique = true;
      }
    }

    drafts.set(b.name, draft);
    tables.push(draft.table);
  }

  if (tables.length === 0) {
    return { tables, relationships: [], errors: ['No model blocks found in the Prisma schema.', ...warnings] };
  }

  // ── Relationships ──────────────────────────────
  const relationships: Relationship[] = [];
  for (const draft of drafts.values()) {
    const pkCount = draft.table.fields.filter((f) => f.isPK).length;
    for (const rel of draft.relations) {
      const target = drafts.get(rel.target);
      if (!target) continue;
      const targetPKs = target.table.fields.filter((f) => f.isPK);
      rel.fields.forEach((fname, idx) => {
        const src = draft.byPrismaName.get(fname);
        const refName = rel.references[idx];
        const tgt = refName ? target.byPrismaName.get(refName) : targetPKs[idx] ?? targetPKs[0];
        if (!src || !tgt) {
          warnings.push(`Relation ${draft.name}.${fname} -> ${rel.target}.${refName ?? '(id)'}: field not found.`);
          return;
        }
        src.isFK = true;
        if (!explicitType.has(src.id) && !src.type.endsWith('[]')) {
          // FK columns share the referenced column's physical type (uuid / integer / ...)
          const tt = tgt.type.replace(/^smallserial$/, 'smallint').replace(/^bigserial$/, 'bigint').replace(/^serial$/, 'integer');
          src.type = tt;
          src.length = tgt.length;
          src.precision = tgt.precision;
          src.scale = tgt.scale;
          if (src.length === undefined) delete src.length;
          if (src.precision === undefined) delete src.precision;
          if (src.scale === undefined) delete src.scale;
        }
        const single = rel.fields.length === 1;
        const cardinality: Cardinality = single && (src.unique || (src.isPK && pkCount === 1)) ? 'one-to-one' : 'one-to-many';
        relationships.push({
          id: nanoid(),
          sourceTableId: draft.table.id,
          sourceFieldId: src.id,
          targetTableId: target.table.id,
          targetFieldId: tgt.id,
          cardinality,
        });
      });
    }
  }

  return { tables, relationships, errors: warnings };
}
