import { nanoid } from '../store/nanoid';
import type { Table, Relationship } from '../types/schema';

interface Template {
  label: string;
  description: string;
  tables: Table[];
  relationships: Relationship[];
}

function t(name: string, accent: Table['accentColor'], fields: Omit<Table['fields'][0], 'id'>[]): Table {
  return {
    id: nanoid(),
    name,
    accentColor: accent,
    position: { x: 0, y: 0 },
    fields: fields.map((f) => ({ ...f, id: nanoid() })),
  };
}

// ── Blog ───────────────────────────────────────────
const blogUsers = t('users', 'blue', [
  { name: 'id', type: 'bigserial', nullable: false, unique: true, isPK: true, isFK: false },
  { name: 'email', type: 'varchar', nullable: false, unique: true, isPK: false, isFK: false },
  { name: 'name', type: 'text', nullable: true, unique: false, isPK: false, isFK: false },
  { name: 'created_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const blogPosts = t('posts', 'teal', [
  { name: 'id', type: 'bigserial', nullable: false, unique: true, isPK: true, isFK: false },
  { name: 'author_id', type: 'bigint', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'title', type: 'text', nullable: false, unique: false, isPK: false, isFK: false },
  { name: 'slug', type: 'varchar', nullable: false, unique: true, isPK: false, isFK: false },
  { name: 'body', type: 'text', nullable: true, unique: false, isPK: false, isFK: false },
  { name: 'published_at', type: 'timestamptz', nullable: true, unique: false, isPK: false, isFK: false },
  { name: 'created_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const blogComments = t('comments', 'coral', [
  { name: 'id', type: 'bigserial', nullable: false, unique: true, isPK: true, isFK: false },
  { name: 'post_id', type: 'bigint', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'author_id', type: 'bigint', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'body', type: 'text', nullable: false, unique: false, isPK: false, isFK: false },
  { name: 'created_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const blogTags = t('tags', 'purple', [
  { name: 'id', type: 'bigserial', nullable: false, unique: true, isPK: true, isFK: false },
  { name: 'name', type: 'varchar', nullable: false, unique: true, isPK: false, isFK: false },
]);
const blogPostTags = t('post_tags', 'amber', [
  { name: 'post_id', type: 'bigint', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'tag_id', type: 'bigint', nullable: false, unique: false, isPK: false, isFK: true },
]);

// Layout positions
blogUsers.position = { x: 80, y: 80 };
blogPosts.position = { x: 360, y: 80 };
blogComments.position = { x: 360, y: 340 };
blogTags.position = { x: 700, y: 80 };
blogPostTags.position = { x: 700, y: 280 };

const blogRels: Relationship[] = [
  { id: nanoid(), sourceTableId: blogPosts.id, sourceFieldId: blogPosts.fields[1].id, targetTableId: blogUsers.id, targetFieldId: blogUsers.fields[0].id, cardinality: 'one-to-many' },
  { id: nanoid(), sourceTableId: blogComments.id, sourceFieldId: blogComments.fields[1].id, targetTableId: blogPosts.id, targetFieldId: blogPosts.fields[0].id, cardinality: 'one-to-many' },
  { id: nanoid(), sourceTableId: blogComments.id, sourceFieldId: blogComments.fields[2].id, targetTableId: blogUsers.id, targetFieldId: blogUsers.fields[0].id, cardinality: 'one-to-many' },
  { id: nanoid(), sourceTableId: blogPostTags.id, sourceFieldId: blogPostTags.fields[0].id, targetTableId: blogPosts.id, targetFieldId: blogPosts.fields[0].id, cardinality: 'one-to-many' },
  { id: nanoid(), sourceTableId: blogPostTags.id, sourceFieldId: blogPostTags.fields[1].id, targetTableId: blogTags.id, targetFieldId: blogTags.fields[0].id, cardinality: 'one-to-many' },
];

// ── E-commerce ─────────────────────────────────────
const eUsers = t('users', 'blue', [
  { name: 'id', type: 'bigserial', nullable: false, unique: true, isPK: true, isFK: false },
  { name: 'email', type: 'varchar', nullable: false, unique: true, isPK: false, isFK: false },
  { name: 'name', type: 'text', nullable: true, unique: false, isPK: false, isFK: false },
  { name: 'created_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const eProducts = t('products', 'teal', [
  { name: 'id', type: 'bigserial', nullable: false, unique: true, isPK: true, isFK: false },
  { name: 'name', type: 'text', nullable: false, unique: false, isPK: false, isFK: false },
  { name: 'price', type: 'numeric', nullable: false, unique: false, isPK: false, isFK: false },
  { name: 'stock', type: 'integer', nullable: false, unique: false, isPK: false, isFK: false, default: '0' },
  { name: 'created_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const eOrders = t('orders', 'coral', [
  { name: 'id', type: 'bigserial', nullable: false, unique: true, isPK: true, isFK: false },
  { name: 'user_id', type: 'bigint', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'total', type: 'numeric', nullable: false, unique: false, isPK: false, isFK: false },
  { name: 'status', type: 'varchar', nullable: false, unique: false, isPK: false, isFK: false, default: "'pending'" },
  { name: 'created_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const eOrderItems = t('order_items', 'amber', [
  { name: 'id', type: 'bigserial', nullable: false, unique: true, isPK: true, isFK: false },
  { name: 'order_id', type: 'bigint', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'product_id', type: 'bigint', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'quantity', type: 'integer', nullable: false, unique: false, isPK: false, isFK: false },
  { name: 'unit_price', type: 'numeric', nullable: false, unique: false, isPK: false, isFK: false },
]);

eUsers.position = { x: 80, y: 80 };
eProducts.position = { x: 380, y: 320 };
eOrders.position = { x: 380, y: 80 };
eOrderItems.position = { x: 680, y: 200 };

const eRels: Relationship[] = [
  { id: nanoid(), sourceTableId: eOrders.id, sourceFieldId: eOrders.fields[1].id, targetTableId: eUsers.id, targetFieldId: eUsers.fields[0].id, cardinality: 'one-to-many' },
  { id: nanoid(), sourceTableId: eOrderItems.id, sourceFieldId: eOrderItems.fields[1].id, targetTableId: eOrders.id, targetFieldId: eOrders.fields[0].id, cardinality: 'one-to-many' },
  { id: nanoid(), sourceTableId: eOrderItems.id, sourceFieldId: eOrderItems.fields[2].id, targetTableId: eProducts.id, targetFieldId: eProducts.fields[0].id, cardinality: 'one-to-many' },
];

// ── Auth & Users ───────────────────────────────────
const authUsers = t('users', 'blue', [
  { name: 'id', type: 'uuid', nullable: false, unique: true, isPK: true, isFK: false, default: 'gen_random_uuid()' },
  { name: 'email', type: 'varchar', nullable: false, unique: true, isPK: false, isFK: false },
  { name: 'email_verified_at', type: 'timestamptz', nullable: true, unique: false, isPK: false, isFK: false },
  { name: 'created_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const authSessions = t('sessions', 'teal', [
  { name: 'id', type: 'uuid', nullable: false, unique: true, isPK: true, isFK: false, default: 'gen_random_uuid()' },
  { name: 'user_id', type: 'uuid', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'token_hash', type: 'text', nullable: false, unique: true, isPK: false, isFK: false },
  { name: 'expires_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false },
  { name: 'created_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const authProfiles = t('profiles', 'purple', [
  { name: 'user_id', type: 'uuid', nullable: false, unique: true, isPK: true, isFK: true },
  { name: 'display_name', type: 'text', nullable: true, unique: false, isPK: false, isFK: false },
  { name: 'avatar_url', type: 'text', nullable: true, unique: false, isPK: false, isFK: false },
  { name: 'bio', type: 'text', nullable: true, unique: false, isPK: false, isFK: false },
  { name: 'updated_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);

authUsers.position = { x: 80, y: 160 };
authSessions.position = { x: 400, y: 80 };
authProfiles.position = { x: 400, y: 300 };

const authRels: Relationship[] = [
  { id: nanoid(), sourceTableId: authSessions.id, sourceFieldId: authSessions.fields[1].id, targetTableId: authUsers.id, targetFieldId: authUsers.fields[0].id, cardinality: 'one-to-many' },
  { id: nanoid(), sourceTableId: authProfiles.id, sourceFieldId: authProfiles.fields[0].id, targetTableId: authUsers.id, targetFieldId: authUsers.fields[0].id, cardinality: 'one-to-one' },
];

// ── Multi-tenant SaaS ──────────────────────────────
const stOrgs = t('organizations', 'blue', [
  { name: 'id', type: 'uuid', nullable: false, unique: true, isPK: true, isFK: false, default: 'gen_random_uuid()' },
  { name: 'name', type: 'text', nullable: false, unique: false, isPK: false, isFK: false },
  { name: 'slug', type: 'varchar', nullable: false, unique: true, isPK: false, isFK: false },
  { name: 'plan', type: 'varchar', nullable: false, unique: false, isPK: false, isFK: false, default: "'free'" },
  { name: 'created_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const stUsers = t('users', 'teal', [
  { name: 'id', type: 'uuid', nullable: false, unique: true, isPK: true, isFK: false, default: 'gen_random_uuid()' },
  { name: 'email', type: 'varchar', nullable: false, unique: true, isPK: false, isFK: false },
  { name: 'created_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const stMembers = t('members', 'coral', [
  { name: 'org_id', type: 'uuid', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'user_id', type: 'uuid', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'role', type: 'varchar', nullable: false, unique: false, isPK: false, isFK: false, default: "'member'" },
  { name: 'joined_at', type: 'timestamptz', nullable: false, unique: false, isPK: false, isFK: false, default: 'now()' },
]);
const stSubscriptions = t('subscriptions', 'purple', [
  { name: 'id', type: 'uuid', nullable: false, unique: true, isPK: true, isFK: false, default: 'gen_random_uuid()' },
  { name: 'org_id', type: 'uuid', nullable: false, unique: false, isPK: false, isFK: true },
  { name: 'plan', type: 'varchar', nullable: false, unique: false, isPK: false, isFK: false },
  { name: 'status', type: 'varchar', nullable: false, unique: false, isPK: false, isFK: false },
  { name: 'current_period_end', type: 'timestamptz', nullable: true, unique: false, isPK: false, isFK: false },
]);

stOrgs.position = { x: 80, y: 80 };
stUsers.position = { x: 80, y: 360 };
stMembers.position = { x: 400, y: 200 };
stSubscriptions.position = { x: 700, y: 80 };

const stRels: Relationship[] = [
  { id: nanoid(), sourceTableId: stMembers.id, sourceFieldId: stMembers.fields[0].id, targetTableId: stOrgs.id, targetFieldId: stOrgs.fields[0].id, cardinality: 'one-to-many' },
  { id: nanoid(), sourceTableId: stMembers.id, sourceFieldId: stMembers.fields[1].id, targetTableId: stUsers.id, targetFieldId: stUsers.fields[0].id, cardinality: 'one-to-many' },
  { id: nanoid(), sourceTableId: stSubscriptions.id, sourceFieldId: stSubscriptions.fields[1].id, targetTableId: stOrgs.id, targetFieldId: stOrgs.fields[0].id, cardinality: 'one-to-many' },
];

export const TEMPLATES: Record<string, Template> = {
  blog: {
    label: 'Blog',
    description: 'Users, posts, comments, tags and post_tags',
    tables: [blogUsers, blogPosts, blogComments, blogTags, blogPostTags],
    relationships: blogRels,
  },
  ecommerce: {
    label: 'E-commerce',
    description: 'Users, products, orders and order_items',
    tables: [eUsers, eProducts, eOrders, eOrderItems],
    relationships: eRels,
  },
  auth: {
    label: 'Auth & Users',
    description: 'Users, sessions and profiles with UUID keys',
    tables: [authUsers, authSessions, authProfiles],
    relationships: authRels,
  },
  saas: {
    label: 'Multi-tenant SaaS',
    description: 'Organizations, users, members and subscriptions',
    tables: [stOrgs, stUsers, stMembers, stSubscriptions],
    relationships: stRels,
  },
};

export type TemplateKey = keyof typeof TEMPLATES;

/**
 * Returns a DEEP CLONE of the template with fresh nanoid()s for all
 * table IDs, field IDs, and relationship IDs.
 * This prevents the singleton module-level objects from being shared
 * across multiple schema insertions, which caused all templates to
 * appear as e-commerce (the first one loaded).
 */
export function getTemplate(id: string): Template | null {
  const original = TEMPLATES[id];
  if (!original) return null;

  // Build a mapping from old table id → new table id
  const tableIdMap: Record<string, string> = {};
  const fieldIdMap: Record<string, string> = {};

  const clonedTables: Table[] = original.tables.map((table) => {
    const newTableId = nanoid();
    tableIdMap[table.id] = newTableId;

    const clonedFields = table.fields.map((field) => {
      const newFieldId = nanoid();
      fieldIdMap[field.id] = newFieldId;
      return { ...field, id: newFieldId };
    });

    return { ...table, id: newTableId, fields: clonedFields };
  });

  const clonedRelationships: Relationship[] = original.relationships.map((rel) => ({
    ...rel,
    id: nanoid(),
    sourceTableId: tableIdMap[rel.sourceTableId] ?? rel.sourceTableId,
    targetTableId: tableIdMap[rel.targetTableId] ?? rel.targetTableId,
    sourceFieldId: fieldIdMap[rel.sourceFieldId] ?? rel.sourceFieldId,
    targetFieldId: fieldIdMap[rel.targetFieldId] ?? rel.targetFieldId,
  }));

  return {
    label: original.label,
    description: original.description,
    tables: clonedTables,
    relationships: clonedRelationships,
  };
}
