import { describe, it, expect } from 'vitest';
import { exportDBML } from '../../src/utils/exporters/dbml';
import { buildSchema, field, table, rel } from './fixtures';

const s = buildSchema();
const out = exportDBML(s.tables, s.relationships);

describe('exportDBML', () => {
  it('quotes "double precision"', () => {
    expect(out).toContain('ratio "double precision"');
    expect(out).not.toMatch(/ratio double precision/);
  });

  it('escapes quotes and newlines in notes', () => {
    expect(out).toContain("note: 'it\\'s a\\nmulti-line bio'");
    expect(out).toContain("Note: 'Users\\nwho login'");
    const t = table('t', 'x', [field('a', 'int', { comment: "a\\b 'c'\nd" })]);
    expect(exportDBML([t], [])).toContain("note: 'a\\\\b \\'c\\'\\nd'");
  });

  it('composite PKs use indexes { (a, b) [pk] } and no column-level pk', () => {
    const block = out.slice(out.indexOf('Table order_item'), out.indexOf('Table order_item') + 250);
    expect(block).toContain('indexes {');
    expect(block).toContain('(order_id, line_no) [pk]');
    expect(block.split('indexes {')[0]).not.toMatch(/\[pk/);
  });

  it('single PK, not null, unique, increment settings', () => {
    expect(out).toContain('id bigserial [pk, increment]');
    expect(out).toContain('email varchar(255) [not null, unique]');
  });

  it('defaults: backticks for expressions, quotes for strings, bare numbers/booleans', () => {
    expect(out).toContain('created_at timestamptz [not null, default: `now()`]');
    expect(out).toContain("id uuid [pk, default: `gen_random_uuid()`]");
    expect(out).toContain("status varchar(20) [not null, default: 'active']");
    expect(out).toContain('score integer [not null, default: 0]');
    expect(out).toContain('active boolean [not null, default: false]');
    expect(out).toContain("nick varchar [default: 'it\\'s']");
    const t = table('t', 'x', [field('a', 'text', { default: 'active' }), field('b', 'int', { default: 'null' })]);
    const code = exportDBML([t], []);
    expect(code).toContain("a text [default: 'active']");
    expect(code).toContain('b int [default: null]');
  });

  it('Ref arrows follow cardinality; FK side is the left operand', () => {
    expect(out).toContain('Ref: order.buyer_id > user.id');
    expect(out).toContain('Ref: profile.user_id - user.id');
    const a = table('a', 'a', [field('id', 'int', { isPK: true })]);
    const f = field('x', 'int');
    const b = table('b', 'b', [f]);
    expect(exportDBML([a, b], [rel(b, f, a, a.fields[0], 'many-to-many')])).toContain('Ref: b.x <> a.id');
  });

  it('dedupes duplicate refs and handles self refs', () => {
    expect(out.match(/Ref: order\.buyer_id/g)).toHaveLength(1);
    expect(out).toContain('Ref: group.parent_id > group.id');
  });

  it('quotes identifiers that are not plain', () => {
    const t = table('t', 'my table', [field('first name', 'text'), field('a"b', 'text')]);
    const code = exportDBML([t], []);
    expect(code).toContain('Table "my table" {');
    expect(code).toContain('"first name" text');
    expect(code).toContain('"a\\"b" text');
  });

  it('picks up length / precision metadata', () => {
    expect(out).toContain('balance numeric(10, 2)');
    expect(out).toContain('email varchar(255)');
  });

  it('braces balance', () => {
    expect(out.split('{').length).toBe(out.split('}').length);
  });
});
