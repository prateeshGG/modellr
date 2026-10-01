import { describe, it, expect } from 'vitest';
import pkg from 'node-sql-parser';
import { generateMigrationsSQL, type TableDiff, type RelationshipDiff } from '../../src/utils/exporters/migrations';
import { field, table } from './fixtures';
import type { Dialect } from '../../src/types/schema';

const { Parser } = pkg as unknown as { Parser: new () => { astify(sql: string, opt: { database: string }): unknown } };
const parser = new Parser();
const DIALECTS: Dialect[] = ['postgres', 'mysql', 'sqlite', 'mssql'];

const changed = (tableName: string, fields: Extract<TableDiff, { kind: 'changed' }>['fields']): TableDiff => ({
  kind: 'changed',
  tableName,
  fields,
});

describe('generateMigrationsSQL: quoting', () => {
  it('uses the right identifier quoting for every dialect', () => {
    const diffs: TableDiff[] = [
      { kind: 'removed', table: table('t', 'order', [field('a', 'int')]) },
      changed('user', [{ kind: 'added', field: field('group', 'int') }]),
    ];
    expect(generateMigrationsSQL(diffs, 'postgres')).toContain('DROP TABLE "order";');
    expect(generateMigrationsSQL(diffs, 'sqlite')).toContain('DROP TABLE "order";');
    expect(generateMigrationsSQL(diffs, 'mysql')).toContain('DROP TABLE `order`;');
    expect(generateMigrationsSQL(diffs, 'mssql')).toContain('DROP TABLE [order];');
    expect(generateMigrationsSQL(diffs, 'mssql')).toContain('ALTER TABLE [user] ADD [group] INT;');
    expect(generateMigrationsSQL(diffs, 'postgres')).toContain('ALTER TABLE "user" ADD COLUMN "group" integer;');
    expect(generateMigrationsSQL(diffs, 'mysql')).toContain('ALTER TABLE `user` ADD COLUMN `group` INT;');
    expect(generateMigrationsSQL(diffs, 'sqlite')).not.toContain('`');
    expect(generateMigrationsSQL(diffs, 'mssql')).not.toContain('`');
  });

  it('header names the dialect', () => {
    const d: TableDiff[] = [{ kind: 'removed', table: table('t', 'x', []) }];
    expect(generateMigrationsSQL(d, 'mssql')).toContain('-- Auto-generated migration for SQL Server');
    expect(generateMigrationsSQL(d, 'sqlite')).toContain('-- Auto-generated migration for SQLite');
  });

  it('returns the no-changes marker for empty diffs', () => {
    expect(generateMigrationsSQL([], 'postgres')).toBe('-- No schema changes detected.');
  });
});

describe('generateMigrationsSQL: destructive warnings', () => {
  it('precedes DROP TABLE and DROP COLUMN with a destructive warning line', () => {
    const diffs: TableDiff[] = [
      { kind: 'removed', table: table('t', 'old', [field('a', 'int')]) },
      changed('keep', [{ kind: 'removed', field: field('gone', 'int') }]),
    ];
    for (const d of DIALECTS) {
      const lines = generateMigrationsSQL(diffs, d).split('\n');
      lines.forEach((line, i) => {
        if (/^(DROP TABLE|ALTER TABLE .* DROP COLUMN)/.test(line)) {
          expect(lines[i - 1], `${d}: ${line}`).toMatch(/^-- WARNING: destructive/);
        }
      });
      expect(lines.filter((l) => /^DROP TABLE|DROP COLUMN/.test(l))).toHaveLength(2);
    }
  });

  it('warns on ADD COLUMN NOT NULL without default, but not with a default / nullable', () => {
    const mk = (f: ReturnType<typeof field>) => generateMigrationsSQL([changed('t', [{ kind: 'added', field: f }])], 'postgres');
    expect(mk(field('a', 'int', { nullable: false }))).toContain('-- WARNING: adding NOT NULL column a without a default');
    expect(mk(field('a', 'int', { nullable: false, default: '0' }))).not.toContain('WARNING');
    expect(mk(field('a', 'int', { nullable: false, default: '0' }))).toContain('ADD COLUMN "a" integer NOT NULL DEFAULT 0;');
    expect(mk(field('a', 'int'))).not.toContain('WARNING');
  });

  it('a table name with a newline cannot break out of a comment line', () => {
    const evil = 'x\nDROP TABLE victim;--';
    const sql = generateMigrationsSQL(
      [{ kind: 'removed', table: table('t', evil, []) }, changed(evil, [{ kind: 'removed', field: field('c\nDROP TABLE other;', 'int') }])],
      'postgres'
    );
    for (const line of sql.split('\n')) {
      if (line.includes('victim') || line.includes('other')) {
        expect(line.startsWith('--') || line.startsWith('DROP TABLE "xDROP') || line.startsWith('ALTER TABLE "xDROP'), line).toBe(true);
      }
    }
    expect(sql).not.toMatch(/^DROP TABLE victim/m);
    expect(sql.split('\n').filter((l) => /^DROP TABLE/.test(l))).toHaveLength(1);
  });
});

describe('generateMigrationsSQL: column changes', () => {
  const before = field('c', 'varchar', { length: 50, nullable: true });

  it('postgres: type change uses USING cast', () => {
    const after = field('c', 'integer', { nullable: true });
    const sql = generateMigrationsSQL([changed('t', [{ kind: 'changed', before, after }])], 'postgres');
    expect(sql).toContain('ALTER TABLE "t" ALTER COLUMN "c" TYPE integer USING "c"::integer;');
  });

  it('postgres: length change is a type change', () => {
    const after = field('c', 'varchar', { length: 100, nullable: true });
    const sql = generateMigrationsSQL([changed('t', [{ kind: 'changed', before, after }])], 'postgres');
    expect(sql).toContain('TYPE varchar(100) USING "c"::varchar(100);');
  });

  it('postgres: nullable, default, unique and PK changes are emitted', () => {
    const b = field('c', 'integer', { nullable: true });
    const a = field('c', 'integer', { nullable: false, default: '5', unique: true, isPK: false });
    const sql = generateMigrationsSQL([changed('t', [{ kind: 'changed', before: b, after: a }])], 'postgres');
    expect(sql).toContain('ALTER TABLE "t" ALTER COLUMN "c" SET NOT NULL;');
    expect(sql).toContain('ALTER TABLE "t" ALTER COLUMN "c" SET DEFAULT 5;');
    expect(sql).toContain('ALTER TABLE "t" ADD CONSTRAINT "uq_t_c" UNIQUE ("c");');

    const back = generateMigrationsSQL([changed('t', [{ kind: 'changed', before: a, after: b }])], 'postgres');
    expect(back).toContain('ALTER COLUMN "c" DROP NOT NULL;');
    expect(back).toContain('ALTER COLUMN "c" DROP DEFAULT;');
    expect(back).toContain('DROP CONSTRAINT IF EXISTS "uq_t_c";');
    expect(back).toContain('DROP CONSTRAINT IF EXISTS "t_c_key";');

    const pk = field('c', 'integer', { nullable: false, isPK: true });
    const up = generateMigrationsSQL([changed('t', [{ kind: 'changed', before: b, after: pk }])], 'postgres');
    expect(up).toContain('ALTER TABLE "t" ADD PRIMARY KEY ("c");');
    const down = generateMigrationsSQL([changed('t', [{ kind: 'changed', before: pk, after: b }])], 'postgres');
    expect(down).toContain('ALTER TABLE "t" DROP CONSTRAINT "t_pkey";');
  });

  it('postgres: default of 0 / false is a real default change', () => {
    const b = field('c', 'integer', { nullable: false });
    const a = field('c', 'integer', { nullable: false, default: '0' });
    expect(generateMigrationsSQL([changed('t', [{ kind: 'changed', before: b, after: a }])], 'postgres')).toContain('SET DEFAULT 0;');
  });

  it('mysql: MODIFY COLUMN carries nullable/default but not UNIQUE/PK inline', () => {
    const b = field('c', 'int', { nullable: true });
    const a = field('c', 'int', { nullable: false, default: '1', unique: true });
    const sql = generateMigrationsSQL([changed('t', [{ kind: 'changed', before: b, after: a }])], 'mysql');
    expect(sql).toContain('ALTER TABLE `t` MODIFY COLUMN `c` INT NOT NULL DEFAULT 1;');
    expect(sql).toContain('ALTER TABLE `t` ADD CONSTRAINT `uq_t_c` UNIQUE (`c`);');
  });

  it('mssql: ALTER COLUMN restates nullability', () => {
    const b = field('c', 'varchar', { length: 5, nullable: true });
    const a = field('c', 'varchar', { length: 9, nullable: false });
    const sql = generateMigrationsSQL([changed('t', [{ kind: 'changed', before: b, after: a }])], 'mssql');
    expect(sql).toContain('ALTER TABLE [t] ALTER COLUMN [c] VARCHAR(9) NOT NULL;');
  });

  it('sqlite: explains that ALTER COLUMN is unsupported instead of emitting invalid SQL', () => {
    const a = field('c', 'integer', { nullable: false });
    const sql = generateMigrationsSQL([changed('t', [{ kind: 'changed', before, after: a }])], 'sqlite');
    expect(sql).toContain('-- NOTE: SQLite cannot ALTER');
    expect(sql).not.toMatch(/^ALTER TABLE/m);
  });

  it('unchanged columns produce no statements', () => {
    const f = field('c', 'integer');
    const sql = generateMigrationsSQL([changed('t', [{ kind: 'changed', before: f, after: { ...f } }])], 'postgres');
    expect(sql.trim()).toBe('-- Auto-generated migration for PostgreSQL');
  });

  it('one ALTER statement per operation (valid in sqlite/mssql too)', () => {
    const sql = generateMigrationsSQL(
      [changed('t', [{ kind: 'added', field: field('a', 'int') }, { kind: 'added', field: field('b', 'int') }])],
      'sqlite'
    );
    expect(sql.match(/^ALTER TABLE "t" ADD COLUMN/gm)).toHaveLength(2);
  });
});

describe('generateMigrationsSQL: foreign keys', () => {
  const added: RelationshipDiff = { kind: 'added', sourceTable: 'posts', sourceColumn: 'user_id', targetTable: 'user', targetColumn: 'id' };
  const removed: RelationshipDiff = { ...added, kind: 'removed' };

  it('adds and drops constraints', () => {
    expect(generateMigrationsSQL([], 'postgres', [added])).toContain(
      'ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("id");'
    );
    expect(generateMigrationsSQL([], 'postgres', [removed])).toContain('ALTER TABLE "posts" DROP CONSTRAINT "fk_posts_user_id";');
    expect(generateMigrationsSQL([], 'mysql', [removed])).toContain('ALTER TABLE `posts` DROP FOREIGN KEY `fk_posts_user_id`;');
    expect(generateMigrationsSQL([], 'mssql', [added])).toContain('ALTER TABLE [posts] ADD CONSTRAINT [fk_posts_user_id] FOREIGN KEY ([user_id]) REFERENCES [user] ([id]);');
    expect(generateMigrationsSQL([], 'sqlite', [added])).toContain('-- NOTE: SQLite cannot add a foreign key');
  });

  it('FK drops come before table drops, FK adds come after table creates', () => {
    const diffs: TableDiff[] = [
      { kind: 'removed', table: table('o', 'old', [field('id', 'int')]) },
      { kind: 'added', table: table('n', 'posts', [field('id', 'int', { isPK: true }), field('user_id', 'int')]) },
    ];
    const sql = generateMigrationsSQL(diffs, 'postgres', [removed, added]);
    expect(sql.indexOf('DROP CONSTRAINT')).toBeLessThan(sql.indexOf('DROP TABLE'));
    expect(sql.indexOf('ADD CONSTRAINT')).toBeGreaterThan(sql.indexOf('CREATE TABLE "posts"'));
  });

  it('sqlite: FKs for newly created tables are inlined', () => {
    const diffs: TableDiff[] = [{ kind: 'added', table: table('n', 'posts', [field('id', 'int', { isPK: true }), field('user_id', 'int')]) }];
    const sql = generateMigrationsSQL(diffs, 'sqlite', [added]);
    expect(sql).toContain('CONSTRAINT "fk_posts_user_id" FOREIGN KEY ("user_id") REFERENCES "user" ("id")');
    expect(sql).not.toContain('ALTER TABLE');
  });
});

describe('generateMigrationsSQL: created tables', () => {
  const created = table('n', 'user', [
    field('id', 'uuid', { isPK: true, nullable: false, default: 'gen_random_uuid()' }),
    field('a', 'int', { isPK: true, nullable: false }),
    field('b', 'text', { nullable: false, default: "'x'" }),
  ]);

  it('reuses the SQL exporter (composite PK, mapped types, defaults)', () => {
    const pg = generateMigrationsSQL([{ kind: 'added', table: created }], 'postgres');
    expect(pg).toContain('PRIMARY KEY ("id", "a")');
    expect(pg).toContain(`"b" text NOT NULL DEFAULT 'x'`);
    expect(() => parser.astify(pg, { database: 'postgresql' })).not.toThrow();
    expect(generateMigrationsSQL([{ kind: 'added', table: created }], 'mysql')).toContain('`id` CHAR(36)');
    expect(generateMigrationsSQL([{ kind: 'added', table: created }], 'mssql')).toContain('[id] UNIQUEIDENTIFIER');
  });

  it('whole migration parses for postgres and mysql', () => {
    const diffs: TableDiff[] = [
      { kind: 'removed', table: table('o', 'old', []) },
      changed('keep', [
        { kind: 'added', field: field('n', 'int', { nullable: false, default: '0' }) },
        { kind: 'removed', field: field('gone', 'int') },
        { kind: 'changed', before: field('c', 'text'), after: field('c', 'varchar', { length: 20, nullable: false }) },
      ]),
      { kind: 'added', table: created },
    ];
    expect(() => parser.astify(generateMigrationsSQL(diffs, 'postgres'), { database: 'postgresql' })).not.toThrow();
    expect(() => parser.astify(generateMigrationsSQL(diffs, 'mysql'), { database: 'mysql' })).not.toThrow();
  });
});
