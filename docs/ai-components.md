# AI Components — Documentation

> **Location:** `src/components/ai/`  
> **Type:** React Components — TypeScript/TSX  
> **Purpose:** Two AI-powered UI components that form the AI interaction layer of the SchemaForge editor — a persistent chat drawer for iterative schema modifications, and a combined panel/dialog module for table-specific AI analysis and full schema generation from natural language.

---

## Overview

| File | Exports | Purpose |
|---|---|---|
| `AIBottomDrawer.tsx` | `AIBottomDrawer` | Slide-up chat interface for conversational schema modifications |
| `AISuggest.tsx` | `AISuggestPanel`, `AIGenerateDialog` | Per-table AI analysis panel + full schema generation dialog |

---

---

# `AIBottomDrawer.tsx` — Component Documentation

> **Location:** `src/components/ai/AIBottomDrawer.tsx`

## File Overview

A **persistent chat-style AI assistant drawer** that allows users to conversationally modify their schema. The user types a natural language instruction (e.g. *"Add a payments table"*, *"Normalize my users table"*), and the AI responds with an analysis and a list of **proposed structural operations**. The user can then **Accept & Apply** or **Reject** the changes before they are committed to the canvas.

This is the primary AI interaction surface in the editor — it mediates between the user's intent and `applyAIOperations()` in the schema store.

## Dependencies & Imports

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { useSchemaStore } from '../../store/schema';
import { Bot, ChevronDown, Send, CheckCircle2, XCircle } from 'lucide-react';
import './AIBottomDrawer.css';
```

| Import | Role |
|---|---|
| `useSchemaStore` | Reads `tables` + `relationships` for schema context; calls `applyAIOperations` |
| `Bot`, `ChevronDown`, `Send`, `CheckCircle2`, `XCircle` | Lucide icons for the chat UI |
| `AIBottomDrawer.css` | Component-scoped styles |

## Type Definitions

### `Message`

```ts
interface Message {
  id:          string;
  role:        'user' | 'assistant';
  content?:    string;      // Display text (analysis / user message)
  operations?: any[];       // Proposed schema operation objects
  applied?:    boolean;     // Whether operations have been committed to canvas
}
```

| Field | Description |
|---|---|
| `operations` | Array of AI-generated operation objects (see `applyAIOperations` in `schema.ts`) |
| `applied` | Flipped to `true` after the user clicks "Accept & Apply" — hides the diff card, shows a confirmation badge |

## Exported Component — `AIBottomDrawer`

**Signature:**
```tsx
export const AIBottomDrawer: React.FC<{
  isOpen:  boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => { ... }
```

| Prop | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Controls visibility — renders `null` when `false` |
| `onClose` | `() => void` | Called when the close (`ChevronDown`) button is clicked |

## State

| State | Type | Initial Value | Description |
|---|---|---|---|
| `messages` | `Message[]` | `[initialMsg]` | Full chat history; always starts with a welcome message |
| `input` | `string` | `''` | Current text input value |
| `loading` | `boolean` | `false` | `true` while the AI request is in-flight |

## Effects

### Auto-scroll to Latest Message

```ts
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

Scrolls the chat container to the bottom on every new message — keeps the newest content visible.

### `sf:open-ai-generate` Event Listener

```ts
useEffect(() => {
  const handler = (e: any) => {
    if (e.detail?.initialPrompt) setInput(e.detail.initialPrompt);
  };
  window.addEventListener('sf:open-ai-generate', handler);
  return () => window.removeEventListener('sf:open-ai-generate', handler);
}, []);
```

Listens for the global `sf:open-ai-generate` custom event. When fired with an `initialPrompt` detail (e.g. from a keyboard shortcut or toolbar button), it pre-fills the input field — allowing external components to open the drawer and inject a starting prompt without direct prop coupling.

## Core Function — `handleSend()`

**Lines:** 40–82

```ts
const handleSend = async () => {
  if (!input.trim() || loading) return;
  // 1. Add user message to history
  // 2. POST to /api/openai/modify with { prompt, currentSchema: { tables, relationships } }
  // 3. Parse response → { response.analysis, response.operations[] }
  // 4. Add assistant message with operations
  // 5. On error → add error message
}
```

### API Call Details

| Property | Value |
|---|---|
| **Endpoint** | `${VITE_API_URL}/api/openai/modify` |
| **Method** | `POST` |
| **Body** | `{ prompt: string, currentSchema: { tables, relationships } }` |
| **Response shape** | `{ response: { analysis: string, operations: Operation[] } }` |

The entire current schema (`tables` + `relationships`) is sent with every request — provides the AI with full context for correctly scoped modifications.

### Message ID Generation

```ts
const userMsg = { id: Date.now().toString(), ... };
const assistantMsg = { id: (Date.now() + 1).toString(), ... };
```

IDs are timestamp strings — functionally unique for message list keys but not collision-safe if `handleSend` is called in rapid succession (the `loading` guard prevents this in practice).

## Core Function — `applyOperations(msgId, ops)`

```ts
const applyOperations = (msgId: string, ops: any[]) => {
  applyAIOperations(ops);   // Commits ops to schema store (one undo step)
  setMessages(prev =>
    prev.map(m => m.id === msgId ? { ...m, applied: true } : m)
  );
};
```

- Calls `useSchemaStore.applyAIOperations(ops)` — applies all operations atomically in a single store update (one zundo undo step).
- Marks the message as `applied: true` — replaces the diff card with a "Changes applied" confirmation badge.
- Operations are **not reversible** from the drawer UI itself — users must use `Ctrl+Z` to undo.

## JSX Structure

```
<div className="ai-drawer">
  ├── <div className="ai-drawer__header">
  │     ├── Bot icon + "SchemaForge AI"
  │     └── <button className="ai-drawer__close"> (ChevronDown)
  │
  ├── <div className="ai-drawer__chat">
  │     ├── messages.map(msg =>
  │     │     <div className="ai-message ai-message--{role}">
  │     │         ├── Bot icon (assistant only)
  │     │         └── <div className="ai-bubble">
  │     │               ├── <p>{msg.content}</p>
  │     │               ├── [Diff Card] if operations && !applied
  │     │               │     ├── Header: "Proposed Changes (N)"
  │     │               │     ├── Operation list with colored badges
  │     │               │     └── [Reject] [Accept & Apply] buttons
  │     │               └── [Applied Badge] if applied
  │     )
  │     ├── [Loading bubbles] if loading
  │     └── <div ref={messagesEndRef} /> (scroll anchor)
  │
  └── <div className="ai-drawer__input-area">
        ├── <input> (Enter key → handleSend)
        └── <button> Send icon
```

## Diff Card — Operation Badge Rendering

```tsx
<span className={`ai-diff-badge ai-diff-badge--${op.action.split('_')[0]}`}>
  {op.action.replace('_', ' ').toUpperCase()}
</span>
```

The badge CSS class is derived from the first word of the operation action:
- `add_table` → `ai-diff-badge--add` (green)
- `remove_table` → `ai-diff-badge--remove` (red)
- `add_field` → `ai-diff-badge--add`
- `modify_field` → `ai-diff-badge--modify` (amber)

Only the first `'_'` is replaced in the display label: `'add_relationship'` → `'ADD RELATIONSHIP'`.
> Note: `.replace('_', ' ')` only replaces the **first** underscore — `modify_field` renders correctly as `MODIFY FIELD`, but a hypothetical `add_many_to_many` would render as `ADD MANY_TO_MANY`.

## Loading Indicator

```tsx
<div className="ai-bubble ai-bubble--loading">
  <span/><span/><span/>
</div>
```

Three `<span>` elements styled in CSS as animated dots (typing indicator) — shown while `loading = true`.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Schema sent on every request** | Full `tables` + `relationships` serialized in the request body — large schemas increase payload size significantly |
| **No streaming** | Uses `/api/openai/modify` which returns a non-streaming JSON response — no progressive rendering for the AI response |
| **No abort on unmount** | `handleSend` has no `AbortController` — if the component unmounts mid-request, the fetch completes and calls `setMessages` on an unmounted component (React 18 suppresses the warning but it's still a leak) |
| **`reject` removes the message** | Clicking "Reject" calls `setMessages(prev => prev.filter(m => m.id !== msg.id))` — removes the entire AI message from history |
| **`isOpen` guard returns null** | `if (!isOpen) return null` — the component fully unmounts, losing chat history when closed and reopened |
| **Message IDs are timestamps** | `Date.now().toString()` — safe for a single user but not universally unique |

---

---

# `AISuggest.tsx` — Component Documentation

> **Location:** `src/components/ai/AISuggest.tsx`

## File Overview

Exports **two distinct AI components** that share the same file:

1. **`AISuggestPanel`** — A streaming AI analysis panel for a specific table. Auto-runs on mount and streams suggestions section by section using SSE.
2. **`AIGenerateDialog`** — A full-screen overlay dialog that generates a complete database schema from a natural language description and applies it to the canvas.

> **Important architectural note:** `AISuggestPanel` calls the OpenAI API **directly from the client** using `VITE_OPENAI_API_KEY` (for dev) or a proxied path (for prod) — unlike `AIBottomDrawer` and `useAI.ts` which always route through the backend. This is an architectural inconsistency within the codebase.

## Dependencies & Imports

```tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSchemaStore } from '../../store/schema';
import type { Table, Relationship } from '../../types/schema';
import type { AIStatus } from '../../hooks/useAI';
import { generateSchemaFromPrompt } from '../../hooks/useAI';
import './AISuggest.css';
```

| Import | Role |
|---|---|
| `useSchemaStore` | Read `tables` + `relationships` for AI context; `importTables` + `addRelationship` for applying |
| `AIStatus` | Type-only import for the status state machine |
| `generateSchemaFromPrompt` | Async function from `useAI.ts` — calls backend `/api/openai/generate` |

## Internal Helpers

### `getKey()` — API Key Retrieval

```ts
function getKey(): string {
  return (import.meta as any).env?.VITE_OPENAI_API_KEY ?? '';
}
```

Reads `VITE_OPENAI_API_KEY` directly from Vite env vars. Used only by `AISuggestPanel`.

> ⚠️ **Security note:** This exposes the OpenAI API key in the browser bundle — any visitor can read it from DevTools or network requests. This is a **client-side key exposure bug**. All production AI calls should route through the backend (as `AIBottomDrawer` and `useAI.ts` correctly do).

### `getEndpoint()` — API Endpoint

```ts
function getEndpoint(): string {
  const isDev = (import.meta as any).env?.DEV;
  return isDev
    ? '/api/openai/v1/chat/completions'      // proxied by Vite in dev
    : 'https://api.openai.com/v1/chat/completions';  // direct OpenAI in prod
}
```

In **development**: Vite proxy routes `/api/openai/...` to avoid CORS.  
In **production**: calls OpenAI's API directly from the browser — requires `VITE_OPENAI_API_KEY` to be in the bundle.

> This is the opposite of `AIBottomDrawer` / `useAI.ts` which always go through the backend. Both patterns exist in the codebase simultaneously.

### `tableToText(table)` — Prompt Serialization

```ts
function tableToText(table: Table): string {
  return `Table "${table.name}" (${table.fields
    .map(f => `${f.name} ${f.type}${f.isPK ? ' PK':''}${f.isFK ? ' FK':''}${!f.nullable ? ' NOT NULL':''}{f.unique ? ' UNIQUE':''}`)
    .join(', ')})`;
}
```

Identical to the same function in `useAI.ts` — duplicated here. Could be extracted to a shared utility.

---

---

## Export 1 — `AISuggestPanel`

> Lines: 32–197

### Purpose

Displays a streaming AI analysis for a specific canvas table. Intended to be rendered inside a table's properties panel or as a floating overlay. Auto-triggers analysis on mount.

### Props

```tsx
interface AISuggestPanelProps {
  table:   Table;      // The table to analyze
  onClose: () => void; // Callback to dismiss the panel
}
```

### State

| State | Type | Initial | Description |
|---|---|---|---|
| `text` | `string` | `''` | Accumulated streaming response text |
| `status` | `AIStatus` | `'idle'` | Status machine: idle → loading → streaming → done \| error |
| `error` | `string` | `''` | Error message if API call fails |

### `run()` — Streaming Analysis

**Lines:** 40–126

```ts
const run = useCallback(async () => {
  // 1. Abort any in-flight request
  // 2. Build schema context string (all tables + relationships)
  // 3. Validate API key (error if missing)
  // 4. POST to OpenAI (streaming)
  // 5. Read SSE stream chunk by chunk → accumulate in `text`
  // 6. Set status to 'done' when stream ends
}, [table, tables, relationships]);
```

**Model config:**
| Setting | Value |
|---|---|
| Model | `gpt-4o-mini` |
| `max_tokens` | `800` |
| `temperature` | `0.4` |
| `stream` | `true` |

**System prompt structure:**
```
You are a senior database architect. Analyze a database table and provide concise, actionable suggestions.
Format your response with these sections (use the exact emoji headers):
📋 Missing Fields — list specific columns this table likely needs, with types
🔑 Indexes — which columns should be indexed and why
⚡ Normalization — structural improvements if any
💡 Best Practices — data integrity, naming, or constraint tips
Keep each point to 1-2 sentences. Be direct and practical.
```

**Delta field extraction:**
```ts
const chunkText = delta.reasoning_content || delta.content || '';
```

Checks `delta.reasoning_content` first — this is a field from OpenAI's experimental reasoning models (o1/o3 series). For `gpt-4o-mini`, only `delta.content` is populated.

### Auto-run on Mount

```ts
useEffect(() => { run(); return () => abortRef.current?.abort(); }, []);
```

Empty dependency array — runs once on mount, aborts on unmount. The `run` function reference is not in the dep array (ESLint-suppress implied) to prevent re-running when `run` is re-created by `useCallback`.

### Auto-scroll as Text Streams

```ts
useEffect(() => {
  if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
}, [text]);
```

Keeps the bottom of the streaming text visible during token-by-token output.

### Text Formatting

```ts
const formattedText = text
  .replace(/📋/g, '\n📋')
  .replace(/🔑/g, '\n🔑')
  .replace(/⚡/g, '\n⚡')
  .replace(/💡/g, '\n💡');
```

Inserts newlines before each section emoji header — ensures each section starts on a new line regardless of how the model formats whitespace. Then split on `\n` and rendered with section-header vs bullet styling.

### Rendered Section Structure

```
ai-panel
├── ai-panel__header
│     ├── ✦ AI Analysis: {table.name}
│     └── [Stop | Retry] + [✕ Close]
│
└── ai-panel__body  (scrollable, ref=scrollRef)
      ├── [Loading dots] if status === 'loading'
      ├── [Error + Retry button] if error
      └── [Streaming text] if streaming | done
            ├── <div className="ai-result__section-header"> for emoji headers
            ├── <div className="ai-result__line ai-result__line--bullet"> for bullets
            └── <span className="ai-cursor">▌</span> while streaming
```

### Stop / Retry Controls

- **While streaming/loading:** Shows a "⏹ Stop" button — calls `abortRef.current?.abort()` and sets status to `'idle'`.
- **While idle/done/error:** Shows "↺ Retry" — calls `run()` to restart.

---

## Export 2 — `AIGenerateDialog`

> Lines: 204–376

### Purpose

A **full-screen modal overlay** that generates a complete database schema from a plain-English description. Users can provide a prompt or click one of four example chips. On success, the generated tables and relationships are applied directly to the canvas and the view is fit.

### Props

```tsx
interface AIGenerateDialogProps {
  onClose: () => void;
}
```

### State

| State | Type | Initial | Description |
|---|---|---|---|
| `prompt` | `string` | `''` | User's natural language input |
| `status` | `AIStatus` | `'idle'` | Generation state machine |
| `error` | `string` | `''` | Error message |
| `preview` | `string[]` | `[]` | Array of `"tableName (N fields)"` strings shown after generation |

### Example Prompts

```ts
const EXAMPLES = [
  'Multi-tenant SaaS with teams, users, roles and audit logs',
  'E-commerce with products, orders, cart and reviews',
  'Blog with posts, comments, tags, authors and subscriptions',
  'Hospital with patients, doctors, appointments and prescriptions',
];
```

Rendered as clickable chips — clicking one sets the `prompt` state directly.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `⌘↩` / `Ctrl+↩` | Trigger generation |
| `Escape` | Close dialog |
| Clicking outside dialog | Close dialog (overlay click guard) |

### `generate()` — Schema Generation & Application

**Lines:** 216–290

```ts
const generate = useCallback(async () => {
  // 1. Abort any in-flight
  // 2. Call generateSchemaFromPrompt(prompt, signal) → backend /api/openai/generate
  // 3. Dynamic import nanoid + ACCENT_COLORS
  // 4. Map API response tables → SchemaForge Table objects (with IDs + positions)
  // 5. Map API response relationships → Relationship objects (resolving by name)
  // 6. setPreview(table summaries)
  // 7. importTables(tables, rels) → replaces entire canvas
  // 8. Dispatch sf:fit-view after 150ms
}, [prompt, importTables, addRelationship]);
```

### Schema Normalization

The `generateSchemaFromPrompt` return shape uses different field names than the internal format:

| AI Response | Internal | Notes |
|---|---|---|
| `t.name` | `table.name` | Direct |
| `f.nullable !== false` | `field.nullable` | Defaults to `true` if not specified |
| `!!f.isPK` | `field.isPK` | Double-bang coerces to boolean |
| `r.from` | `sourceTableId` | Resolved by table name lookup |
| `r.fromField` | `sourceFieldId` | Resolved by field name within source table |
| `r.cardinality ?? 'one-to-many'` | `cardinality` | Safe default |

### 4-Column Grid Positioning

```ts
position: {
  x: 80 + (idx % 4) * 300,
  y: 80 + Math.floor(idx / 4) * 220,
}
```

Identical to the importers — tables placed in a 4-column grid. The `sf:fit-view` event fired at 150ms ensures the canvas zooms to show all generated tables.

### Canvas Application

```ts
importTables(tables, rels);
setTimeout(() => window.dispatchEvent(new CustomEvent('sf:fit-view')), 150);
```

`importTables` **replaces the entire canvas** — any existing schema is overwritten. There is no confirmation step before applying.

> The `setTimeout` of 150ms before `sf:fit-view` is a workaround to let the React Flow canvas re-render with the new nodes before triggering the fit animation.

### Dynamic Imports

```ts
const { nanoid } = await import('../../store/nanoid');
const { ACCENT_COLORS } = await import('../../utils/constants');
```

`nanoid` and `ACCENT_COLORS` are **dynamically imported** inside the async `generate()` function rather than at module load time. This is unusual — these are small, always-needed modules. The pattern may have been intended for code-splitting, but these modules are already statically imported elsewhere in the bundle.

### Preview Card

After successful generation, a preview of the created tables is shown:

```tsx
<div className="ai-gen-preview">
  <div className="ai-gen-preview__title">✓ Generated {preview.length} tables</div>
  <div className="ai-gen-preview__list">
    {preview.map(p => <span className="ai-gen-preview__tag">{p}</span>)}
  </div>
</div>
```

Shows tags like `"users (4 fields)"`, `"orders (5 fields)"`, etc.

### Dialog JSX Structure

```
<div className="ai-gen-overlay">  (backdrop — click to close)
  <div className="ai-gen-dialog">  (panel)
    ├── Header: ✦ icon + title + subtitle + ✕ button
    │
    ├── Body:
    │     ├── <textarea> prompt input (auto-focused, ⌘↩ triggers generate)
    │     ├── Example chips (4 clickable examples)
    │     ├── [Error message] if error
    │     └── [Preview tags] if done
    │
    └── Footer:
          ├── "⌘↩ to generate" hint
          └── Generate button: [Generating… | ✓ Applied | ✦ Generate schema]
```

## Notable Patterns & Caveats

### Both Components

| | Detail |
|---|---|
| **`useSchemaStore() as any`** | Both components cast the store to `any` — avoids TypeScript errors for properties that may not be fully typed on the store interface |
| **`tableToText` duplicated** | Both this file and `useAI.ts` define an identical `tableToText` helper — should be extracted to a shared utility |

### `AISuggestPanel` Specific

| | Detail |
|---|---|
| **Client-side API key exposure** | `VITE_OPENAI_API_KEY` read from env and sent in `Authorization` header from the browser — key is visible in DevTools network tab |
| **Direct OpenAI call in production** | `getEndpoint()` returns `https://api.openai.com/v1/chat/completions` directly in production — bypasses the backend security layer |
| **`run` not in `useEffect` deps** | `useEffect(() => { run(); }, [])` — empty deps suppresses ESLint warning about `run` as a missing dep. Intentional: avoids infinite re-run loop |
| **`delta.reasoning_content`** | Handles experimental reasoning model output — not used by `gpt-4o-mini` but won't break if present |

### `AIGenerateDialog` Specific

| | Detail |
|---|---|
| **No confirmation before overwrite** | `importTables(tables, rels)` replaces the entire canvas without a warning — existing schema is silently overwritten |
| **`addRelationship` in deps but unused** | `useCallback` includes `addRelationship` in deps but it's never called — relationships are passed to `importTables` directly |
| **150ms `setTimeout` for fit-view** | Magic number — assumes the canvas re-renders within 150ms. May fail on slow devices or very large generated schemas |
| **Dynamic import of trivial modules** | `await import('../../store/nanoid')` inside the async function — unnecessary; these are already in the bundle |
| **Relationships filtered by `Boolean`** | `.filter(Boolean)` removes `null` entries from relationship mapping (when source/target table/field can't be resolved by name) — silently drops invalid FK links |

---

## Architectural Consistency Note

Three different AI call paths exist in the codebase:

| Component / Hook | API Path | Key Location |
|---|---|---|
| `AISuggestPanel` | Direct OpenAI or Vite proxy | `VITE_OPENAI_API_KEY` — **client-side (insecure in prod)** |
| `AIBottomDrawer` | Backend `/api/openai/modify` | Backend env `OPENAI_API_KEY` — **secure** |
| `useAI.ts` (all exports) | Backend `/api/openai/stream` + `/generate` | Backend env `OPENAI_API_KEY` — **secure** |

`AISuggestPanel` is the **outlier** — it is the only surface that exposes the OpenAI key on the client side. This should be refactored to route through the backend like the other AI features.

---

*Generated documentation for SchemaForge — `src/components/ai/`*
