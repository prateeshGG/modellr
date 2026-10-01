import { describe, it, expect } from 'vitest';
import {
  extractJSON,
  parseOperationsResponse,
  parseGeneratedSchema,
  validateOperations,
  normalizeField,
  AIParseError,
} from '../../src/lib/aiPrompts';

describe('extractJSON', () => {
  it('parses plain JSON', () => {
    expect(extractJSON('{"a":1}')).toEqual({ a: 1 });
  });
  it('parses ```json fenced blocks', () => {
    expect(extractJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('parses bare ``` fences and CRLF', () => {
    expect(extractJSON('```\r\n{"a":[1,2]}\r\n```')).toEqual({ a: [1, 2] });
  });
  it('ignores leading and trailing prose', () => {
    expect(extractJSON('Sure! Here is the schema:\n{"a":{"b":2}}\nHope this helps {really}.')).toEqual({ a: { b: 2 } });
  });
  it('picks the fenced block when prose precedes it', () => {
    expect(extractJSON('Here you go:\n```json\n{"x":true}\n```\nLet me know.')).toEqual({ x: true });
  });
  it('handles unterminated fences', () => {
    expect(extractJSON('```json\n{"x":1}')).toEqual({ x: 1 });
  });
  it('is not confused by braces inside strings', () => {
    expect(extractJSON('text {"s":"a } b { c","n":1} end')).toEqual({ s: 'a } b { c', n: 1 });
  });
  it('skips bracketed prose before the JSON', () => {
    expect(extractJSON('[note] result: {"ok":1}')).toEqual({ ok: 1 });
  });
  it('throws a friendly AIParseError for prose and truncated JSON', () => {
    expect(() => extractJSON('no json here')).toThrow(AIParseError);
    expect(() => extractJSON('{"a":[1,2')).toThrow(/incomplete|cut off/i);
    expect(() => extractJSON('')).toThrow(AIParseError);
  });
});

describe('operation validation', () => {
  it('drops unknown actions and malformed ops', () => {
    const { operations, dropped } = validateOperations([
      { action: 'drop_database', tableName: 'x' },
      { action: 'add_table' },
      { action: 'remove_field', tableName: 't' }, // missing fieldName
      'nonsense',
      null,
      { action: 'remove_table', tableName: 'old' },
    ]);
    expect(operations).toEqual([{ action: 'remove_table', tableName: 'old' }]);
    expect(dropped).toBe(5);
  });

  it('never lets fieldUpdates carry an id or unknown keys', () => {
    const { operations } = validateOperations([
      { action: 'modify_field', tableName: 't', fieldName: 'f', fieldUpdates: { id: 'evil', name: 'g', foo: 1, type: 'text' } },
    ]);
    expect(operations[0].fieldUpdates).toEqual({ name: 'g', type: 'text' });
    expect(operations[0].fieldUpdates).not.toHaveProperty('id');
  });

  it('drops modify_field whose updates are empty after sanitising', () => {
    const { operations, dropped } = validateOperations([
      { action: 'modify_field', tableName: 't', fieldName: 'f', fieldUpdates: { id: 'x' } },
    ]);
    expect(operations).toEqual([]);
    expect(dropped).toBe(1);
  });

  it('strips ids from new fields and defaults nullable sensibly', () => {
    const { operations } = validateOperations([
      {
        action: 'add_table',
        tableName: 'users',
        newFields: [
          { id: 'x', name: 'id', type: 'bigserial', isPK: true },
          { name: 'email', type: 'text' },
          { name: 'bio', type: 'text', nullable: false, default: null },
          { name: 'age', type: 'integer', default: 18 },
          { name: 'email', type: 'dup' },
          { type: 'text' },
        ],
      },
    ]);
    const f = operations[0].newFields!;
    expect(f.map((x) => x.name)).toEqual(['id', 'email', 'bio', 'age']);
    expect(f[0]).toEqual({ name: 'id', type: 'bigserial', isPK: true, unique: false, nullable: false, isFK: false });
    expect(f[0]).not.toHaveProperty('id');
    expect(f[1].nullable).toBe(true);
    expect(f[2].nullable).toBe(false);
    expect(f[2]).not.toHaveProperty('default');
    expect(f[3].default).toBe('18');
  });

  it('gives an empty add_table a default id PK', () => {
    const { operations } = validateOperations([{ action: 'add_table', tableName: 't', newFields: [] }]);
    expect(operations[0].newFields).toHaveLength(1);
    expect(operations[0].newFields![0]).toMatchObject({ name: 'id', isPK: true, nullable: false });
  });

  it('normalises add_field and add_relationship', () => {
    const { operations } = validateOperations([
      { action: 'add_field', tableName: 't', newFields: [{ name: 'a', type: 'text' }, { name: 'b' }] },
      { action: 'add_field', tableName: 't', newFields: [] },
      { action: 'add_relationship', tableName: 'orders', fieldName: 'customer_id', relationTargetTable: 'customers', relationCardinality: 'weird' },
      { action: 'add_relationship', tableName: 'orders', relationTargetTable: 'customers' },
    ]);
    expect(operations).toHaveLength(2);
    expect(operations[0]).toMatchObject({ action: 'add_field', fieldName: 'a' });
    expect(operations[0].newFields).toHaveLength(1);
    expect(operations[1]).toMatchObject({ relationTargetField: 'id', relationCardinality: 'one-to-many' });
  });

  it('does not mutate its input', () => {
    const input = [{ action: 'modify_field', tableName: 't', fieldName: 'f', fieldUpdates: { id: 'x', type: 'text' } }];
    const copy = JSON.parse(JSON.stringify(input));
    validateOperations(input);
    expect(input).toEqual(copy);
  });

  it('normalizeField rejects non-objects', () => {
    expect(normalizeField('x')).toBeNull();
    expect(normalizeField({ name: '  ' })).toBeNull();
  });
});

describe('parseOperationsResponse', () => {
  it('parses a fenced response with prose', () => {
    const text = 'Sure!\n```json\n{"analysis":"Add a table","operations":[{"action":"add_table","tableName":"posts","newFields":[{"name":"id","type":"bigserial","isPK":true}]},{"action":"bogus","tableName":"x"}]}\n```';
    const r = parseOperationsResponse(text);
    expect(r.parsed).toBe(true);
    expect(r.analysis).toBe('Add a table');
    expect(r.operations).toHaveLength(1);
    expect(r.dropped).toBe(1);
  });
  it('accepts a bare array of operations', () => {
    const r = parseOperationsResponse('[{"action":"remove_table","tableName":"a"}]');
    expect(r.operations).toHaveLength(1);
  });
  it('treats prose as the analysis instead of failing', () => {
    const r = parseOperationsResponse('Your schema looks fine already.');
    expect(r).toMatchObject({ parsed: false, operations: [], analysis: 'Your schema looks fine already.' });
  });
});

describe('parseGeneratedSchema', () => {
  it('parses fenced output and applies defaults', () => {
    const text = '```json\n{"tables":[{"name":"customers","fields":[{"name":"id","type":"bigserial","isPK":true},{"name":"email","type":"text"}]},{"name":"orders","fields":[{"name":"id","type":"bigserial","isPK":true},{"name":"customer_id","type":"bigint","isFK":true,"nullable":false}]}],"relationships":[{"from":"orders","fromField":"customer_id","to":"customers","toField":"id","cardinality":"one-to-many"},{"from":"ghost","fromField":"x","to":"customers","toField":"id"}]}\n```';
    const s = parseGeneratedSchema(text);
    expect(s.tables).toHaveLength(2);
    expect(s.tables[0].fields[1].nullable).toBe(true);
    expect(s.relationships).toHaveLength(1);
  });
  it('throws when there are no tables', () => {
    expect(() => parseGeneratedSchema('{"tables":[]}')).toThrow(AIParseError);
    expect(() => parseGeneratedSchema('Sorry, I cannot do that.')).toThrow(AIParseError);
  });
});
