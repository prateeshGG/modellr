import { describe, it, expect } from 'vitest';
import {
  analyzeDefault,
  commentText,
  fitName,
  mapType,
  orderTables,
  parseType,
  quoteIdent,
  renderSqlDefault,
  resolveRelationships,
  uniqueName,
} from '../../src/utils/exporters/sqlUtils';
import { toCamelCase, toPascalCase, tsString } from '../../src/utils/exporters/namingUtils';
import { field, table, rel } from './fixtures';

describe('quoteIdent', () => {
  it('quotes per dialect and escapes', () => {
    expect(quoteIdent('a"b', 'postgres')).toBe('"a""b"');
    expect(quoteIdent('a"b', 'sqlite')).toBe('"a""b"');
    expect(quoteIdent('a`b', 'mysql')).toBe('`a``b`');
    expect(quoteIdent('a]b', 'mssql')).toBe('[a]]b]');
    expect(quoteIdent('a\nb\u0000c', 'postgres')).toBe('"abc"');
    expect(quoteIdent('', 'postgres')).toBe('"_"');
  });
});

describe('analyzeDefault', () => {
  it('classifies', () => {
    expect(analyzeDefault(undefined)).toBeUndefined();
    expect(analyzeDefault('  ')).toBeUndefined();
    expect(analyzeDefault('0')).toEqual({ kind: 'number', text: '0' });
    expect(analyzeDefault('-1.5')).toEqual({ kind: 'number', text: '-1.5' });
    expect(analyzeDefault('FALSE')).toEqual({ kind: 'bool', value: false });
    expect(analyzeDefault('NULL')).toEqual({ kind: 'null' });
    expect(analyzeDefault("'a''b'")).toEqual({ kind: 'string', value: "a'b" });
    expect(analyzeDefault('active')).toEqual({ kind: 'string', value: 'active' });
    expect(analyzeDefault("it's")).toEqual({ kind: 'string', value: "it's" });
    expect(analyzeDefault('NOW()')).toMatchObject({ kind: 'now' });
    expect(analyzeDefault('(gen_random_uuid())')).toMatchObject({ kind: 'uuid', text: 'gen_random_uuid()' });
    expect(analyzeDefault('current_date')).toMatchObject({ kind: 'keyword' });
    expect(analyzeDefault("'x'::text")).toEqual({ kind: 'expr', text: "'x'::text" });
    expect(analyzeDefault('1 + 1')).toEqual({ kind: 'expr', text: '1 + 1' });
  });

  it('unsafe expressions become string literals', () => {
    expect(analyzeDefault('foo(); DROP TABLE x')).toEqual({ kind: 'string', value: 'foo(); DROP TABLE x' });
    expect(analyzeDefault('1 -- hi')).toEqual({ kind: 'string', value: '1 -- hi' });
    expect(analyzeDefault('(1')).toEqual({ kind: 'string', value: '(1' });
  });
});

describe('renderSqlDefault', () => {
  it('quote-escapes strings per dialect', () => {
    expect(renderSqlDefault("'it''s'", 'postgres')).toBe("'it''s'");
    expect(renderSqlDefault("'a\\b'", 'mysql')).toBe("'a\\\\b'");
  });
  it('expressions are parenthesised for mysql/sqlite only', () => {
    expect(renderSqlDefault('lower(x)', 'postgres')).toBe('lower(x)');
    expect(renderSqlDefault('lower(x)', 'mysql')).toBe('(lower(x))');
    expect(renderSqlDefault('lower(x)', 'sqlite')).toBe('(lower(x))');
    expect(renderSqlDefault('lower(x)', 'mssql')).toBe('lower(x)');
  });
});

describe('parseType / mapType', () => {
  it('parses args, arrays and multiword names', () => {
    expect(parseType('Double Precision')).toMatchObject({ base: 'double precision', category: 'double' });
    expect(parseType('numeric(10, 2)')).toMatchObject({ base: 'numeric', args: ['10', '2'] });
    expect(parseType('int[]')).toMatchObject({ arrayDims: 1, category: 'int' });
  });

  it('removes injected statements from types', () => {
    const m = mapType({ type: 'int); DROP TABLE x; --' }, 'postgres');
    expect(m.sql).not.toContain(';');
    expect(m.sql).not.toContain('-');
  });

  it('arrays: native in postgres, JSON-like elsewhere', () => {
    expect(mapType({ type: 'int[]' }, 'postgres').sql).toBe('integer[]');
    expect(mapType({ type: 'int[]' }, 'mysql').sql).toBe('JSON');
    expect(mapType({ type: 'int[]' }, 'sqlite').sql).toBe('TEXT');
    expect(mapType({ type: 'int[]' }, 'mssql').sql).toBe('NVARCHAR(MAX)');
  });

  it('passes unknown types through and keeps native dialect types', () => {
    expect(mapType({ type: 'geometry' }, 'postgres').sql).toBe('geometry');
    expect(mapType({ type: 'datetime2' }, 'mssql').sql).toBe('DATETIME2');
    expect(mapType({ type: 'nvarchar', length: 30 }, 'mssql').sql).toBe('NVARCHAR(30)');
    expect(mapType({ type: 'datetime' }, 'mysql').sql).toBe('DATETIME');
    expect(mapType({ type: 'longtext' }, 'mysql').sql).toBe('LONGTEXT');
  });
});

describe('names and ordering', () => {
  it('commentText flattens newlines', () => {
    expect(commentText('a\r\nb c')).toBe('a b c');
  });
  it('fitName / uniqueName cap at 63', () => {
    const n = fitName('x'.repeat(100));
    expect(n.length).toBeLessThanOrEqual(63);
    expect(fitName('x'.repeat(100))).toBe(n);
    const used = new Set<string>();
    const a = uniqueName('x'.repeat(100), used);
    const b = uniqueName('x'.repeat(100), used);
    expect(a).not.toBe(b);
    expect(b.length).toBeLessThanOrEqual(63);
  });
  it('orderTables puts referenced tables first and survives cycles', () => {
    const a = table('a', 'a', [field('id', 'int')]);
    const bf = field('a_id', 'int');
    const b = table('b', 'b', [bf]);
    const rels = resolveRelationships([b, a], [rel(b, bf, a, a.fields[0])]);
    expect(orderTables([b, a], rels).map((t) => t.id)).toEqual(['a', 'b']);
    const af = field('b_id', 'int');
    const a2 = table('a2', 'a2', [af, field('id', 'int')]);
    const b2f = field('a_id', 'int');
    const b2 = table('b2', 'b2', [b2f, field('id', 'int')]);
    const cyc = resolveRelationships([a2, b2], [rel(a2, af, b2, b2.fields[1]), rel(b2, b2f, a2, a2.fields[1])]);
    expect(orderTables([a2, b2], cyc)).toHaveLength(2);
  });
});

describe('namingUtils', () => {
  it('case conversion', () => {
    expect(toPascalCase('blog_posts')).toBe('BlogPosts');
    expect(toPascalCase('userProfile')).toBe('UserProfile');
    expect(toPascalCase('USERS')).toBe('Users');
    expect(toCamelCase('order_item')).toBe('orderItem');
  });
  it('tsString escapes', () => {
    expect(tsString("it's\n")).toBe("'it\\'s\\n'");
  });
});
