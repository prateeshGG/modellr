import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase Client] Missing environment variables!');
}

/**
 * Shared Supabase client for general backend operations.
 * Uses the Anon key by default.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Service role client for operations that bypass RLS (use with caution).
 */
export const supabaseService = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Creates a per-request client bound to a user's JWT.
 * Useful for ensuring RLS is respected in backend routes.
 */
export const createRequestClient = (token) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

/**
 * ScopedDatabase Helper
 * Wraps the Service Role client but forces a userId filter on every operation.
 * This prevents accidental data leaks in high-privilege contexts like the MCP Gateway.
 */
export class ScopedDatabase {
  constructor(userId) {
    if (!userId) throw new Error('ScopedDatabase requires a userId');
    this.userId = userId;
  }

  from(table) {
    const query = supabaseService.from(table);
    
    // Auto-apply owner_id filter for tables that support it
    const ownerTables = ['schemas', 'snapshots', 'api_keys'];
    if (ownerTables.includes(table)) {
      const originalSelect = query.select.bind(query);
      query.select = (...args) => originalSelect(...args).eq('owner_id', this.userId);
      
      const originalDelete = query.delete.bind(query);
      query.delete = (...args) => originalDelete(...args).eq('owner_id', this.userId);

      const originalUpdate = query.update.bind(query);
      query.update = (values, ...args) => originalUpdate(values, ...args).eq('owner_id', this.userId);
    }

    return query;
  }
}
