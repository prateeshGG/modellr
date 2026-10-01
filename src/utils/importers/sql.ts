import { nanoid } from '../../store/nanoid';
import type { Table, Field, Relationship, AccentColor, Cardinality } from '../../types/schema';
import { ACCENT_COLORS } from '../constants';

/**
 * SQL DDL importer.
 *
 * A hand-written, dependency-free pipeline:
 *   1. preprocess  - drop COPY ... FROM stdin data blocks, psql meta lines, turn `GO` into `;`
 *   2. stripComments - tokenizer-aware (strings, quoted identifiers, $$ quoting)
 *   3. splitStatements - respects quotes / dollar-quotes / `DELIMITER`
 *   4. each CREATE TABLE is parsed on its own; ALTER TABLE / COMMENT ON / CREATE UNIQUE INDEX
 *      are applied afterwards; everything else is ignored.
 *   A statement that fails to parse only produces a warning in `errors`.
 *
 * Representation decisions (documented for the rest of the app):
 *  - `Field.default` is a ready-to-emit SQL fragment: string literals keep their quotes
 *    (`'active'`), expressions are verbatim (`now()`, `gen_random_uuid()`, `CURRENT_TIMESTAMP`).
 *    Redundant `::type` casts on plain string literals are dropped. `DEFAULT NULL` => undefined.
 *  - `Field.type` is the base type (`varchar`, `numeric`); size goes to `length` / `precision` / `scale`.
 *    `timestamp with time zone` => `timestamptz`, `double precision` is kept as is.
 *  - Auto-increment columns (serial, nextval() default, AUTO_INCREMENT, AUTOINCREMENT, IDENTITY,
 *    GENERATED ... AS IDENTITY) become `serial` / `bigserial` / `smallserial` with no default.
 *  - Enum types (`CREATE TYPE x AS ENUM`) keep the enum name as the column type. Enum VALUES are
 *    not preserved (the data model has nowhere to store them). MySQL inline enum(...) => `enum`.
 *  - `unsigned` / `zerofill` / integer display widths are dropped; `tinyint(1)` => `boolean`.
 *  - Composite UNIQUE constraints are not representable; only single-column ones set `unique`.
 *  - Composite foreign keys produce one relationship per column pair.
 *  - Tables are keyed internally by schema-qualified name. `public`/`dbo`/`main` are dropped from
 *    display names; if two tables share a bare name the display name becomes `schema.table`.
 *  - `errors` only ever contains non-fatal warnings, except when no table could be imported.
 */

export interface ImportResult {
  tables: Table[];
  relationships: Relationship[];
  errors: string[];
}

// ─────────────────────────────────────────────────────────────
// Low level scanning helpers
// ─────────────────────────────────────────────────────────────

function isWordCh(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95 ||
    code === 36 ||
    code > 127
  );
}

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

/** Index just past the closing quote of a '...' string that starts at i. */
function skipSingleQuoted(s: string, i: number, backslash: boolean): number {
  const n = s.length;
  let j = i + 1;
  while (j < n) {
    const c = s.charCodeAt(j);
    if (c === 92 && backslash) { j += 2; continue; }
    if (c === 39) {
      if (s.charCodeAt(j + 1) === 39) { j += 2; continue; }
      return j + 1;
    }
    j++;
  }
  return n;
}

/** Index just past the closing quote of a "..." or `...` identifier. */
function skipQuotedIdent(s: string, i: number, q: number): number {
  const n = s.length;
  let j = i + 1;
  while (j < n) {
    if (s.charCodeAt(j) === q) {
      if (s.charCodeAt(j + 1) === q) { j += 2; continue; }
      return j + 1;
    }
    j++;
  }
  return n;
}

/** If a Postgres dollar-quote tag ($$ or $tag$) starts at i, return it. */
function dollarTagAt(s: string, i: number): string | null {
  if (s.charCodeAt(i) !== 36) return null;
  if (i > 0 && isWordCh(s.charCodeAt(i - 1))) return null;
  let j = i + 1;
  if (isDigit(s.charCodeAt(j))) return null; // $1 parameter
  while (j < s.length) {
    const c = s.charCodeAt(j);
    if (c === 36 || !isWordCh(c)) break;
    j++;
  }
  return s.charCodeAt(j) === 36 ? s.slice(i, j + 1) : null;
}

function isEStringAt(s: string, i: number): boolean {
  if (i === 0) return false;
  const p = s.charCodeAt(i - 1);
  if (p !== 69 && p !== 101) return false;
  return i < 2 || !isWordCh(s.charCodeAt(i - 2));
}

/**
 * Remove `-- ...` and `/* ... *\/` comments without touching string literals,
 * quoted identifiers, backtick identifiers or dollar-quoted bodies.
 */
export function stripComments(sql: string, opts: { mysql?: boolean } = {}): string {
  const mysql = !!opts.mysql;
  const n = sql.length;
  const out: string[] = [];
  let last = 0;
  let i = 0;
  while (i < n) {
    const c = sql.charCodeAt(i);
    if (c === 39) {
      i = skipSingleQuoted(sql, i, mysql || isEStringAt(sql, i));
    } else if (c === 34 || c === 96) {
      i = skipQuotedIdent(sql, i, c);
    } else if (c === 36) {
      const tag = dollarTagAt(sql, i);
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length);
        i = end === -1 ? n : end + tag.length;
      } else {
        i++;
      }
    } else if (c === 45 && sql.charCodeAt(i + 1) === 45) {
      out.push(sql.slice(last, i));
      let j = sql.indexOf('\n', i);
      if (j === -1) j = n;
      out.push(' ');
      i = last = j; // keep the newline
    } else if (c === 47 && sql.charCodeAt(i + 1) === 42) {
      out.push(sql.slice(last, i));
      let depth = 1;
      let j = i + 2;
      while (j < n && depth > 0) {
        if (sql.charCodeAt(j) === 42 && sql.charCodeAt(j + 1) === 47) { depth--; j += 2; }
        else if (!mysql && sql.charCodeAt(j) === 47 && sql.charCodeAt(j + 1) === 42) { depth++; j += 2; }
        else j++;
      }
      out.push(' ');
      i = last = j;
    } else {
      i++;
    }
  }
  out.push(sql.slice(last));
  return out.join('');
}

/** Split into statements on `;` (or a DELIMITER override) outside of quotes. */
export function splitStatements(sql: string, mysql = false): string[] {
  const n = sql.length;
  const stmts: string[] = [];
  const delimRe = /[ \t]*DELIMITER[ \t]+(\S+)[ \t]*(?:\r?\n|$)/iy;
  let delim = ';';
  let start = 0;
  let atStart = true;
  let i = 0;
  const flush = (end: number) => {
    const s = sql.slice(start, end).trim();
    if (s) stmts.push(s);
  };
  while (i < n) {
    const c = sql.charCodeAt(i);
    if (atStart) {
      if (c <= 32) { i++; continue; }
      delimRe.lastIndex = i;
      const m = delimRe.exec(sql);
      if (m) {
        delim = m[1];
        i += m[0].length;
        start = i;
        continue;
      }
      atStart = false;
    }
    if (c === 39) {
      i = skipSingleQuoted(sql, i, mysql || isEStringAt(sql, i));
    } else if (c === 34 || c === 96) {
      i = skipQuotedIdent(sql, i, c);
    } else if (c === 36) {
      const tag = dollarTagAt(sql, i);
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length);
        i = end === -1 ? n : end + tag.length;
      } else i++;
    } else if (c === delim.charCodeAt(0) && sql.startsWith(delim, i)) {
      flush(i);
      i += delim.length;
      start = i;
      atStart = true;
    } else {
      i++;
    }
  }
  flush(n);
  return stmts;
}

/**
 * Line based clean-up that has to happen before comment stripping:
 *  - pg_dump `COPY ... FROM stdin;` data blocks (data lines are dropped, the COPY line stays)
 *  - psql meta commands (`\connect`, `\restrict`, ...)
 *  - SQL Server `GO` batch separators (become `;`)
 */
function preprocess(sql: string): string {
  if (!/\bstdin\b|^\s*\\|^\s*GO\s*$/im.test(sql)) return sql;
  const lines = sql.split('\n');
  const out: string[] = [];
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k];
    if (/^\s*copy\s.*\sfrom\s+stdin\b/i.test(line)) {
      out.push(line);
      while (k + 1 < lines.length && lines[k + 1].trim() !== '\\.') k++;
      k++; // skip terminator line (or run off the end)
      continue;
    }
    if (/^\s*\\[A-Za-z]/.test(line)) { out.push(''); continue; }
    if (/^\s*GO(?:\s+\d+)?\s*$/i.test(line)) { out.push(';'); continue; }
    out.push(line);
  }
  return out.join('\n');
}

// ─────────────────────────────────────────────────────────────
// Tokenizer (used for the statements we actually understand)
// ─────────────────────────────────────────────────────────────

type TokKind = 'w' | 'q' | 's' | 'n' | 'p';
interface Tok {
  k: TokKind;   // w=bare word, q=quoted identifier, s=string literal, n=number, p=punctuation
  v: string;    // w: original text, q: unquoted name, s/n: raw text, p: the punctuation
  l: string;    // lowercase for words, '' otherwise
  s: number;
  e: number;
}

const NUM_RE = /0[xX][0-9a-fA-F]+|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+/y;

function tokenize(text: string, mysql: boolean): Tok[] {
  const toks: Tok[] = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c <= 32) { i++; continue; }
    const prev = toks[toks.length - 1];

    if (c === 39) { // string (optionally prefixed with E / N / B / X)
      let s = i;
      let bs = mysql;
      if (prev && prev.k === 'w' && prev.e === i && /^[eEnNbBxX]$/.test(prev.v)) {
        s = prev.s;
        if (prev.v === 'e' || prev.v === 'E') bs = true;
        toks.pop();
      }
      const j = skipSingleQuoted(text, i, bs);
      toks.push({ k: 's', v: text.slice(s, j), l: '', s, e: j });
      i = j;
      continue;
    }
    if (c === 34 || c === 96) {
      const j = skipQuotedIdent(text, i, c);
      const q = String.fromCharCode(c);
      const inner = text.slice(i + 1, j - 1).split(q + q).join(q);
      toks.push({ k: 'q', v: inner, l: '', s: i, e: j });
      i = j;
      continue;
    }
    if (c === 91) { // [ : SQL Server identifier or array subscript
      const adjacent = prev && prev.e === i && (prev.k === 'w' || prev.k === 'q' || (prev.k === 'p' && (prev.v === ')' || prev.v === ']')));
      if (!adjacent && text.charCodeAt(i + 1) !== 93) {
        let j = i + 1;
        while (j < n) {
          if (text.charCodeAt(j) === 93) {
            if (text.charCodeAt(j + 1) === 93) { j += 2; continue; }
            break;
          }
          j++;
        }
        const inner = text.slice(i + 1, j).split(']]').join(']');
        toks.push({ k: 'q', v: inner, l: '', s: i, e: Math.min(j + 1, n) });
        i = j + 1;
        continue;
      }
    }
    if (c === 36) {
      const tag = dollarTagAt(text, i);
      if (tag) {
        const end = text.indexOf(tag, i + tag.length);
        const j = end === -1 ? n : end + tag.length;
        toks.push({ k: 's', v: text.slice(i, j), l: '', s: i, e: j });
        i = j;
        continue;
      }
    }
    if (isDigit(c) || (c === 46 && isDigit(text.charCodeAt(i + 1)) && !(prev && prev.e === i && (prev.k === 'w' || prev.k === 'q')))) {
      NUM_RE.lastIndex = i;
      const m = NUM_RE.exec(text);
      if (m) {
        toks.push({ k: 'n', v: m[0], l: '', s: i, e: i + m[0].length });
        i += m[0].length;
        continue;
      }
    }
    if (isWordCh(c) || c === 35 || c === 64) { // word (also #temp / @var)
      let j = i + 1;
      while (j < n) {
        const d = text.charCodeAt(j);
        if (isWordCh(d) || d === 35 || d === 64) j++; else break;
      }
      const v = text.slice(i, j);
      toks.push({ k: 'w', v, l: v.toLowerCase(), s: i, e: j });
      i = j;
      continue;
    }
    if (c === 58 && text.charCodeAt(i + 1) === 58) {
      toks.push({ k: 'p', v: '::', l: '', s: i, e: i + 2 });
      i += 2;
      continue;
    }
    toks.push({ k: 'p', v: text[i], l: '', s: i, e: i + 1 });
    i++;
  }
  return toks;
}

class Cur {
  i = 0;
  t: Tok[];
  src: string;
  constructor(t: Tok[], src: string) {
    this.t = t;
    this.src = src;
  }
  get eof(): boolean { return this.i >= this.t.length; }
  peek(o = 0): Tok | undefined { return this.t[this.i + o]; }
  next(): Tok | undefined { return this.t[this.i++]; }
  isW(w: string, o = 0): boolean { const t = this.t[this.i + o]; return !!t && t.k === 'w' && t.l === w; }
  isP(p: string, o = 0): boolean { const t = this.t[this.i + o]; return !!t && t.k === 'p' && t.v === p; }
  eatW(w: string): boolean { if (this.isW(w)) { this.i++; return true; } return false; }
  eatP(p: string): boolean { if (this.isP(p)) { this.i++; return true; } return false; }
  /** Skip a balanced ( ... ) or [ ... ] group starting at the current token. */
  skipGroup(): void {
    let depth = 0;
    while (!this.eof) {
      const t = this.next()!;
      if (t.k === 'p') {
        if (t.v === '(' || t.v === '[') depth++;
        else if (t.v === ')' || t.v === ']') depth--;
      }
      if (depth <= 0) return;
    }
  }
}

/** Split a token list on commas that are not nested inside parentheses. */
function splitTop(toks: Tok[]): Tok[][] {
  const parts: Tok[][] = [];
  let cur: Tok[] = [];
  let depth = 0;
  for (const t of toks) {
    if (t.k === 'p') {
      if (t.v === '(' || t.v === '[') depth++;
      else if (t.v === ')' || t.v === ']') depth--;
      else if (t.v === ',' && depth === 0) { parts.push(cur); cur = []; continue; }
    }
    cur.push(t);
  }
  if (cur.length) parts.push(cur);
  return parts;
}

function unquoteString(raw: string): string {
  const m = /^[a-zA-Z]?'([\s\S]*)'$/.exec(raw);
  if (!m) return raw;
  return m[1].split("''").join("'");
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

const TYPE_CONT = new Set([
  'varying', 'precision', 'with', 'without', 'time', 'zone', 'unsigned', 'signed', 'zerofill',
]);
const DROPPED_TYPE_WORDS = new Set(['unsigned', 'signed', 'zerofill']);
const TYPE_ALIASES: Record<string, string> = {
  'character varying': 'varchar',
  'national character varying': 'varchar',
  'national char varying': 'varchar',
  'character': 'char',
  'national character': 'char',
  'national char': 'char',
  'int4': 'integer',
  'int8': 'bigint',
  'int2': 'smallint',
  'float4': 'real',
  'float8': 'double precision',
  'bool': 'boolean',
  'serial4': 'serial',
  'serial8': 'bigserial',
  'serial2': 'smallserial',
  'timestamp with time zone': 'timestamptz',
  'timestamp without time zone': 'timestamp',
  'time with time zone': 'timetz',
  'time without time zone': 'time',
  'bit varying': 'varbit',
  'dec': 'decimal',
};
const LENGTH_TYPES = new Set(['varchar', 'char', 'nvarchar', 'nchar', 'binary', 'varbinary']);
const PRECISION_TYPES = new Set(['numeric', 'decimal', 'float', 'double', 'real']);
const INT_TYPES = new Set(['int', 'integer', 'smallint', 'bigint', 'mediumint', 'tinyint']);
const SERIAL_TYPES = new Set(['serial', 'bigserial', 'smallserial']);

interface TypeInfo {
  name: string;
  args: Array<number | string>;
  isArray: boolean;
}

function parseType(cur: Cur): TypeInfo {
  let first = cur.next();
  if (!first || (first.k !== 'w' && first.k !== 'q')) throw new Error('expected a data type');
  while (cur.isP('.') && (cur.peek(1)?.k === 'w' || cur.peek(1)?.k === 'q')) {
    cur.next();
    first = cur.next()!;
  }
  const quoted = first.k === 'q';
  const words: string[] = [quoted ? first.v : first.l];
  const args: Array<number | string> = [];
  let isArray = false;
  for (;;) {
    const t = cur.peek();
    if (!t) break;
    if (t.k === 'w' && !quoted) {
      const lastWord = words[words.length - 1];
      if (TYPE_CONT.has(t.l) || (t.l === 'character' && lastWord === 'national') || (t.l === 'char' && lastWord === 'national')) {
        words.push(t.l);
        cur.next();
        continue;
      }
      if (t.l === 'array') {
        isArray = true;
        cur.next();
        if (cur.isP('[')) cur.skipGroup();
        continue;
      }
    }
    if (t.k === 'p' && t.v === '(') {
      const start = cur.i;
      cur.skipGroup();
      if (args.length === 0) {
        for (let k = start + 1; k < cur.i - 1; k++) {
          const a = cur.t[k];
          if (a.k === 'n' && /^\d+$/.test(a.v)) args.push(Number(a.v));
          else if (a.k === 'w' && a.l === 'max') args.push('max');
        }
      }
      continue;
    }
    if (t.k === 'p' && t.v === '[') {
      cur.skipGroup();
      isArray = true;
      continue;
    }
    break;
  }
  const kept = words.filter((w) => !DROPPED_TYPE_WORDS.has(w));
  const joined = kept.join(' ');
  return { name: TYPE_ALIASES[joined] ?? joined, args, isArray };
}

function applyTypeInfo(field: Field, ti: TypeInfo): void {
  let name = ti.name;
  const a0 = ti.args[0];
  const a1 = ti.args[1];
  if (name === 'tinyint' && a0 === 1) name = 'boolean';
  field.type = ti.isArray ? `${name}[]` : name;
  if (ti.isArray) return;
  if (LENGTH_TYPES.has(name) && typeof a0 === 'number') {
    field.length = a0;
  } else if (PRECISION_TYPES.has(name) && typeof a0 === 'number') {
    field.precision = a0;
    if (typeof a1 === 'number') field.scale = a1;
  }
}

function applyAutoInc(field: Field): void {
  const t = field.type;
  if (SERIAL_TYPES.has(t)) return;
  if (!INT_TYPES.has(t)) return;
  field.type = t === 'bigint' ? 'bigserial' : t === 'smallint' || t === 'tinyint' ? 'smallserial' : 'serial';
  field.default = undefined;
}

// ─────────────────────────────────────────────────────────────
// Default expressions
// ─────────────────────────────────────────────────────────────

const EXPR_OPS = new Set(['+', '-', '*', '/', '%', '|', '&', '^']);
const TYPED_LITERAL = new Set(['interval', 'timestamp', 'timestamptz', 'date', 'time', 'timetz', 'bit']);
const NOW_LITERALS = new Set(["'now'", "'today'", "'tomorrow'", "'yesterday'", "'infinity'", "'-infinity'", "'epoch'", "'allballs'"]);

function parseOperand(cur: Cur): void {
  const t = cur.next();
  if (!t) throw new Error('unexpected end of expression');
  if (t.k === 'p') {
    if (t.v === '(') { cur.i--; cur.skipGroup(); return; }
    if (t.v === '-' || t.v === '+' || t.v === '~') { parseOperand(cur); return; }
    throw new Error(`unexpected "${t.v}" in expression`);
  }
  if (t.k !== 'w') return; // string, number or quoted identifier
  if (t.l === 'case') {
    let depth = 1;
    while (!cur.eof && depth > 0) {
      const x = cur.next()!;
      if (x.k === 'w' && x.l === 'case') depth++;
      else if (x.k === 'w' && x.l === 'end') depth--;
    }
    return;
  }
  while (cur.isP('.') && cur.peek(1)) { cur.next(); cur.next(); }
  if (cur.isP('(')) { cur.skipGroup(); return; }
  if (cur.isP('[') && cur.peek()!.s === t.e) { cur.skipGroup(); return; }
  if (TYPED_LITERAL.has(t.l) && cur.peek()?.k === 's') cur.next();
}

function parseExpr(cur: Cur): string {
  const first = cur.peek();
  if (!first) throw new Error('missing default expression');
  let casts = 0;
  let ops = 0;
  parseOperand(cur);
  for (;;) {
    if (cur.isP('::')) {
      cur.next();
      parseType(cur);
      casts++;
      continue;
    }
    const t = cur.peek();
    if (t && t.k === 'p' && EXPR_OPS.has(t.v)) {
      cur.next();
      while (cur.peek()?.k === 'p' && EXPR_OPS.has(cur.peek()!.v) && cur.peek(1)?.k !== 'n') cur.next();
      parseOperand(cur);
      ops++;
      continue;
    }
    if (cur.isW('at') && cur.isW('time', 1) && cur.isW('zone', 2)) {
      cur.next(); cur.next(); cur.next();
      parseOperand(cur);
      ops++;
      continue;
    }
    break;
  }
  const last = cur.t[cur.i - 1];
  if (first.k === 's' && ops === 0 && casts === 1 && !NOW_LITERALS.has(first.v.toLowerCase())) {
    return first.v;
  }
  return cur.src.slice(first.s, last.e).trim();
}

/** True if `text` is entirely wrapped by one pair of parentheses. */
function isWrapped(text: string): boolean {
  if (text.charCodeAt(0) !== 40 || text.charCodeAt(text.length - 1) !== 41) return false;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 39) { i = skipSingleQuoted(text, i, false) - 1; continue; }
    if (c === 40) depth++;
    else if (c === 41) {
      depth--;
      if (depth === 0 && i < text.length - 1) return false;
    }
  }
  return depth === 0;
}

function normalizeDefault(text: string): string | undefined {
  let t = text.trim();
  while (isWrapped(t)) {
    const inner = t.slice(1, -1).trim();
    if (isWrapped(inner) || /^[+-]?\d+(\.\d+)?$/.test(inner) || /^'(?:[^']|'')*'$/.test(inner) || /^(true|false|null)$/i.test(inner)) {
      t = inner;
    } else break;
  }
  if (!t || /^null$/i.test(t)) return undefined;
  return t;
}

function setDefault(field: Field, text: string | undefined): void {
  const d = text === undefined ? undefined : normalizeDefault(text);
  if (d && /^nextval\s*\(/i.test(d) && (INT_TYPES.has(field.type) || SERIAL_TYPES.has(field.type))) {
    applyAutoInc(field);
    field.default = undefined;
    return;
  }
  field.default = d !== undefined ? coerceLiteral(field.type, d) : undefined;
}

/** MySQL dumps quote numbers ('0.00', '1'); unquote them for numeric/boolean columns. */
function coerceLiteral(type: string, d: string): string {
  const m = /^'(-?\d+(?:\.\d+)?)'$/.exec(d);
  if (!m) return type === 'boolean' && (d === '1' || d === '0') ? (d === '1' ? 'TRUE' : 'FALSE') : d;
  const base = type.replace(/\[\]$/, '');
  if (type === 'boolean') return m[1] === '1' ? 'TRUE' : m[1] === '0' ? 'FALSE' : d;
  if (INT_TYPES.has(base) || PRECISION_TYPES.has(base) || base === 'smallserial') return m[1];
  return d;
}

// ─────────────────────────────────────────────────────────────
// Import context
// ─────────────────────────────────────────────────────────────

interface Ref { parts: string[]; cols?: string[] }

interface TableDraft {
  key: string;
  schema: string;      // original schema as written ('' if none)
  keySchema: string;   // '' for public/dbo/main
  bare: string;
  table: Table;
  byName: Map<string, Field>;
}

interface PendingFK { td: TableDraft; cols: string[]; ref: Ref }

interface Ctx {
  mysql: boolean;
  drafts: TableDraft[];
  byKey: Map<string, TableDraft>;
  byBare: Map<string, TableDraft[]>;
  fks: PendingFK[];
  warnings: string[];
  ignored: Map<string, number>;
  enumTypes: number;
}

const DEFAULT_SCHEMAS = new Set(['', 'public', 'dbo', 'main']);
const keySchemaOf = (s: string) => (DEFAULT_SCHEMAS.has(s.toLowerCase()) ? '' : s.toLowerCase());

function resolveTable(ctx: Ctx, parts: string[], hint?: TableDraft): TableDraft | undefined {
  const name = parts[parts.length - 1].toLowerCase();
  if (parts.length >= 2) {
    const ks = keySchemaOf(parts[parts.length - 2]);
    const hit = ctx.byKey.get(ks ? `${ks}.${name}` : name);
    if (hit) return hit;
    const c = ctx.byBare.get(name);
    return c && c.length === 1 ? c[0] : undefined;
  }
  const c = ctx.byBare.get(name);
  if (!c) return undefined;
  if (c.length === 1) return c[0];
  return (hint && c.find((d) => d.keySchema === hint.keySchema)) || c.find((d) => d.keySchema === '') || c[0];
}

function ident(t: Tok | undefined): string {
  if (!t || (t.k !== 'w' && t.k !== 'q')) throw new Error('expected an identifier');
  return t.v;
}

function parseQName(cur: Cur): string[] {
  const parts = [ident(cur.next())];
  while (cur.isP('.')) {
    cur.next();
    if (cur.isP('.')) { cur.next(); continue; } // db..table
    parts.push(ident(cur.next()));
  }
  return parts;
}

function parseColList(cur: Cur): { cols: string[]; autoinc: boolean } {
  const cols: string[] = [];
  let autoinc = false;
  if (!cur.eatP('(')) throw new Error('expected a column list');
  let depth = 1;
  let itemStart = true;
  while (!cur.eof && depth > 0) {
    const t = cur.next()!;
    if (t.k === 'p' && t.v === '(') { depth++; itemStart = false; continue; }
    if (t.k === 'p' && t.v === ')') { depth--; continue; }
    if (depth === 1 && t.k === 'p' && t.v === ',') { itemStart = true; continue; }
    if (depth === 1 && t.k === 'w' && t.l === 'autoincrement') autoinc = true;
    if (depth === 1 && itemStart) {
      itemStart = false;
      if (t.k === 'w' || t.k === 'q') {
        const nxt = cur.peek();
        const isExpr = t.k === 'w' && nxt && nxt.k === 'p' && nxt.v === '(' && cur.peek(1)?.k !== 'n';
        cols.push(isExpr ? '' : t.v);
      } else cols.push('');
    }
  }
  return { cols, autoinc };
}

function skipRefActions(cur: Cur): void {
  for (;;) {
    if (cur.isW('on') && (cur.isW('delete', 1) || cur.isW('update', 1))) {
      cur.next(); cur.next();
      const a = cur.next();
      if (a && a.k === 'w' && (a.l === 'set' || a.l === 'no')) cur.next();
      if (cur.isP('(')) cur.skipGroup();
    } else if (cur.isW('match')) {
      cur.next(); cur.next();
    } else if (cur.isW('not') && (cur.isW('deferrable', 1) || cur.isW('enforced', 1))) {
      cur.next(); cur.next();
    } else if (cur.isW('deferrable') || cur.isW('enforced')) {
      cur.next();
    } else if (cur.isW('initially')) {
      cur.next(); cur.next();
    } else break;
  }
}

function parseReferences(cur: Cur): Ref {
  const parts = parseQName(cur);
  let cols: string[] | undefined;
  if (cur.isP('(')) cols = parseColList(cur).cols.filter(Boolean);
  skipRefActions(cur);
  return { parts, cols };
}

// ─────────────────────────────────────────────────────────────
// Column definitions
// ─────────────────────────────────────────────────────────────

const COLUMN_KEYWORDS = new Set([
  'not', 'null', 'default', 'primary', 'unique', 'references', 'check', 'constraint', 'collate',
  'generated', 'auto_increment', 'autoincrement', 'identity', 'comment', 'as',
]);

interface ColumnResult { field: Field; ref?: Ref }

function parseColumnDef(cur: Cur): ColumnResult {
  const name = ident(cur.next());
  const field: Field = {
    id: nanoid(), name, type: 'text', nullable: true, unique: false, isPK: false, isFK: false,
  };
  let ref: Ref | undefined;
  let autoInc = false;
  let defaultText: string | undefined;

  const t0 = cur.peek();
  if (t0 && !(t0.k === 'w' && COLUMN_KEYWORDS.has(t0.l))) {
    applyTypeInfo(field, parseType(cur));
  }

  while (!cur.eof) {
    const t = cur.next()!;
    if (t.k !== 'w') continue;
    switch (t.l) {
      case 'constraint':
        if (!cur.isW('primary') && !cur.isW('unique') && !cur.isW('not') && !cur.isW('null') && !cur.isW('default') && !cur.isW('references') && !cur.isW('check')) cur.next();
        break;
      case 'not':
        if (cur.eatW('null')) field.nullable = false;
        break;
      case 'null':
        break;
      case 'default':
        defaultText = parseExpr(cur);
        break;
      case 'primary':
        cur.eatW('key');
        field.isPK = true;
        break;
      case 'unique':
        field.unique = true;
        cur.eatW('key');
        break;
      case 'references':
        ref = parseReferences(cur);
        break;
      case 'check':
        if (cur.isP('(')) {
          const start = cur.i;
          cur.skipGroup();
          const inner = cur.src.slice(cur.t[start].e, cur.t[cur.i - 1].s).trim();
          if (inner) field.check = field.check ? `${field.check} AND ${inner}` : inner;
        }
        break;
      case 'generated':
        // GENERATED {ALWAYS | BY DEFAULT} AS IDENTITY [(...)]  or  GENERATED ALWAYS AS (expr) STORED
        while (cur.isW('always') || cur.isW('by') || cur.isW('default')) cur.next();
        if (cur.eatW('as')) {
          if (cur.eatW('identity')) { autoInc = true; if (cur.isP('(')) cur.skipGroup(); }
          else if (cur.isP('(')) { cur.skipGroup(); if (cur.isW('stored') || cur.isW('virtual')) cur.next(); }
        }
        break;
      case 'as':
        if (cur.isP('(')) { cur.skipGroup(); if (cur.isW('stored') || cur.isW('virtual') || cur.isW('persisted')) cur.next(); }
        break;
      case 'auto_increment':
      case 'autoincrement':
        autoInc = true;
        break;
      case 'identity':
        autoInc = true;
        if (cur.isP('(')) cur.skipGroup();
        break;
      case 'comment':
        if (cur.peek()?.k === 's') field.comment = unquoteString(cur.next()!.v);
        break;
      case 'collate':
        cur.next();
        while (cur.isP('.')) { cur.next(); cur.next(); }
        break;
      case 'character':
        if (cur.eatW('set')) cur.next();
        break;
      case 'charset':
        cur.next();
        break;
      case 'on':
        if (cur.isW('update')) { cur.next(); parseExpr(cur); }
        break;
      default:
        if (cur.isP('(')) cur.skipGroup();
    }
  }

  if (field.isPK) field.nullable = false;
  if (defaultText !== undefined) setDefault(field, defaultText);
  if (autoInc) applyAutoInc(field);
  return { field, ref };
}

// ─────────────────────────────────────────────────────────────
// Table level constraints
// ─────────────────────────────────────────────────────────────

const CONSTRAINT_STARTERS = new Set([
  'constraint', 'primary', 'unique', 'foreign', 'check', 'key', 'index', 'fulltext', 'spatial', 'exclude', 'like', 'period',
]);

function findField(td: TableDraft, name: string): Field | undefined {
  return td.byName.get(name.toLowerCase());
}

function addPK(ctx: Ctx, td: TableDraft, cols: string[], autoinc: boolean): void {
  for (const c of cols) {
    const f = c ? findField(td, c) : undefined;
    if (!f) {
      ctx.warnings.push(`PRIMARY KEY on ${td.table.name}: column "${c}" not found.`);
      continue;
    }
    f.isPK = true;
    f.nullable = false;
    if (autoinc) applyAutoInc(f);
  }
}

function addUnique(td: TableDraft, cols: string[]): void {
  if (cols.length !== 1 || !cols[0]) return; // composite uniques are not representable
  const f = findField(td, cols[0]);
  if (f) f.unique = true;
}

function skipTo(cur: Cur, p: string): void {
  while (!cur.eof && !cur.isP(p)) cur.next();
}

/** Parses one table constraint (inside CREATE TABLE or after ALTER TABLE ... ADD). */
function parseTableConstraint(cur: Cur, ctx: Ctx, td: TableDraft): void {
  if (cur.eatW('constraint')) {
    if (!cur.isW('primary') && !cur.isW('unique') && !cur.isW('foreign') && !cur.isW('check') && !cur.isW('default')) cur.next();
  }
  const kw = cur.next();
  if (!kw || kw.k !== 'w') return;
  switch (kw.l) {
    case 'primary': {
      skipTo(cur, '(');
      const { cols, autoinc } = parseColList(cur);
      addPK(ctx, td, cols, autoinc);
      break;
    }
    case 'unique': {
      skipTo(cur, '(');
      addUnique(td, parseColList(cur).cols);
      break;
    }
    case 'foreign': {
      skipTo(cur, '(');
      const { cols } = parseColList(cur);
      if (!cur.eatW('references')) throw new Error('FOREIGN KEY without REFERENCES');
      ctx.fks.push({ td, cols, ref: parseReferences(cur) });
      break;
    }
    case 'default': {
      // SQL Server: ADD [CONSTRAINT n] DEFAULT (expr) FOR col
      const expr = parseExpr(cur);
      if (cur.eatW('for')) {
        const f = findField(td, ident(cur.next()));
        if (f) setDefault(f, expr);
      }
      break;
    }
    default:
      break; // CHECK, KEY, INDEX, FULLTEXT, ... are ignored
  }
}

// ─────────────────────────────────────────────────────────────
// Statement handlers
// ─────────────────────────────────────────────────────────────

const CREATE_TABLE_RE = /^create\s+(?:(?:global|local|temp|temporary|unlogged)\s+)*table\b/i;

function handleCreateTable(stmt: string, ctx: Ctx): void {
  const toks = tokenize(stmt, ctx.mysql);
  const cur = new Cur(toks, stmt);
  cur.next(); // create
  while (!cur.eof && !cur.isW('table')) cur.next();
  cur.next();
  if (cur.isW('if') && cur.isW('not', 1) && cur.isW('exists', 2)) { cur.next(); cur.next(); cur.next(); }
  const parts = parseQName(cur);
  const bare = parts[parts.length - 1];
  const schema = parts.length >= 2 ? parts[parts.length - 2] : '';

  if (!cur.isP('(')) throw new Error(`unsupported CREATE TABLE form for "${bare}" (AS SELECT / PARTITION OF / LIKE)`);
  if (bare.toLowerCase() === 'sqlite_sequence') return;

  const bodyStart = cur.i + 1;
  cur.skipGroup();
  const body = toks.slice(bodyStart, cur.i - 1);

  const keySchema = keySchemaOf(schema);
  const key = keySchema ? `${keySchema}.${bare.toLowerCase()}` : bare.toLowerCase();
  if (ctx.byKey.has(key)) {
    ctx.warnings.push(`Duplicate CREATE TABLE for "${bare}" ignored.`);
    return;
  }

  const td: TableDraft = {
    key, schema, keySchema, bare,
    byName: new Map(),
    table: {
      id: nanoid(), name: bare, fields: [],
      position: { x: 0, y: 0 }, accentColor: 'blue',
    },
  };

  // Table options: COMMENT='...'
  for (let k = cur.i; k < toks.length - 1; k++) {
    if (toks[k].k === 'w' && toks[k].l === 'comment') {
      const v = toks[k + 1].k === 'p' && toks[k + 1].v === '=' ? toks[k + 2] : toks[k + 1];
      if (v && v.k === 's') td.table.comment = unquoteString(v.v);
    }
  }

  const defs = splitTop(body);
  const inlineRefs: Array<{ field: Field; ref: Ref }> = [];
  const constraintDefs: Tok[][] = [];
  for (const def of defs) {
    if (def.length === 0) continue;
    const first = def[0];
    if (first.k === 'w' && CONSTRAINT_STARTERS.has(first.l)) {
      constraintDefs.push(def);
      continue;
    }
    try {
      const dcur = new Cur(def, stmt);
      const { field, ref } = parseColumnDef(dcur);
      if (td.byName.has(field.name.toLowerCase())) continue;
      td.table.fields.push(field);
      td.byName.set(field.name.toLowerCase(), field);
      if (ref) inlineRefs.push({ field, ref });
    } catch (e) {
      ctx.warnings.push(`Table ${bare}: could not parse column definition "${stmt.slice(first.s, def[def.length - 1].e).slice(0, 60)}" (${(e as Error).message}).`);
    }
  }
  for (const { field, ref } of inlineRefs) ctx.fks.push({ td, cols: [field.name], ref });
  for (const def of constraintDefs) {
    try {
      parseTableConstraint(new Cur(def, stmt), ctx, td);
    } catch (e) {
      ctx.warnings.push(`Table ${bare}: could not parse constraint (${(e as Error).message}).`);
    }
  }

  ctx.byKey.set(key, td);
  const lk = bare.toLowerCase();
  const list = ctx.byBare.get(lk);
  if (list) list.push(td); else ctx.byBare.set(lk, [td]);
  ctx.drafts.push(td);
}

function handleAlterTable(stmt: string, ctx: Ctx): void {
  const cur = new Cur(tokenize(stmt, ctx.mysql), stmt);
  cur.next(); cur.next(); // alter table
  cur.eatW('only');
  if (cur.isW('if') && cur.isW('exists', 1)) { cur.next(); cur.next(); }
  const parts = parseQName(cur);
  cur.eatP('*');
  const td = resolveTable(ctx, parts);
  if (!td) {
    ctx.warnings.push(`ALTER TABLE ${parts.join('.')}: table not found in the pasted SQL.`);
    return;
  }
  if (cur.isW('with') && (cur.isW('check', 1) || cur.isW('nocheck', 1))) { cur.next(); cur.next(); }
  const actions = splitTop(cur.t.slice(cur.i));
  for (const action of actions) {
    if (!action.length) continue;
    const a = new Cur(action, stmt);
    const kw = a.next()!;
    if (kw.k !== 'w') continue;
    try {
      if (kw.l === 'add') {
        const nx = a.peek();
        if (!nx) continue;
        if (nx.k === 'w' && (CONSTRAINT_STARTERS.has(nx.l) || nx.l === 'default')) {
          parseTableConstraint(a, ctx, td);
        } else {
          a.eatW('column');
          if (a.isW('if') && a.isW('not', 1)) { a.next(); a.next(); a.next(); }
          const { field, ref } = parseColumnDef(a);
          if (!td.byName.has(field.name.toLowerCase())) {
            td.table.fields.push(field);
            td.byName.set(field.name.toLowerCase(), field);
          }
          if (ref) ctx.fks.push({ td, cols: [field.name], ref });
        }
      } else if (kw.l === 'alter') {
        a.eatW('column');
        const f = findField(td, ident(a.next()));
        if (!f) continue;
        if (a.eatW('set')) {
          if (a.eatW('default')) setDefault(f, parseExpr(a));
          else if (a.isW('not') && a.isW('null', 1)) { f.nullable = false; }
        } else if (a.eatW('drop')) {
          if (a.eatW('default')) f.default = undefined;
          else if (a.isW('not') && a.isW('null', 1)) f.nullable = true;
        } else if (a.eatW('add') && a.eatW('generated')) {
          applyAutoInc(f);
        }
      } else {
        const key = `ALTER TABLE ${kw.l.toUpperCase()}`;
        ctx.ignored.set(key, (ctx.ignored.get(key) ?? 0) + 1);
      }
    } catch (e) {
      ctx.warnings.push(`ALTER TABLE ${td.table.name}: ${(e as Error).message}.`);
    }
  }
}

function handleCommentOn(stmt: string, ctx: Ctx): void {
  const cur = new Cur(tokenize(stmt, ctx.mysql), stmt);
  cur.next(); cur.next(); // comment on
  const kind = cur.next();
  if (!kind || kind.k !== 'w' || (kind.l !== 'table' && kind.l !== 'column')) {
    ctx.ignored.set('COMMENT ON', (ctx.ignored.get('COMMENT ON') ?? 0) + 1);
    return;
  }
  const parts = parseQName(cur);
  if (!cur.eatW('is')) return;
  const v = cur.next();
  if (!v || v.k !== 's') return;
  const text = unquoteString(v.v);
  if (kind.l === 'table') {
    const td = resolveTable(ctx, parts);
    if (td) td.table.comment = text;
  } else if (parts.length >= 2) {
    const td = resolveTable(ctx, parts.slice(0, -1));
    const f = td && findField(td, parts[parts.length - 1]);
    if (f) f.comment = text;
  }
}

function handleCreateUniqueIndex(stmt: string, ctx: Ctx): void {
  const cur = new Cur(tokenize(stmt, ctx.mysql), stmt);
  while (!cur.eof && !cur.isW('on')) cur.next();
  cur.next();
  cur.eatW('only');
  const parts = parseQName(cur);
  if (cur.eatW('using')) cur.next();
  if (!cur.isP('(')) return;
  const { cols } = parseColList(cur);
  if (cur.isW('where')) return; // partial index: not a full uniqueness guarantee
  const td = resolveTable(ctx, parts);
  if (td) addUnique(td, cols);
}

function stmtKey(stmt: string): string {
  const s = stmt.replace(/^\s*create\s+or\s+replace\b/i, 'CREATE');
  const m = /^\s*([A-Za-z_]+)(?:\s+([A-Za-z_]+))?/.exec(s);
  if (!m) return 'UNKNOWN';
  const first = m[1].toUpperCase();
  if (m[2] && ['CREATE', 'ALTER', 'DROP', 'COMMENT'].includes(first)) return `${first} ${m[2].toUpperCase()}`;
  return first;
}

// ─────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────

/**
 * Parse SQL DDL (PostgreSQL / pg_dump, MySQL / mysqldump, SQLite, SQL Server) into
 * Modellr tables and relationships. Never throws; unparseable statements become warnings.
 */
export function importSQL(sql: string): ImportResult {
  const empty = (msg: string): ImportResult => ({ tables: [], relationships: [], errors: [msg] });
  if (!sql || !sql.trim()) return empty('No SQL content found.');

  const mysql = /`/.test(sql) || /\bengine\s*=/i.test(sql);
  const text = stripComments(preprocess(sql), { mysql });
  if (!text.trim()) return empty('No SQL content found.');

  const ctx: Ctx = {
    mysql,
    drafts: [], byKey: new Map(), byBare: new Map(),
    fks: [], warnings: [], ignored: new Map(), enumTypes: 0,
  };

  const deferred: Array<{ kind: 'alter' | 'comment' | 'index'; stmt: string }> = [];
  const stmts = splitStatements(text, mysql);

  for (const stmt of stmts) {
    try {
      if (CREATE_TABLE_RE.test(stmt)) {
        try {
          handleCreateTable(stmt, ctx);
        } catch (e) {
          ctx.warnings.push(`Skipped CREATE TABLE statement: ${(e as Error).message}.`);
        }
      } else if (/^alter\s+table\b/i.test(stmt)) {
        deferred.push({ kind: 'alter', stmt });
      } else if (/^comment\s+on\s+(?:table|column)\b/i.test(stmt)) {
        deferred.push({ kind: 'comment', stmt });
      } else if (/^create\s+unique\s+index\b/i.test(stmt)) {
        deferred.push({ kind: 'index', stmt });
      } else if (/^create\s+type\b[\s\S]*?\bas\s+enum\b/i.test(stmt)) {
        ctx.enumTypes++;
      } else {
        const key = stmtKey(stmt);
        ctx.ignored.set(key, (ctx.ignored.get(key) ?? 0) + 1);
      }
    } catch (e) {
      ctx.warnings.push(`Skipped statement (${stmtKey(stmt)}): ${(e as Error).message}.`);
    }
  }

  for (const d of deferred) {
    try {
      if (d.kind === 'alter') handleAlterTable(d.stmt, ctx);
      else if (d.kind === 'comment') handleCommentOn(d.stmt, ctx);
      else handleCreateUniqueIndex(d.stmt, ctx);
    } catch (e) {
      ctx.warnings.push(`Skipped statement (${stmtKey(d.stmt)}): ${(e as Error).message}.`);
    }
  }

  // ── Relationships ──────────────────────────────
  const relationships: Relationship[] = [];
  const seen = new Set<string>();
  for (const fk of ctx.fks) {
    const target = resolveTable(ctx, fk.ref.parts, fk.td);
    if (!target) {
      ctx.warnings.push(`Foreign key on ${fk.td.table.name}(${fk.cols.join(', ')}) references unknown table "${fk.ref.parts.join('.')}".`);
      continue;
    }
    const targetPKs = target.table.fields.filter((f) => f.isPK);
    fk.cols.forEach((colName, idx) => {
      const src = findField(fk.td, colName);
      const refName = fk.ref.cols?.[idx];
      const tgt = refName ? findField(target, refName) : targetPKs[idx] ?? targetPKs[0];
      if (!src || !tgt) {
        ctx.warnings.push(`Foreign key ${fk.td.table.name}.${colName} -> ${target.table.name}.${refName ?? '(primary key)'}: column not found.`);
        return;
      }
      const dedupe = `${fk.td.table.id}:${src.id}:${target.table.id}:${tgt.id}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      src.isFK = true;
      const pkCount = fk.td.table.fields.reduce((n, f) => n + (f.isPK ? 1 : 0), 0);
      const cardinality: Cardinality = src.unique || (src.isPK && pkCount === 1) ? 'one-to-one' : 'one-to-many';
      relationships.push({
        id: nanoid(),
        sourceTableId: fk.td.table.id,
        sourceFieldId: src.id,
        targetTableId: target.table.id,
        targetFieldId: tgt.id,
        cardinality,
      });
    });
  }

  // ── Final tables (display names, layout) ───────
  const tables: Table[] = ctx.drafts.map((td, idx) => {
    const collides = (ctx.byBare.get(td.bare.toLowerCase())?.length ?? 0) > 1;
    td.table.name = collides && td.keySchema ? `${td.schema}.${td.bare}` : td.bare;
    td.table.accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length] as AccentColor;
    td.table.position = { x: 80 + (idx % 4) * 280, y: 80 + Math.floor(idx / 4) * 180 };
    return td.table;
  });

  const errors: string[] = [];
  if (tables.length === 0) errors.push('No CREATE TABLE statements found in the SQL.');
  errors.push(...ctx.warnings);
  if (ctx.enumTypes > 0) {
    errors.push(`${ctx.enumTypes} enum type(s) found: columns keep the enum name as their type, enum values are not imported.`);
  }
  if (ctx.ignored.size > 0) {
    const total = [...ctx.ignored.values()].reduce((a, b) => a + b, 0);
    const top = [...ctx.ignored.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([k, v]) => `${k} x${v}`).join(', ');
    errors.push(`Ignored ${total} non-table statement(s): ${top}.`);
  }
  return { tables, relationships, errors };
}
