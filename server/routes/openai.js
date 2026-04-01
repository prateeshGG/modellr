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
      temperature: 0.1, // Highly deterministic
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

export default router;
