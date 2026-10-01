import { describe, it, expect } from 'vitest';
import { importSQL, stripComments, splitStatements } from '../../src/utils/importers/sql';
import { fixture, table, field, relStrings, pks, assertIntegrity } from './helpers';

describe('stripComments / splitStatements', () => {
  it('keeps -- and /* inside string literals, strips real comments', () => {
    const sql = "SELECT 'http://x--y', 'a /* b */ c'; -- real\n/* block */ SELECT \"we--ird\", `ba--ck`;";
    const out = stripComments(sql);
    expect(out).toContain("'http://x--y'");
    expect(out).toContain("'a /* b */ c'");
    expect(out).toContain('"we--ird"');
    expect(out).toContain('`ba--ck`');
    expect(out).not.toContain('real');
    expect(out).not.toContain('block');
  });

  it("handles '' escapes and dollar quoting", () => {
    const sql = "SELECT 'it''s -- fine'; SELECT $$ -- not a comment; ' $$; SELECT $f$ /* x */ $f$; -- gone";
    const out = stripComments(sql);
    expect(out).toContain("'it''s -- fine'");
    expect(out).toContain('$$ -- not a comment; \' $$');
    expect(out).toContain('$f$ /* x */ $f$');
    expect(out).not.toContain('gone');
  });

  it('splits on ; outside quotes and dollar-quotes, and honours DELIMITER', () => {
    const stmts = splitStatements("A 'x;y'; B $$ ; $$; C \"a;b\";");
    expect(stmts).toEqual(["A 'x;y'", 'B $$ ; $$', 'C "a;b"']);
    const my = splitStatements('DELIMITER ;;\nCREATE TRIGGER t BEGIN SET a=1; END ;;\nDELIMITER ;\nSELECT 1;');
    expect(my).toEqual(['CREATE TRIGGER t BEGIN SET a=1; END', 'SELECT 1']);
  });
});

describe('importSQL: robustness (defects 5 & 6)', () => {
  it('a `--` inside a string default does not break the import', () => {
    const r = importSQL("CREATE TABLE a (id int PRIMARY KEY, url text DEFAULT 'http://x--y'); -- trailing");
    expect(r.tables).toHaveLength(1);
    expect(field(r, 'a', 'url').default).toBe("'http://x--y'");
  });

  it('one unsupported statement does not fail the import', () => {
    const r = importSQL(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      SET search_path = public;
      CREATE FUNCTION f() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;
      CREATE TABLE a (id int PRIMARY KEY);
      CREATE VIEW v AS SELECT 1;
      GRANT ALL ON a TO bob;
      INSERT INTO a VALUES (1);
      CREATE TABLE b (id int PRIMARY KEY, a_id int REFERENCES a(id));
    `);
    expect(r.tables.map((t) => t.name)).toEqual(['a', 'b']);
    expect(r.relationships).toHaveLength(1);
    expect(r.errors.join('\n')).toMatch(/Ignored \d+ non-table statement/);
  });

  it('a malformed CREATE TABLE becomes a warning, the others still import', () => {
    const r = importSQL('CREATE TABLE broken AS SELECT 1; CREATE TABLE ok (id int);');
    expect(r.tables.map((t) => t.name)).toEqual(['ok']);
    expect(r.errors.some((e) => /broken|unsupported/i.test(e))).toBe(true);
  });

  it('empty / table-less input reports an error and no tables', () => {
    expect(importSQL('   ').errors).toEqual(['No SQL content found.']);
    const r = importSQL('SET x = 1;');
    expect(r.tables).toHaveLength(0);
    expect(r.errors[0]).toMatch(/No CREATE TABLE/);
  });

  it('never throws on garbage', () => {
    expect(() => importSQL("CREATE TABLE ( ((( 'unterminated")).not.toThrow();
    expect(() => importSQL('CREATE TABLE t (a int, , b)')).not.toThrow();
  });
});

describe('importSQL: foreign keys & primary keys (defects 1, 2, 9)', () => {
  it('table-level FOREIGN KEY and inline REFERENCES', () => {
    const r = importSQL(`
      CREATE TABLE users (id uuid PRIMARY KEY);
      CREATE TABLE orgs (id uuid PRIMARY KEY);
      CREATE TABLE t (
        id uuid PRIMARY KEY,
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        org_id uuid NOT NULL,
        other uuid REFERENCES orgs,
        FOREIGN KEY (org_id) REFERENCES orgs (id)
      );`);
    expect(relStrings(r).sort()).toEqual([
      't.org_id -> orgs.id (one-to-many)',
      't.other -> orgs.id (one-to-many)',
      't.user_id -> users.id (one-to-many)',
    ]);
    expect(field(r, 't', 'user_id').isFK).toBe(true);
    expect(field(r, 't', 'org_id').isFK).toBe(true);
    assertIntegrity(r);
  });

  it('ALTER TABLE ADD [CONSTRAINT] FOREIGN KEY and ALTER TABLE ONLY ... PRIMARY KEY', () => {
    const r = importSQL(`
      CREATE TABLE a (id int NOT NULL, code text);
      CREATE TABLE b (id int NOT NULL, a_id int, a2_id int);
      ALTER TABLE ONLY a ADD CONSTRAINT a_pkey PRIMARY KEY (id);
      ALTER TABLE b ADD PRIMARY KEY (id);
      ALTER TABLE ONLY public.b ADD CONSTRAINT b_a FOREIGN KEY (a_id) REFERENCES public.a(id);
      ALTER TABLE b ADD FOREIGN KEY (a2_id) REFERENCES a (id) ON DELETE SET NULL;
    `);
    expect(pks(table(r, 'a'))).toEqual(['id']);
    expect(pks(table(r, 'b'))).toEqual(['id']);
    expect(relStrings(r).sort()).toEqual(['b.a2_id -> a.id (one-to-many)', 'b.a_id -> a.id (one-to-many)']);
  });

  it('composite PRIMARY KEY, MySQL PRIMARY KEY(`id`) and UNIQUE variants', () => {
    const r = importSQL(`
      CREATE TABLE \`m\` (\`id\` int NOT NULL, \`a\` int, \`b\` int, \`c\` int, \`d\` int,
        PRIMARY KEY(\`id\`), UNIQUE KEY \`u1\` (\`a\`), UNIQUE (\`b\`, \`c\`), UNIQUE INDEX u2 (\`d\`));
      CREATE TABLE link (x int, y int, PRIMARY KEY (x, y));`);
    expect(pks(table(r, 'm'))).toEqual(['id']);
    expect(pks(table(r, 'link'))).toEqual(['x', 'y']);
    expect(field(r, 'link', 'x').nullable).toBe(false);
    expect(field(r, 'm', 'a').unique).toBe(true);
    expect(field(r, 'm', 'd').unique).toBe(true);
    // composite unique is not representable
    expect(field(r, 'm', 'b').unique).toBe(false);
    expect(field(r, 'm', 'c').unique).toBe(false);
  });

  it('cardinality: UNIQUE or sole-PK FK column => one-to-one, otherwise one-to-many', () => {
    const r = importSQL(`
      CREATE TABLE u (id int PRIMARY KEY);
      CREATE TABLE prof (user_id int PRIMARY KEY REFERENCES u(id));
      CREATE TABLE prof2 (id int PRIMARY KEY, user_id int UNIQUE REFERENCES u(id));
      CREATE TABLE post (id int PRIMARY KEY, user_id int REFERENCES u(id));
      CREATE TABLE tag_link (post_id int REFERENCES post(id), tag_id int REFERENCES u(id), PRIMARY KEY (post_id, tag_id));
    `);
    expect(relStrings(r).sort()).toEqual([
      'post.user_id -> u.id (one-to-many)',
      'prof.user_id -> u.id (one-to-one)',
      'prof2.user_id -> u.id (one-to-one)',
      'tag_link.post_id -> post.id (one-to-many)',
      'tag_link.tag_id -> u.id (one-to-many)',
    ]);
  });

  it('FK without referenced column resolves to the target primary key; forward references work', () => {
    const r = importSQL(`
      CREATE TABLE child (id int PRIMARY KEY, parent_id int REFERENCES parent);
      CREATE TABLE parent (pid int PRIMARY KEY);`);
    expect(relStrings(r)).toEqual(['child.parent_id -> parent.pid (one-to-many)']);
  });

  it('FK to an unknown table is a warning, not a relationship', () => {
    const r = importSQL('CREATE TABLE t (id int PRIMARY KEY, x int REFERENCES nowhere(id));');
    expect(r.relationships).toHaveLength(0);
    expect(field(r, 't', 'x').isFK).toBe(false);
    expect(r.errors.join(' ')).toMatch(/nowhere/);
  });

  it('same FK declared twice is imported once', () => {
    const r = importSQL(`
      CREATE TABLE a (id int PRIMARY KEY);
      CREATE TABLE b (id int PRIMARY KEY, a_id int REFERENCES a(id));
      ALTER TABLE b ADD CONSTRAINT dup FOREIGN KEY (a_id) REFERENCES a(id);`);
    expect(r.relationships).toHaveLength(1);
  });
});

describe('importSQL: defaults (defect 3)', () => {
  const r = importSQL(`
    CREATE TABLE d (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      id2 uuid DEFAULT uuid_generate_v4(),
      created timestamptz NOT NULL DEFAULT now(),
      created2 timestamp DEFAULT CURRENT_TIMESTAMP,
      status varchar(20) DEFAULT 'active',
      quoted text DEFAULT 'it''s',
      typed varchar DEFAULT 'x'::character varying,
      num int DEFAULT 42,
      neg int DEFAULT -1,
      price numeric(10,2) DEFAULT 0.00,
      flag boolean DEFAULT false,
      nul text DEFAULT NULL,
      j jsonb DEFAULT '{}'::jsonb NOT NULL,
      later timestamptz DEFAULT now() + interval '1 day',
      wrapped int DEFAULT (5),
      concat text DEFAULT 'a' || 'b'
    );`);
  const def = (n: string) => field(r, 'd', n).default;

  it('function defaults are preserved verbatim', () => {
    expect(def('id')).toBe('gen_random_uuid()');
    expect(def('id2')).toBe('uuid_generate_v4()');
    expect(def('created')).toBe('now()');
    expect(def('created2')).toBe('CURRENT_TIMESTAMP');
    expect(def('later')).toBe("now() + interval '1 day'");
  });

  it('string literals keep their quotes (valid on re-export)', () => {
    expect(def('status')).toBe("'active'");
    expect(def('quoted')).toBe("'it''s'");
    expect(def('typed')).toBe("'x'");
    expect(def('j')).toBe("'{}'");
    expect(def('concat')).toBe("'a' || 'b'");
  });

  it('numbers / booleans / NULL', () => {
    expect(def('num')).toBe('42');
    expect(def('neg')).toBe('-1');
    expect(def('price')).toBe('0.00');
    expect(def('flag')).toBe('false');
    expect(def('wrapped')).toBe('5');
    expect(def('nul')).toBeUndefined();
  });

  it('constraints after a default are still parsed', () => {
    expect(field(r, 'd', 'j').nullable).toBe(false);
    expect(field(r, 'd', 'created').nullable).toBe(false);
  });

  it('MySQL quoted numbers are unquoted for numeric / boolean columns', () => {
    const m = importSQL("CREATE TABLE `x` (`a` int DEFAULT '1', `b` decimal(5,2) DEFAULT '0.00', `c` tinyint(1) DEFAULT '0', `d` varchar(3) DEFAULT '7') ENGINE=InnoDB;");
    expect(field(m, 'x', 'a').default).toBe('1');
    expect(field(m, 'x', 'b').default).toBe('0.00');
    expect(field(m, 'x', 'c').default).toBe('FALSE');
    expect(field(m, 'x', 'd').default).toBe("'7'");
  });
});

describe('importSQL: types (defect 4, 8)', () => {
  const r = importSQL(`
    CREATE TYPE status AS ENUM ('a', 'b');
    CREATE TABLE t (
      a varchar(255), b numeric(10,2), c char(3), d decimal(8), e numeric,
      f timestamp with time zone, g timestamp(3) without time zone, h double precision,
      i character varying(50), j text[], k int4, l bigint, m status, n public.status NOT NULL,
      o time with time zone, p float8
    );`);
  const f = (n: string) => field(r, 't', n);

  it('length / precision / scale are populated', () => {
    expect(f('a')).toMatchObject({ type: 'varchar', length: 255 });
    expect(f('b')).toMatchObject({ type: 'numeric', precision: 10, scale: 2 });
    expect(f('c')).toMatchObject({ type: 'char', length: 3 });
    expect(f('d')).toMatchObject({ type: 'decimal', precision: 8 });
    expect(f('d').scale).toBeUndefined();
    expect(f('e').precision).toBeUndefined();
    expect(f('i')).toMatchObject({ type: 'varchar', length: 50 });
  });

  it('timestamptz / double precision stay distinct types', () => {
    expect(f('f').type).toBe('timestamptz');
    expect(f('g').type).toBe('timestamp');
    expect(f('h').type).toBe('double precision');
    expect(f('o').type).toBe('timetz');
    expect(f('p').type).toBe('double precision');
    expect(f('k').type).toBe('integer');
    expect(f('j').type).toBe('text[]');
  });

  it('enum-typed columns keep the enum name; enum creation is reported', () => {
    expect(f('m').type).toBe('status');
    expect(f('n')).toMatchObject({ type: 'status', nullable: false });
    expect(r.errors.join(' ')).toMatch(/1 enum type/);
  });
});

describe('importSQL: identity / auto increment', () => {
  it('serial / identity / AUTO_INCREMENT / AUTOINCREMENT / nextval all map to serial types with no default', () => {
    const r = importSQL(`
      CREATE TABLE t (
        a serial PRIMARY KEY,
        b integer GENERATED ALWAYS AS IDENTITY,
        c bigint GENERATED BY DEFAULT AS IDENTITY (START WITH 10) PRIMARY KEY,
        d int NOT NULL AUTO_INCREMENT,
        e integer PRIMARY KEY AUTOINCREMENT,
        f int IDENTITY(1,1),
        g integer DEFAULT nextval('t_g_seq'::regclass),
        h int
      );`);
    const t = (n: string) => field(r, 't', n);
    expect(t('a').type).toBe('serial');
    expect(t('b')).toMatchObject({ type: 'serial', default: undefined });
    expect(t('c').type).toBe('bigserial');
    expect(t('d').type).toBe('serial');
    expect(t('e').type).toBe('serial');
    expect(t('f').type).toBe('serial');
    expect(t('g')).toMatchObject({ type: 'serial', default: undefined });
    expect(t('h').type).toBe('int');
  });
});

describe('importSQL: schema-qualified names (defect 7)', () => {
  it('a.users and b.users do not collide', () => {
    const r = importSQL(`
      CREATE TABLE a.users (id int PRIMARY KEY);
      CREATE TABLE b.users (id int PRIMARY KEY, a_user int REFERENCES a.users(id));
      CREATE TABLE b.posts (id int PRIMARY KEY, u int REFERENCES b.users(id));`);
    expect(r.tables.map((t) => t.name)).toEqual(['a.users', 'b.users', 'posts']);
    expect(relStrings(r).sort()).toEqual(['b.users.a_user -> a.users.id (one-to-many)', 'posts.u -> b.users.id (one-to-many)']);
  });

  it('public. is dropped from display names, but kept distinct on collision', () => {
    const r = importSQL(`
      CREATE TABLE public.users (id int PRIMARY KEY);
      CREATE TABLE audit.users (id int PRIMARY KEY, who int REFERENCES public.users(id));
      CREATE TABLE IF NOT EXISTS "public"."orders" (id int PRIMARY KEY, u int REFERENCES users(id));`);
    expect(r.tables.map((t) => t.name)).toEqual(['users', 'audit.users', 'orders']);
    expect(relStrings(r).sort()).toEqual(['audit.users.who -> users.id (one-to-many)', 'orders.u -> users.id (one-to-many)']);
  });

  it('duplicate CREATE TABLE of the same name is warned about, not duplicated', () => {
    const r = importSQL('CREATE TABLE t (a int); CREATE TABLE t (b int);');
    expect(r.tables).toHaveLength(1);
    expect(r.errors.join(' ')).toMatch(/Duplicate/);
  });
});

describe('fixture (a): pg_dump', () => {
  const r = importSQL(fixture('pg_dump.sql'));

  it('imports every table once, including the schema-qualified duplicate', () => {
    expect(r.tables.map((t) => t.name)).toEqual(['users', 'orders', 'order_items', 'profiles', 'audit.users']);
    assertIntegrity(r);
  });

  it('primary keys: single, composite, via ALTER TABLE ONLY', () => {
    expect(pks(table(r, 'users'))).toEqual(['id']);
    expect(pks(table(r, 'orders'))).toEqual(['id']);
    expect(pks(table(r, 'order_items'))).toEqual(['order_id', 'line_no']);
    expect(pks(table(r, 'profiles'))).toEqual(['id']);
    expect(pks(table(r, 'audit.users'))).toEqual(['id']);
  });

  it('relationships from ALTER TABLE ONLY ... FOREIGN KEY, with cardinality', () => {
    expect(relStrings(r)).toEqual([
      'orders.user_id -> users.id (one-to-many)',
      'order_items.order_id -> orders.id (one-to-many)',
      'profiles.user_id -> users.id (one-to-one)',
      'audit.users.actor_id -> users.id (one-to-many)',
    ]);
    expect(field(r, 'orders', 'user_id').isFK).toBe(true);
  });

  it('column details', () => {
    expect(field(r, 'users', 'id')).toMatchObject({ type: 'serial', default: undefined, nullable: false, isPK: true });
    expect(field(r, 'users', 'email')).toMatchObject({ type: 'varchar', length: 255, unique: true, nullable: false });
    expect(field(r, 'users', 'display_name').default).toBe("'anonymous'");
    expect(field(r, 'users', 'status').default).toBe("'active'");
    expect(field(r, 'users', 'website').default).toBe("'http://x--y.example/a;b'");
    expect(field(r, 'users', 'balance')).toMatchObject({ type: 'numeric', precision: 10, scale: 2, default: '0.00' });
    expect(field(r, 'users', 'created_at')).toMatchObject({ type: 'timestamptz', default: 'now()' });
    expect(field(r, 'users', 'updated_at')).toMatchObject({ type: 'timestamp', default: 'CURRENT_TIMESTAMP' });
    expect(field(r, 'users', 'public_id')).toMatchObject({ type: 'uuid', default: 'gen_random_uuid()' });
    expect(field(r, 'users', 'legacy_id').default).toBe('public.uuid_generate_v4()');
    expect(field(r, 'users', 'meta').default).toBe("'{}'");
    expect(field(r, 'users', 'tags')).toMatchObject({ type: 'text[]', default: 'ARRAY[]::text[]' });
    expect(field(r, 'orders', 'status')).toMatchObject({ type: 'order_status', default: "'pending'" });
    expect(field(r, 'orders', 'id').type).toBe('bigserial'); // ADD GENERATED ... AS IDENTITY
    expect(field(r, 'profiles', 'id')).toMatchObject({ type: 'serial', default: undefined }); // nextval()
    expect(field(r, 'order_items', 'qty')).toMatchObject({ default: '1', nullable: false });
    expect(field(r, 'order_items', 'qty').check).toBeUndefined();
  });

  it('COMMENT ON TABLE / COLUMN are applied', () => {
    expect(table(r, 'users').comment).toBe('Application users');
    expect(field(r, 'users', 'email').comment).toBe("Login e-mail; it's unique");
  });

  it('COPY data (with quotes and --) does not disturb the following statements; warnings summarise ignored statements', () => {
    expect(r.errors.join('\n')).toMatch(/COPY x1/);
    expect(r.errors.join('\n')).toMatch(/CREATE FUNCTION x1/);
    expect(r.errors.join('\n')).toMatch(/1 enum type/);
  });
});

describe('fixture (b): mysqldump', () => {
  const r = importSQL(fixture('mysqldump.sql'));

  it('tables, PKs and relationships', () => {
    expect(r.tables.map((t) => t.name)).toEqual(['customers', 'orders', 'order_lines', 'customer_profiles']);
    expect(pks(table(r, 'customers'))).toEqual(['id']);
    expect(pks(table(r, 'orders'))).toEqual(['id']);
    expect(pks(table(r, 'order_lines'))).toEqual(['order_id', 'line']);
    expect(pks(table(r, 'customer_profiles'))).toEqual(['customer_id']);
    expect(relStrings(r)).toEqual([
      'orders.customer_id -> customers.id (one-to-many)',
      'order_lines.order_id -> orders.id (one-to-many)',
      'customer_profiles.customer_id -> customers.id (one-to-one)',
    ]);
    assertIntegrity(r);
  });

  it('column details', () => {
    expect(field(r, 'customers', 'id')).toMatchObject({ type: 'serial', nullable: false, isPK: true });
    expect(field(r, 'customers', 'email')).toMatchObject({ type: 'varchar', length: 190, unique: true, nullable: false });
    expect(field(r, 'customers', 'name')).toMatchObject({ nullable: true, default: undefined });
    expect(field(r, 'customers', 'balance')).toMatchObject({ type: 'decimal', precision: 10, scale: 2, default: '0.00' });
    expect(field(r, 'customers', 'is_active')).toMatchObject({ type: 'boolean', default: 'TRUE' });
    expect(field(r, 'customers', 'kind')).toMatchObject({ type: 'enum', default: "'retail'" });
    expect(field(r, 'customers', 'created_at').default).toBe('CURRENT_TIMESTAMP');
    expect(field(r, 'customers', 'updated_at')).toMatchObject({ nullable: true, default: undefined });
    expect(field(r, 'customers', 'notes').comment).toBe("it's -- a comment; with semicolon");
    expect(table(r, 'customers').comment).toBe('Shop customers');
    expect(field(r, 'orders', 'id').type).toBe('bigserial');
    expect(field(r, 'orders', 'placed_at').default).toBe('CURRENT_TIMESTAMP(6)');
  });

  it('INSERTs, triggers with DELIMITER and /*! ... */ comments are ignored without errors', () => {
    expect(r.errors.join('\n')).toMatch(/INSERT x1/);
    expect(r.errors.join('\n')).toMatch(/CREATE TRIGGER x1/);
    expect(r.errors.every((e) => !/could not|Skipped/.test(e))).toBe(true);
  });
});

describe('fixture (c): Django / Rails style', () => {
  const r = importSQL(fixture('django_rails.sql'));

  it('imports 7 tables and 6 relationships (forward references included)', () => {
    expect(r.tables.map((t) => t.name)).toEqual([
      'auth_user', 'blog_post', 'blog_comment', 'blog_post_tags', 'blog_tag', 'accounts', 'memberships',
    ]);
    expect(relStrings(r).sort()).toEqual([
      'blog_comment.author_id -> auth_user.id (one-to-many)',
      'blog_comment.post_id -> blog_post.id (one-to-many)',
      'blog_post.author_id -> auth_user.id (one-to-many)',
      'blog_post_tags.post_id -> blog_post.id (one-to-many)',
      'blog_post_tags.tag_id -> blog_tag.id (one-to-many)',
      'memberships.account_id -> accounts.id (one-to-many)',
    ]);
    assertIntegrity(r);
  });

  it('field details', () => {
    expect(field(r, 'auth_user', 'username')).toMatchObject({ type: 'varchar', length: 150, unique: true });
    expect(field(r, 'auth_user', 'is_staff').type).toBe('boolean');
    expect(field(r, 'blog_comment', 'author_id').nullable).toBe(true);
    expect(field(r, 'blog_tag', 'name').unique).toBe(true); // CREATE UNIQUE INDEX
    expect(field(r, 'accounts', 'id').type).toBe('bigserial');
    expect(field(r, 'accounts', 'name').type).toBe('varchar');
    expect(field(r, 'accounts', 'created_at').type).toBe('timestamp');
    expect(field(r, 'memberships', 'user_id').unique).toBe(true);
  });
});

describe('fixture (d): SQLite with AUTOINCREMENT', () => {
  const r = importSQL(fixture('sqlite.sql'));

  it('tables (sqlite_sequence is skipped), PKs and FKs', () => {
    expect(r.tables.map((t) => t.name)).toEqual(['artists', 'albums', 'tracks']);
    expect(pks(table(r, 'artists'))).toEqual(['ArtistId']);
    expect(pks(table(r, 'albums'))).toEqual(['AlbumId']); // PRIMARY KEY ("AlbumId" AUTOINCREMENT)
    expect(pks(table(r, 'tracks'))).toEqual(['TrackId']);
    expect(relStrings(r)).toEqual([
      'albums.ArtistId -> artists.ArtistId (one-to-many)',
      'tracks.AlbumId -> albums.AlbumId (one-to-many)',
    ]);
  });

  it('AUTOINCREMENT => serial; defaults preserved', () => {
    expect(field(r, 'artists', 'ArtistId').type).toBe('serial');
    expect(field(r, 'albums', 'AlbumId').type).toBe('serial');
    expect(field(r, 'tracks', 'TrackId').type).toBe('serial');
    expect(field(r, 'albums', 'Title')).toMatchObject({ type: 'nvarchar', length: 160, default: "'Untitled'" });
    expect(field(r, 'albums', 'Price')).toMatchObject({ precision: 10, scale: 2, default: '9.99' });
    expect(field(r, 'albums', 'AddedAt').default).toBe("(datetime('now'))");
    expect(r.errors.every((e) => !/Skipped|could not/.test(e))).toBe(true);
  });
});

describe('fixture (e): SQL Server', () => {
  const r = importSQL(fixture('mssql.sql'));

  it('[bracket] names, IDENTITY, GO batches, schema-qualified tables', () => {
    expect(r.tables.map((t) => t.name)).toEqual(['Users', 'Orders', 'Invoices']);
    expect(pks(table(r, 'Users'))).toEqual(['Id']);
    expect(pks(table(r, 'Orders'))).toEqual(['Id']);
    expect(pks(table(r, 'Invoices'))).toEqual(['InvoiceId']);
    expect(field(r, 'Users', 'Id').type).toBe('serial');
    expect(field(r, 'Orders', 'Id').type).toBe('bigserial');
    expect(field(r, 'Invoices', 'InvoiceId').type).toBe('int');
  });

  it('WITH CHECK ADD CONSTRAINT FOREIGN KEY relationships', () => {
    expect(relStrings(r)).toEqual([
      'Orders.UserId -> Users.Id (one-to-many)',
      'Invoices.OrderId -> Orders.Id (one-to-many)',
    ]);
  });

  it('types and constraint-scripted defaults', () => {
    expect(field(r, 'Users', 'Email')).toMatchObject({ type: 'nvarchar', length: 256, unique: true, nullable: false });
    expect(field(r, 'Users', 'Bio')).toMatchObject({ type: 'nvarchar', nullable: true });
    expect(field(r, 'Users', 'Bio').length).toBeUndefined(); // (max)
    expect(field(r, 'Users', 'Balance')).toMatchObject({ type: 'decimal', precision: 18, scale: 2 });
    expect(field(r, 'Users', 'CreatedAt')).toMatchObject({ type: 'datetime2', default: '(getdate())' });
    expect(field(r, 'Users', 'IsActive')).toMatchObject({ type: 'bit', default: '1' });
    expect(field(r, 'Users', 'RowId').default).toBe('(newid())');
  });
});

describe('fixture (f): generated 200-table DDL and performance', () => {
  function generate(n: number, fksPerTable: number) {
    const parts: string[] = [];
    let expectedFks = 0;
    for (let i = 0; i < n; i++) {
      const cols = [`  id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `  name varchar(100) NOT NULL DEFAULT 'n${i}'`, `  created_at timestamptz DEFAULT now()`];
      const used = new Set<number>();
      for (let k = 0; k < fksPerTable && i > 0; k++) {
        const target = (i * 7 + k * 13) % i; // always an earlier table
        if (used.has(target)) continue;
        used.add(target);
        cols.push(`  t${target}_id uuid ${k % 2 ? 'NOT NULL ' : ''}REFERENCES tbl_${target}(id) ON DELETE CASCADE`);
        expectedFks++;
      }
      parts.push(`CREATE TABLE tbl_${i} (\n${cols.join(',\n')}\n);`);
    }
    return { sql: parts.join('\n\n'), expectedFks };
  }

  it('imports every table and every inline REFERENCES (200 tables)', () => {
    const { sql, expectedFks } = generate(200, 3);
    expect(expectedFks).toBeGreaterThan(300);
    const r = importSQL(sql);
    expect(r.tables).toHaveLength(200);
    expect(r.relationships).toHaveLength(expectedFks);
    expect(r.tables.every((t) => pks(t).length === 1)).toBe(true);
    expect(r.errors).toEqual([]);
    assertIntegrity(r);
    const fkFields = r.tables.reduce((n, t) => n + t.fields.filter((f) => f.isFK).length, 0);
    expect(fkFields).toBe(expectedFks);
  });

  it('49 inline REFERENCES give 49 relationships (benchmark regression)', () => {
    const lines = ['CREATE TABLE root (id uuid PRIMARY KEY);'];
    for (let i = 0; i < 49; i++) lines.push(`CREATE TABLE c${i} (id uuid PRIMARY KEY, root_id uuid REFERENCES root(id));`);
    expect(importSQL(lines.join('\n')).relationships).toHaveLength(49);
  });

  it('500 tables parse in under 2 seconds', () => {
    const { sql, expectedFks } = generate(500, 3);
    const t0 = performance.now();
    const r = importSQL(sql);
    const ms = performance.now() - t0;
    expect(r.tables).toHaveLength(500);
    expect(r.relationships).toHaveLength(expectedFks);
    expect(ms).toBeLessThan(2000);
  });
});

describe('re-export compatibility', () => {
  it('defaults imported from SQL can be re-emitted verbatim by the SQL exporter', async () => {
    const { exportSQL } = await import('../../src/utils/exporters/sql');
    const r = importSQL("CREATE TABLE t (id int PRIMARY KEY, s text DEFAULT 'it''s -- ok', ts timestamptz DEFAULT now());");
    const out = exportSQL(r.tables, r.relationships, 'postgres');
    expect(out).toContain("DEFAULT 'it''s -- ok'");
    expect(out).toContain('DEFAULT now()');
    // and the exported SQL can be imported again to the same thing
    const again = importSQL(out);
    expect(field(again, 't', 's').default).toBe("'it''s -- ok'");
    expect(pks(table(again, 't'))).toEqual(['id']);
  });
});
