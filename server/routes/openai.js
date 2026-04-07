import express from 'express';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const router = express.Router();

// Enforce structured outputs via Zod
const FieldSchema = z.object({
  name: z.string(),
  type: z.string().describe("PostgreSQL standard data type (e.g. uuid, varchar(255), integer)"),
  isPK: z.boolean().default(false),
  unique: z.boolean().default(false),
  nullable: z.boolean().default(false),
  isFK: z.boolean().default(false),
  default: z.string().nullish()
});

const OperationSchema = z.object({
  action: z.enum(['add_table', 'remove_table', 'add_field', 'modify_field', 'remove_field', 'add_relationship']),
  tableName: z.string().describe('The name of the table this operation acts on'),
  fieldName: z.string().nullish().describe('The name of the field this operation acts on (if applicable)'),
  newFields: z.array(FieldSchema).nullish().describe('Used when action=add_table (list of fields) or add_field (array of length 1)'),
  fieldUpdates: z.object({
    name: z.string().nullish(),
    type: z.string().nullish(),
    isPK: z.boolean().nullish(),
    unique: z.boolean().nullish(),
    nullable: z.boolean().nullish(),
    isFK: z.boolean().nullish(),
    default: z.string().nullish()
  }).nullish().describe('Used when action=modify_field'),
  relationTargetTable: z.string().nullish().describe('For action=add_relationship: The target table name'),
  relationTargetField: z.string().nullish().describe('For action=add_relationship: The target field name (usually id)'),
  relationCardinality: z.enum(['one-to-many', 'one-to-one', 'many-to-many']).nullish()
});

const AIResponseSchema = z.object({
  analysis: z.string().describe("Extremely brief reasoning for these exact changes (1-2 sentences)."),
  operations: z.array(OperationSchema).describe("The strictly ordered sequence of operations to apply to the schema canvas to fulfill the user's request.")
});

router.post('/modify', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key missing on server' });
  }

  const { prompt, currentSchema } = req.body;

  if (!prompt || !currentSchema) {
    return res.status(400).json({ error: 'Missing prompt or currentSchema context' });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are SchemaForge AI, an expert Database Architect acting directly on a visual schema canvas. Given the current JSON context of the user\'s schema and their prompt, output the exact sequence of structural Operations needed to modify their schema to fulfill their request. Ensure all field types conform to standard PostgreSQL formatting.'
        },
        {
          role: 'user',
          content: `CURRENT SCHEMA CONTEXT:\n${JSON.stringify(currentSchema, null, 2)}\n\nUSER REQUEST: ${prompt}`
        }
      ],
      response_format: zodResponseFormat(AIResponseSchema, "schema_modifications"),
      temperature: 0.1,
    });

    const parsedResult = completion.choices[0].message.parsed;

    if (!parsedResult) {
      return res.status(500).json({ error: 'Failed to parse AI structured output' });
    }

    res.json({ success: true, response: parsedResult });

  } catch (error) {
    console.error('[OpenAI Error]', error);
    res.status(500).json({ error: error.message || 'Unknown OpenAI proxy error' });
  }
});

// ── Streaming chat proxy (for AI Suggest / field description) ──────────────
router.post('/stream', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key missing on server' });

  const { messages, max_tokens = 800, temperature = 0.4 } = req.body;
  if (!messages) return res.status(400).json({ error: 'Missing messages' });

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        stream: true,
        max_tokens,
        temperature,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({ error: err?.error?.message || 'OpenAI error' });
    }

    // Pipe the SSE stream directly to the client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    upstream.body.pipe(res);
  } catch (error) {
    console.error('[OpenAI Stream Error]', error);
    res.status(500).json({ error: error.message || 'Proxy stream error' });
  }
});

// ── JSON schema generation proxy ───────────────────────────────────────────
router.post('/generate', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key missing on server' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a database schema designer. Given a description, output a JSON schema object.

Rules:
- Output ONLY valid JSON, no markdown, no explanation
- Use snake_case for all table and field names
- Include appropriate id field (bigserial PK) for each table
- Include created_at (timestamptz) for important tables
- Use realistic PostgreSQL types: text, varchar, integer, bigint, bigserial, boolean, timestamptz, numeric, jsonb, uuid
- Infer foreign key relationships from context

Output format:
{
  "tables": [
    {
      "name": "table_name",
      "fields": [
        { "name": "id", "type": "bigserial", "isPK": true, "nullable": false },
        { "name": "field_name", "type": "text", "nullable": false }
      ]
    }
  ],
  "relationships": [
    { "from": "orders", "fromField": "customer_id", "to": "customers", "toField": "id", "cardinality": "one-to-many" }
  ]
}`,
          },
          { role: 'user', content: `Design a database schema for: ${prompt}` },
        ],
        max_tokens: 1200,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({ error: err?.error?.message || 'OpenAI error' });
    }

    const data = await upstream.json();
    res.json(data);
  } catch (error) {
    console.error('[OpenAI Generate Error]', error);
    res.status(500).json({ error: error.message || 'Proxy generate error' });
  }
});

export default router;
