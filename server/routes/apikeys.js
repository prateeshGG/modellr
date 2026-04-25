import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabase, createRequestClient } from '../lib/supabase.js';

const router = express.Router();

// Helper to create an RLS-bound Supabase client using the incoming JWT
function getSupabaseClient(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('Missing Authorization header');
  const token = authHeader.split(' ')[1];
  return createRequestClient(token);
}

router.get('/', async (req, res) => {
  try {
    const supabase = getSupabaseClient(req);
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, label, key_prefix, created_at, last_used_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(keys);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const supabase = getSupabaseClient(req);
    
    // Explicitly verify the token to grab the user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Generate exactly 32 hex chars (16 bytes)
    const randomHex = crypto.randomBytes(16).toString('hex');
    const rawKey = `sfk_live_${randomHex}`;
    const keyPrefix = rawKey.substring(0, 15) + '...';

    // Hash the raw string
    const keyHash = await bcrypt.hash(rawKey, 10);
    const label = req.body.label || 'Default MCP Key';

    // Insert to DB using user's RLS scope
    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        label
      })
      .select('id, label, key_prefix, created_at, last_used_at')
      .single();

    if (insertError) throw insertError;

    // We ONLY ever return the rawKey once. It will never be accessible again.
    res.json({ newKey, rawKey });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const supabase = getSupabaseClient(req);
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
