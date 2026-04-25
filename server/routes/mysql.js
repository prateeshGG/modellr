import express from 'express';
import mysql from 'mysql2/promise';
import { requireAuth } from '../middleware/auth.js';
import { validateConnectionString } from '../utils/security.js';
import { supabaseService } from '../lib/supabase.js';

const router = express.Router();

function getDialectType(myType) {
  myType = myType.toLowerCase();
  if (myType.includes('bigint')) return 'bigint';
  if (myType.includes('int')) return 'integer';
  if (myType.includes('varchar') || myType.includes('text') || myType.includes('char')) return 'varchar';
  if (myType.includes('date') || myType.includes('time')) return 'datetime';
  if (myType.includes('tinyint(1)')) return 'boolean';
  return myType;
}

// Fix #P0: Applied requireAuth and SSRF validation
router.post('/', requireAuth, async (req, res) => {
  const { connectionString } = req.body;
  
  try {
    // Check Tier
    const { data: user } = await supabaseService.from('users').select('tier').eq('id', req.user.id).single();
    if (!user || user.tier !== 'pro') {
      return res.status(403).json({ error: 'Live Introspection is a Pro feature. Please upgrade your plan.' });
    }

    await validateConnectionString(connectionString, 'mysql');
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  let connection;
  try {
    // MySQL2 doesn't have a built-in connect timeout in the same way, but we can wrap it
    const connectPromise = mysql.createConnection(connectionString);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );

    connection = await Promise.race([connectPromise, timeoutPromise]);

    // Get current database name
    const [dbResult] = await connection.query('SELECT DATABASE() AS dbName');
    const dbName = dbResult[0].dbName;

    // 1. Fetch tables
    const [tableRes] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
        AND table_type = 'BASE TABLE'
    `, [dbName]);

    // 2. Fetch columns
    const [columnsRes] = await connection.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = ?
      ORDER BY ordinal_position
    `, [dbName]);

    // 3. Fetch constraints (PK/FK)
    const [constraintsRes] = await connection.query(`
      SELECT 
          kcu.TABLE_NAME as table_name, 
          kcu.COLUMN_NAME as column_name, 
          tc.CONSTRAINT_TYPE as constraint_type, 
          kcu.REFERENCED_TABLE_NAME as foreign_table_name,
          kcu.REFERENCED_COLUMN_NAME as foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.DEFAULT_COLLATION_NAME IS NULL OR tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA 
      WHERE tc.TABLE_SCHEMA = ?
        AND tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'FOREIGN KEY');
    `, [dbName]);

    const tablesMap = new Map();
    const relationships = [];

    // Init Tables
    for (const row of tableRes) {
      tablesMap.set(row.table_name, {
        id: `tbl_${row.table_name}`,
        name: row.table_name,
        fields: [],
        position: { x: 0, y: 0 },
        accentColor: 'indigo'
      });
    }

    // Assign Fields
    for (const col of columnsRes) {
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
    for (const cons of constraintsRes) {
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
          cardinality: 'one-to-many'
        });
      }
    }

    res.json({
      tables: Array.from(tablesMap.values()),
      relationships
    });

  } catch (err) {
    console.error('MySQL Introspection Error:', err);
    res.status(500).json({ error: 'Failed to introspect MySQL database: ' + err.message });
  } finally {
    if (connection) await connection.end();
  }
});

export default router;
