import type { Field, Relationship, Table } from '../../src/types/schema';

let n = 0;
export function field(name: string, type: string, extra: Partial<Field> = {}): Field {
  return {
    id: `f${++n}`,
    name,
    type,
    nullable: true,
    unique: false,
    isPK: false,
    isFK: false,
    ...extra,
  };
}

export function table(id: string, name: string, fields: Field[], extra: Partial<Table> = {}): Table {
  return { id, name, fields, position: { x: 0, y: 0 }, accentColor: 'blue', ...extra };
}

export function rel(
  s: Table,
  sf: Field,
  t: Table,
  tf: Field,
  cardinality: Relationship['cardinality'] = 'one-to-many'
): Relationship {
  return {
    id: `r${++n}`,
    sourceTableId: s.id,
    sourceFieldId: sf.id,
    targetTableId: t.id,
    targetFieldId: tf.id,
    cardinality,
  };
}

/** Rich schema: reserved words, composite PK, defaults, multi-FK, self reference, uuid FKs. */
export function buildSchema() {
  const userId = field('id', 'uuid', { isPK: true, nullable: false, default: 'gen_random_uuid()' });
  const users = table('t_users', 'user', [
    userId,
    field('email', 'varchar', { nullable: false, unique: true, length: 255 }),
    field('status', 'varchar', { nullable: false, default: "'active'", length: 20 }),
    field('score', 'integer', { nullable: false, default: '0' }),
    field('active', 'boolean', { nullable: false, default: 'false' }),
    field('created_at', 'timestamptz', { nullable: false, default: 'now()' }),
    field('balance', 'numeric', { precision: 10, scale: 2 }),
    field('bio', 'text', { comment: "it's a\nmulti-line bio" }),
    field('ratio', 'double precision'),
    field('born', 'date'),
    field('meta', 'jsonb'),
    field('nick', 'varchar', { default: "'it''s'" }),
  ], { comment: 'Users\nwho login' });

  const orderId = field('id', 'bigserial', { isPK: true, nullable: false });
  const orderBuyer = field('buyer_id', 'uuid', { isFK: true, nullable: false });
  const orderSeller = field('seller_id', 'uuid', { isFK: true });
  const orders = table('t_orders', 'order', [
    orderId,
    orderBuyer,
    orderSeller,
    field('total', 'numeric', { precision: 12, scale: 2, check: 'total >= 0' }),
  ]);

  const itemOrder = field('order_id', 'bigint', { isPK: true, isFK: true, nullable: false });
  const itemNo = field('line_no', 'int', { isPK: true, nullable: false });
  const items = table('t_items', 'order_item', [itemOrder, itemNo, field('qty', 'int', { nullable: false, default: '1' })]);

  const catId = field('id', 'serial', { isPK: true, nullable: false });
  const catParent = field('parent_id', 'int', { isFK: true });
  const cats = table('t_cats', 'group', [catId, catParent, field('name', 'text')]);

  const profUser = field('user_id', 'uuid', { isPK: true, isFK: true, nullable: false });
  const profiles = table('t_prof', 'profile', [profUser, field('avatar', 'text')]);

  const tables = [items, orders, users, cats, profiles]; // intentionally out of dependency order
  const relationships = [
    rel(orders, orderBuyer, users, userId),
    rel(orders, orderSeller, users, userId),
    rel(orders, orderBuyer, users, userId), // duplicate
    rel(items, itemOrder, orders, orderId),
    rel(cats, catParent, cats, catId),
    rel(profiles, profUser, users, userId, 'one-to-one'),
  ];
  return { tables, relationships, users, orders, items, cats, profiles, f: { userId, orderBuyer, orderSeller } };
}
