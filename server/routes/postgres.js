import express from 'express';
import pg from 'pg';
const { Client } = pg;
const router = express.Router();

function getDialectType(pgType) {
  // Mapping pg info_schema types to our generic types
  if (pgType.includes('int8') || pgType === 'bigint') return 'bigint';
  if (pgType.includes('int') || pgType === 'integer') return 'integer';
  if (pgType.includes('char') || pgType === 'text') return 'text';
  if (pgType.includes('time') || pgType === 'date') return 'timestamp';
  if (pgType === 'boolean') return 'boolean';
  return pgType;
}

router.post('/', async (req, res) => {
  const { connectionString } = req.body;
  if (!connectionString) {
    return res.status(400).json({ error: 'connectionString is required' });
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();

    // 1. Fetch tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema') 
        AND table_type = 'BASE TABLE'
    `);

    // 2. Fetch columns
    const columnsRes = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY ordinal_position
    `);

    // 3. Fetch constraints (PK/FK)
    const constraintsRes = await client.query(`
      SELECT 
          tc.table_name, kcu.column_name, 
          tc.constraint_type, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema')
        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY');
    `);

    const tablesMap = new Map();
    const relationships = [];

    // Init Tables
    for (const row of tableRes.rows) {
      tablesMap.set(row.table_name, {
        id: `tbl_${row.table_name}`,
        name: row.table_name,
        fields: [],
        position: { x: 0, y: 0 },
        accentColor: 'blue'
      });
    }

    // Assign Fields
    for (const col of columnsRes.rows) {
      const table = tablesMap.get(col.table_name);
      if (!table) continue;

      table.fields.push({
        id: `fld_${col.table_name}_${col.column_name}`,
        name: col.column_name,
        type: getDialectType(col.data_type),
        nullable: col.is_nullable === 'YES',
        default: col.column_default || undefined,
        isPK: false,
        isFK: false,
        unique: false
      });
    }

    // Apply Constraints & Build Relationships
    let relIndex = 1;
    for (const cons of constraintsRes.rows) {
      const table = tablesMap.get(cons.table_name);
      if (!table) continue;

      const field = table.fields.find(f => f.name === cons.column_name);
      if (!field) continue;

      if (cons.constraint_type === 'PRIMARY KEY') {
        field.isPK = true;
      } else if (cons.constraint_type === 'FOREIGN KEY') {
        field.isFK = true;
        relationships.push({
          id: `rel_${relIndex++}`,
          sourceTableId: `tbl_${cons.table_name}`,
          sourceFieldId: `fld_${cons.table_name}_${cons.column_name}`,
          targetTableId: `tbl_${cons.foreign_table_name}`,
          targetFieldId: `fld_${cons.foreign_table_name}_${cons.foreign_column_name}`,
          cardinality: 'one-to-many' // default
        });
      }
    }

    res.json({
      tables: Array.from(tablesMap.values()),
      relationships
    });

  } catch (err) {
    console.error('Introspection Error:', err);
    res.status(500).json({ error: 'Failed to introspect database: ' + err.message });
  } finally {
    await client.end().catch(console.error);
  }
});

export default router;
