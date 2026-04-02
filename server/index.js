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
