import { describe, it, expect } from 'vitest';
import { exportDrizzle } from '../../src/utils/exporters/drizzle';
import { buildSchema, field, table, rel } from './fixtures';

const s = buildSchema();
const out = exportDrizzle(s.tables, s.relationships);

function importedNames(code: string, from: string): string[] {
  const m = new RegExp(`import \\{([^}]*)\\} from '${from}';`).exec(code);
  return m ? m[1].split(',').map((x) => x.trim().replace(/^type /, '')).filter(Boolean) : [];
}

describe('exportDrizzle', () => {
  it('relations never emit duplicate keys and use real column names', () => {
    for (const block of out.split('export const').filter((b) => b.includes('relations('))) {
      for (const one of block.split(': one(').slice(1)) {
        const body = one.split('}),')[0];
        const nFields = (body.match(/fields:/g) ?? []).length;
        expect(nFields).toBeLessThanOrEqual(1);
        expect((body.match(/references:/g) ?? []).length).toBe(nFields);
      }
    }
    expect(out).not.toMatch(/fields: \[\w+\.f\d+\]/); // raw ids
    expect(out).toContain('fields: [orderTable.buyer_id]');
    expect(out).toContain('references: [userTable.id]');
  });

  it('imports exactly the builders that are used', () => {
    const pg = importedNames(out, 'drizzle-orm/pg-core');
    const used = new Set<string>();
    for (const m of out.matchAll(/\b([a-zA-Z]+)\(/g)) used.add(m[1]);
    if (out.includes('AnyPgColumn')) used.add('AnyPgColumn');
    for (const name of pg) expect(used.has(name), `${name} imported but unused`).toBe(true);
    for (const b of ['pgTable', 'uuid', 'varchar', 'integer', 'boolean', 'timestamp', 'numeric', 'text', 'jsonb', 'bigint', 'bigserial', 'serial', 'date', 'doublePrecision', 'primaryKey', 'check', 'AnyPgColumn']) {
      expect(pg, `${b} should be imported`).toContain(b);
    }
    expect(pg).not.toContain('foreignKey');
    expect(pg).not.toContain('index');
    expect(importedNames(out, 'drizzle-orm').sort()).toEqual(['relations', 'sql']);
  });

  it('maps double precision, date, bigint, bigserial and int types correctly', () => {
    expect(out).toContain("ratio: doublePrecision('ratio')");
    expect(out).toContain("born: date('born')");
    expect(out).toContain("id: bigserial('id', { mode: 'number' }).primaryKey()");
    expect(out).toContain("order_id: bigint('order_id', { mode: 'number' })");
    expect(out).toContain("meta: jsonb('meta')");
  });

  it('an integer primary key stays integer (only serial is auto-increment)', () => {
    const t = table('t', 'things', [field('id', 'integer', { isPK: true }), field('sid', 'serial', { isPK: false })]);
    const code = exportDrizzle([t], []);
    expect(code).toContain("id: integer('id').primaryKey()");
    expect(code).toContain("sid: serial('sid')");
  });

  it('composite PKs use primaryKey({ columns }) once and no per-column primaryKey()', () => {
    const block = out.slice(out.indexOf('export const orderItemTable'), out.indexOf('export const groupTable'));
    expect(block).toContain('primaryKey({ columns: [t.order_id, t.line_no] })');
    expect(block.match(/primaryKey\(/g)).toHaveLength(1);
    expect(block).not.toContain('.primaryKey()');
    expect(block).toContain("order_id: bigint('order_id', { mode: 'number' }).notNull()");
    expect(block).toContain("line_no: integer('line_no').notNull()");
  });

  it('keeps apostrophes in string defaults and escapes them', () => {
    expect(out).toContain("nick: varchar('nick').default('it\\'s')");
    const t = table('t', 'x', [field('a', 'text', { default: "'don''t'" }), field('b', 'text', { default: "it's" })]);
    const code = exportDrizzle([t], []);
    expect(code).toContain("a: text('a').default('don\\'t')");
    expect(code).toContain("b: text('b').default('it\\'s')");
  });

  it('translates default expressions', () => {
    expect(out).toContain("id: uuid('id').primaryKey().defaultRandom()");
    expect(out).toContain("created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()");
    expect(out).toContain(".notNull().default(0)");
    expect(out).toContain("active: boolean('active').notNull().default(false)");
    expect(out).toContain("status: varchar('status', { length: 20 }).notNull().default('active')");
  });

  it('other expressions use the sql template tag with escaping', () => {
    const t = table('t', 'x', [field('a', 'text', { default: "lower('A`B')" }), field('n', 'integer', { default: 'floor(random() * 10)' })]);
    const code = exportDrizzle([t], []);
    expect(code).toContain("a: text('a').default(sql`lower('A\\`B')`)");
    expect(code).toContain("n: integer('n').default(sql`floor(random() * 10)`)");
  });

  it('notNull correctness', () => {
    expect(out).toContain("email: varchar('email', { length: 255 }).notNull().unique()");
    expect(out).toContain("balance: numeric('balance', { precision: 10, scale: 2 }),");
    expect(out).toContain("seller_id: uuid('seller_id').references(() => userTable.id)");
    expect(out).toContain("buyer_id: uuid('buyer_id').notNull().references(() => userTable.id)");
  });

  it('references() point at the right column; self references are typed with AnyPgColumn', () => {
    expect(out).toContain("order_id: bigint('order_id', { mode: 'number' }).notNull().references(() => orderTable.id)");
    expect(out).toContain("parent_id: integer('parent_id').references((): AnyPgColumn => groupTable.id)");
  });

  it('declares tables in dependency order', () => {
    expect(out.indexOf('export const userTable')).toBeLessThan(out.indexOf('export const orderTable'));
    expect(out.indexOf('export const orderTable')).toBeLessThan(out.indexOf('export const orderItemTable'));
  });

  it('relation names disambiguate multiple FKs to the same table, with unique keys', () => {
    expect(out).toContain("order_buyer: many(orderTable, { relationName: 'order_buyer_id' })");
    expect(out).toContain("order_seller: many(orderTable, { relationName: 'order_seller_id' })");
    expect(out).toContain('buyer: one(userTable, {');
    expect(out).toContain('seller: one(userTable, {');
    const keys = [...out.split('export const userTableRelations')[1].split('\n\n')[0].matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('one-to-one back relation is a non-list one()', () => {
    expect(out).toContain("profile: one(profileTable, { relationName: 'profile_user_id' })");
  });

  it('duplicate relationships are collapsed', () => {
    expect(out.match(/buyer: one\(/g)).toHaveLength(1);
  });

  it('balanced braces / parentheses and no leaked ids', () => {
    for (const [a, b] of [['{', '}'], ['(', ')'], ['[', ']']]) {
      expect(out.split(a).length).toBe(out.split(b).length);
    }
    expect(out).not.toMatch(/\bf\d+\b/);
  });

  it('quotes non-identifier column names', () => {
    const t = table('t', 'my table', [field('first-name', 'text', { isPK: true, nullable: false })]);
    const code = exportDrizzle([t], []);
    expect(code).toContain("export const myTableTable = pgTable('my table', {");
    expect(code).toContain("'first-name': text('first-name').primaryKey()");
  });

  it('unknown and bytea types use customType', () => {
    const t = table('t', 'x', [field('a', 'bytea'), field('b', 'tsvector')]);
    const code = exportDrizzle([t], []);
    expect(importedNames(code, 'drizzle-orm/pg-core')).toContain('customType');
    expect(code).toContain("return 'bytea';");
    expect(code).toContain("return 'tsvector';");
  });

  it('table with no relationships has no drizzle-orm imports', () => {
    const code = exportDrizzle([table('t', 'x', [field('id', 'int', { isPK: true })])], []);
    expect(code).not.toContain("from 'drizzle-orm';");
    expect(code).not.toContain('Relations');
  });

  it('extra FKs on the same column use foreignKey()', () => {
    const a = table('a', 'a', [field('id', 'int', { isPK: true })]);
    const b = table('b', 'b', [field('id', 'int', { isPK: true })]);
    const c = field('x', 'int');
    const src = table('s', 's', [c]);
    const code = exportDrizzle([a, b, src], [rel(src, c, a, a.fields[0]), rel(src, c, b, b.fields[0])]);
    expect(code).toContain('foreignKey({ columns: [t.x], foreignColumns: [bTable.id] })');
    expect(importedNames(code, 'drizzle-orm/pg-core')).toContain('foreignKey');
  });
});
