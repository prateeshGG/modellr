import { describe, it, expect } from 'vitest';
import { exportPrisma } from '../../src/utils/exporters/prisma';
import { buildSchema, field, table, rel } from './fixtures';

const s = buildSchema();
const out = exportPrisma(s.tables, s.relationships);

function model(code: string, name: string): string {
  const start = code.indexOf(`model ${name} {`);
  expect(start, `model ${name} exists`).toBeGreaterThanOrEqual(0);
  return code.slice(start, code.indexOf('\n}', start) + 2);
}
const lineOf = (m: string, field: string) => m.split('\n').find((l) => l.trim().startsWith(`${field} `)) ?? '';

describe('exportPrisma', () => {
  it('has generator + datasource and PascalCase models with @@map', () => {
    expect(out).toContain('generator client {');
    expect(out).toContain('provider = "postgresql"');
    for (const [m, t] of [['User', 'user'], ['Order', 'order'], ['OrderItem', 'order_item'], ['Group', 'group'], ['Profile', 'profile']]) {
      expect(model(out, m)).toContain(`@@map("${t}")`);
    }
  });

  it('no @@map when the model name equals the table name', () => {
    const code = exportPrisma([table('t', 'Thing', [field('id', 'int', { isPK: true, nullable: false })])], []);
    expect(code).toContain('model Thing {');
    expect(code).not.toContain('@@map');
  });

  it('only generator-default / PK uuids get @default(uuid())', () => {
    const user = model(out, 'User');
    expect(lineOf(user, 'id')).toContain('@id @default(uuid()) @db.Uuid');
    const order = model(out, 'Order');
    expect(lineOf(order, 'buyer_id')).not.toContain('@default');
    expect(lineOf(order, 'buyer_id')).toContain('@db.Uuid');
    expect(lineOf(order, 'seller_id')).not.toContain('@default');
    // PK that is also an FK: no generated default
    expect(lineOf(model(out, 'Profile'), 'user_id')).not.toContain('@default');
    // plain uuid column without default
    const t = table('t', 'x', [field('id', 'int', { isPK: true }), field('ref', 'uuid')]);
    expect(exportPrisma([t], [])).not.toContain('uuid()');
  });

  it('uses the real target field in references (not hardcoded id)', () => {
    const tid = field('code', 'varchar', { isPK: true, nullable: false, length: 10 });
    const target = table('tt', 'country', [tid]);
    const c = field('country_code', 'varchar', { length: 10 });
    const src = table('ts', 'city', [field('id', 'int', { isPK: true }), c]);
    const code = exportPrisma([target, src], [rel(src, c, target, tid)]);
    expect(code).toContain('fields: [country_code], references: [code]');
    expect(code).not.toContain('references: [id]');
  });

  it('composite PK uses @@id and no field-level @id', () => {
    const m = model(out, 'OrderItem');
    expect(m).toContain('@@id([order_id, line_no])');
    expect(m).not.toContain(' @id');
  });

  it('back-relations have unique, sane names (no doubled plurals)', () => {
    expect(out).not.toMatch(/ss\b/);
    const user = model(out, 'User');
    expect(lineOf(user, 'order_buyer')).toContain('Order[]');
    expect(lineOf(user, 'order_seller')).toContain('Order[]');
    const names = [...user.matchAll(/^ {2}(\w+)\s/gm)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every relation is named and both sides carry the same name', () => {
    const order = model(out, 'Order');
    expect(lineOf(order, 'buyer')).toContain('@relation("order_buyer_id", fields: [buyer_id], references: [id])');
    expect(lineOf(order, 'seller')).toContain('@relation("order_seller_id", fields: [seller_id], references: [id])');
    const user = model(out, 'User');
    expect(lineOf(user, 'order_buyer')).toContain('@relation("order_buyer_id")');
    expect(lineOf(user, 'order_seller')).toContain('@relation("order_seller_id")');
  });

  it('optional FK gives optional relation field', () => {
    const order = model(out, 'Order');
    expect(lineOf(order, 'seller')).toMatch(/User\?/);
    expect(lineOf(order, 'buyer')).toMatch(/User\s/);
    expect(lineOf(order, 'buyer')).not.toMatch(/User\?/);
  });

  it('one-to-one: unique FK and non-list back field', () => {
    const user = model(out, 'User');
    expect(lineOf(user, 'profile')).toMatch(/Profile\?/);
    expect(lineOf(user, 'profile')).not.toContain('[]');

    const aId = field('id', 'int', { isPK: true, nullable: false });
    const bFk = field('a_id', 'int', { nullable: false });
    const A = table('A', 'a', [aId]);
    const B = table('B', 'b', [field('id', 'int', { isPK: true, nullable: false }), bFk]);
    const code = exportPrisma([A, B], [rel(B, bFk, A, aId, 'one-to-one')]);
    expect(lineOf(model(code, 'B'), 'a_id')).toContain('@unique');
    expect(lineOf(model(code, 'A'), 'b')).toContain('B?');
  });

  it('self relation works with named relation and distinct field names', () => {
    const g = model(out, 'Group');
    expect(lineOf(g, 'parent')).toContain('Group?');
    expect(lineOf(g, 'parent')).toContain('@relation("group_parent_id", fields: [parent_id], references: [id])');
    expect(lineOf(g, 'group')).toContain('Group[]');
  });

  it('relation field names do not collide with scalar columns', () => {
    const idCol = field('id', 'int', { isPK: true, nullable: false });
    const userCol = field('user', 'int'); // fk column named like the relation would be
    const U = table('U', 'users', [field('id', 'int', { isPK: true, nullable: false })]);
    const P = table('P', 'posts', [idCol, userCol]);
    const code = exportPrisma([U, P], [rel(P, userCol, U, U.fields[0])]);
    const names = [...model(code, 'Posts').matchAll(/^ {2}(\w+)\s/gm)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });

  it('defaults: escaping, now(), autoincrement(), numbers, booleans, dbgenerated()', () => {
    const user = model(out, 'User');
    expect(lineOf(user, 'nick')).toContain('@default("it\'s")');
    expect(lineOf(user, 'status')).toContain('@default("active")');
    expect(lineOf(user, 'score')).toContain('@default(0)');
    expect(lineOf(user, 'active')).toContain('@default(false)');
    expect(lineOf(user, 'created_at')).toContain('@default(now())');
    expect(lineOf(model(out, 'Order'), 'id')).toContain('@id @default(autoincrement())');
    expect(lineOf(model(out, 'Group'), 'id')).toContain('@default(autoincrement())');

    const t = table('t', 'x', [
      field('id', 'int', { isPK: true }),
      field('a', 'text', { default: "he said \"hi\" it's" }),
      field('b', 'int', { default: 'floor(random() * 10)' }),
      field('c', 'text', { default: 'active' }),
      field('d', 'timestamp', { default: 'current_timestamp' }),
      field('e', 'boolean', { default: 'true' }),
    ]);
    const code = exportPrisma([t], []);
    expect(code).toContain('@default("he said \\"hi\\" it\'s")');
    expect(code).toContain('@default(dbgenerated("floor(random() * 10)"))');
    expect(code).toContain('@default("active")');
    expect(code).toContain('@default(now())');
    expect(code).toContain('@default(true)');
  });

  it('type mapping with native attributes', () => {
    const t = table('t', 'x', [
      field('id', 'int', { isPK: true }),
      field('a', 'varchar', { length: 120 }),
      field('b', 'numeric', { precision: 12, scale: 3 }),
      field('c', 'bigint'),
      field('d', 'jsonb'),
      field('e', 'timestamptz'),
      field('f', 'double precision'),
      field('g', 'smallint'),
      field('h', 'bytea'),
      field('i', 'text'),
      field('j', 'char', { length: 3 }),
      field('k', 'interval'),
      field('l', 'text[]'),
    ]);
    const code = model(exportPrisma([t], []), 'X');
    expect(lineOf(code, 'a')).toMatch(/String\?\s+@db\.VarChar\(120\)/);
    expect(lineOf(code, 'b')).toMatch(/Decimal\?\s+@db\.Decimal\(12, 3\)/);
    expect(lineOf(code, 'c')).toMatch(/BigInt\?/);
    expect(lineOf(code, 'd')).toMatch(/Json\?/);
    expect(lineOf(code, 'e')).toMatch(/DateTime\?\s+@db\.Timestamptz\(6\)/);
    expect(lineOf(code, 'f')).toMatch(/Float\?/);
    expect(lineOf(code, 'g')).toMatch(/Int\?\s+@db\.SmallInt/);
    expect(lineOf(code, 'h')).toMatch(/Bytes\?/);
    expect(lineOf(code, 'i')).toMatch(/String\?/);
    expect(lineOf(code, 'j')).toMatch(/@db\.Char\(3\)/);
    expect(lineOf(code, 'k')).toContain('Unsupported("interval")?');
    expect(lineOf(code, 'l')).toMatch(/String\[\]/);
  });

  it('@unique on unique columns, not on PKs', () => {
    expect(lineOf(model(out, 'User'), 'email')).toContain('@unique');
    expect(lineOf(model(out, 'User'), 'id')).not.toContain('@unique');
  });

  it('invalid column names are sanitized and @map ed', () => {
    const t = table('t', 'x', [field('first-name', 'text'), field('1st', 'text'), field('id', 'int', { isPK: true })]);
    const code = exportPrisma([t], []);
    expect(code).toContain('first_name');
    expect(code).toContain('@map("first-name")');
    expect(code).toContain('f_1st');
    expect(code).toContain('@map("1st")');
  });

  it('comments become /// doc lines on a single line', () => {
    const user = model(out, 'User');
    expect(user).toContain("/// it's a multi-line bio");
    expect(out).toContain('/// Users who login');
  });

  it('warns about models without a unique identifier', () => {
    const code = exportPrisma([table('t', 'x', [field('a', 'text')])], []);
    expect(code).toContain('// WARNING: Prisma requires a unique identifier');
  });

  it('model names are unique even if tables collide after PascalCase', () => {
    const code = exportPrisma(
      [table('a', 'user_data', [field('id', 'int', { isPK: true })]), table('b', 'userData', [field('id', 'int', { isPK: true })])],
      []
    );
    const names = [...code.matchAll(/^model (\w+) \{/gm)].map((m) => m[1]);
    expect(new Set(names).size).toBe(2);
  });

  it('braces balance', () => {
    expect(out.split('{').length).toBe(out.split('}').length);
  });
});
