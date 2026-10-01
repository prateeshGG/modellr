import { describe, it, expect } from 'vitest';
import { diffSchemas, diffRelationships, fieldChanged } from '../../src/utils/schemaDiff';
import { generateMigrationsSQL } from '../../src/utils/exporters/migrations';
import type { Field, Relationship, Table } from '../../src/types/schema';

const f = (name: string, extra: Partial<Field> = {}): Field => ({
  id: `f_${name}`, name, type: 'text', nullable: true, unique: false, isPK: false, isFK: false, ...extra,
});
const t = (name: string, fields: Field[]): Table => ({
  id: `t_${name}`, name, fields, position: { x: 0, y: 0 }, accentColor: 'blue',
});

describe('diffSchemas', () => {
  it('detects default-only and length changes (previously ignored)', () => {
    expect(fieldChanged(f('a'), f('a', { default: "'x'" }))).toBe(true);
    expect(fieldChanged(f('a', { type: 'varchar', length: 100 }), f('a', { type: 'varchar', length: 255 }))).toBe(true);
    expect(fieldChanged(f('a'), f('a'))).toBe(false);
  });

  it('reports added/removed/changed tables by name', () => {
    const before = { tables: [t('users', [f('id', { isPK: true })]), t('old', [f('id')])] };
    const after = { tables: [t('users', [f('id', { isPK: true }), f('email')]), t('posts', [f('id')])] };
    const diffs = diffSchemas(before, after);
    expect(diffs.filter((d) => d.kind === 'removed')).toHaveLength(1);
    expect(diffs.filter((d) => d.kind === 'added')).toHaveLength(1);
    const changed = diffs.find((d) => d.kind === 'changed') as { fields: unknown[] };
    expect(changed.fields).toHaveLength(1);
  });
});

describe('migration with foreign keys', () => {
  const users = t('users', [f('id', { isPK: true, type: 'uuid', nullable: false })]);
  const postsBefore = t('posts', [f('id', { isPK: true, type: 'uuid', nullable: false }), f('user_id', { type: 'uuid', isFK: true })]);

  const withFk = (tables: Table[]) => ({
    tables,
    relationships: [{ id: 'r1', sourceTableId: postsBefore.id, sourceFieldId: 'f_user_id', targetTableId: users.id, targetFieldId: 'f_id', cardinality: 'one-to-many' } as Relationship],
  });

  it('adds a foreign key between existing tables', () => {
    const before = { tables: [users, postsBefore], relationships: [] as Relationship[] };
    const after = withFk([users, postsBefore]);
    const sql = generateMigrationsSQL(diffSchemas(before, after), 'postgres', diffRelationships(before, after));
    expect(sql).toMatch(/ALTER TABLE "posts" ADD CONSTRAINT .*FOREIGN KEY \("user_id"\) REFERENCES "users" \("id"\)/);
  });

  it('drops a removed foreign key', () => {
    const before = withFk([users, postsBefore]);
    const after = { tables: [users, postsBefore], relationships: [] as Relationship[] };
    const sql = generateMigrationsSQL(diffSchemas(before, after), 'postgres', diffRelationships(before, after));
    expect(sql).toMatch(/ALTER TABLE "posts" DROP CONSTRAINT/);
  });

  it('creates a new table AFTER its referenced table exists and adds its FK exactly once', () => {
    const before = { tables: [users], relationships: [] as Relationship[] };
    const after = withFk([users, postsBefore]);
    const sql = generateMigrationsSQL(diffSchemas(before, after), 'postgres', diffRelationships(before, after));
    expect(sql.match(/FOREIGN KEY/g)).toHaveLength(1);
    expect(sql.indexOf('CREATE TABLE "posts"')).toBeLessThan(sql.indexOf('FOREIGN KEY'));
  });

  it('warns before dropping a table', () => {
    const before = { tables: [users, postsBefore], relationships: [] as Relationship[] };
    const after = { tables: [users], relationships: [] as Relationship[] };
    const sql = generateMigrationsSQL(diffSchemas(before, after), 'postgres', diffRelationships(before, after));
    expect(sql).toContain('-- WARNING: destructive');
    expect(sql).toContain('DROP TABLE "posts"');
  });
});
