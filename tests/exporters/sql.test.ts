import { describe, it, expect } from 'vitest';
import pkg from 'node-sql-parser';
import { exportSQL } from '../../src/utils/exporters/sql';
import { buildSchema, field, table, rel } from './fixtures';
import type { Dialect } from '../../src/types/schema';

const { Parser } = pkg as unknown as { Parser: new () => { astify(sql: string, opt: { database: string }): unknown } };
const parser = new Parser();
const PARSER_DB: Record<Dialect, string> = { postgres: 'postgresql', mysql: 'mysql', sqlite: 'sqlite', mssql: 'transactsql' };

const s = buildSchema();
const out = (d: Dialect) => exportSQL(s.tables, s.relationships, d);
const DIALECTS: Dialect[] = ['postgres', 'mysql', 'sqlite', 'mssql'];

function statements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((x) => x.trim())
    .filter(Boolean);
}

describe('exportSQL: structural validity', () => {
  for (const d of ['postgres', 'mysql', 'sqlite'] as Dialect[]) {
    it(`parses as valid ${d} DDL`, () => {
      expect(() => parser.astify(out(d), { database: PARSER_DB[d] })).not.toThrow();
    });
  }

  it('mssql: simple CREATE TABLE statements parse (parser has no table-level constraint support)', () => {
    const sql = exportSQL(
      [table('a', 'user', [field('id', 'serial', { isPK: true, nullable: false }), field('b', 'text', { default: "'x'" })])],
      [],
      'mssql'
    );
    expect(() => parser.astify(sql, { database: 'transactsql' })).not.toThrow();
  });

  it('every statement terminates with a semicolon and parentheses balance', () => {
    for (const d of DIALECTS) {
      const sql = out(d);
      expect((sql.match(/\(/g) ?? []).length).toBe((sql.match(/\)/g) ?? []).length);
      for (const st of statements(sql)) expect(st).toMatch(/^(CREATE TABLE|ALTER TABLE|COMMENT ON)/);
    }
  });
});

describe('exportSQL: composite primary keys', () => {
  it('emits a table-level PRIMARY KEY (a, b) and no per-column PRIMARY KEY', () => {
    for (const d of DIALECTS) {
      const sql = out(d);
      const block = sql.slice(sql.indexOf('order_item'), sql.indexOf('order_item') + 400).split(');')[0];
      const q = (n: string) => (d === 'mysql' ? `\`${n}\`` : d === 'mssql' ? `[${n}]` : `"${n}"`);
      expect(block).toContain(`PRIMARY KEY (${q('order_id')}, ${q('line_no')})`);
      expect(block.match(/PRIMARY KEY/g)).toHaveLength(1);
      expect(block).not.toMatch(/"order_id" bigint NOT NULL PRIMARY KEY/);
    }
  });
});

describe('exportSQL: type mapping per dialect', () => {
  const t = table('t', 'things', [
    field('a', 'serial', { isPK: true, nullable: false }),
    field('b', 'bigserial'),
    field('c', 'uuid'),
    field('d', 'timestamptz'),
    field('e', 'jsonb'),
    field('f', 'boolean'),
    field('g', 'text'),
    field('h', 'timestamp'),
    field('i', 'double precision'),
    field('j', 'bytea'),
  ]);
  const gen = (d: Dialect) => exportSQL([t], [], d);

  it('mysql', () => {
    const sql = gen('mysql');
    expect(sql).toContain('`a` INT NOT NULL AUTO_INCREMENT PRIMARY KEY');
    expect(sql).toContain('`b` BIGINT AUTO_INCREMENT');
    expect(sql).toContain('`c` CHAR(36)');
    expect(sql).toContain('`d` TIMESTAMP');
    expect(sql).toContain('`e` JSON');
    expect(sql).toContain('`f` TINYINT(1)');
    expect(sql).toContain('`i` DOUBLE');
    expect(sql).toContain('`j` BLOB');
  });

  it('mysql bigserial does not double NOT NULL', () => {
    const sql = exportSQL([table('t', 'x', [field('id', 'bigserial', { isPK: true, nullable: false })])], [], 'mysql');
    expect(sql).toContain('`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY');
    expect(sql).not.toMatch(/NOT NULL[^,]*NOT NULL/);
  });

  it('sqlite', () => {
    const sql = gen('sqlite');
    expect(sql).toContain('"a" INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(sql).toContain('"c" TEXT');
    expect(sql).toContain('"d" TEXT');
    expect(sql).toContain('"e" TEXT');
    expect(sql).toContain('"f" INTEGER');
    expect(sql).toContain('"i" REAL');
    expect(sql).toContain('"j" BLOB');
    expect(sql).not.toMatch(/bigserial|uuid|timestamptz|jsonb|boolean/i);
  });

  it('mssql', () => {
    const sql = gen('mssql');
    expect(sql).toContain('[a] INT IDENTITY(1,1) NOT NULL PRIMARY KEY');
    expect(sql).toContain('[b] BIGINT IDENTITY(1,1)');
    expect(sql).toContain('[c] UNIQUEIDENTIFIER');
    expect(sql).toContain('[d] DATETIMEOFFSET');
    expect(sql).toContain('[e] NVARCHAR(MAX)');
    expect(sql).toContain('[f] BIT');
    expect(sql).toContain('[g] NVARCHAR(MAX)');
    expect(sql).toContain('[h] DATETIME2');
    expect(sql).toContain('[j] VARBINARY(MAX)');
    expect(sql).not.toMatch(/bigserial|uuid |timestamptz|jsonb|boolean/i);
  });

  it('postgres keeps native types', () => {
    const sql = gen('postgres');
    expect(sql).toContain('"a" serial NOT NULL PRIMARY KEY');
    expect(sql).toContain('"c" uuid');
    expect(sql).toContain('"d" timestamptz');
    expect(sql).toContain('"i" double precision');
  });

  it('varchar length / numeric precision come from field metadata', () => {
    const sql = out('postgres');
    expect(sql).toContain('"email" varchar(255) NOT NULL UNIQUE');
    expect(sql).toContain('"balance" numeric(10, 2)');
    expect(out('mysql')).toContain('`balance` DECIMAL(10, 2)');
    expect(out('mssql')).toContain('[balance] DECIMAL(10, 2)');
  });

  it('type-string arguments win and unsized varchar gets a length where required', () => {
    const t2 = table('t', 'x', [field('a', 'varchar(40)', { length: 99 }), field('b', 'varchar')]);
    expect(exportSQL([t2], [], 'postgres')).toContain('"a" varchar(40)');
    expect(exportSQL([t2], [], 'mysql')).toContain('`b` VARCHAR(255)');
    expect(exportSQL([t2], [], 'mssql')).toContain('[b] VARCHAR(255)');
  });
});

describe('exportSQL: identifier quoting', () => {
  it('quotes reserved words per dialect', () => {
    expect(out('postgres')).toContain('CREATE TABLE "user" (');
    expect(out('postgres')).toContain('CREATE TABLE "order" (');
    expect(out('postgres')).toContain('CREATE TABLE "group" (');
    expect(out('mysql')).toContain('CREATE TABLE `user` (');
    expect(out('mysql')).toContain('CREATE TABLE `order` (');
    expect(out('sqlite')).toContain('CREATE TABLE "group" (');
    expect(out('mssql')).toContain('CREATE TABLE [user] (');
    expect(out('mssql')).toContain('CREATE TABLE [order] (');
  });

  it('escapes embedded quote characters', () => {
    const tt = table('t', 'we"ird`na]me', [field('co"l`u]mn', 'int')]);
    expect(exportSQL([tt], [], 'postgres')).toContain('CREATE TABLE "we""ird`na]me" (\n  "co""l`u]mn" integer');
    expect(exportSQL([tt], [], 'sqlite')).toContain('"we""ird`na]me"');
    expect(exportSQL([tt], [], 'mysql')).toContain('CREATE TABLE `we"ird``na]me` (\n  `co"l``u]mn` INT');
    expect(exportSQL([tt], [], 'mssql')).toContain('CREATE TABLE [we"ird`na]]me] (\n  [co"l`u]]mn] INT');
  });

  it('strips control characters from identifiers', () => {
    const tt = table('t', 'bad\nname\r\n', [field('x\ny', 'int')]);
    const sql = exportSQL([tt], [], 'postgres');
    expect(sql).toContain('CREATE TABLE "badname" (');
    expect(sql).toContain('"xy" integer');
  });
});

describe('exportSQL: foreign keys', () => {
  it('dedupes duplicate relationships and keeps names unique', () => {
    const sql = out('postgres');
    const names = [...sql.matchAll(/CONSTRAINT "([^"]+)" FOREIGN KEY/g)].map((m) => m[1]);
    expect(names).toHaveLength(5); // 6 relationships, 1 duplicate
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length);
    expect(names).toContain('fk_order_buyer_id');
    expect(names).toContain('fk_order_seller_id');
  });

  it('multiple FKs to the same table reference the right columns', () => {
    const sql = out('postgres');
    expect(sql).toContain('FOREIGN KEY ("buyer_id") REFERENCES "user" ("id")');
    expect(sql).toContain('FOREIGN KEY ("seller_id") REFERENCES "user" ("id")');
  });

  it('truncates long names to 63 chars and keeps them unique', () => {
    const long = 'a'.repeat(50);
    const target = table('tt', 'target', [field('id', 'int', { isPK: true, nullable: false })]);
    const c1 = field(`${long}_one`, 'int');
    const c2 = field(`${long}_two`, 'int');
    const src = table('ts', long, [c1, c2]);
    const sql = exportSQL([target, src], [rel(src, c1, target, target.fields[0]), rel(src, c2, target, target.fields[0])], 'postgres');
    const names = [...sql.matchAll(/CONSTRAINT "([^"]+)" FOREIGN KEY/g)].map((m) => m[1]);
    expect(names).toHaveLength(2);
    for (const n of names) expect(n.length).toBeLessThanOrEqual(63);
    expect(new Set(names).size).toBe(2);
  });

  it('two relationships on the same column to different targets still get unique names', () => {
    const a = table('a', 'a', [field('id', 'int', { isPK: true })]);
    const b = table('b', 'b', [field('id', 'int', { isPK: true })]);
    const c1 = field('x', 'int');
    const src = table('s', 's', [c1]);
    const sql = exportSQL([a, b, src], [rel(src, c1, a, a.fields[0]), rel(src, c1, b, b.fields[0])], 'postgres');
    const names = [...sql.matchAll(/CONSTRAINT "([^"]+)" FOREIGN KEY/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(2);
  });

  it('creates referenced tables first (dependency order)', () => {
    const sql = out('postgres');
    const pos = (n: string) => sql.indexOf(`CREATE TABLE "${n}" (`);
    expect(pos('user')).toBeLessThan(pos('order'));
    expect(pos('order')).toBeLessThan(pos('order_item'));
    expect(pos('user')).toBeLessThan(pos('profile'));
  });

  it('self references are inline and need no ALTER', () => {
    const sql = out('postgres');
    expect(sql).toContain('REFERENCES "group" ("id")');
    expect(sql).not.toContain('ALTER TABLE');
  });

  it('circular references fall back to ALTER TABLE at the end (not for sqlite)', () => {
    const aId = field('id', 'int', { isPK: true });
    const aB = field('b_id', 'int');
    const bId = field('id', 'int', { isPK: true });
    const bA = field('a_id', 'int');
    const A = table('A', 'a', [aId, aB]);
    const B = table('B', 'b', [bId, bA]);
    const rels = [rel(A, aB, B, bId), rel(B, bA, A, aId)];
    const pg = exportSQL([A, B], rels, 'postgres');
    expect(pg).toContain('-- Foreign Keys');
    expect(pg).toMatch(/ALTER TABLE "a" ADD CONSTRAINT "fk_a_b_id" FOREIGN KEY \("b_id"\) REFERENCES "b" \("id"\);/);
    expect(pg.indexOf('ALTER TABLE')).toBeGreaterThan(pg.lastIndexOf('CREATE TABLE'));
    expect(() => parser.astify(pg, { database: 'postgresql' })).not.toThrow();
    const lite = exportSQL([A, B], rels, 'sqlite');
    expect(lite).not.toContain('ALTER TABLE');
  });

  it('ignores relationships with dangling references', () => {
    const t1 = table('t1', 'a', [field('id', 'int', { isPK: true })]);
    const sql = exportSQL(
      [t1],
      [{ id: 'x', sourceTableId: 't1', sourceFieldId: 'nope', targetTableId: 'gone', targetFieldId: 'q', cardinality: 'one-to-many' }],
      'postgres'
    );
    expect(sql).not.toContain('FOREIGN KEY');
  });
});

describe('exportSQL: defaults', () => {
  it('keeps DEFAULT 0 and DEFAULT false (no truthiness drop)', () => {
    const sql = out('postgres');
    expect(sql).toContain('"score" integer NOT NULL DEFAULT 0');
    expect(sql).toContain('"active" boolean NOT NULL DEFAULT false');
  });

  it('maps boolean defaults for dialects without booleans', () => {
    expect(out('mssql')).toContain('[active] BIT NOT NULL DEFAULT 0');
    expect(out('sqlite')).toContain('"active" INTEGER NOT NULL DEFAULT 0');
    expect(out('mysql')).toContain('`active` TINYINT(1) NOT NULL DEFAULT false');
  });

  it("emits string literals and function defaults", () => {
    const sql = out('postgres');
    expect(sql).toContain(`"status" varchar(20) NOT NULL DEFAULT 'active'`);
    expect(sql).toContain('DEFAULT now()');
    expect(sql).toContain('DEFAULT gen_random_uuid()');
    expect(sql).toContain(`"nick" varchar DEFAULT 'it''s'`);
  });

  it('wraps a bare word default in quotes (defensive heuristic)', () => {
    const t1 = table('t', 'x', [field('status', 'text', { default: 'active' })]);
    expect(exportSQL([t1], [], 'postgres')).toContain(`"status" text DEFAULT 'active'`);
  });

  it('translates function defaults for other dialects', () => {
    expect(out('mysql')).toContain('DEFAULT (UUID())');
    expect(out('mysql')).toContain('`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(out('mssql')).toContain('DEFAULT NEWID()');
    expect(out('mssql')).toContain('DATETIMEOFFSET NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(out('sqlite')).toContain('DEFAULT CURRENT_TIMESTAMP');
  });

  it('does not emit DEFAULT for empty defaults and never for serial columns', () => {
    const t1 = table('t', 'x', [field('a', 'int', { default: '' }), field('id', 'serial', { isPK: true, default: "nextval('s')" })]);
    const sql = exportSQL([t1], [], 'postgres');
    expect(sql).not.toContain('DEFAULT');
  });

  it('never lets an injected default escape the statement', () => {
    const t1 = table('t', 'x', [field('a', 'text', { default: "x'); DROP TABLE y; --" })]);
    const sql = exportSQL([t1], [], 'postgres');
    expect(sql).toContain(`DEFAULT 'x''); DROP TABLE y; --'`);
    expect(() => parser.astify(sql, { database: 'postgresql' })).not.toThrow();
  });

  it('a numeric default on a text column becomes a string', () => {
    const t1 = table('t', 'x', [field('a', 'varchar', { default: '0' }), field('b', 'boolean', { default: '1' })]);
    expect(exportSQL([t1], [], 'postgres')).toContain(`"a" varchar DEFAULT '0'`);
    expect(exportSQL([t1], [], 'postgres')).toContain(`"b" boolean DEFAULT true`);
  });
});

describe('exportSQL: checks and comments', () => {
  it('emits CHECK constraints', () => {
    expect(out('postgres')).toContain('"total" numeric(12, 2) CHECK (total >= 0)');
  });

  it('drops a CHECK that could break out of the statement', () => {
    const t1 = table('t', 'x', [field('a', 'int', { check: 'a > 0); DROP TABLE x; --' })]);
    expect(exportSQL([t1], [], 'postgres')).not.toContain('DROP TABLE');
  });

  it('postgres: COMMENT ON with escaping and newlines flattened', () => {
    const sql = out('postgres');
    expect(sql).toContain(`COMMENT ON COLUMN "user"."bio" IS 'it''s a multi-line bio';`);
    expect(sql).toContain(`COMMENT ON TABLE "user" IS 'Users who login';`);
  });

  it('mysql: inline COMMENT clauses', () => {
    const sql = out('mysql');
    expect(sql).toContain(`\`bio\` TEXT COMMENT 'it''s a multi-line bio'`);
    expect(sql).toContain(`) COMMENT='Users who login';`);
  });

  it('sqlite/mssql: comments are single -- lines and cannot inject', () => {
    const t1 = table('t', 'x', [field('a', 'int', { comment: 'hello\nDROP TABLE x;' })], { comment: 'tbl\r\nDROP TABLE y;' });
    for (const d of ['sqlite', 'mssql'] as Dialect[]) {
      const sql = exportSQL([t1], [], d);
      for (const line of sql.split('\n')) {
        if (line.includes('DROP TABLE')) expect(line.trim().startsWith('--')).toBe(true);
      }
    }
    const pg = exportSQL([t1], [], 'postgres');
    expect(pg).toContain(`IS 'hello DROP TABLE x;'`);
  });
});

describe('exportSQL: misc', () => {
  it('nullable PK columns are still NOT NULL', () => {
    const t1 = table('t', 'x', [field('id', 'int', { isPK: true, nullable: true })]);
    expect(exportSQL([t1], [], 'postgres')).toContain('"id" integer NOT NULL PRIMARY KEY');
  });

  it('skips tables without columns', () => {
    const sql = exportSQL([table('e', 'empty', [])], [], 'postgres');
    expect(sql).not.toContain('CREATE TABLE');
    expect(sql).toContain('-- Skipped table empty');
  });

  it('sqlite composite key containing a serial column does not use AUTOINCREMENT', () => {
    const t1 = table('t', 'x', [field('a', 'serial', { isPK: true }), field('b', 'int', { isPK: true })]);
    const sql = exportSQL([t1], [], 'sqlite');
    expect(sql).not.toContain('AUTOINCREMENT');
    expect(sql).toContain('PRIMARY KEY ("a", "b")');
  });
});
