import type { Dialect, Field, Table } from '../../types/schema';
import { columnDDL, createTableStatement, fkClause, type FkSpec } from './sql';
import {
  commentText,
  fitName,
  fkBaseName,
  mapType,
  quoteIdent,
  renderSqlDefault,
} from './sqlUtils';

export type FieldDiff =
  | { kind: 'added';   field: Field }
  | { kind: 'removed'; field: Field }
  | { kind: 'changed'; before: Field; after: Field };

export type TableDiff =
  | { kind: 'added';   table: Table }
  | { kind: 'removed'; table: Table }
  | { kind: 'changed'; tableName: string; fields: FieldDiff[] };

/** Added / removed foreign keys, expressed with table/column names (optional 3rd argument). */
export interface RelationshipDiff {
  kind: 'added' | 'removed';
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  /** Explicit constraint name; defaults to fk_<table>_<column> */
  name?: string;
}

const DIALECT_LABEL: Record<Dialect, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  sqlite: 'SQLite',
  mssql: 'SQL Server',
};

const q = quoteIdent;
const c = commentText;

function fkSpec(r: RelationshipDiff): FkSpec {
  return {
    name: r.name ?? fitName(fkBaseName(r.sourceTable, r.sourceColumn)),
    sourceTable: r.sourceTable,
    sourceColumn: r.sourceColumn,
    targetTable: r.targetTable,
    targetColumn: r.targetColumn,
  };
}

/** Column definition used by ADD COLUMN (includes PK / UNIQUE inline). */
function addColumnDef(f: Field, dialect: Dialect): string {
  return columnDDL(f, dialect, { mysqlComment: true });
}

/** Statements (each ending with ';') for a single changed column. */
function changedFieldStatements(table: string, before: Field, after: Field, dialect: Dialect): string[] {
  const t = q(table, dialect);
  const col = q(after.name, dialect);
  const out: string[] = [];

  const bm = mapType(before, dialect);
  const am = mapType(after, dialect);
  const typeChanged = bm.sql !== am.sql;
  const nullChanged = (!before.nullable || before.isPK) !== (!after.nullable || after.isPK);
  const bDef = renderSqlDefault(before.default, dialect, bm.category);
  const aDef = renderSqlDefault(after.default, dialect, am.category);
  const defChanged = bDef !== aDef;
  const uniqueChanged = (before.unique && !before.isPK) !== (after.unique && !after.isPK);
  const pkChanged = before.isPK !== after.isPK;
  const nullable = after.nullable && !after.isPK;

  if (dialect === 'sqlite') {
    if (typeChanged || nullChanged || defChanged || uniqueChanged || pkChanged) {
      out.push(
        `-- NOTE: SQLite cannot ALTER an existing column (${c(table)}.${c(after.name)}); recreate the table.`,
        `-- Desired definition: ${c(columnDDL(after, dialect, { mysqlComment: false }))}`
      );
    }
    return out;
  }

  if (dialect === 'postgres') {
    if (typeChanged) {
      // serial is not a real type; use the underlying integer type.
      const target = am.auto
        ? ({ serial: 'integer', smallserial: 'smallint', bigserial: 'bigint' } as const)[am.auto]
        : am.sql;
      if (am.auto) {
        out.push(`-- NOTE: ${c(after.name)} becomes ${c(am.sql)}; create and attach the sequence manually.`);
      }
      out.push(`ALTER TABLE ${t} ALTER COLUMN ${col} TYPE ${target} USING ${col}::${target};`);
    }
    if (nullChanged) {
      out.push(`ALTER TABLE ${t} ALTER COLUMN ${col} ${nullable ? 'DROP' : 'SET'} NOT NULL;`);
    }
    if (defChanged && !am.auto) {
      out.push(
        aDef === undefined
          ? `ALTER TABLE ${t} ALTER COLUMN ${col} DROP DEFAULT;`
          : `ALTER TABLE ${t} ALTER COLUMN ${col} SET DEFAULT ${aDef};`
      );
    }
  } else if (dialect === 'mysql') {
    if (typeChanged || nullChanged || defChanged) {
      out.push(
        `ALTER TABLE ${t} MODIFY COLUMN ${columnDDL(after, dialect, { inlineUnique: false, inlinePk: false })};`
      );
    }
  } else if (dialect === 'mssql') {
    if (typeChanged || nullChanged) {
      out.push(`ALTER TABLE ${t} ALTER COLUMN ${col} ${am.sql} ${nullable ? 'NULL' : 'NOT NULL'};`);
    }
    if (defChanged && !am.auto) {
      const df = q(fitName(`DF_${table}_${after.name}`, 128), dialect);
      out.push(
        `-- NOTE: SQL Server default constraints are named objects; drop the existing default on ${c(table)}.${c(after.name)} first (see sys.default_constraints).`
      );
      if (aDef !== undefined) out.push(`ALTER TABLE ${t} ADD CONSTRAINT ${df} DEFAULT ${aDef} FOR ${col};`);
    }
  }

  // UNIQUE
  if (uniqueChanged) {
    const uq = fitName(`uq_${table}_${after.name}`);
    if (after.unique && !after.isPK) {
      out.push(`ALTER TABLE ${t} ADD CONSTRAINT ${q(uq, dialect)} UNIQUE (${col});`);
    } else if (dialect === 'postgres') {
      out.push(`ALTER TABLE ${t} DROP CONSTRAINT IF EXISTS ${q(uq, dialect)};`);
      out.push(`ALTER TABLE ${t} DROP CONSTRAINT IF EXISTS ${q(fitName(`${table}_${after.name}_key`), dialect)};`);
    } else if (dialect === 'mysql') {
      out.push(`-- NOTE: assumes the unique index is named after the column (MySQL default) or ${c(uq)}.`);
      out.push(`ALTER TABLE ${t} DROP INDEX ${col};`);
    } else {
      out.push(
        `-- NOTE: drop the UNIQUE constraint on ${c(table)}.${c(after.name)} manually (SQL Server auto-generates its name; see sys.key_constraints).`
      );
    }
  }

  // PRIMARY KEY
  if (pkChanged) {
    if (after.isPK) {
      out.push(`-- NOTE: if the table already has a primary key, drop it first and include all key columns.`);
      out.push(`ALTER TABLE ${t} ADD PRIMARY KEY (${col});`);
    } else if (dialect === 'postgres') {
      out.push(`ALTER TABLE ${t} DROP CONSTRAINT ${q(fitName(`${table}_pkey`), dialect)};`);
    } else if (dialect === 'mysql') {
      out.push(`ALTER TABLE ${t} DROP PRIMARY KEY;`);
    } else {
      out.push(
        `-- NOTE: drop the PRIMARY KEY on ${c(table)} manually (SQL Server auto-generates its name; see sys.key_constraints).`
      );
    }
  }

  return out;
}

export function generateMigrationsSQL(
  diffs: TableDiff[],
  dialect: Dialect,
  relationshipDiffs: RelationshipDiff[] = []
): string {
  if (diffs.length === 0 && relationshipDiffs.length === 0) return '-- No schema changes detected.';

  const blocks: string[] = [];
  blocks.push(`-- Auto-generated migration for ${DIALECT_LABEL[dialect]}`);

  const addedTableNames = new Set(diffs.filter((d) => d.kind === 'added').map((d) => (d as { table: Table }).table.name));

  // 1. Drop FKs first so dropping tables/columns cannot fail on them.
  for (const r of relationshipDiffs.filter((x) => x.kind === 'removed')) {
    const fk = fkSpec(r);
    const t = q(fk.sourceTable, dialect);
    if (dialect === 'sqlite') {
      blocks.push(`-- NOTE: SQLite cannot drop a foreign key (${c(fk.sourceTable)}.${c(fk.sourceColumn)}); recreate the table.`);
    } else if (dialect === 'mysql') {
      blocks.push(`ALTER TABLE ${t} DROP FOREIGN KEY ${q(fk.name, dialect)};`);
    } else {
      blocks.push(`ALTER TABLE ${t} DROP CONSTRAINT ${q(fk.name, dialect)};`);
    }
  }

  // 2. Removed tables
  for (const diff of diffs) {
    if (diff.kind === 'removed') {
      blocks.push(
        `-- WARNING: destructive - drops table ${c(diff.table.name)} and all of its data (a renamed table also appears as DROP + CREATE)\nDROP TABLE ${q(diff.table.name, dialect)};`
      );
    }
  }

  // 3. Altered tables (one statement per operation; valid in every dialect)
  for (const diff of diffs) {
    if (diff.kind !== 'changed') continue;
    const t = q(diff.tableName, dialect);
    const stmts: string[] = [];
    for (const fd of diff.fields) {
      if (fd.kind === 'added') {
        const f = fd.field;
        const am = mapType(f, dialect);
        const hasDefault = renderSqlDefault(f.default, dialect, am.category) !== undefined || am.auto !== null;
        if (!f.nullable && !f.isPK && !hasDefault) {
          stmts.push(
            `-- WARNING: adding NOT NULL column ${c(f.name)} without a default fails if ${c(diff.tableName)} has rows; add a default or backfill first.`
          );
        }
        if (dialect === 'sqlite' && (f.isPK || f.unique)) {
          stmts.push(`-- NOTE: SQLite cannot ADD COLUMN with PRIMARY KEY/UNIQUE; recreate the table for ${c(f.name)}.`);
          continue;
        }
        const def = dialect === 'sqlite'
          ? columnDDL(f, dialect, { inlineUnique: false, inlinePk: false, mysqlComment: false })
          : addColumnDef(f, dialect);
        stmts.push(`ALTER TABLE ${t} ADD ${dialect === 'mssql' ? '' : 'COLUMN '}${def};`);
      } else if (fd.kind === 'removed') {
        stmts.push(
          `-- WARNING: destructive - drops column ${c(diff.tableName)}.${c(fd.field.name)} and its data\nALTER TABLE ${t} DROP COLUMN ${q(fd.field.name, dialect)};`
        );
      } else {
        stmts.push(...changedFieldStatements(diff.tableName, fd.before, fd.after, dialect));
      }
    }
    if (stmts.length) blocks.push(stmts.join('\n'));
  }

  // 4. Created tables
  const addedFks = relationshipDiffs.filter((x) => x.kind === 'added');
  const deferredFks: FkSpec[] = [];
  for (const r of addedFks) {
    if (!(dialect === 'sqlite' && addedTableNames.has(r.sourceTable))) deferredFks.push(fkSpec(r));
  }
  for (const diff of diffs) {
    if (diff.kind === 'added') {
      const inline = dialect === 'sqlite'
        ? addedFks.filter((r) => r.sourceTable === diff.table.name).map(fkSpec)
        : [];
      blocks.push(createTableStatement(diff.table, dialect, inline));
    }
  }

  // 5. Added FKs after all tables exist
  for (const fk of deferredFks) {
    if (dialect === 'sqlite') {
      blocks.push(`-- NOTE: SQLite cannot add a foreign key to an existing table (${c(fk.sourceTable)}.${c(fk.sourceColumn)}); recreate the table.`);
    } else {
      blocks.push(`ALTER TABLE ${q(fk.sourceTable, dialect)} ADD ${fkClause(fk, dialect)};`);
    }
  }

  return blocks.join('\n\n').trim() + '\n';
}
