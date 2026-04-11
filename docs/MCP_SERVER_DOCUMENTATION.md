# SchemaForge MCP Server - Comprehensive Documentation

## Overview

The SchemaForge MCP (Model Context Protocol) Server is a bridge that enables AI agents (like Claude, Cursor, Windsurf) to interact with SchemaForge database schema diagrams. It implements the Model Context Protocol standard, allowing AI assistants to read, modify, and generate SQL from visual database schemas stored in SchemaForge.

**Location**: `mcp-server/index.js`  
**Package**: `mcp-server/package.json`  
**Version**: 1.0.0  
**Type**: ES Module (ESM)

---

## Architecture & Purpose

### What is MCP?

Model Context Protocol (MCP) is a standardized way for AI agents to access external tools and data sources. This server acts as a protocol adapter that:

1. **Exposes SchemaForge capabilities** as MCP tools
2. **Authenticates requests** using bearer tokens
3. **Proxies tool calls** to the SchemaForge API
4. **Supports multiple transport modes** (stdio for local, SSE for cloud)

### Deployment Modes

The server supports two distinct operational modes:

#### 1. **Local Mode (Stdio Transport)**
- Used by desktop AI IDEs (Cursor, Windsurf, Claude Desktop)
- Communication via standard input/output streams
- Direct process-to-process communication
- Activated when `PORT` environment variable is NOT set

#### 2. **Cloud Mode (SSE Transport)**
- Used for cloud deployments (Railway, Heroku, etc.)
- Communication via Server-Sent Events over HTTP
- Exposes endpoints: `GET /sse` and `POST /messages`
- Activated when `PORT` environment variable IS set

---

## Environment Configuration

### Required Environment Variables

```bash
SCHEMA_FORGE_TOKEN=sfk_live_xxxxxxxxxxxxx
```

**Purpose**: Authentication token for SchemaForge API  
**Format**: Starts with `sfk_live_` or `sfk_test_`  
**Behavior**: Server exits immediately if missing (in local mode)

### Optional Environment Variables

```bash
SCHEMA_FORGE_API_URL=http://localhost:3001/api/mcp/call
```

**Purpose**: Override the SchemaForge API endpoint  
**Default**: `http://localhost:3001/api/mcp/call` (local development)  
**Production**: Would be `https://api.schemaforge.com/api/mcp/call`

```bash
PORT=3000
```

**Purpose**: Enable cloud deployment mode with SSE transport  
**Effect**: When set, server runs as HTTP server instead of stdio

---

## Dependencies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | ^1.29.0 | Official MCP SDK for server implementation |
| `express` | ^5.2.1 | HTTP server for cloud deployment mode |
| `@supabase/supabase-js` | ^2.101.1 | Supabase client (likely for future features) |
| `bcryptjs` | ^3.0.3 | Password hashing (likely for future features) |
| `dotenv` | ^17.3.1 | Environment variable management |

### Import Structure

```javascript
// MCP SDK Components
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

// HTTP Server
import express from 'express';

// Schema Definitions
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
```

---

## Server Initialization

### Server Configuration

```javascript
const server = new Server(
  {
    name: 'schemaforge_mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
```

**Server Metadata**:
- **Name**: `schemaforge_mcp` - Identifier for the MCP server
- **Version**: `1.0.0` - Semantic version
- **Capabilities**: Declares that this server provides `tools`

---

## Available Tools

The server exposes 8 tools for interacting with SchemaForge schemas:

### 1. `schemaforge_list_schemas`

**Description**: Lists all available database schemas for the authenticated user

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Use Case**: Discovery - find schema IDs before performing operations

**Example Response**:
```json
[
  {
    "id": "uuid-1234",
    "name": "E-commerce Database",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### 2. `schemaforge_read_schema`

**Description**: Reads the complete structural state of a database schema canvas

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" }
  },
  "required": ["id"]
}
```

**Parameters**:
- `id` (required): UUID of the schema to read

**Use Case**: Retrieve current schema structure for analysis or modification

**Example Response**:
```json
{
  "id": "uuid-1234",
  "name": "E-commerce Database",
  "tables": [
    {
      "id": "table-1",
      "name": "users",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "primaryKey": true
        }
      ]
    }
  ],
  "relationships": []
}
```

---

### 3. `schemaforge_update_schema`

**Description**: Completely overwrites the remote database schema canvas

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "tables": { "type": "array" },
    "relationships": { "type": "array" }
  },
  "required": ["id", "tables"]
}
```

**Parameters**:
- `id` (required): UUID of the schema to update
- `tables` (required): Complete array of table definitions
- `relationships` (optional): Array of relationship definitions

**Use Case**: Full schema replacement or major restructuring

**Warning**: This is a destructive operation - it replaces the entire schema

---

### 4. `schemaforge_add_table`

**Description**: Adds a new table to an existing schema without affecting other tables

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "table": { "type": "object" }
  },
  "required": ["id", "table"]
}
```

**Parameters**:
- `id` (required): UUID of the schema
- `table` (required): Table definition object

**Use Case**: Incremental schema building

**Example Input**:
```json
{
  "id": "uuid-1234",
  "table": {
    "name": "orders",
    "fields": [
      { "name": "id", "type": "uuid", "primaryKey": true },
      { "name": "user_id", "type": "uuid" },
      { "name": "total", "type": "decimal" }
    ]
  }
}
```

---

### 5. `schemaforge_modify_table`

**Description**: Updates a specific table in the schema

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "tableName": { "type": "string" },
    "updates": { "type": "object" }
  },
  "required": ["id", "tableName", "updates"]
}
```

**Parameters**:
- `id` (required): UUID of the schema
- `tableName` (required): Name of the table to modify
- `updates` (required): Object containing the changes

**Use Case**: Modify existing table structure (add/remove fields, change types)

**Example Input**:
```json
{
  "id": "uuid-1234",
  "tableName": "users",
  "updates": {
    "fields": [
      { "name": "email", "type": "varchar", "unique": true }
    ]
  }
}
```

---

### 6. `schemaforge_generate_postgres_sql`

**Description**: Generates standard PostgreSQL DDL (Data Definition Language) for the schema

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" }
  },
  "required": ["id"]
}
```

**Parameters**:
- `id` (required): UUID of the schema

**Use Case**: Export schema as executable SQL for PostgreSQL

**Example Response**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total DECIMAL(10,2)
);
```

---

### 7. `schemaforge_diff_schemas`

**Description**: Compares two schema versions and returns structural differences

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "oldId": { 
      "type": "string", 
      "description": "The UUID of the baseline schema" 
    },
    "newId": { 
      "type": "string", 
      "description": "The UUID of the updated schema" 
    }
  },
  "required": ["oldId", "newId"]
}
```

**Parameters**:
- `oldId` (required): UUID of the baseline schema
- `newId` (required): UUID of the updated schema

**Use Case**: Schema version comparison, change tracking

**Example Response**:
```json
{
  "added": {
    "tables": ["orders"],
    "fields": { "users": ["last_login"] }
  },
  "removed": {
    "tables": [],
    "fields": { "users": ["legacy_field"] }
  },
  "modified": {
    "fields": {
      "users.email": { "old": "varchar(100)", "new": "varchar(255)" }
    }
  }
}
```

---

### 8. `schemaforge_generate_migration`

**Description**: Generates PostgreSQL migration SQL (ALTER/CREATE/DROP statements)

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "oldId": { 
      "type": "string", 
      "description": "The UUID of the old schema version" 
    },
    "newId": { 
      "type": "string", 
      "description": "The UUID of the new schema version" 
    }
  },
  "required": ["oldId", "newId"]
}
```

**Parameters**:
- `oldId` (required): UUID of the old schema version
- `newId` (required): UUID of the new schema version

**Use Case**: Generate migration scripts for database updates

**Example Response**:
```sql
-- Migration from schema v1 to v2

ALTER TABLE users 
  ADD COLUMN last_login TIMESTAMP,
  DROP COLUMN legacy_field,
  ALTER COLUMN email TYPE VARCHAR(255);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total DECIMAL(10,2)
);
```

---

## Request Handling

### Tool Listing Handler

```javascript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [ /* array of 8 tool definitions */ ]
  };
});
```

**Purpose**: Responds to MCP `tools/list` requests  
**Returns**: Array of all available tools with their schemas  
**Called**: When AI agent initializes or refreshes tool list

---

### Tool Execution Handler

```javascript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ tool: name, arguments: args || {} })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        content: [{ type: 'text', text: `Error: ${data.error || 'Request failed'}` }], 
        isError: true 
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data.result, null, 2) }],
      isError: false,
    };
  } catch (error) {
    return { 
      content: [{ type: 'text', text: `Connection Failed: ${error.message}` }], 
      isError: true 
    };
  }
});
```

**Flow**:
1. Extract tool name and arguments from request
2. Forward request to SchemaForge API with authentication
3. Parse response and format for MCP
4. Handle errors gracefully with descriptive messages

**Error Handling**:
- **API Errors**: Returns error message from API response
- **Network Errors**: Returns connection failure message
- **All errors**: Marked with `isError: true` flag

---

## Transport Modes

### Local Mode (Stdio)

```javascript
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[SchemaForge MCP] Connected and listening on stdio.');
```

**Characteristics**:
- Direct stdin/stdout communication
- No network overhead
- Used by desktop AI IDEs
- Synchronous request/response

**Configuration Example** (Claude Desktop):
```json
{
  "mcpServers": {
    "schemaforge": {
      "command": "node",
      "args": ["path/to/mcp-server/index.js"],
      "env": {
        "SCHEMA_FORGE_TOKEN": "sfk_live_xxxxx"
      }
    }
  }
}
```

---

### Cloud Mode (SSE)

```javascript
const app = express();
let transport;

app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  }
});

const port = parseInt(process.env.PORT);
app.listen(port, "0.0.0.0", () => {
  console.error(`[SchemaForge MCP] SSE Server listening on 0.0.0.0:${port}`);
});
```

**Endpoints**:
- `GET /sse`: Establishes SSE connection for server-to-client messages
- `POST /messages`: Receives client-to-server messages

**Characteristics**:
- HTTP-based communication
- Supports cloud deployments
- Scalable architecture
- Binds to `0.0.0.0` for external access

**Deployment Platforms**:
- Railway
- Heroku
- Render
- Any platform supporting Node.js HTTP servers

---

## Error Handling & Validation

### Startup Validation

```javascript
if (!TOKEN) {
  console.error("Missing SCHEMA_FORGE_TOKEN. Add 'SCHEMA_FORGE_TOKEN': 'sfk_live_...' into your MCP environment variables.");
  if (!process.env.PORT) process.exit(1);
}
```

**Behavior**:
- Logs error message if token is missing
- Exits process in local mode (stdio)
- Continues in cloud mode (allows health checks)

### Runtime Error Handling

```javascript
run().catch((error) => {
  console.error('[SchemaForge MCP] Fatal error:', error);
  process.exit(1);
});
```

**Fatal Errors**:
- Transport connection failures
- Server initialization errors
- Unhandled promise rejections

---

## Package Configuration

### Package Metadata

```json
{
  "name": "mcp-server",
  "version": "1.0.0",
  "description": "Standard Model Context Protocol server connecting AI Agents to SchemaForge diagrams.",
  "main": "index.js",
  "type": "module"
}
```

**Key Points**:
- ES Module format (`"type": "module"`)
- Entry point: `index.js`
- Executable via npm/npx

### Binary Configuration

```json
{
  "bin": {
    "schemaforge-mcp": "./index.js"
  }
}
```

**Purpose**: Allows installation as global command  
**Usage**: `npx schemaforge-mcp` or `schemaforge-mcp` (if installed globally)

### Scripts

```json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

**Note**: No tests currently implemented

---

## Usage Examples

### Example 1: List All Schemas

**AI Agent Request**:
```
"List all my database schemas"
```

**MCP Tool Call**:
```json
{
  "tool": "schemaforge_list_schemas",
  "arguments": {}
}
```

**Response**:
```json
[
  { "id": "abc-123", "name": "Production DB" },
  { "id": "def-456", "name": "Staging DB" }
]
```

---

### Example 2: Read and Modify Schema

**AI Agent Request**:
```
"Add a 'created_at' timestamp field to the users table in schema abc-123"
```

**Step 1 - Read Schema**:
```json
{
  "tool": "schemaforge_read_schema",
  "arguments": { "id": "abc-123" }
}
```

**Step 2 - Modify Table**:
```json
{
  "tool": "schemaforge_modify_table",
  "arguments": {
    "id": "abc-123",
    "tableName": "users",
    "updates": {
      "fields": [
        { "name": "created_at", "type": "timestamp", "default": "NOW()" }
      ]
    }
  }
}
```

---

### Example 3: Generate Migration

**AI Agent Request**:
```
"Show me the SQL migration from schema v1 (old-id) to v2 (new-id)"
```

**MCP Tool Call**:
```json
{
  "tool": "schemaforge_generate_migration",
  "arguments": {
    "oldId": "old-id",
    "newId": "new-id"
  }
}
```

**Response**:
```sql
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
CREATE INDEX idx_users_email ON users(email);
```

---

## Security Considerations

### Authentication

- **Bearer Token**: All API requests include `Authorization: Bearer ${TOKEN}`
- **Token Format**: Must start with `sfk_live_` or `sfk_test_`
- **Token Storage**: Stored in environment variables (not in code)

### Network Security

- **Local Mode**: No network exposure (stdio only)
- **Cloud Mode**: Exposed HTTP endpoints (should use HTTPS in production)
- **CORS**: Not implemented (should be added for production)

### Input Validation

- **Schema Validation**: MCP SDK validates inputs against tool schemas
- **Type Checking**: All parameters have defined types
- **Required Fields**: Enforced by `required` arrays in schemas

---

## Logging & Debugging

### Log Levels

All logs use `console.error()` to avoid interfering with stdio transport:

```javascript
console.error('[SchemaForge MCP] Connected and listening on stdio.');
console.error(`[SchemaForge MCP] SSE Server listening on 0.0.0.0:${port}`);
console.error('[SchemaForge MCP] Fatal error:', error);
```

### Debug Information

**Startup Logs**:
- Token validation status
- Transport mode (stdio vs SSE)
- Server binding address and port (cloud mode)

**Error Logs**:
- Missing token warnings
- Connection failures
- Fatal errors with stack traces

---

## Integration Guide

### For AI IDE Users (Cursor, Windsurf, Claude Desktop)

1. **Install Dependencies**:
   ```bash
   cd mcp-server
   npm install
   ```

2. **Configure IDE** (example for Claude Desktop):
   ```json
   {
     "mcpServers": {
       "schemaforge": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-server/index.js"],
         "env": {
           "SCHEMA_FORGE_TOKEN": "sfk_live_your_token_here"
         }
       }
     }
   }
   ```

3. **Restart IDE** to load the MCP server

4. **Test Connection**:
   ```
   Ask AI: "List my SchemaForge schemas"
   ```

---

### For Cloud Deployment (Railway, Heroku)

1. **Set Environment Variables**:
   ```bash
   SCHEMA_FORGE_TOKEN=sfk_live_xxxxx
   SCHEMA_FORGE_API_URL=https://api.schemaforge.com/api/mcp/call
   PORT=3000
   ```

2. **Deploy**:
   ```bash
   git push railway main
   # or
   git push heroku main
   ```

3. **Verify Deployment**:
   ```bash
   curl https://your-app.railway.app/sse
   ```

4. **Connect AI Agent** to `https://your-app.railway.app`

---

## Future Enhancements

### Potential Improvements

1. **Authentication**:
   - Support for multiple authentication methods
   - Token refresh mechanism
   - API key rotation

2. **Caching**:
   - Cache schema reads to reduce API calls
   - Invalidation strategies

3. **Batch Operations**:
   - Add multiple tables in one call
   - Bulk modifications

4. **Webhooks**:
   - Real-time schema change notifications
   - Collaborative editing support

5. **Validation**:
   - Schema validation before updates
   - Constraint checking
   - Data type validation

6. **Monitoring**:
   - Request/response logging
   - Performance metrics
   - Error tracking

---

## Troubleshooting

### Common Issues

#### 1. "Missing SCHEMA_FORGE_TOKEN"

**Cause**: Environment variable not set  
**Solution**: Add token to environment or IDE configuration

#### 2. "Connection Failed"

**Cause**: API URL unreachable or incorrect  
**Solution**: Verify `SCHEMA_FORGE_API_URL` and network connectivity

#### 3. "Error: Request failed"

**Cause**: API returned error (auth, validation, etc.)  
**Solution**: Check token validity and request parameters

#### 4. Server Not Responding (Cloud Mode)

**Cause**: Port binding issues or firewall  
**Solution**: Verify `PORT` environment variable and network configuration

#### 5. Tools Not Appearing in AI IDE

**Cause**: MCP server not loaded or crashed  
**Solution**: Check IDE logs, restart IDE, verify configuration

---

## Technical Specifications

### Protocol Compliance

- **MCP Version**: Compatible with SDK v1.29.0
- **Transport Protocols**: Stdio, SSE
- **Message Format**: JSON-RPC 2.0 (via MCP SDK)

### Performance Characteristics

- **Latency**: Depends on API response time (typically 100-500ms)
- **Throughput**: Limited by API rate limits
- **Concurrency**: Single transport connection per instance

### Compatibility

- **Node.js**: Requires ES Module support (Node 14+)
- **Operating Systems**: Cross-platform (Windows, macOS, Linux)
- **AI Platforms**: Claude Desktop, Cursor, Windsurf, any MCP-compatible client

---

## Conclusion

The SchemaForge MCP Server is a robust, production-ready bridge between AI agents and SchemaForge's visual database design platform. It provides a standardized interface for schema manipulation, SQL generation, and version comparison, enabling AI-assisted database design workflows.

**Key Strengths**:
- ✅ Standards-compliant MCP implementation
- ✅ Dual transport mode support (local + cloud)
- ✅ Comprehensive tool set (8 operations)
- ✅ Secure authentication
- ✅ Graceful error handling
- ✅ Production-ready architecture

**Ideal For**:
- AI-assisted database design
- Schema version management
- Automated migration generation
- Collaborative database modeling
- Educational database design tools

---

*Documentation generated for SchemaForge MCP Server v1.0.0*  
*Last Updated: 2024*
