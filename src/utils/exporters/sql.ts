import type { Table, Relationship, Dialect, Field } from '../../types/schema';
import {
  commentText,
  fkBaseName,
  isSafeExpression,
  mapType,
  orderTables,
  quoteIdent,
  renderSqlDefault,
  resolveRelationships,
  sqlString,
  stripControl,
  uniqueName,
  type ResolvedRel,
} from './sqlUtils';

export interface ColumnOptions {
  /** Emit UNIQUE inline (default true) */
  inlineUnique?: boolean;
  /** Emit a single-column PRIMARY KEY inline (default true) */
  inlinePk?: boolean;
  /** Emit CHECK inline (default true) */
  inlineCheck?: boolean;
  /** Emit a MySQL COMMENT '...' clause (default true) */
  mysqlComment?: boolean;
}

/** One column definition (without leading indentation / trailing comma). */
export function columnDDL(f: Field, dialect: Dialect, opts: ColumnOptions = {}): string {
  const { inlineUnique = true, inlinePk = true, inlineCheck = true, mysqlComment = true } = opts;
  const mapped = mapType(f, dialect);
  const q = quoteIdent(f.name, dialect);

  // SQLite: INTEGER PRIMARY KEY AUTOINCREMENT is the only legal form.
  if (dialect === 'sqlite' && mapped.auto && f.isPK && inlinePk) {
    return `${q} INTEGER PRIMARY KEY AUTOINCREMENT`;
  }

  const parts: string[] = [q, mapped.sql];
  const notNull = !f.nullable || f.isPK;
  const isAuto = mapped.auto !== null;

  if (dialect === 'mysql') {
    if (notNull) parts.push('NOT NULL');
    if (isAuto && dialect === 'mysql') parts.push('AUTO_INCREMENT');
  } else {
    if (notNull) parts.push('NOT NULL');
  }

  // Serial / identity columns have their own generator.
  if (!isAuto) {
    const def = renderSqlDefault(f.default, dialect, mapped.category);
    if (def !== undefined) parts.push(`DEFAULT ${def}`);
  }

  if (inlineUnique && f.unique && !f.isPK) parts.push('UNIQUE');

  if (inlineCheck) {
    const check = checkExpr(f.check);
    if (check) parts.push(`CHECK (${check})`);
  }

  if (inlinePk && f.isPK) parts.push('PRIMARY KEY');

  if (mysqlComment && dialect === 'mysql' && f.comment && commentText(f.comment)) {
    parts.push(`COMMENT ${sqlString(commentText(f.comment), dialect)}`);
  }
  return parts.join(' ');
}

function checkExpr(check: string | undefined): string | undefined {
  if (!check) return undefined;
  const t = check.trim();
  if (!t) return undefined;
  if (!isSafeExpression(t)) return undefined;
  return t.replace(/[\r\n\t]+/g, ' ');
}

export interface FkSpec {
  name: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

export function fkClause(fk: FkSpec, dialect: Dialect): string {
  return `CONSTRAINT ${quoteIdent(fk.name, dialect)} FOREIGN KEY (${quoteIdent(fk.sourceColumn, dialect)}) REFERENCES ${quoteIdent(fk.targetTable, dialect)} (${quoteIdent(fk.targetColumn, dialect)})`;
}

/** Build a complete CREATE TABLE statement (comments for non-MySQL/Postgres dialects included). */
export function createTableStatement(table: Table, dialect: Dialect, fks: FkSpec[] = []): string {
  const pkFields = table.fields.filter((f) => f.isPK);
  const composite = pkFields.length > 1;
  // SQLite AUTOINCREMENT needs an inline single-column key.
  const inlinePk = !composite;

  const lines: string[] = [];
  const entries: string[] = [];

  for (const f of table.fields) {
    const c = commentText(f.comment);
    const ddl = columnDDL(f, dialect, { inlinePk });
    if (c && (dialect === 'sqlite' || dialect === 'mssql')) {
      entries.push(`  -- ${c}\n  ${ddl}`);
    } else {
      entries.push(`  ${ddl}`);
    }
  }
  if (composite) {
    entries.push(`  PRIMARY KEY (${pkFields.map((f) => quoteIdent(f.name, dialect)).join(', ')})`);
  }
  for (const fk of fks) entries.push(`  ${fkClause(fk, dialect)}`);

  // Entries may contain a leading comment line; commas go on the real line.
  entries.forEach((e, i) => {
    lines.push(i < entries.length - 1 ? `${e},` : e);
  });

  const tableComment = commentText(table.comment);
  let prefix = '';
  if (tableComment && (dialect === 'sqlite' || dialect === 'mssql')) prefix = `-- ${tableComment}\n`;
  let suffix = ';';
  if (tableComment && dialect === 'mysql') suffix = ` COMMENT=${sqlString(tableComment, dialect)};`;

  return `${prefix}CREATE TABLE ${quoteIdent(table.name, dialect)} (\n${lines.join('\n')}\n)${suffix}`;
}

export function exportSQL(
  tables: Table[],
  relationships: Relationship[],
  dialect: Dialect
): string {
  // Tables without columns cannot be created in most dialects.
  const usable = tables.filter((t) => t.fields.length > 0);
  const skipped = tables.filter((t) => t.fields.length === 0);
  const resolved = resolveRelationships(usable, relationships);
  const ordered = orderTables(usable, resolved);

  // Unique, length-safe FK names
  const usedNames = new Set<string>();
  const named = new Map<ResolvedRel, FkSpec>();
  for (const r of resolved) {
    named.set(r, {
      name: uniqueName(fkBaseName(r.sourceTable.name, r.sourceField.name), usedNames),
      sourceTable: r.sourceTable.name,
      sourceColumn: r.sourceField.name,
      targetTable: r.targetTable.name,
      targetColumn: r.targetField.name,
    });
  }

  // FKs are inlined when the target already exists (or SQLite, which has no
  // ALTER ... ADD CONSTRAINT); otherwise they are added at the end.
  const created = new Set<string>();
  const createStmts: string[] = [];
  const deferred: FkSpec[] = [];
  for (const table of ordered) {
    created.add(table.id);
    const inline: FkSpec[] = [];
    for (const r of resolved) {
      if (r.sourceTable.id !== table.id) continue;
      const spec = named.get(r)!;
      if (dialect === 'sqlite' || created.has(r.targetTable.id)) inline.push(spec);
      else deferred.push(spec);
    }
    createStmts.push(createTableStatement(table, dialect, inline));
  }

  const header = `-- Generated by SchemaForge\n-- Dialect: ${dialect}\n-- ${new Date().toISOString()}\n\n`;
  let result = header;
  for (const t of skipped) {
    result += `-- Skipped table ${stripControl(t.name)}: no columns defined\n`;
  }
  if (skipped.length) result += '\n';
  result += createStmts.join('\n\n');

  if (deferred.length > 0) {
    result += '\n\n-- Foreign Keys\n';
    result += deferred
      .map((fk) => `ALTER TABLE ${quoteIdent(fk.sourceTable, dialect)} ADD ${fkClause(fk, dialect)};`)
      .join('\n');
  }

  if (dialect === 'postgres') {
    const comments: string[] = [];
    for (const t of ordered) {
      const tc = commentText(t.comment);
      if (tc) comments.push(`COMMENT ON TABLE ${quoteIdent(t.name, dialect)} IS ${sqlString(tc, dialect)};`);
      for (const f of t.fields) {
        const fc = commentText(f.comment);
        if (fc) {
          comments.push(
            `COMMENT ON COLUMN ${quoteIdent(t.name, dialect)}.${quoteIdent(f.name, dialect)} IS ${sqlString(fc, dialect)};`
          );
        }
      }
    }
    if (comments.length) result += `\n\n-- Comments\n${comments.join('\n')}`;
  }

  return result;
}
