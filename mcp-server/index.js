#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// If users configure IDEs, they will provide this token.
const TOKEN = process.env.SCHEMA_FORGE_TOKEN;
// Local development points to local server; production would point to https://api.schemaforge.com
const API_URL = process.env.SCHEMA_FORGE_API_URL || 'http://localhost:3001/api/mcp/call';

if (!TOKEN) {
  console.error("Missing SCHEMA_FORGE_TOKEN. Add 'SCHEMA_FORGE_TOKEN': 'sfk_live_...' into your MCP environment variables.");
  if (!process.env.PORT) process.exit(1);
}

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

// ... [Tools listed here] ...
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'schemaforge_list_schemas',
        description: 'Lists all available SchemaForge database schemas for the authenticated user. Useful for finding the schema ID parameter to read the canvas state.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'schemaforge_read_schema',
        description: 'Reads the live structural relational canvas state of a specific database schema.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
      {
        name: 'schemaforge_update_schema',
        description: 'Overwrites the entire remote database schema canvas.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tables: { type: 'array' },
            relationships: { type: 'array' }
          },
          required: ['id', 'tables'],
        },
      },
      {
        name: 'schemaforge_add_table',
        description: 'Adds a new table to the existing remote database schema.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            table: { type: 'object' }
          },
          required: ['id', 'table'],
        },
      },
      {
        name: 'schemaforge_modify_table',
        description: 'Updates a specific table in the remote schema.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tableName: { type: 'string' },
            updates: { type: 'object' }
          },
          required: ['id', 'tableName', 'updates'],
        },
      },
      {
        name: 'schemaforge_generate_postgres_sql',
        description: 'Generates standard PostgreSQL DDL for the current schema.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
      {
        name: 'schemaforge_diff_schemas',
        description: 'Compares two database schemas and returns structural differences (added/removed/modified tables and fields).',
        inputSchema: {
          type: 'object',
          properties: {
            oldId: { type: 'string', description: 'The UUID of the baseline schema' },
            newId: { type: 'string', description: 'The UUID of the updated schema' }
          },
          required: ['oldId', 'newId'],
        },
      },
      {
        name: 'schemaforge_generate_migration',
        description: 'Generates the PostgreSQL ALTER/CREATE/DROP SQL needed to migrate from an old schema to a new one.',
        inputSchema: {
          type: 'object',
          properties: {
            oldId: { type: 'string', description: 'The UUID of the old schema version' },
            newId: { type: 'string', description: 'The UUID of the new schema version' }
          },
          required: ['oldId', 'newId'],
        },
      }
    ],
  };
});

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
      return { content: [{ type: 'text', text: `Error: ${data.error || 'Request failed'}` }], isError: true };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(data.result, null, 2) }],
      isError: false,
    };
  } catch (error) {
    return { content: [{ type: 'text', text: `Connection Failed: ${error.message}` }], isError: true };
  }
});

async function run() {
  if (process.env.PORT) {
    // Cloud Deployment (Railway) - Use SSE
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

  } else {
    // Local Usage (Stdio) - Cursor/Windsurf/Claude Desktop
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[SchemaForge MCP] Connected and listening on stdio.');
  }
}

run().catch((error) => {
  console.error('[SchemaForge MCP] Fatal error:', error);
  process.exit(1);
});
