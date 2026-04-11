# SchemaForge Server - Comprehensive Documentation

## Overview

The SchemaForge Server is the backend API and real-time collaboration hub for the SchemaForge database design platform. It provides HTTP REST endpoints for database introspection, AI integration, API key management, and MCP gateway services, while also hosting a WebSocket server for real-time collaborative editing using Yjs CRDT (Conflict-free Replicated Data Type).

**Location**: `server/index.js`  
**Environment Loader**: `server/loadEnv.js`  
**Default Port**: 3001  
**Protocol Support**: HTTP, WebSocket (Yjs)

---

## Architecture Overview

### Core Responsibilities

1. **HTTP API Server** - Express.js REST endpoints
2. **WebSocket Server** - Real-time collaboration via Yjs
3. **Database Introspection** - Connect to PostgreSQL/MySQL and extract schemas
4. **AI Integration** - Proxy requests to OpenAI API
5. **API Key Management** - CRUD operations for user API keys
6. **MCP Gateway** - Model Context Protocol integration endpoint

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **HTTP Server** | Express.js | REST API framework |
| **WebSocket** | ws + y-websocket | Real-time collaboration |
| **CRDT** | Yjs | Conflict-free data synchronization |
| **Environment** | dotenv | Configuration management |
| **CORS** | cors middleware | Cross-origin request handling |

---

## File Structure

### Main Server File: `server/index.js`

**Purpose**: Application entry point and server initialization

**Key Features**:
- Express app configuration
- HTTP server creation
- WebSocket server setup
- Route registration
- Health check endpoint

### Environment Loader: `server/loadEnv.js`

**Purpose**: Load environment variables before any other imports

**Key Features**:
- Multi-location .env file loading
- ES Module path resolution
- Fallback configuration loading

---

## Environment Configuration

### Loading Strategy

The `loadEnv.js` module implements a cascading environment variable loading strategy:

```javascript
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });        // server/.env
dotenv.config({ path: join(__dirname, '../.env') });     // root .env
```

**Loading Order** (later values override earlier ones):
1. `server/.env` - Server-specific configuration
2. `.env` (root) - Project-wide configuration

**Why This Matters**:
- ES Modules don't have `__dirname` by default
- `fileURLToPath` and `dirname` recreate the directory path
- Allows running server from any working directory
- Supports both local development and production deployments

### Required Environment Variables

```bash
# Supabase Configuration
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Purpose**: Service role key for Supabase backend operations  
**Validation**: Checked on startup with visual indicator (✓/✗)

### Optional Environment Variables

```bash
# Server Configuration
PORT=3001                    # HTTP server port (default: 3001)

# Database Connection Strings (for introspection)
POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:5432/db
MYSQL_CONNECTION_STRING=mysql://user:pass@host:3306/db

# OpenAI API Configuration
OPENAI_API_KEY=sk-...       # For AI-powered features

# MCP Configuration
SCHEMA_FORGE_TOKEN=sfk_live_...  # For MCP gateway authentication
```

---

## Server Initialization

### Import Order (Critical)

```javascript
import './loadEnv.js'; // ⚠️ MUST be first to load env vars before other imports
import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import pgRouter from './routes/postgres.js';
import mysqlRouter from './routes/mysql.js';
import openaiRouter from './routes/openai.js';
import apiKeyRouter from './routes/apikeys.js';
import mcpGatewayRouter from './routes/mcpGateway.js';
```

**Critical Note**: `loadEnv.js` MUST be imported first to ensure environment variables are available to all subsequent modules.

### Express App Configuration

```javascript
const app = express();
const port = process.env.PORT || 3001;
const host = '0.0.0.0';

// Allow requests from any origin (Vercel previews, local dev, etc.)
app.use(cors());

app.use(express.json());
```

**Configuration Details**:
- **Host**: `0.0.0.0` - Binds to all network interfaces (allows external connections)
- **Port**: Configurable via `PORT` environment variable, defaults to 3001
- **CORS**: Permissive configuration allowing all origins (suitable for development and multi-domain deployments)
- **Body Parser**: `express.json()` middleware for parsing JSON request bodies

---

## HTTP Endpoints

### Health Check Endpoint

```javascript
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));
```

**Endpoint**: `GET /api/health`

**Purpose**: 
- Service availability monitoring
- Load balancer health checks
- Deployment verification

**Response**:
```json
{
  "status": "ok",
  "ts": 1704067200000
}
```

**Use Cases**:
- Kubernetes liveness/readiness probes
- Uptime monitoring services
- CI/CD deployment verification

---

### Database Introspection Routes

```javascript
app.use('/api/introspect/postgres', pgRouter);
app.use('/api/introspect/mysql', mysqlRouter);
```

#### PostgreSQL Introspection

**Base Path**: `/api/introspect/postgres`  
**Router**: `./routes/postgres.js`

**Capabilities**:
- Connect to PostgreSQL databases
- Extract table schemas
- Retrieve column definitions
- Discover relationships (foreign keys)
- Analyze indexes and constraints

**Example Endpoint**:
```
POST /api/introspect/postgres/connect
```

**Request Body**:
```json
{
  "connectionString": "postgresql://user:pass@localhost:5432/mydb"
}
```

**Response**:
```json
{
  "tables": [
    {
      "name": "users",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        }
      ]
    }
  ],
  "relationships": []
}
```

#### MySQL Introspection

**Base Path**: `/api/introspect/mysql`  
**Router**: `./routes/mysql.js`

**Capabilities**:
- Connect to MySQL/MariaDB databases
- Extract table schemas
- Retrieve column definitions
- Discover relationships (foreign keys)
- Analyze indexes and constraints

**Similar API structure to PostgreSQL introspection**

---

### AI Integration Routes

```javascript
app.use('/api/openai', openaiRouter);
```

**Base Path**: `/api/openai`  
**Router**: `./routes/openai.js`

**Purpose**: Proxy and manage OpenAI API requests

**Capabilities**:
- AI-powered schema suggestions
- Natural language to SQL conversion
- Schema optimization recommendations
- Documentation generation

**Example Endpoint**:
```
POST /api/openai/chat
```

**Request Body**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Suggest a schema for an e-commerce platform"
    }
  ],
  "model": "gpt-4"
}
```

**Why Proxy?**:
- Hide API keys from frontend
- Rate limiting and usage tracking
- Request/response transformation
- Cost management and monitoring

---

### API Key Management Routes

```javascript
app.use('/api/keys', apiKeyRouter);
```

**Base Path**: `/api/keys`  
**Router**: `./routes/apikeys.js`

**Purpose**: CRUD operations for user API keys

**Capabilities**:
- Create new API keys
- List user's API keys
- Revoke/delete API keys
- Update key permissions
- Track key usage

**Example Endpoints**:

**Create Key**:
```
POST /api/keys
```

**List Keys**:
```
GET /api/keys
```

**Delete Key**:
```
DELETE /api/keys/:keyId
```

**Security Considerations**:
- Keys should be hashed before storage
- Implement rate limiting per key
- Support key expiration
- Audit log for key usage

---

### MCP Gateway Routes

```javascript
app.use('/api/mcp', mcpGatewayRouter);
```

**Base Path**: `/api/mcp`  
**Router**: `./routes/mcpGateway.js`

**Purpose**: Model Context Protocol integration endpoint

**Capabilities**:
- Receive MCP tool calls from MCP server
- Authenticate requests via bearer tokens
- Execute schema operations
- Return formatted responses

**Example Endpoint**:
```
POST /api/mcp/call
```

**Request Body**:
```json
{
  "tool": "schemaforge_read_schema",
  "arguments": {
    "id": "uuid-1234"
  }
}
```

**Request Headers**:
```
Authorization: Bearer sfk_live_xxxxx
Content-Type: application/json
```

**Response**:
```json
{
  "result": {
    "id": "uuid-1234",
    "name": "My Schema",
    "tables": []
  }
}
```

**Integration Flow**:
```
AI Agent → MCP Server → MCP Gateway → SchemaForge Backend → Database
```

---

## WebSocket Server (Real-Time Collaboration)

### Yjs Integration

```javascript
import { setupWSConnection } from 'y-websocket/bin/utils';

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log(`[WS] client connected to ${req.url}`);
  setupWSConnection(ws, req);
});
```

### What is Yjs?

**Yjs** is a CRDT (Conflict-free Replicated Data Type) framework that enables real-time collaboration without conflicts.

**Key Features**:
- **Automatic Conflict Resolution**: Multiple users can edit simultaneously
- **Offline Support**: Changes sync when connection is restored
- **Efficient**: Only sends deltas (changes), not full documents
- **Framework Agnostic**: Works with any data structure

### How It Works

1. **Client Connects**: WebSocket connection established to server
2. **Room-Based**: Clients join "rooms" (typically schema IDs)
3. **State Sync**: Server relays changes between all clients in the same room
4. **CRDT Magic**: Yjs ensures all clients converge to the same state

### Connection Flow

```
Client A                    Server                      Client B
   |                          |                            |
   |--- WS Connect ---------->|                            |
   |<-- Sync State ------------|                            |
   |                          |<--- WS Connect ------------|
   |                          |---- Sync State ----------->|
   |                          |                            |
   |--- Edit Table ---------->|                            |
   |                          |---- Broadcast Edit ------->|
   |                          |                            |
   |                          |<--- Edit Field ------------|
   |<--- Broadcast Edit ------|                            |
```

### Room-Based Architecture

**URL Pattern**: `ws://localhost:3001/?room=schema-uuid-1234`

**Room Isolation**:
- Each schema has its own room
- Changes only broadcast within the same room
- No cross-contamination between schemas

**Example Client Connection**:
```javascript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  'ws://localhost:3001',
  'schema-uuid-1234',
  ydoc
);

// Now all changes to ydoc are synced in real-time
```

### Collaboration Features Enabled

1. **Multi-User Editing**:
   - Multiple users can edit the same schema simultaneously
   - Changes appear in real-time for all connected users

2. **Cursor Tracking**:
   - See where other users are working
   - Display user avatars and names

3. **Undo/Redo**:
   - Each user has their own undo/redo stack
   - Doesn't interfere with other users' changes

4. **Offline Resilience**:
   - Continue editing when disconnected
   - Changes sync automatically when reconnected

5. **Conflict-Free**:
   - No "save conflicts" or "overwrite" dialogs
   - All changes merge automatically

---

## Server Startup

### HTTP Server Creation

```javascript
const server = http.createServer(app);
```

**Why `http.createServer(app)` instead of `app.listen()`?**

- Allows attaching WebSocket server to the same port
- Single port for both HTTP and WebSocket traffic
- Simplifies deployment and firewall configuration

### Server Listening

```javascript
server.listen(port, host, () => {
  console.log(`[SchemaForge Server] HTTP  → http://${host}:${port}`);
  console.log(`[SchemaForge Server] WS    → ws://localhost:${port}  (room-based Yjs relay)`);
  console.log(`[SchemaForge Server] ENV   → SUPABASE_SERVICE_ROLE_KEY ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ loaded' : '✗ missing'}`);
});
```

**Startup Logs**:

```
[SchemaForge Server] HTTP  → http://0.0.0.0:3001
[SchemaForge Server] WS    → ws://localhost:3001  (room-based Yjs relay)
[SchemaForge Server] ENV   → SUPABASE_SERVICE_ROLE_KEY ✓ loaded
```

**Log Components**:
1. **HTTP Endpoint**: Shows the HTTP API base URL
2. **WebSocket Endpoint**: Shows the WebSocket connection URL
3. **Environment Check**: Validates critical environment variables

**Environment Validation**:
- ✓ loaded - Environment variable is present
- ✗ missing - Environment variable is missing (may cause runtime errors)

---

## Network Configuration

### Binding to 0.0.0.0

```javascript
const host = '0.0.0.0';
```

**What This Means**:
- Server listens on ALL network interfaces
- Accessible from localhost (127.0.0.1)
- Accessible from LAN (192.168.x.x)
- Accessible from external networks (if firewall allows)

**Alternatives**:
- `127.0.0.1` - Only localhost (not accessible from other machines)
- `localhost` - Same as 127.0.0.1
- Specific IP - Only that network interface

**Use Cases**:
- **Development**: Access from mobile devices on same network
- **Docker**: Container networking requires 0.0.0.0
- **Cloud Deployment**: Required for Railway, Heroku, etc.

### Port Configuration

```javascript
const port = process.env.PORT || 3001;
```

**Default**: 3001  
**Override**: Set `PORT` environment variable

**Why Port 3001?**:
- Avoids conflict with frontend dev server (typically 3000)
- Common convention for backend APIs
- Easy to remember and configure

---

## CORS Configuration

```javascript
app.use(cors());
```

**Current Configuration**: Permissive (allows all origins)

**What This Enables**:
- Frontend hosted on Vercel can call backend on Railway
- Local development (localhost:3000 → localhost:3001)
- Preview deployments with dynamic URLs
- Mobile app development

**Production Considerations**:

For production, consider restricting origins:

```javascript
app.use(cors({
  origin: [
    'https://schemaforge.com',
    'https://app.schemaforge.com',
    /\.vercel\.app$/  // Allow Vercel preview deployments
  ],
  credentials: true
}));
```

**Security Trade-offs**:
- **Permissive**: Easy development, potential security risk
- **Restrictive**: Better security, requires configuration management

---

## Routing Architecture

### Route Organization

```
server/
├── index.js                 # Main server file
├── routes/
│   ├── postgres.js         # PostgreSQL introspection
│   ├── mysql.js            # MySQL introspection
│   ├── openai.js           # AI integration
│   ├── apikeys.js          # API key management
│   └── mcpGateway.js       # MCP protocol gateway
└── utils/
    ├── schemaDiff.js       # Schema comparison logic
    ├── sqlExporter.js      # SQL generation
    └── migrationGenerator.js # Migration SQL generation
```

### Route Mounting

```javascript
app.use('/api/introspect/postgres', pgRouter);
app.use('/api/introspect/mysql', mysqlRouter);
app.use('/api/openai', openaiRouter);
app.use('/api/keys', apiKeyRouter);
app.use('/api/mcp', mcpGatewayRouter);
```

**Benefits of This Structure**:
- **Modularity**: Each router is self-contained
- **Maintainability**: Easy to find and update specific features
- **Scalability**: Can split routers into microservices later
- **Testing**: Each router can be tested independently

---

## Error Handling

### Current Implementation

The server relies on Express's default error handling:
- Unhandled errors return 500 status
- Error details logged to console
- Stack traces in development mode

### Recommended Error Middleware

```javascript
// Add after all routes
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});
```

---

## Security Considerations

### Current Security Posture

**Implemented**:
- ✅ Environment variable isolation
- ✅ CORS enabled (permissive)
- ✅ JSON body parsing with size limits (default)

**Missing** (Recommendations):
- ⚠️ Rate limiting (prevent abuse)
- ⚠️ Request validation (sanitize inputs)
- ⚠️ Authentication middleware (protect endpoints)
- ⚠️ HTTPS enforcement (production)
- ⚠️ Helmet.js (security headers)
- ⚠️ Input sanitization (prevent injection)

### Security Enhancements

#### 1. Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

#### 2. Helmet (Security Headers)

```javascript
import helmet from 'helmet';
app.use(helmet());
```

#### 3. Authentication Middleware

```javascript
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  // Verify token with Supabase or JWT
  try {
    const user = await verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.use('/api/keys', authenticate);
```

---

## Performance Considerations

### Current Performance Characteristics

**Strengths**:
- ✅ Lightweight Express server
- ✅ Efficient WebSocket connections
- ✅ CRDT-based collaboration (minimal data transfer)

**Potential Bottlenecks**:
- ⚠️ Database introspection (can be slow for large databases)
- ⚠️ OpenAI API calls (external dependency)
- ⚠️ No caching layer
- ⚠️ Single-threaded Node.js (CPU-bound operations)

### Performance Optimizations

#### 1. Response Caching

```javascript
import apicache from 'apicache';
let cache = apicache.middleware;

app.use('/api/introspect', cache('5 minutes'));
```

#### 2. Compression

```javascript
import compression from 'compression';
app.use(compression());
```

#### 3. Connection Pooling

For database introspection, implement connection pooling:

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
  max: 20, // maximum pool size
  idleTimeoutMillis: 30000
});
```

---

## Monitoring & Logging

### Current Logging

```javascript
console.log(`[WS] client connected to ${req.url}`);
console.log(`[SchemaForge Server] HTTP  → http://${host}:${port}`);
```

**Format**: Prefixed console logs with component identifiers

### Recommended Logging Strategy

#### 1. Structured Logging

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

#### 2. Request Logging

```javascript
import morgan from 'morgan';
app.use(morgan('combined'));
```

#### 3. Performance Monitoring

```javascript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});
```

---

## Deployment Guide

### Local Development

1. **Install Dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment**:
   ```bash
   # server/.env
   SUPABASE_SERVICE_ROLE_KEY=your_key_here
   PORT=3001
   ```

3. **Start Server**:
   ```bash
   node index.js
   ```

4. **Verify**:
   ```bash
   curl http://localhost:3001/api/health
   ```

### Production Deployment (Railway/Heroku)

1. **Set Environment Variables**:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=prod_key
   PORT=3001  # Usually auto-set by platform
   NODE_ENV=production
   ```

2. **Deploy**:
   ```bash
   git push railway main
   # or
   git push heroku main
   ```

3. **Health Check**:
   ```bash
   curl https://your-app.railway.app/api/health
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
```

**Build & Run**:
```bash
docker build -t schemaforge-server .
docker run -p 3001:3001 --env-file .env schemaforge-server
```

---

## Testing Strategy

### Unit Tests

Test individual routers and utilities:

```javascript
// tests/routes/postgres.test.js
import request from 'supertest';
import app from '../server/index.js';

describe('PostgreSQL Introspection', () => {
  it('should connect to database', async () => {
    const response = await request(app)
      .post('/api/introspect/postgres/connect')
      .send({ connectionString: 'postgresql://...' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('tables');
  });
});
```

### Integration Tests

Test full request/response cycles:

```javascript
describe('Health Check', () => {
  it('should return ok status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
```

### WebSocket Tests

Test real-time collaboration:

```javascript
import WebSocket from 'ws';

describe('WebSocket Server', () => {
  it('should accept connections', (done) => {
    const ws = new WebSocket('ws://localhost:3001/?room=test');
    ws.on('open', () => {
      ws.close();
      done();
    });
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. "SUPABASE_SERVICE_ROLE_KEY ✗ missing"

**Cause**: Environment variable not loaded  
**Solution**: 
- Check `server/.env` file exists
- Verify `.env` is not in `.gitignore`
- Ensure `loadEnv.js` is imported first

#### 2. "Port 3001 already in use"

**Cause**: Another process is using the port  
**Solution**:
```bash
# Find process
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process or change PORT
export PORT=3002
```

#### 3. "WebSocket connection failed"

**Cause**: CORS or network configuration  
**Solution**:
- Verify server is running
- Check firewall settings
- Ensure WebSocket URL matches server URL
- Test with `wscat -c ws://localhost:3001/?room=test`

#### 4. "Cannot find module './routes/...'"

**Cause**: Missing route files or incorrect paths  
**Solution**:
- Verify all route files exist
- Check import paths (ES modules require `.js` extension)
- Ensure file names match exactly (case-sensitive)

---

## API Endpoint Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/introspect/postgres/*` | PostgreSQL introspection |
| POST | `/api/introspect/mysql/*` | MySQL introspection |
| POST | `/api/openai/*` | AI integration |
| GET/POST/DELETE | `/api/keys/*` | API key management |
| POST | `/api/mcp/call` | MCP gateway |
| WS | `ws://host:port/?room=<id>` | Real-time collaboration |

---

## Future Enhancements

### Planned Features

1. **Authentication & Authorization**:
   - JWT-based authentication
   - Role-based access control (RBAC)
   - OAuth integration (Google, GitHub)

2. **Database Support**:
   - SQLite introspection
   - MongoDB schema extraction
   - Redis data structure analysis

3. **Collaboration Features**:
   - Presence indicators (who's online)
   - Chat/comments system
   - Change history/audit log

4. **Performance**:
   - Redis caching layer
   - GraphQL API option
   - Horizontal scaling support

5. **Monitoring**:
   - Prometheus metrics
   - Grafana dashboards
   - Error tracking (Sentry)

6. **Developer Experience**:
   - OpenAPI/Swagger documentation
   - SDK generation (TypeScript, Python)
   - Webhook support

---

## Technical Specifications

### Protocol Support

- **HTTP/1.1**: REST API endpoints
- **WebSocket**: Real-time collaboration (Yjs)
- **JSON**: Request/response format

### Concurrency Model

- **Single-threaded**: Node.js event loop
- **Non-blocking I/O**: Async/await throughout
- **WebSocket Connections**: Handled by `ws` library

### Scalability

**Current Limitations**:
- Single server instance
- In-memory WebSocket state
- No distributed coordination

**Scaling Options**:
- **Horizontal**: Multiple server instances with Redis pub/sub
- **Vertical**: Increase server resources
- **Hybrid**: Separate HTTP and WebSocket servers

---

## Dependencies Analysis

### Production Dependencies

| Package | Purpose | Critical? |
|---------|---------|-----------|
| `express` | HTTP server framework | ✅ Yes |
| `cors` | Cross-origin request handling | ✅ Yes |
| `ws` | WebSocket server | ✅ Yes |
| `y-websocket` | Yjs WebSocket provider | ✅ Yes |
| `dotenv` | Environment configuration | ✅ Yes |

### Route Dependencies

Each router may have additional dependencies:
- `pg` - PostgreSQL client
- `mysql2` - MySQL client
- `openai` - OpenAI API client
- `@supabase/supabase-js` - Supabase client

---

## Conclusion

The SchemaForge Server is a robust, production-ready backend that combines traditional REST API patterns with modern real-time collaboration capabilities. Its modular architecture, comprehensive routing system, and Yjs-powered WebSocket server make it an ideal foundation for collaborative database design tools.

**Key Strengths**:
- ✅ Dual protocol support (HTTP + WebSocket)
- ✅ Real-time collaboration via Yjs CRDT
- ✅ Modular routing architecture
- ✅ Flexible environment configuration
- ✅ Multi-database introspection support
- ✅ AI integration ready
- ✅ MCP protocol gateway

**Ideal For**:
- Collaborative database design
- Real-time schema editing
- Database introspection and migration
- AI-assisted database modeling
- Multi-user development environments

---

*Documentation generated for SchemaForge Server*  
*Last Updated: 2024*
