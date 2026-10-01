import { describe, it, expect } from 'vitest';
import { applyOperations } from '../../src/store/applyOperations';
import type { Field, Relationship, Table } from '../../src/types/schema';

const f = (id: string, name: string, extra: Partial<Field> = {}): Field => ({
  id, name, type: 'text', nullable: true, unique: false, isPK: false, isFK: false, ...extra,
});
const t = (id: string, name: string, fields: Field[], x = 0): Table => ({
  id, name, fields, position: { x, y: 0 }, accentColor: 'blue',
});

describe('applyOperations', () => {
  it('keeps tables that share a name (regression: a name-keyed map deleted them)', () => {
    const tables = [t('a', 'new_table', [f('a1', 'id')]), t('b', 'new_table', [f('b1', 'id')]), t('c', 'new_table', [f('c1', 'id')])];
    const out = applyOperations(tables, [], [{ action: 'add_table', tableName: 'comments', newFields: [{ name: 'id', type: 'uuid' }] }])!;
    expect(out.tables).toHaveLength(4);
    expect(out.tables.filter((x) => x.name === 'new_table')).toHaveLength(3);
  });

  it('does not mutate its inputs (they are shared with the undo history)', () => {
    const field = f('f1', 'email', { type: 'text' });
    const tables = [t('t1', 'users', [field])];
    const snapshot = JSON.stringify(tables);
    const out = applyOperations(tables, [], [{ action: 'modify_field', tableName: 'users', fieldName: 'email', fieldUpdates: { type: 'varchar' } }])!;
    expect(JSON.stringify(tables)).toBe(snapshot);
    expect(field.type).toBe('text');
    expect(out.tables[0].fields[0].type).toBe('varchar');
  });

  it('never lets an update overwrite a field id', () => {
    const tables = [t('t1', 'users', [f('f1', 'email')])];
    const out = applyOperations(tables, [], [{ action: 'modify_field', tableName: 'users', fieldName: 'email', fieldUpdates: { id: 'evil', nullable: false } }])!;
    expect(out.tables[0].fields[0].id).toBe('f1');
    expect(out.tables[0].fields[0].nullable).toBe(false);
  });

  it('removing a field also removes relationships that used it', () => {
    const tables = [t('u', 'users', [f('uid', 'id')]), t('p', 'posts', [f('pid', 'id'), f('puid', 'user_id', { isFK: true })])];
    const rels: Relationship[] = [{ id: 'r', sourceTableId: 'p', sourceFieldId: 'puid', targetTableId: 'u', targetFieldId: 'uid', cardinality: 'one-to-many' }];
    const out = applyOperations(tables, rels, [{ action: 'remove_field', tableName: 'posts', fieldName: 'user_id' }])!;
    expect(out.relationships).toHaveLength(0);
  });

  it('removing a table removes its relationships', () => {
    const tables = [t('u', 'users', [f('uid', 'id')]), t('p', 'posts', [f('puid', 'user_id')])];
    const rels: Relationship[] = [{ id: 'r', sourceTableId: 'p', sourceFieldId: 'puid', targetTableId: 'u', targetFieldId: 'uid', cardinality: 'one-to-many' }];
    const out = applyOperations(tables, rels, [{ action: 'remove_table', tableName: 'users' }])!;
    expect(out.tables.map((x) => x.name)).toEqual(['posts']);
    expect(out.relationships).toHaveLength(0);
  });

  it('add_relationship marks the source field as a foreign key and ignores duplicates', () => {
    const tables = [t('u', 'users', [f('uid', 'id')]), t('p', 'posts', [f('puid', 'user_id')])];
    const op = { action: 'add_relationship', tableName: 'posts', fieldName: 'user_id', relationTargetTable: 'users', relationTargetField: 'id' };
    const out = applyOperations(tables, [], [op])!;
    expect(out.relationships).toHaveLength(1);
    expect(out.tables.find((x) => x.name === 'posts')!.fields[0].isFK).toBe(true);
    expect(applyOperations(out.tables, out.relationships, [op])).toBeNull();
  });

  it('places new tables to the right of existing ones and returns null when nothing changes', () => {
    const tables = [t('a', 'a', [], 500)];
    const out = applyOperations(tables, [], [{ action: 'add_table', tableName: 'b', newFields: [] }])!;
    expect(out.tables[1].position.x).toBeGreaterThan(500);
    expect(applyOperations(tables, [], [{ action: 'remove_table', tableName: 'nope' }, { action: 'add_field', tableName: 'nope', newFields: [{ name: 'x' }] }])).toBeNull();
  });
});
