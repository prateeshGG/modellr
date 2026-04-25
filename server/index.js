import './loadEnv.js'; // MUST be first to load env vars before other imports
import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import pgRouter from './routes/postgres.js';
import mysqlRouter from './routes/mysql.js';
import openaiRouter from './routes/openai.js';
import apiKeyRouter from './routes/apikeys.js';
import mcpGatewayRouter from './routes/mcpGateway.js';

const app = express();
const port = process.env.PORT || 3001;
const host = '0.0.0.0';

// Allow requests from any origin (Vercel previews, local dev, etc.)
app.use(cors());

app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Database Introspection Routers
app.use('/api/introspect/postgres', pgRouter);
app.use('/api/introspect/mysql', mysqlRouter);

// AI Proxies & Key Management
app.use('/api/openai', openaiRouter);
app.use('/api/keys', apiKeyRouter);
app.use('/api/mcp', mcpGatewayRouter);

const server = http.createServer(app);

// ── Official Yjs WebSocket server ──────────────────────────────────────────
import { setupWSConnection } from 'y-websocket/bin/utils';
import { supabase } from './lib/supabase.js';

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname;
  
  // y-websocket usually connects to /<roomname>
  const roomId = pathname.slice(1);
  const token = url.searchParams.get('token');

  if (!roomId) {
    socket.destroy();
    return;
  }

  // 1. Verify JWT
  if (!token) {
    console.log(`[WS Auth] Connection rejected: No token for room ${roomId}`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');

    // 2. Check if user has access to this schema
    // If it's a UUID, check the 'schemas' table. If it's a random string (stateless), allow it?
    // Actually, for real-time collaboration, the room is usually the schema UUID.
    if (roomId.length === 36) { // Basic UUID check
      const { data: schema, error: schemaErr } = await supabase
        .from('schemas')
        .select('owner_id, is_public')
        .eq('id', roomId)
        .single();

      if (schemaErr || !schema) {
        console.log(`[WS Auth] Room ${roomId} not found or access denied`);
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      const isOwner = schema.owner_id === user.id;
      if (!isOwner && !schema.is_public) {
        console.log(`[WS Auth] User ${user.id} denied access to private room ${roomId}`);
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    // 3. Authenticated!
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });

  } catch (err) {
    console.log(`[WS Auth] Connection error: ${err.message}`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
});

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req);
});

server.listen(port, host, () => {
  console.log(`[Modellr Server] HTTP  → http://${host}:${port}`);
  console.log(`[Modellr Server] WS    → ws://localhost:${port}  (room-based Yjs relay)`);
  console.log(`[Modellr Server] ENV   → SUPABASE_SERVICE_ROLE_KEY ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ loaded' : '✗ missing'}`);
});
