import type { Dialect, Field, Table } from '../../types/schema';

export type FieldDiff =
  | { kind: 'added';   field: Field }
  | { kind: 'removed'; field: Field }
  | { kind: 'changed'; before: Field; after: Field };

export type TableDiff =
  | { kind: 'added';   table: Table }
  | { kind: 'removed'; table: Table }
  | { kind: 'changed'; tableName: string; fields: FieldDiff[] };

function quote(name: string, dialect: Dialect): string {
  return dialect === 'postgres' ? `"${name}"` : `\`${name}\``;
}

function getFieldDef(f: Field, dialect: Dialect): string {
  let def = `${quote(f.name, dialect)} ${f.type}`;
  if (!f.nullable) def += ' NOT NULL';
  if (f.unique && !f.isPK) def += ' UNIQUE';
  if (f.isPK) def += ' PRIMARY KEY';
  return def;
}

export function generateMigrationsSQL(diffs: TableDiff[], dialect: Dialect): string {
  if (diffs.length === 0) return '-- No schema changes detected.';

  let sql = `-- Auto-generated migration for ${dialect === 'postgres' ? 'PostgreSQL' : 'MySQL'}\n\n`;

  // Process DELETES first
  for (const diff of diffs) {
    if (diff.kind === 'removed') {
      sql += `DROP TABLE ${quote(diff.table.name, dialect)};\n\n`;
    }
  }

  // Process ALTERS
  for (const diff of diffs) {
    if (diff.kind === 'changed') {
      const alters: string[] = [];
      
      for (const fdiff of diff.fields) {
        if (fdiff.kind === 'added') {
          alters.push(`ADD COLUMN ${getFieldDef(fdiff.field, dialect)}`);
        } else if (fdiff.kind === 'removed') {
          alters.push(`DROP COLUMN ${quote(fdiff.field.name, dialect)}`);
        } else if (fdiff.kind === 'changed') {
          if (dialect === 'postgres') {
            const cast = fdiff.after.type.includes('char') || fdiff.after.type.includes('text') 
              ? ` USING ${quote(fdiff.before.name, dialect)}::${fdiff.after.type}` 
              : '';
            alters.push(`ALTER COLUMN ${quote(fdiff.before.name, dialect)} TYPE ${fdiff.after.type}${cast}`);
          } else {
            alters.push(`MODIFY COLUMN ${getFieldDef(fdiff.after, dialect)}`);
          }
        }
      }

      if (alters.length > 0) {
        sql += `ALTER TABLE ${quote(diff.tableName, dialect)}\n  ${alters.join(',\n  ')};\n\n`;
      }
    }
  }

  // Process CREATES last
  for (const diff of diffs) {
    if (diff.kind === 'added') {
      const cols = diff.table.fields.map((f) => getFieldDef(f, dialect)).join(',\n  ');
      sql += `CREATE TABLE ${quote(diff.table.name, dialect)} (\n  ${cols}\n);\n\n`;
    }
  }

  return sql.trim() + '\n';
}
