import express from 'express';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { generatePostgresSQL } from '../utils/sqlExporter.js';
import { diffSchemas } from '../utils/schemaDiff.js';
import { generateMigration } from '../utils/migrationGenerator.js';

const router = express.Router();

// The Gateway uses the Service Role key to bypass RLS, then validates internally
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[mcpGateway] SUPABASE_URL:', supabaseUrl);
console.log('[mcpGateway] SERVICE_KEY:', serviceKey ? `${serviceKey.substring(0, 20)}...` : 'MISSING');
console.log('[mcpGateway] All env keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));

// Only initialize if we have the service key (useful to not crash local dev if omitted initially)
const supabase = serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

// Middleware to authenticate sfk_live_ keys
router.use(async (req, res, next) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer sfk_live_')) {
    return res.status(401).json({ error: 'Invalid or missing SCHEMA_FORGE_TOKEN format' });
  }

  const rawKey = authHeader.replace('Bearer ', '');
  const prefix = rawKey.substring(0, 15) + '...';

  // Find possible matches based on the prefix index
  const { data: possibleKeys, error } = await supabase
    .from('api_keys')
    .select('id, user_id, key_hash')
    .eq('key_prefix', prefix);

  if (error || !possibleKeys || possibleKeys.length === 0) {
    return res.status(401).json({ error: 'Token not found or revoked' });
  }

  // Verify bcrypt hash
  // Since multiple keys could theoretically share the same prefix, we check them all
  let matchedUserId = null;
  let matchedKeyId = null;

  for (const keyRow of possibleKeys) {
    const isValid = await bcrypt.compare(rawKey, keyRow.key_hash);
    if (isValid) {
      matchedUserId = keyRow.user_id;
      matchedKeyId = keyRow.id;
      break;
    }
  }

  if (!matchedUserId) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Update last_used_at in background
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', matchedKeyId).then();

  // Bind the user_id context to the request for the handlers
  req.ctx = { userId: matchedUserId };
  next();
});

// Tool router
router.post('/call', async (req, res) => {
  const { tool, arguments: args } = req.body;
  const userId = req.ctx.userId;

  try {
    switch (tool) {
      case 'schemaforge_list_schemas': {
        const { data, error } = await supabase
          .from('schemas')
          .select('id, name, updated_at')
          .eq('owner_id', userId)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        return res.json({ result: data });
      }

      case 'schemaforge_read_schema': {
        const { id } = args;
        if (!id) throw new Error("Missing 'id' argument");

        const { data, error } = await supabase
          .from('schemas')
          .select('name, canvas_state, updated_at')
          .eq('id', id)
          .eq('owner_id', userId)
          .single();

        if (error || !data) throw new Error("Schema not found or access denied");
        return res.json({ result: data });
      }

      case 'schemaforge_update_schema': {
        const { id, tables, relationships } = args;
        if (!id || !tables) throw new Error("Missing 'id' or 'tables' arguments");

        // First verify ownership
        const { count, error: countErr } = await supabase
          .from('schemas')
          .select('*', { count: 'exact', head: true })
          .eq('id', id)
          .eq('owner_id', userId);

        if (countErr || count === 0) throw new Error("Schema not found or access denied");

        const payload = {
          tables,
          relationships: relationships || []
        };

        const { error } = await supabase
          .from('schemas')
          .update({ canvas_state: payload, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
        return res.json({ result: { success: true, message: `Schema ${id} updated remotely.` } });
      }

      case 'schemaforge_add_table': {
        const { id, table } = args;
        if (!id || !table) throw new Error("Missing 'id' or 'table' arguments");

        const { data, error: fetchErr } = await supabase
          .from('schemas')
          .select('canvas_state')
          .eq('id', id)
          .eq('owner_id', userId)
          .single();

        if (fetchErr || !data) throw new Error("Schema not found or access denied");

        const currentState = data.canvas_state || { tables: [], relationships: [] };
        currentState.tables = [...(currentState.tables || []), table];

        const { error: updateErr } = await supabase
          .from('schemas')
          .update({ canvas_state: currentState, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updateErr) throw updateErr;
        return res.json({ result: { success: true, message: `Table ${table.name} added to schema ${id}.` } });
      }

      case 'schemaforge_modify_table': {
        const { id, tableName, updates } = args;
        if (!id || !tableName || !updates) throw new Error("Missing 'id', 'tableName', or 'updates' arguments");

        const { data, error: fetchErr } = await supabase
          .from('schemas')
          .select('canvas_state')
          .eq('id', id)
          .eq('owner_id', userId)
          .single();

        if (fetchErr || !data) throw new Error("Schema not found or access denied");

        const currentState = data.canvas_state || { tables: [], relationships: [] };
        const tableIdx = currentState.tables.findIndex(t => t.name === tableName);
        if (tableIdx === -1) throw new Error(`Table ${tableName} not found in schema.`);

        currentState.tables[tableIdx] = { ...currentState.tables[tableIdx], ...updates };

        const { error: updateErr } = await supabase
          .from('schemas')
          .update({ canvas_state: currentState, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updateErr) throw updateErr;
        return res.json({ result: { success: true, message: `Table ${tableName} modified in schema ${id}.` } });
      }

      case 'schemaforge_generate_postgres_sql': {
        const { id } = args;
        if (!id) throw new Error("Missing 'id' argument");

        const { data, error: fetchErr } = await supabase
          .from('schemas')
          .select('canvas_state')
          .eq('id', id)
          .eq('owner_id', userId)
          .single();

        if (fetchErr || !data) throw new Error("Schema not found or access denied");

        const cs = data.canvas_state || { tables: [], relationships: [] };
        const sql = generatePostgresSQL(cs.tables || [], cs.relationships || []);
        return res.json({ result: { sql } });
      }

      case 'schemaforge_diff_schemas': {
        const { oldId, newId } = args;
        if (!oldId || !newId) throw new Error("Missing 'oldId' or 'newId' arguments");

        const { data: schemas, error } = await supabase
          .from('schemas')
          .select('id, canvas_state')
          .in('id', [oldId, newId])
          .eq('owner_id', userId);

        if (error || !schemas || schemas.length < 2) throw new Error("One or both schemas not found or access denied");

        const oldSchema = schemas.find(s => s.id === oldId);
        const newSchema = schemas.find(s => s.id === newId);

        const diff = diffSchemas(oldSchema.canvas_state, newSchema.canvas_state);
        return res.json({ result: diff });
      }

      case 'schemaforge_generate_migration': {
        const { oldId, newId } = args;
        if (!oldId || !newId) throw new Error("Missing 'oldId' or 'newId' arguments");

        const { data: schemas, error } = await supabase
          .from('schemas')
          .select('id, canvas_state')
          .in('id', [oldId, newId])
          .eq('owner_id', userId);

        if (error || !schemas || schemas.length < 2) throw new Error("One or both schemas not found or access denied");

        const oldSchema = schemas.find(s => s.id === oldId);
        const newSchema = schemas.find(s => s.id === newId);

        const diff = diffSchemas(oldSchema.canvas_state, newSchema.canvas_state);
        const sql = generateMigration(diff, newSchema.canvas_state);
        return res.json({ result: { sql, diffSummary: { added: diff.addedTables.length, removed: diff.removedTables.length, modified: diff.modifiedTables.length } } });
      }

      default:
        return res.status(404).json({ error: `Unknown tool: ${tool}` });
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
