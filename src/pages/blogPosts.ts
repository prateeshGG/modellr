// Static blog content. Plain data so BlogIndex and BlogPost can share it.

export type PostBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'code'; label: string; text: string };

export interface BlogPostData {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: 'Engineering' | 'Database';
  body: PostBlock[];
}

export const POSTS: BlogPostData[] = [
  {
    id: 'why-visual-diagrams-fail',
    title: 'Why schema diagrams go stale',
    excerpt:
      'A diagram drawn once is out of date as soon as the next migration lands. A few habits keep the picture and the real schema close together.',
    date: 'October 1, 2026',
    category: 'Engineering',
    body: [
      { type: 'p', text: 'Almost every team has a database diagram that was accurate on the day it was drawn. Then migrations arrive, columns get added, a table is split in two, and nobody updates the picture. After a few months it misleads more than it helps.' },
      { type: 'h2', text: 'Why it happens' },
      { type: 'p', text: 'The diagram and the database are maintained in two different places by two different actions. Changing the database is required to ship; updating the diagram is optional, so it loses.' },
      { type: 'h2', text: 'Habits that reduce drift' },
      { type: 'ul', items: [
        'Treat the SQL or ORM schema in your repository as the source of truth, and regenerate or re-import the diagram from it rather than editing the diagram by hand.',
        'Keep diagrams small and scoped. One diagram per area (billing, auth, content) is easier to keep current than one diagram of everything.',
        'Store a text export (SQL, DBML, Prisma or JSON) next to the code so changes to the design show up in code review.',
        'Before a big change, save a snapshot of the current design so you can compare it with the new one afterwards.',
        'Put the date on any image you paste into a wiki, so readers know how old it is.',
      ] },
      { type: 'h2', text: 'Where Modellr fits' },
      { type: 'p', text: 'Modellr can import SQL DDL or a Prisma schema, export SQL, Prisma, Drizzle, DBML and JSON, and compare the current schema with a local snapshot. It never connects to your database, so refreshing a diagram means importing the current schema again.' },
    ],
  },
  {
    id: 'prisma-vs-drizzle-schema-design',
    title: 'Prisma vs Drizzle: a schema design perspective',
    excerpt:
      'Both ORMs describe the same relational ideas in different ways. Here is what changes in how you write tables, relations and join tables.',
    date: 'October 1, 2026',
    category: 'Database',
    body: [
      { type: 'p', text: 'Prisma and Drizzle can both sit on top of the same PostgreSQL or MySQL database. The relational design is the same either way. What differs is how you write it down, and a few habits that follow from that.' },
      { type: 'h2', text: 'Where the schema lives' },
      { type: 'ul', items: [
        'Prisma uses its own schema language in a schema.prisma file. Models, fields and relations are declared there, and a client is generated from it.',
        'Drizzle declares tables in TypeScript using table builders such as pgTable or mysqlTable, so the schema is ordinary code in your project.',
      ] },
      { type: 'h2', text: 'Relations' },
      { type: 'p', text: 'In Prisma, a relation is declared with an @relation attribute on the side that holds the foreign key, and relation fields usually appear on both models. In Drizzle, a foreign key is a column that references another column, and the relation helpers used for relational queries are declared separately from the table definitions.' },
      { type: 'h2', text: 'Many-to-many' },
      { type: 'p', text: 'Prisma lets you declare a many-to-many relation implicitly and manages the join table for you, or explicitly with your own join model. With Drizzle you define the join table yourself. Defining it explicitly is also the better choice in Prisma whenever the link carries its own data, such as a created-at date or a role.' },
      { type: 'h2', text: 'A practical workflow' },
      { type: 'p', text: 'Design the relational model first: tables, primary keys, foreign keys, nullability and uniqueness. Then express it in whichever ORM you use. A tool that exports both formats from one design lets you compare the two outputs side by side. Whichever you choose, read the generated code before you rely on it.' },
    ],
  },
  {
    id: 'many-to-many-join-tables',
    title: 'Many-to-many relationships and join tables',
    excerpt:
      'A relational database models many-to-many with a third table. How to design it so duplicates are impossible and lookups stay fast in both directions.',
    date: 'October 1, 2026',
    category: 'Database',
    body: [
      { type: 'p', text: 'A post can have many tags, and a tag can belong to many posts. A single foreign key cannot express that, so you add a join table (also called a junction or link table) with one row per pairing.' },
      { type: 'code', label: 'SQL (PostgreSQL)', text: `CREATE TABLE posts (
  id    uuid PRIMARY KEY,
  title text NOT NULL
);

CREATE TABLE tags (
  id   uuid PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE post_tags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);` },
      { type: 'h2', text: 'Design points' },
      { type: 'ul', items: [
        'Use a composite primary key on the two foreign keys. It makes it impossible to link the same post and tag twice.',
        'Both columns are NOT NULL foreign keys. A link row with a missing side has no meaning.',
        'The primary key index helps lookups that start from post_id. If you also look up posts by tag, add an index starting with tag_id.',
        'Decide what should happen on delete. CASCADE on a join table usually makes sense, because the link has no meaning without both sides.',
        'If the link has its own attributes, such as a role or an added-at time, put them on the join table. At that point it is really its own entity and may deserve a descriptive name.',
      ] },
    ],
  },
  {
    id: 'reviewing-migration-sql',
    title: 'Review migration SQL before you run it',
    excerpt:
      'Generated migrations are a starting point. What to look for before running one against a database that holds real data.',
    date: 'October 1, 2026',
    category: 'Engineering',
    body: [
      { type: 'p', text: 'Any tool that compares two schemas and writes the SQL to get from one to the other is working with limited information. It sees the before and after, not your intent. That is why generated migrations should always be read before they run.' },
      { type: 'h2', text: 'What to check' },
      { type: 'ul', items: [
        'Renames. A comparison that only sees the old and new schema cannot tell a rename from a drop plus an add, so a renamed column can show up as dropping the old column and creating a new one. Run as written, that deletes the data in the column. Rewrite it as a rename.',
        'Dropped columns and tables. These are not reversible without a backup. Confirm they are really meant to go.',
        'New NOT NULL columns. On a table that already has rows, adding one without a default fails or forces a backfill. Add the column as nullable, fill it, then tighten it.',
        'Type changes. Narrowing a type or changing it to an incompatible one can fail or truncate values. Check how existing data converts.',
        'Locking and size. Some changes rewrite or lock a large table. Run them in a quiet period and know your database engine behaviour.',
      ] },
      { type: 'h2', text: 'Safe habits' },
      { type: 'ul', items: [
        'Take a backup, and try the migration on a copy of the data first.',
        'Where your database supports transactional DDL (PostgreSQL does), run the migration in a transaction. MySQL commits most DDL statements implicitly, so plan for partial application.',
        'Keep migrations in version control and review them like any other code.',
      ] },
      { type: 'h2', text: 'In Modellr' },
      { type: 'p', text: 'The diff viewer compares the current schema with a snapshot and writes migration SQL. Treat that output as a draft: renames appear as a drop plus an add, and Modellr never connects to or changes your database.' },
    ],
  },
];
