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

// Allowed to receive requests from dynamic frontend or local dev
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({ 
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

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

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log(`[WS] client connected to ${req.url}`);
  setupWSConnection(ws, req);
});

server.listen(port, host, () => {
  console.log(`[SchemaForge Server] HTTP  → http://${host}:${port}`);
  console.log(`[SchemaForge Server] WS    → ws://localhost:${port}  (room-based Yjs relay)`);
  console.log(`[SchemaForge Server] ENV   → SUPABASE_SERVICE_ROLE_KEY ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ loaded' : '✗ missing'}`);
});
