import { describe, it, expect } from 'vitest';
import { importSQL } from '../../src/utils/importers/sql';
import { importPrisma } from '../../src/utils/importers/prisma';
import { exportSQL } from '../../src/utils/exporters/sql';
import { exportPrisma } from '../../src/utils/exporters/prisma';
import { exportDBML } from '../../src/utils/exporters/dbml';
import { exportDrizzle } from '../../src/utils/exporters/drizzle';
import { fixture, relStrings, pks, assertIntegrity } from '../importers/helpers';
import type { Dialect } from '../../src/types/schema';

/** import -> export -> import must keep tables, columns, keys and relationships. */
function shape(r: ReturnType<typeof importSQL>) {
  return {
    tables: r.tables.map((t) => `${t.name}(${t.fields.map((f) => `${f.name}${f.isPK ? '*' : ''}${f.nullable ? '' : '!'}`).join(',')})`).sort(),
    rels: relStrings(r).sort(),
  };
}

describe('SQL import -> SQL export -> SQL import', () => {
  const cases: [string, string, Dialect][] = [
    ['pg_dump.sql', 'pg_dump', 'postgres'],
    ['mysqldump.sql', 'mysqldump', 'mysql'],
    ['django_rails.sql', 'django/rails', 'postgres'],
    ['sqlite.sql', 'sqlite', 'sqlite'],
    ['mssql.sql', 'mssql', 'mssql'],
  ];

  for (const [file, label, dialect] of cases) {
    it(`${label} survives a round trip`, () => {
      const first = importSQL(fixture(file));
      expect(first.tables.length).toBeGreaterThan(0);
      assertIntegrity(first);

      const sql = exportSQL(first.tables, first.relationships, dialect);
      const second = importSQL(sql);

      assertIntegrity(second);
      expect(second.tables.length).toBe(first.tables.length);
      expect(shape(second).rels).toEqual(shape(first).rels);
      expect(shape(second).tables).toEqual(shape(first).tables);
    });
  }

  it('exports every dialect from every fixture without throwing', () => {
    const dialects: Dialect[] = ['postgres', 'mysql', 'sqlite', 'mssql'];
    for (const [file] of cases) {
      const r = importSQL(fixture(file));
      for (const d of dialects) expect(() => exportSQL(r.tables, r.relationships, d)).not.toThrow();
      expect(() => exportPrisma(r.tables, r.relationships)).not.toThrow();
      expect(() => exportDrizzle(r.tables, r.relationships)).not.toThrow();
      expect(() => exportDBML(r.tables, r.relationships)).not.toThrow();
    }
  });
});

describe('Prisma import -> Prisma export -> Prisma import', () => {
  it('keeps models, keys and relations', () => {
    const first = importPrisma(fixture('blog.prisma'));
    assertIntegrity(first);
    const out = exportPrisma(first.tables, first.relationships);
    const second = importPrisma(out);
    assertIntegrity(second);
    expect(second.tables.length).toBe(first.tables.length);
    expect(relStrings(second).sort()).toEqual(relStrings(first).sort());
    for (const t of first.tables) {
      const again = second.tables.find((x) => x.name === t.name);
      expect(again, `table ${t.name}`).toBeTruthy();
      expect(pks(again!)).toEqual(pks(t));
    }
  });
});
