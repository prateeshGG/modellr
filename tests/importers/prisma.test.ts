import { describe, it, expect } from 'vitest';
import { importPrisma, stripPrismaComments, modelNameToTableName } from '../../src/utils/importers/prisma';
import { fixture, table, field, relStrings, pks, assertIntegrity } from './helpers';

describe('prisma helpers', () => {
  it('snake_case converter handles acronyms', () => {
    expect(modelNameToTableName('HTTPLog')).toBe('http_log');
    expect(modelNameToTableName('UserProfile')).toBe('user_profile');
    expect(modelNameToTableName('User')).toBe('user');
    expect(modelNameToTableName('OrderItem2')).toBe('order_item2');
    expect(modelNameToTableName('APIKey')).toBe('api_key');
  });

  it('comment stripper leaves "//" inside strings alone', () => {
    const out = stripPrismaComments('a String @default("http://x") // gone\n/// doc\nb Int');
    expect(out).toContain('"http://x"');
    expect(out).not.toContain('gone');
    expect(out).not.toContain('doc');
  });
});

describe('importPrisma: block scanning', () => {
  it('does not truncate a model at @default("{}") or braces inside strings', () => {
    const r = importPrisma(`
model A {
  id      Int    @id
  data    Json   @default("{}")
  tpl     String @default("x } y { z")
  after   String
}
model B {
  id Int @id
}`);
    expect(r.tables.map((t) => t.name)).toEqual(['a', 'b']);
    expect(table(r, 'a').fields.map((f) => f.name)).toEqual(['id', 'data', 'tpl', 'after']);
    expect(field(r, 'a', 'data').default).toBe("'{}'");
    expect(field(r, 'a', 'tpl').default).toBe("'x } y { z'");
  });

  it('reports an error when there are no models', () => {
    const r = importPrisma('datasource db { provider = "postgresql" }');
    expect(r.tables).toHaveLength(0);
    expect(r.errors[0]).toMatch(/No model blocks/);
  });

  it('ignores datasource / generator / enum blocks as tables and never throws', () => {
    expect(() => importPrisma('model A { id Int @id ')).not.toThrow();
    const r = importPrisma('generator c { provider = "x" }\nenum E { A B }\nmodel M { id Int @id }');
    expect(r.tables).toHaveLength(1);
  });
});

describe('importPrisma: enums, defaults, attributes', () => {
  it('enum fields stay as columns typed with the enum name', () => {
    const r = importPrisma(`
enum Role { USER ADMIN }
model U {
  id   Int  @id
  role Role @default(USER)
  opt  Role?
}`);
    expect(field(r, 'u', 'role')).toMatchObject({ type: 'Role', nullable: false, default: "'USER'" });
    expect(field(r, 'u', 'opt')).toMatchObject({ type: 'Role', nullable: true });
  });

  it('default conversions', () => {
    const r = importPrisma(`
model D {
  id    Int      @id @default(autoincrement())
  big   BigInt   @default(autoincrement())
  now   DateTime @default(now())
  uid   String   @default(uuid())
  cu    String   @default(cuid())
  s     String   @default("it's")
  n     Int      @default(5)
  neg   Float    @default(-1.5)
  t     Boolean  @default(true)
  f     Boolean  @default(false)
  db    String   @default(dbgenerated("gen_random_uuid()"))
  arr   String[] @default([])
  upd   DateTime @updatedAt
}`);
    const f = (n: string) => field(r, 'd', n);
    expect(f('id')).toMatchObject({ type: 'serial', isPK: true });
    expect(f('id').default).toBeUndefined();
    expect(f('big').type).toBe('bigserial');
    expect(f('now')).toMatchObject({ type: 'timestamptz', default: 'now()' });
    expect(f('uid')).toMatchObject({ type: 'uuid', default: 'gen_random_uuid()' });
    expect(f('cu').type).toBe('text');
    expect(f('cu').default).toBeUndefined();
    expect(f('s').default).toBe("'it''s'");
    expect(f('n').default).toBe('5');
    expect(f('neg').default).toBe('-1.5');
    expect(f('t').default).toBe('TRUE');
    expect(f('f').default).toBe('FALSE');
    expect(f('db').default).toBe('gen_random_uuid()');
    expect(f('arr')).toMatchObject({ type: 'text[]', default: "'{}'" });
    expect(f('upd').default).toBeUndefined();
  });

  it('@unique, @@unique, optional (?) and native @db types', () => {
    const r = importPrisma(`
model X {
  id    Int      @id
  a     String   @unique
  b     String
  c     String
  d     String?
  e     String   @db.VarChar(64)
  p     Decimal  @db.Decimal(12, 4)
  u     String   @db.Uuid

  @@unique([b])
  @@unique([b, c])
}`);
    expect(field(r, 'x', 'a').unique).toBe(true);
    expect(field(r, 'x', 'b').unique).toBe(true);
    expect(field(r, 'x', 'c').unique).toBe(false); // composite unique not representable
    expect(field(r, 'x', 'd').nullable).toBe(true);
    expect(field(r, 'x', 'e')).toMatchObject({ type: 'varchar', length: 64 });
    expect(field(r, 'x', 'p')).toMatchObject({ type: 'decimal', precision: 12, scale: 4 });
    expect(field(r, 'x', 'u').type).toBe('uuid');
  });

  it('@@id composite primary key', () => {
    const r = importPrisma(`
model Link {
  a Int
  b Int
  c String

  @@id([a, b])
}`);
    expect(pks(table(r, 'link'))).toEqual(['a', 'b']);
    expect(field(r, 'link', 'a').nullable).toBe(false);
    expect(field(r, 'link', 'c').isPK).toBe(false);
  });

  it('@@map / @map use the mapped database names; unmapped models are snake_cased', () => {
    const r = importPrisma(`
model UserProfile {
  id        Int    @id
  firstName String @map("first_name")
  lastName  String

  @@map("user_profiles")
}
model HTTPLog { id Int @id }`);
    expect(r.tables.map((t) => t.name)).toEqual(['user_profiles', 'http_log']);
    expect(table(r, 'user_profiles').fields.map((f) => f.name)).toEqual(['id', 'first_name', 'lastName']);
  });

  it('multi-line @@index and attributes do not leak into columns', () => {
    const r = importPrisma(`
model M {
  id Int @id
  a  Int
  b  Int
  @@index([
    a,
    b
  ])
}`);
    expect(table(r, 'm').fields.map((f) => f.name)).toEqual(['id', 'a', 'b']);
    expect(r.errors).toEqual([]);
  });
});

describe('importPrisma: relations', () => {
  it('resolves the referenced field (not a hardcoded id) and sets cardinality', () => {
    const r = importPrisma(`
model User {
  id      Int      @id
  email   String   @unique
  profile Profile?
  posts   Post[]
  logs    Log[]
}
model Profile {
  id     Int  @id
  userId Int  @unique
  user   User @relation(fields: [userId], references: [id])
}
model Post {
  id     Int    @id
  author String
  user   User   @relation(fields: [author], references: [email])
}
model Log {
  uid Int @id
  user User @relation(fields: [uid], references: [id])
}`);
    expect(relStrings(r).sort()).toEqual([
      'log.uid -> user.id (one-to-one)',
      'post.author -> user.email (one-to-many)',
      'profile.userId -> user.id (one-to-one)',
    ]);
    expect(field(r, 'post', 'author').isFK).toBe(true);
    // back-relation fields are not columns
    expect(table(r, 'user').fields.map((f) => f.name)).toEqual(['id', 'email']);
    assertIntegrity(r);
  });

  it('FK column adopts the referenced column type', () => {
    const r = importPrisma(`
model A { id String @id @default(uuid()) }
model B { id Int @id @default(autoincrement())
  aId String
  a   A @relation(fields: [aId], references: [id])
}
model C { id Int @id
  bId Int
  b   B @relation(fields: [bId], references: [id])
}`);
    expect(field(r, 'b', 'aId').type).toBe('uuid');
    expect(field(r, 'c', 'bId').type).toBe('integer'); // not serial
  });

  it('composite foreign keys create one relationship per column pair', () => {
    const r = importPrisma(`
model Parent { a Int
  b Int
  @@id([a, b])
}
model Child { id Int @id
  pa Int
  pb Int
  parent Parent @relation(fields: [pa, pb], references: [a, b])
}`);
    expect(relStrings(r).sort()).toEqual(['child.pa -> parent.a (one-to-many)', 'child.pb -> parent.b (one-to-many)']);
  });
});

describe('fixture (g): blog.prisma', () => {
  const r = importPrisma(fixture('blog.prisma'));

  it('imports 6 models, with mapped / snake_cased names', () => {
    expect(r.tables.map((t) => t.name)).toEqual(['users', 'profile', 'post', 'comment', 'http_log', 'account']);
    assertIntegrity(r);
    expect(r.errors).toEqual([]);
  });

  it('7 relationships incl. two relations to the same model and one-to-one', () => {
    expect(relStrings(r)).toEqual([
      'profile.user_id -> users.id (one-to-one)',
      'post.author_id -> users.id (one-to-many)',
      'post.reviewer_id -> users.id (one-to-many)',
      'comment.postId -> post.id (one-to-many)',
      'http_log.userEmail -> users.email (one-to-many)',
    ].filter(Boolean));
    expect(r.relationships).toHaveLength(5);
  });

  it('primary keys including @@id', () => {
    expect(pks(table(r, 'users'))).toEqual(['id']);
    expect(pks(table(r, 'comment'))).toEqual(['postId', 'seq']);
    expect(pks(table(r, 'post'))).toEqual(['id']);
    expect(pks(table(r, 'account'))).toEqual(['accountId']);
  });

  it('field details', () => {
    expect(field(r, 'users', 'id').type).toBe('serial');
    expect(field(r, 'users', 'id').default).toBeUndefined();
    expect(field(r, 'users', 'email')).toMatchObject({ type: 'varchar', length: 255, unique: true });
    expect(field(r, 'users', 'role')).toMatchObject({ type: 'role', default: "'USER'" }); // enum @@map("role")
    expect(field(r, 'users', 'settings')).toMatchObject({ type: 'jsonb', default: "'{}'" });
    expect(field(r, 'users', 'bio').default).toBe("'a {brace} } here'");
    expect(field(r, 'users', 'created_at')).toMatchObject({ default: 'now()' }); // @map
    expect(field(r, 'users', 'tags').type).toBe('text[]');
    expect(field(r, 'post', 'id')).toMatchObject({ type: 'uuid', default: 'gen_random_uuid()' });
    expect(field(r, 'post', 'status')).toMatchObject({ type: 'PostStatus', default: "'DRAFT'" });
    expect(field(r, 'post', 'price')).toMatchObject({ type: 'decimal', precision: 10, scale: 2 });
    expect(field(r, 'post', 'slug').default).toBe('lower(gen_random_uuid()::text)');
    expect(field(r, 'post', 'reviewer_id')).toMatchObject({ nullable: true, isFK: true });
    expect(field(r, 'comment', 'postId').type).toBe('uuid');
    expect(field(r, 'account', 'login').unique).toBe(true); // @@unique([login])
    expect(field(r, 'account', 'accountId').default).toBeUndefined(); // cuid()
    // relation / back-relation fields never become columns
    expect(table(r, 'post').fields.map((f) => f.name)).toEqual(
      ['id', 'title', 'status', 'price', 'slug', 'author_id', 'reviewer_id']
    );
    expect(table(r, 'users').fields.map((f) => f.name)).not.toContain('posts');
  });
});
