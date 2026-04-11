# `openai.js` — Route Documentation

> **Location:** `server/routes/openai.js`  
> **Type:** Express Router Module  
> **Purpose:** Acts as the backend AI proxy layer for Modellr, bridging the frontend to OpenAI's API. Exposes three distinct endpoints for schema modification via structured AI output, real-time streaming text, and full schema generation from a natural language prompt.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Code Structure & Organization](#3-code-structure--organization)
4. [Zod Schema Definitions](#4-zod-schema-definitions)
   - [`FieldSchema`](#fieldschema)
   - [`OperationSchema`](#operationschema)
   - [`AIResponseSchema`](#airesponseschema)
5. [Endpoints](#5-endpoints)
   - [POST `/modify` — Structured Schema Modification](#post-modify--structured-schema-modification)
   - [POST `/stream` — Streaming Chat Proxy](#post-stream--streaming-chat-proxy)
   - [POST `/generate` — Schema Generation from Prompt](#post-generate--schema-generation-from-prompt)
6. [Prompt Engineering Details](#6-prompt-engineering-details)
7. [Data Shapes & Schemas](#7-data-shapes--schemas)
8. [Error Handling](#8-error-handling)
9. [Configuration & Environment Variables](#9-configuration--environment-variables)
10. [Notable Patterns & Conventions](#10-notable-patterns--conventions)
11. [Known Caveats & Limitations](#11-known-caveats--limitations)
12. [Usage Examples](#12-usage-examples)

---

## 1. File Overview

`openai.js` is the **AI intelligence layer** of Modellr's backend. It proxies three distinct categories of OpenAI API calls, each serving a different feature on the frontend:

| Endpoint | Feature | Output Type |
|---|---|---|
| `POST /modify` | AI-driven schema editing via natural language | Structured JSON (validated by Zod) |
| `POST /stream` | AI chat suggestions, field descriptions, contextual hints | Server-Sent Events (SSE stream) |
| `POST /generate` | Generate a full schema from a plain-text description | Raw JSON schema object |

All endpoints use the `gpt-4o-mini` model and retrieve the API key exclusively from the server-side environment variable `OPENAI_API_KEY`, preventing key exposure to the client.

---

## 2. Dependencies & Imports

```js
import express from 'express';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
```

| Package | Role |
|---|---|
| `express` | HTTP routing — `Router()` |
| `openai` | Official OpenAI Node.js SDK; used for the structured output endpoint |
| `openai/helpers/zod` | Helper that converts a Zod schema into OpenAI's `response_format` parameter |
| `zod` | Runtime schema validation and type enforcement for structured AI outputs |

### Why `openai` SDK for `/modify` but raw `fetch` for `/stream` and `/generate`?

- The `/modify` endpoint uses `openai.chat.completions.parse()` — an SDK-specific method that natively integrates structured output parsing with Zod. This is not available in a standard `fetch` call.
- `/stream` and `/generate` use raw `fetch` to the OpenAI REST API directly, giving finer control over stream piping and response forwarding without SDK overhead.

---

## 3. Code Structure & Organization

```
openai.js
├── Imports                              (lines 1–5)
├── Router Initialization                (line 6)
├── Zod Schema Definitions
│   ├── FieldSchema                      (lines 9–17)
│   ├── OperationSchema                  (lines 19–36)
│   └── AIResponseSchema                 (lines 38–41)
├── POST /modify                         (lines 43–86)   — Structured schema operations
├── POST /stream                         (lines 89–125)  — SSE streaming proxy
├── POST /generate                       (lines 128–192) — Natural language → JSON schema
└── export default router                (line 194)
```

---

## 4. Zod Schema Definitions

These schemas serve a dual purpose: they **constrain the AI's output** at the OpenAI API level (via `zodResponseFormat`) and **validate/parse** the response in JavaScript.

---

### `FieldSchema`

**Lines:** 9–17

Describes a single database column/field.

```ts
{
  name: string;
  type: string;           // PostgreSQL standard type, e.g. "uuid", "varchar(255)"
  isPK: boolean;          // default: false
  unique: boolean;        // default: false
  nullable: boolean;      // default: false
  isFK: boolean;          // default: false
  default: string | null | undefined;  // .nullish()
}
```

| Property | Zod Definition | Notes |
|---|---|---|
| `name` | `z.string()` | Column name |
| `type` | `z.string().describe(...)` | Has an `.describe()` hint directing the AI to use PostgreSQL types |
| `isPK` | `z.boolean().default(false)` | Defaults prevent AI from omitting these fields |
| `unique` | `z.boolean().default(false)` | |
| `nullable` | `z.boolean().default(false)` | |
| `isFK` | `z.boolean().default(false)` | |
| `default` | `z.string().nullish()` | Allows `null`, `undefined`, or a string value |

---

### `OperationSchema`

**Lines:** 19–36

Describes a **single atomic change** the AI instructs the canvas to make.

```ts
{
  action: 'add_table' | 'remove_table' | 'add_field' | 'modify_field' | 'remove_field' | 'add_relationship';
  tableName: string;
  fieldName?: string | null;
  newFields?: FieldSchema[] | null;
  fieldUpdates?: {
    name?: string | null;
    type?: string | null;
    isPK?: boolean | null;
    unique?: boolean | null;
    nullable?: boolean | null;
    isFK?: boolean | null;
    default?: string | null;
  } | null;
  relationTargetTable?: string | null;
  relationTargetField?: string | null;
  relationCardinality?: 'one-to-many' | 'one-to-one' | 'many-to-many' | null;
}
```

#### Action-specific field usage:

| `action` | Required fields | Optional fields |
|---|---|---|
| `add_table` | `tableName`, `newFields` (full field list) | — |
| `remove_table` | `tableName` | — |
| `add_field` | `tableName`, `newFields` (array of 1) | — |
| `modify_field` | `tableName`, `fieldName`, `fieldUpdates` | — |
| `remove_field` | `tableName`, `fieldName` | — |
| `add_relationship` | `tableName`, `relationTargetTable`, `relationTargetField`, `relationCardinality` | `fieldName` |

---

### `AIResponseSchema`

**Lines:** 38–41

The top-level response structure returned by the `/modify` endpoint.

```ts
{
  analysis: string;            // 1-2 sentence explanation of the changes
  operations: OperationSchema[]; // Ordered list of operations to apply
}
```

- `analysis` provides a brief, human-readable rationale for the AI's decision.
- `operations` is an **ordered sequence** — the frontend applies them in order to mutate the canvas state.

---

## 5. Endpoints

### POST `/modify` — Structured Schema Modification

**Lines:** 43–86  
**Full path (when mounted):** `POST /api/openai/modify`

#### Purpose
Accepts the user's natural language instruction and the current full schema context, then returns a precise, validated list of schema operations to perform.

#### Request Body

```json
{
  "prompt": "Add a reviews table with user_id, product_id foreign keys and a rating field",
  "currentSchema": {
    "tables": [ ... ],
    "relationships": [ ... ]
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | ✅ | Natural language instruction from the user |
| `currentSchema` | `object` | ✅ | Full current schema canvas state (tables + relationships) |

#### How It Works

```
Validate env key → Validate request body
          ↓
new OpenAI({ apiKey })
          ↓
openai.chat.completions.parse({
  model: 'gpt-4o-mini',
  messages: [system_prompt + schema_context + user_prompt],
  response_format: zodResponseFormat(AIResponseSchema, 'schema_modifications'),
  temperature: 0.1   ← very low for deterministic, precise output
})
          ↓
completion.choices[0].message.parsed  ← Already a validated JS object
          ↓
res.json({ success: true, response: parsedResult })
```

#### Response

```json
{
  "success": true,
  "response": {
    "analysis": "Adding a reviews table with FK relationships to users and products, plus a rating column.",
    "operations": [
      {
        "action": "add_table",
        "tableName": "reviews",
        "newFields": [
          { "name": "id", "type": "bigserial", "isPK": true, "nullable": false, "isFK": false, "unique": false },
          { "name": "user_id", "type": "bigint", "isPK": false, "nullable": false, "isFK": true, "unique": false },
          { "name": "rating", "type": "integer", "isPK": false, "nullable": false, "isFK": false, "unique": false }
        ]
      },
      {
        "action": "add_relationship",
        "tableName": "reviews",
        "fieldName": "user_id",
        "relationTargetTable": "users",
        "relationTargetField": "id",
        "relationCardinality": "one-to-many"
      }
    ]
  }
}
```

---

### POST `/stream` — Streaming Chat Proxy

**Lines:** 89–125  
**Full path (when mounted):** `POST /api/openai/stream`

#### Purpose
A lightweight SSE (Server-Sent Events) proxy for real-time streaming responses. Used for AI-powered contextual suggestions, field description generation, or freeform chat within the Modellr UI.

#### Request Body

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful database design assistant." },
    { "role": "user", "content": "What's a good default for a created_at field?" }
  ],
  "max_tokens": 800,
  "temperature": 0.4
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `messages` | `array` | ✅ | — | OpenAI chat messages array |
| `max_tokens` | `number` | ❌ | `800` | Max output tokens |
| `temperature` | `number` | ❌ | `0.4` | Model creativity level |

#### How It Works

```
Validate env key → Validate messages
          ↓
fetch('https://api.openai.com/v1/chat/completions', {
  stream: true,
  model: 'gpt-4o-mini',
  ...
})
          ↓
if (!upstream.ok) → forward error status + message
          ↓
res.setHeader('Content-Type', 'text/event-stream')
res.setHeader('Cache-Control', 'no-cache')
          ↓
upstream.body.pipe(res)   ← Raw SSE stream pass-through
```

The SSE stream is **piped directly** from OpenAI's response to the client response — no buffering or parsing. This minimizes latency and keeps the server stateless.

#### Response

A raw `text/event-stream` response with OpenAI's standard SSE format:
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","choices":[{"delta":{"content":"NOW"}}]}

data: {"id":"chatcmpl-...","choices":[{"delta":{"content":" use"}}]}

data: [DONE]
```

---

### POST `/generate` — Schema Generation from Prompt

**Lines:** 128–192  
**Full path (when mounted):** `POST /api/openai/generate`

#### Purpose
Given a plain-text application description, generates a complete, ready-to-use database schema (tables + fields + relationships) in JSON format. This powers the "generate schema from scratch" feature in Modellr.

#### Request Body

```json
{
  "prompt": "An e-commerce platform with customers, products, orders, and reviews"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | ✅ | Plain-text description of the application or domain |

#### How It Works

```
Validate env key → Validate prompt
          ↓
fetch OpenAI with:
  model: 'gpt-4o-mini'
  response_format: { type: 'json_object' }
  temperature: 0.2
  max_tokens: 1200
  messages: [detailed_system_prompt + user_prompt]
          ↓
if (!upstream.ok) → forward error
          ↓
const data = await upstream.json()
res.json(data)    ← Forward the raw completion response
```

> **Note:** Unlike `/modify`, this endpoint uses `response_format: { type: 'json_object' }` — a simpler OpenAI JSON mode (no Zod validation). The generated schema is forwarded as-is and the frontend is responsible for interpreting and normalizing it into canvas state.

#### Expected AI Output (inside `choices[0].message.content`)

```json
{
  "tables": [
    {
      "name": "customers",
      "fields": [
        { "name": "id", "type": "bigserial", "isPK": true, "nullable": false },
        { "name": "email", "type": "varchar", "nullable": false },
        { "name": "created_at", "type": "timestamptz", "nullable": false }
      ]
    },
    {
      "name": "orders",
      "fields": [
        { "name": "id", "type": "bigserial", "isPK": true, "nullable": false },
        { "name": "customer_id", "type": "bigint", "nullable": false }
      ]
    }
  ],
  "relationships": [
    { "from": "orders", "fromField": "customer_id", "to": "customers", "toField": "id", "cardinality": "one-to-many" }
  ]
}
```

---

## 6. Prompt Engineering Details

### `/modify` System Prompt

```
You are Modellr AI, an expert Database Architect acting directly on a visual schema canvas.
Given the current JSON context of the user's schema and their prompt, output the exact sequence of
structural Operations needed to modify their schema to fulfill their request.
Ensure all field types conform to standard PostgreSQL formatting.
```

Key design choices:
- **Role framing:** "Database Architect acting directly on a canvas" — encourages the model to think in terms of discrete, actionable mutations rather than descriptions.
- **`temperature: 0.1`** — Near-deterministic: avoids creative leaps that could break schema consistency.
- **Full schema JSON in context:** The model sees the entire current state, preventing hallucinated table/field names.

---

### `/generate` System Prompt (condensed)

```
You are a database schema designer. Given a description, output a JSON schema object.

Rules:
- Output ONLY valid JSON, no markdown, no explanation
- Use snake_case for all table and field names
- Include appropriate id field (bigserial PK) for each table
- Include created_at (timestamptz) for important tables
- Use realistic PostgreSQL types: text, varchar, integer, bigint, bigserial, boolean, timestamptz, numeric, jsonb, uuid
- Infer foreign key relationships from context
```

Key design choices:
- **Explicit output format** with a JSON template embedded in the prompt — minimizes schema shape hallucinations.
- **`temperature: 0.2`** — Low creativity; consistent, structured output preferred.
- **`response_format: { type: 'json_object' }`** — Guarantees the output is valid JSON.
- **`max_tokens: 1200`** — Allows a moderately complex schema to be fully generated.

---

## 7. Data Shapes & Schemas

### Environment Variables Required

| Variable | Used In | Notes |
|---|---|---|
| `OPENAI_API_KEY` | All three endpoints | Checked at request time, not at startup |

### Common Error Responses

| Condition | Status | Body |
|---|---|---|
| Missing `OPENAI_API_KEY` | `500` | `{ error: 'OpenAI API key missing on server' }` |
| Missing required body fields | `400` | `{ error: 'Missing prompt or currentSchema context' }` etc. |
| Zod parse failed (`/modify`) | `500` | `{ error: 'Failed to parse AI structured output' }` |
| OpenAI API error | Forwarded status | `{ error: <openai_error_message> }` |
| Unexpected exception | `500` | `{ error: error.message }` |

---

## 8. Error Handling

| Endpoint | Strategy |
|---|---|
| `/modify` | `try/catch` wraps SDK call; checks `parsedResult` for null |
| `/stream` | Checks `upstream.ok`; `try/catch` for network errors |
| `/generate` | Checks `upstream.ok`; `try/catch` for network errors |

All endpoints log errors to `console.error` with a labeled prefix (`[OpenAI Error]`, `[OpenAI Stream Error]`, `[OpenAI Generate Error]`) for easy server log filtering.

---

## 9. Configuration & Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI secret key. **Never sent to the client.** Loaded from `.env` at server startup. |

The key is read inside the request handler (`process.env.OPENAI_API_KEY`) rather than at module load time — this means if the env var is added/updated after startup (e.g. in hot-reload dev), it picks up the current value.

---

## 10. Notable Patterns & Conventions

- **Server-side API key guard:** The key is never exposed to the browser. All three endpoints check for it as the very first step and return `500` if absent.
- **Zod for structured AI output:** `zodResponseFormat` + `openai.chat.completions.parse()` is a robust pattern — the Zod schema is both documentation and runtime enforcement of the AI's output shape.
- **Ordered operations array:** The AI's output for `/modify` is an **ordered sequence** of operations, allowing the frontend to replay them step-by-step against canvas state — like a command pattern.
- **Stream piping:** `upstream.body.pipe(res)` is the most efficient way to proxy an SSE stream — zero buffering, lowest latency, server just acts as a relay.
- **Low temperature for structural tasks:** `/modify` uses `0.1` and `/generate` uses `0.2` — both very low, optimizing for consistency and correctness over creativity.
- **`.describe()` on Zod fields:** Zod's `.describe()` adds metadata that `zodResponseFormat` includes in the JSON Schema sent to OpenAI, acting as inline instructions to the model about each field's purpose.

---

## 11. Known Caveats & Limitations

| Issue | Description |
|---|---|
| **No rate limiting** | Requests are forwarded directly to OpenAI without any rate-limiting middleware. High traffic could cause OpenAI quota exhaustion or unexpected costs. |
| **No authentication on these routes** | The OpenAI routes only check for `OPENAI_API_KEY` — not for a logged-in user. Any client with network access to the server can call these endpoints. |
| **`/generate` output not Zod-validated** | The schema from `/generate` is forwarded raw. If the AI deviates from the expected format, the frontend could receive malformed data. |
| **`unique` field in `FieldSchema`** | `unique` is defined in the Zod schema but `FieldSchema` doesn't have a `.describe()` hint on it, meaning the AI may not always populate it correctly. |
| **Single model hardcoded** | `gpt-4o-mini` is hardcoded in all three endpoints with no way to switch models from the request or config. |
| **Stream error mid-pipe** | If OpenAI cuts the stream partway through, the error won't be caught and delivered cleanly — the client's stream will simply terminate. |

---

## 12. Usage Examples

### POST `/modify`

```http
POST /api/openai/modify
Content-Type: application/json

{
  "prompt": "Add a tags table and link it to articles with a many-to-many relationship",
  "currentSchema": {
    "tables": [
      { "name": "articles", "fields": [{ "name": "id", "type": "bigserial", "isPK": true }] }
    ],
    "relationships": []
  }
}
```

---

### POST `/stream`

```http
POST /api/openai/stream
Content-Type: application/json

{
  "messages": [
    { "role": "system", "content": "You are a helpful PostgreSQL database advisor." },
    { "role": "user", "content": "What type should I use for storing monetary values?" }
  ],
  "max_tokens": 300,
  "temperature": 0.3
}
```

**Client-side consumption:**

```js
const res = await fetch('/api/openai/stream', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

---

### POST `/generate`

```http
POST /api/openai/generate
Content-Type: application/json

{
  "prompt": "A project management tool with users, projects, tasks, and comments"
}
```

---

*Generated documentation for Modellr — `server/routes/openai.js`*
