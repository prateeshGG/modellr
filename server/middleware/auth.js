import { supabase } from '../lib/supabase.js';

/**
 * requireAuth - Middleware to verify Supabase JWT
 * Expects 'Authorization: Bearer <token>' header
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the token with Supabase using the shared singleton client
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Attach user and token to request for downstream use
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    console.error('[AuthMiddleware Error]', err);
    res.status(500).json({ error: 'Internal auth verification error' });
  }
};
