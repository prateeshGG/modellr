import type { Dialect, Field, Relationship, Table } from '../../types/schema';

/**
 * Shared helpers for all exporters: identifier quoting, type mapping,
 * default-value analysis, relationship resolution and ordering.
 */

// ── Text safety ─────────────────────────────────────────────────────────────

/* eslint-disable no-control-regex */
const CONTROL_CHARS = /[\u0000-\u001f\u007f\u0085\u2028\u2029]/g;

/** Remove control characters (including newlines) so text can never break out of a `--` comment. */
export function stripControl(s: string): string {
  return String(s ?? '').replace(CONTROL_CHARS, ' ').replace(/ {2,}/g, ' ').trim();
}

/** Single-line text that is safe inside a `-- ...` SQL line comment or a `//` line comment. */
export function commentText(s: string | undefined): string {
  return stripControl(s ?? '');
}

// ── Identifiers ─────────────────────────────────────────────────────────────

/**
 * Quote an identifier for the given dialect. Everything is quoted (which
 * also covers reserved words such as user/order/group/table), embedded quote
 * characters are escaped and control characters are removed.
 */
export function quoteIdent(name: string, dialect: Dialect): string {
  const clean = String(name ?? '').replace(CONTROL_CHARS, '').trim() || '_';
  switch (dialect) {
    case 'mysql':
      return `\`${clean.replace(/`/g, '``')}\``;
    case 'mssql':
      return `[${clean.replace(/\]/g, ']]')}]`;
    default:
      return `"${clean.replace(/"/g, '""')}"`;
  }
}

/** SQL string literal for the given dialect. */
export function sqlString(value: string, dialect: Dialect): string {
  let v = String(value).replace(/\u0000/g, '');
  if (dialect === 'mysql') v = v.replace(/\\/g, '\\\\');
  v = v.replace(/'/g, "''");
  return `'${v}'`;
}

// ── Expression scanning (injection guard) ───────────────────────────────────

/**
 * Quote-aware scan. An expression is "safe" when quotes and parentheses are
 * balanced and it has no statement separators or comment openers outside
 * of quotes.
 */
function scanExpr(src: string): { safe: boolean; text: string } {
  let out = '';
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const code = c.charCodeAt(0);
    if (quote) {
      if (code === 0) return { safe: false, text: src };
      out += c;
      if (c === quote) {
        if (src[i + 1] === quote) {
          out += src[++i];
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (c === '\n' || c === '\r' || c === '\t') {
      out += ' ';
      continue;
    }
    if (code < 32 || code === 127) return { safe: false, text: src };
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      out += c;
      continue;
    }
    if (c === ';') return { safe: false, text: src };
    if (c === '-' && src[i + 1] === '-') return { safe: false, text: src };
    if (c === '/' && src[i + 1] === '*') return { safe: false, text: src };
    if (c === '(') depth++;
    if (c === ')') {
      depth--;
      if (depth < 0) return { safe: false, text: src };
    }
    out += c;
  }
  return { safe: !quote && depth === 0, text: out.trim() };
}

/** True when `src` is safe to embed verbatim as a SQL expression (e.g. a CHECK body). */
export function isSafeExpression(src: string): boolean {
  return scanExpr(src).safe;
}

/** Return a normalised, safe expression or undefined if it cannot be embedded. */
export function safeExpression(src: string | undefined): string | undefined {
  if (src == null) return undefined;
  const r = scanExpr(src);
  if (!r.safe || !r.text) return undefined;
  return r.text;
}

// ── Type parsing & mapping ──────────────────────────────────────────────────

export type TypeCategory =
  | 'smallint' | 'tinyint' | 'mediumint' | 'int' | 'bigint'
  | 'serial' | 'smallserial' | 'bigserial'
  | 'real' | 'float' | 'double' | 'decimal' | 'money'
  | 'char' | 'varchar' | 'text'
  | 'bool' | 'bit'
  | 'timestamp' | 'timestamptz' | 'date' | 'time'
  | 'uuid' | 'json' | 'bytes'
  | 'other';

const CATEGORY_BY_NAME: Record<string, TypeCategory> = {
  smallint: 'smallint', int2: 'smallint',
  tinyint: 'tinyint',
  mediumint: 'mediumint',
  int: 'int', integer: 'int', int4: 'int',
  bigint: 'bigint', int8: 'bigint',
  serial: 'serial', serial4: 'serial',
  smallserial: 'smallserial', serial2: 'smallserial',
  bigserial: 'bigserial', serial8: 'bigserial',
  real: 'real', float4: 'real',
  float: 'float',
  double: 'double', 'double precision': 'double', float8: 'double',
  decimal: 'decimal', numeric: 'decimal', dec: 'decimal',
  money: 'money', smallmoney: 'money',
  char: 'char', character: 'char', nchar: 'char', bpchar: 'char',
  varchar: 'varchar', 'character varying': 'varchar', nvarchar: 'varchar',
  text: 'text', tinytext: 'text', mediumtext: 'text', longtext: 'text',
  ntext: 'text', clob: 'text', citext: 'text',
  boolean: 'bool', bool: 'bool',
  bit: 'bit',
  timestamp: 'timestamp', datetime: 'timestamp', datetime2: 'timestamp',
  smalldatetime: 'timestamp', 'timestamp without time zone': 'timestamp',
  timestamptz: 'timestamptz', datetimeoffset: 'timestamptz',
  'timestamp with time zone': 'timestamptz',
  date: 'date',
  time: 'time', timetz: 'time', 'time without time zone': 'time', 'time with time zone': 'time',
  uuid: 'uuid', uniqueidentifier: 'uuid',
  json: 'json', jsonb: 'json',
  bytea: 'bytes', blob: 'bytes', tinyblob: 'bytes', mediumblob: 'bytes', longblob: 'bytes',
  binary: 'bytes', varbinary: 'bytes', image: 'bytes',
};

export interface ParsedType {
  /** lower-cased, whitespace-normalised base name, e.g. "double precision" */
  base: string;
  category: TypeCategory;
  /** Raw arguments inside parentheses, e.g. ['10', '2'] */
  args: string[];
  /** Number of trailing [] pairs */
  arrayDims: number;
  /** Cleaned original text (used for unknown types) */
  raw: string;
}

const TYPE_RE = /^([A-Za-z_][A-Za-z0-9_]*(?: [A-Za-z_][A-Za-z0-9_]*)*)\s*(?:\(([^)]*)\))?\s*((?:\[\s*\d*\s*\])*)$/;

export function parseType(type: string): ParsedType {
  const cleaned = stripControl(type);
  const m = TYPE_RE.exec(cleaned);
  if (!m) {
    // Unparseable: keep only harmless characters.
    const raw = cleaned.replace(/[^A-Za-z0-9_ (),.[\]]/g, '').trim() || 'text';
    return { base: raw.toLowerCase(), category: 'other', args: [], arrayDims: 0, raw };
  }
  const base = m[1].toLowerCase().replace(/\s+/g, ' ');
  let args: string[] = [];
  let rawArgs: string | undefined = m[2];
  if (rawArgs != null) {
    if (!isSafeExpression(`(${rawArgs})`)) rawArgs = undefined;
    else args = rawArgs.split(',').map((a) => a.trim()).filter((a) => a !== '');
  }
  const dims = (m[3].match(/\[/g) ?? []).length;
  const raw = `${m[1].replace(/\s+/g, ' ')}${rawArgs != null ? `(${rawArgs.trim()})` : ''}${m[3].replace(/\s+/g, '')}`;
  return { base, category: CATEGORY_BY_NAME[base] ?? 'other', args, arrayDims: dims, raw };
}

export type AutoKind = 'serial' | 'smallserial' | 'bigserial' | null;

export interface MappedType {
  /** SQL type text for this dialect (without nullability / defaults). */
  sql: string;
  category: TypeCategory;
  /** Set for serial-style columns */
  auto: AutoKind;
  parsed: ParsedType;
}

function posInt(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

/** Effective size arguments for a field (type-string arguments win over Field.length/precision/scale). */
function sizeArgs(f: Pick<Field, 'length' | 'precision' | 'scale'>, p: ParsedType): string[] {
  if (p.args.length > 0) return p.args;
  switch (p.category) {
    case 'char':
    case 'varchar':
    case 'bytes': {
      const l = posInt(f.length);
      return l ? [String(l)] : [];
    }
    case 'decimal': {
      const pr = posInt(f.precision);
      if (!pr) return [];
      const sc = f.scale != null && Number.isFinite(f.scale) && f.scale >= 0 ? [String(Math.floor(f.scale))] : [];
      return [String(pr), ...sc];
    }
    case 'float': {
      const pr = posInt(f.precision);
      return pr ? [String(pr)] : [];
    }
    default:
      return [];
  }
}

const withArgs = (name: string, args: string[]): string =>
  args.length ? `${name}(${args.join(', ')})` : name;

/** Map a (Postgres-flavoured or native) column type to the target dialect. */
export function mapType(
  f: Pick<Field, 'type' | 'length' | 'precision' | 'scale'>,
  dialect: Dialect
): MappedType {
  const p = parseType(f.type);
  const cat = p.category;
  const args = sizeArgs(f, p);
  const mk = (sql: string, auto: AutoKind = null): MappedType => ({ sql, category: cat, auto, parsed: p });
  const nPrefixed = p.base.startsWith('n') && (cat === 'char' || cat === 'varchar');

  // Arrays are a Postgres feature.
  if (p.arrayDims > 0) {
    const brackets = '[]'.repeat(p.arrayDims);
    if (dialect === 'postgres') {
      const inner = mapType({ ...f, type: f.type.replace(/\s*(\[\s*\d*\s*\])+\s*$/, '') }, dialect);
      return { ...inner, sql: inner.sql + brackets, auto: null, parsed: p };
    }
    return { sql: dialect === 'mysql' ? 'JSON' : dialect === 'mssql' ? 'NVARCHAR(MAX)' : 'TEXT', category: 'json', auto: null, parsed: p };
  }

  switch (dialect) {
    case 'postgres': {
      switch (cat) {
        case 'smallint': case 'tinyint': return mk('smallint');
        case 'mediumint': case 'int': return mk('integer');
        case 'bigint': return mk('bigint');
        case 'serial': return mk('serial', 'serial');
        case 'smallserial': return mk('smallserial', 'smallserial');
        case 'bigserial': return mk('bigserial', 'bigserial');
        case 'real': return mk('real');
        case 'float': return mk(withArgs('float', args.slice(0, 1)));
        case 'double': return mk('double precision');
        case 'decimal': return mk(withArgs('numeric', args));
        case 'money': return mk('money');
        case 'char': return mk(withArgs('char', args));
        case 'varchar': return mk(withArgs('varchar', args));
        case 'text': return mk(p.base === 'citext' ? 'citext' : 'text');
        case 'bool': case 'bit': return mk('boolean');
        case 'timestamp': return mk(withArgs('timestamp', args));
        case 'timestamptz': return mk(withArgs('timestamptz', args));
        case 'date': return mk('date');
        case 'time': return mk(p.base.includes('tz') || p.base.includes('with time') ? withArgs('timetz', args) : withArgs('time', args));
        case 'uuid': return mk('uuid');
        case 'json': return mk(p.base === 'json' ? 'json' : 'jsonb');
        case 'bytes': return mk('bytea');
        default: return mk(p.raw);
      }
    }
    case 'mysql': {
      switch (cat) {
        case 'smallint': return mk('SMALLINT');
        case 'tinyint': return mk('TINYINT');
        case 'mediumint': return mk('MEDIUMINT');
        case 'int': return mk('INT');
        case 'bigint': return mk('BIGINT');
        case 'serial': return mk('INT', 'serial');
        case 'smallserial': return mk('SMALLINT', 'smallserial');
        case 'bigserial': return mk('BIGINT', 'bigserial');
        case 'real': return mk('FLOAT');
        case 'float': return mk(withArgs('FLOAT', args.slice(0, 1)));
        case 'double': return mk('DOUBLE');
        case 'decimal': return mk(withArgs('DECIMAL', args));
        case 'money': return mk('DECIMAL(19, 4)');
        case 'char': return mk(withArgs('CHAR', args));
        case 'varchar': return mk(withArgs('VARCHAR', args.length ? args : ['255']));
        case 'text':
          return mk(['tinytext', 'mediumtext', 'longtext'].includes(p.base) ? p.base.toUpperCase() : p.base === 'ntext' ? 'LONGTEXT' : 'TEXT');
        case 'bool': return mk('TINYINT(1)');
        case 'bit': return mk(withArgs('BIT', args));
        case 'timestamp': return mk(p.base === 'timestamp' ? withArgs('TIMESTAMP', args) : withArgs('DATETIME', args));
        case 'timestamptz': return mk(withArgs('TIMESTAMP', args));
        case 'date': return mk('DATE');
        case 'time': return mk(withArgs('TIME', args));
        case 'uuid': return mk('CHAR(36)');
        case 'json': return mk('JSON');
        case 'bytes':
          if (p.base === 'bytea') return mk('BLOB');
          if (p.base === 'image') return mk('LONGBLOB');
          if (p.base === 'binary' || p.base === 'varbinary') return mk(withArgs(p.base.toUpperCase(), args.length ? args : p.base === 'varbinary' ? ['255'] : []));
          return mk(p.base.toUpperCase());
        default: return mk(p.raw);
      }
    }
    case 'sqlite': {
      switch (cat) {
        case 'smallint': case 'tinyint': case 'mediumint': case 'int': case 'bigint':
          return mk('INTEGER');
        case 'serial': case 'smallserial': case 'bigserial':
          return mk('INTEGER', cat);
        case 'real': case 'float': case 'double': return mk('REAL');
        case 'decimal': case 'money': return mk('NUMERIC');
        case 'char': case 'varchar': case 'text': return mk('TEXT');
        case 'bool': case 'bit': return mk('INTEGER');
        case 'timestamp': case 'timestamptz': case 'date': case 'time': return mk('TEXT');
        case 'uuid': case 'json': return mk('TEXT');
        case 'bytes': return mk('BLOB');
        default: return mk(p.raw);
      }
    }
    case 'mssql': {
      switch (cat) {
        case 'smallint': return mk('SMALLINT');
        case 'tinyint': return mk('TINYINT');
        case 'mediumint': case 'int': return mk('INT');
        case 'bigint': return mk('BIGINT');
        case 'serial': return mk('INT IDENTITY(1,1)', 'serial');
        case 'smallserial': return mk('SMALLINT IDENTITY(1,1)', 'smallserial');
        case 'bigserial': return mk('BIGINT IDENTITY(1,1)', 'bigserial');
        case 'real': return mk('REAL');
        case 'float': return mk(withArgs('FLOAT', args.slice(0, 1)));
        case 'double': return mk('FLOAT(53)');
        case 'decimal': return mk(withArgs('DECIMAL', args));
        case 'money': return mk(p.base === 'smallmoney' ? 'SMALLMONEY' : 'MONEY');
        case 'char': return mk(withArgs(nPrefixed ? 'NCHAR' : 'CHAR', args));
        case 'varchar': return mk(withArgs(nPrefixed ? 'NVARCHAR' : 'VARCHAR', args.length ? args : ['255']));
        case 'text': return mk('NVARCHAR(MAX)');
        case 'bool': case 'bit': return mk('BIT');
        case 'timestamp':
          return mk(p.base === 'smalldatetime' ? 'SMALLDATETIME' : p.base === 'datetime' ? 'DATETIME' : withArgs('DATETIME2', args));
        case 'timestamptz': return mk(withArgs('DATETIMEOFFSET', args));
        case 'date': return mk('DATE');
        case 'time': return mk(withArgs('TIME', args));
        case 'uuid': return mk('UNIQUEIDENTIFIER');
        case 'json': return mk('NVARCHAR(MAX)');
        case 'bytes':
          if (p.base === 'binary' || p.base === 'varbinary') return mk(withArgs(p.base.toUpperCase(), args.length ? args : p.base === 'varbinary' ? ['MAX'] : ['1']));
          return mk('VARBINARY(MAX)');
        default: return mk(p.raw);
      }
    }
  }
}

// ── Defaults ────────────────────────────────────────────────────────────────

export type DefaultInfo =
  | { kind: 'null' }
  | { kind: 'bool'; value: boolean }
  | { kind: 'number'; text: string }
  | { kind: 'string'; value: string }
  | { kind: 'now'; text: string }
  | { kind: 'uuid'; text: string }
  | { kind: 'keyword'; text: string }
  | { kind: 'expr'; text: string };

const NUMBER_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const SINGLE_QUOTED_RE = /^'((?:[^']|'')*)'$/s;
const PREFIXED_QUOTED_RE = /^[nNeE]'((?:[^']|'')*)'$/s;
const DOUBLE_QUOTED_RE = /^"((?:[^"]|"")*)"$/s;
const NOW_RE = /^(now\(\)|current_timestamp(\(\d*\))?|localtimestamp(\(\d*\))?|transaction_timestamp\(\)|statement_timestamp\(\)|clock_timestamp\(\)|getdate\(\)|getutcdate\(\)|sysdatetime\(\)|sysutcdatetime\(\)|sysdatetimeoffset\(\))$/i;
const UUID_RE = /^(gen_random_uuid|uuid_generate_v[1-5]|uuid|newid|newsequentialid)\(\)$/i;
const KEYWORD_RE = /^(current_date|current_time(\(\d*\))?|localtime(\(\d*\))?|current_user|session_user|current_schema|user)$/i;
const BARE_WORD_RE = /^[A-Za-z_][A-Za-z0-9_ .-]*$/;

function unwrapParens(s: string): string {
  let cur = s.trim();
  while (cur.startsWith('(') && cur.endsWith(')')) {
    // Only strip when the first paren closes at the very end.
    let depth = 0;
    let wrapped = true;
    let quote: string | null = null;
    for (let i = 0; i < cur.length; i++) {
      const c = cur[i];
      if (quote) {
        if (c === quote) {
          if (cur[i + 1] === quote) i++;
          else quote = null;
        }
        continue;
      }
      if (c === "'" || c === '"') quote = c;
      else if (c === '(') depth++;
      else if (c === ')') {
        depth--;
        if (depth === 0 && i < cur.length - 1) { wrapped = false; break; }
      }
    }
    if (!wrapped) break;
    cur = cur.slice(1, -1).trim();
  }
  return cur;
}

/**
 * Convention: Field.default holds a SQL expression verbatim, so string
 * literals are stored WITH quotes ('active'). Bare words that are not
 * keywords/numbers/functions (active) are defensively treated as strings.
 * Anything that cannot be embedded safely becomes a string literal.
 */
export function analyzeDefault(raw: string | undefined | null): DefaultInfo | undefined {
  if (raw == null) return undefined;
  const trimmed = String(raw).replace(/\u0000/g, '').trim();
  if (trimmed === '') return undefined;

  const unwrapped = unwrapParens(trimmed);
  const t = unwrapped === '' ? trimmed : unwrapped;

  if (/^null$/i.test(t)) return { kind: 'null' };
  if (/^(true|false)$/i.test(t)) return { kind: 'bool', value: t.toLowerCase() === 'true' };
  if (NUMBER_RE.test(t)) return { kind: 'number', text: t };

  let m = SINGLE_QUOTED_RE.exec(t) ?? PREFIXED_QUOTED_RE.exec(t);
  if (m) return { kind: 'string', value: m[1].replace(/''/g, "'") };
  m = DOUBLE_QUOTED_RE.exec(t);
  if (m) return { kind: 'string', value: m[1].replace(/""/g, '"') };

  const compact = t.replace(/\s+/g, ' ');
  if (NOW_RE.test(compact)) return { kind: 'now', text: compact };
  if (UUID_RE.test(compact)) return { kind: 'uuid', text: compact };
  if (KEYWORD_RE.test(compact)) return { kind: 'keyword', text: compact };
  if (BARE_WORD_RE.test(compact)) return { kind: 'string', value: compact };

  const safe = safeExpression(t);
  if (safe === undefined) {
    // Unbalanced quotes etc. (e.g. it's): treat as a plain string.
    return { kind: 'string', value: t.replace(CONTROL_CHARS, ' ') };
  }
  return { kind: 'expr', text: safe };
}

const PG_NOW_OK = /^(now\(\)|current_timestamp(\(\d*\))?|localtimestamp(\(\d*\))?|transaction_timestamp\(\)|statement_timestamp\(\)|clock_timestamp\(\))$/i;
const PG_UUID_OK = /^(gen_random_uuid|uuid_generate_v[1-5])\(\)$/i;

const TEXTUAL: TypeCategory[] = ['char', 'varchar', 'text', 'uuid', 'date', 'time', 'timestamp', 'timestamptz'];

/** Render a DEFAULT expression for the SQL dialect (without the DEFAULT keyword). */
export function renderSqlDefault(
  raw: string | undefined,
  dialect: Dialect,
  category: TypeCategory = 'other'
): string | undefined {
  const info = analyzeDefault(raw);
  if (!info) return undefined;
  const boolish = category === 'bool';
  switch (info.kind) {
    case 'null':
      return 'NULL';
    case 'bool':
      return dialect === 'postgres' || dialect === 'mysql'
        ? (info.value ? 'true' : 'false')
        : (info.value ? '1' : '0');
    case 'number':
      if (boolish && (info.text === '0' || info.text === '1')) {
        const v = info.text === '1';
        return dialect === 'postgres' || dialect === 'mysql' ? (v ? 'true' : 'false') : (v ? '1' : '0');
      }
      if (TEXTUAL.includes(category) && category !== 'date' && category !== 'time' && category !== 'timestamp' && category !== 'timestamptz') {
        return sqlString(info.text, dialect);
      }
      return info.text;
    case 'string':
      return sqlString(info.value, dialect);
    case 'now':
      if (dialect === 'postgres') return PG_NOW_OK.test(info.text) ? info.text : 'now()';
      return 'CURRENT_TIMESTAMP';
    case 'uuid':
      switch (dialect) {
        case 'postgres': return PG_UUID_OK.test(info.text) ? info.text : 'gen_random_uuid()';
        case 'mysql': return '(UUID())';
        case 'mssql': return 'NEWID()';
        case 'sqlite': return '(lower(hex(randomblob(16))))';
      }
      return info.text;
    case 'keyword':
      return info.text.toUpperCase();
    case 'expr':
      return dialect === 'mysql' || dialect === 'sqlite' ? `(${info.text})` : info.text;
  }
}

// ── Relationships ───────────────────────────────────────────────────────────

export interface ResolvedRel {
  rel: Relationship;
  sourceTable: Table;
  sourceField: Field;
  targetTable: Table;
  targetField: Field;
}

/** Resolve ids to objects, drop dangling relationships and exact duplicates. */
export function resolveRelationships(tables: Table[], relationships: Relationship[]): ResolvedRel[] {
  const tableMap = new Map(tables.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const out: ResolvedRel[] = [];
  for (const rel of relationships) {
    const sourceTable = tableMap.get(rel.sourceTableId);
    const targetTable = tableMap.get(rel.targetTableId);
    const sourceField = sourceTable?.fields.find((f) => f.id === rel.sourceFieldId);
    const targetField = targetTable?.fields.find((f) => f.id === rel.targetFieldId);
    if (!sourceTable || !targetTable || !sourceField || !targetField) continue;
    const key = `${sourceTable.id}\u0000${sourceField.id}\u0000${targetTable.id}\u0000${targetField.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ rel, sourceTable, sourceField, targetTable, targetField });
  }
  return out;
}

/** True when the FK column is effectively unique (one-to-one). */
export function isOneToOne(r: ResolvedRel): boolean {
  if (r.rel.cardinality === 'one-to-one') return true;
  const f = r.sourceField;
  if (f.unique) return true;
  const pkCount = r.sourceTable.fields.filter((x) => x.isPK).length;
  return f.isPK && pkCount === 1;
}

/**
 * Order tables so referenced tables come first (stable; cycles are broken by
 * picking the first remaining table).
 */
export function orderTables(tables: Table[], rels: ResolvedRel[]): Table[] {
  const deps = new Map<string, Set<string>>();
  for (const t of tables) deps.set(t.id, new Set());
  for (const r of rels) {
    if (r.sourceTable.id !== r.targetTable.id) deps.get(r.sourceTable.id)?.add(r.targetTable.id);
  }
  const done = new Set<string>();
  const remaining = [...tables];
  const result: Table[] = [];
  while (remaining.length) {
    let idx = remaining.findIndex((t) => [...(deps.get(t.id) ?? [])].every((d) => done.has(d)));
    if (idx === -1) idx = 0; // cycle
    const [t] = remaining.splice(idx, 1);
    done.add(t.id);
    result.push(t);
  }
  return result;
}

// ── Constraint names ────────────────────────────────────────────────────────

const MAX_NAME = 63;

function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36).padStart(7, '0').slice(0, 7);
}

/** Fit a name into the identifier limit, keeping it deterministic. */
export function fitName(name: string, max = MAX_NAME): string {
  const clean = name.replace(CONTROL_CHARS, '');
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 8)}_${shortHash(clean)}`;
}

/** Return a name unused in `used` (case-insensitive) and register it. */
export function uniqueName(base: string, used: Set<string>, max = MAX_NAME): string {
  let name = fitName(base, max);
  let n = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = `_${n++}`;
    name = fitName(base, max - suffix.length) + suffix;
  }
  used.add(name.toLowerCase());
  return name;
}

/** Default FK constraint name (shared by SQL export and migrations). */
export function fkBaseName(table: string, column: string): string {
  return `fk_${stripControl(table)}_${stripControl(column)}`;
}
