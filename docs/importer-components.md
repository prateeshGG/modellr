# Importer Components — Documentation

> **Location:** `src/components/importer/`  
> **Type:** React Components — TypeScript/TSX  
> **Purpose:** Two modal dialog components for importing database schemas into the canvas — one for pasting static schema text (SQL DDL or Prisma Schema Language), and one for connecting to a live database and introspecting it in real time.

---

## Overview

| File | Export | Role |
|---|---|---|
| `ImportDialog.tsx` | `ImportDialog` | Paste-based importer — SQL DDL or Prisma schema text → canvas |
| `LiveImportDialog.tsx` | `LiveImportDialog` | Live database importer — connection string → backend introspection → canvas |

Both dialogs call `useSchemaStore().importTables(tables, relationships)` on success, which **replaces the entire canvas** with the imported schema.

---

---

# `ImportDialog.tsx` — Component Documentation

> **Location:** `src/components/importer/ImportDialog.tsx`

## File Overview

A **paste-based schema import dialog**. Users paste SQL DDL or a Prisma schema into a `<textarea>`, and the dialog parses it client-side using the frontend importer utilities (`importSQL` or `importPrisma`). No server round-trip — fully local parsing.

## Dependencies & Imports

```tsx
import { importSQL }    from '../../utils/importers/sql';
import { importPrisma } from '../../utils/importers/prisma';
import { useSchemaStore } from '../../store/schema';
import { useUIStore }     from '../../store/ui';
```

| Import | Role |
|---|---|
| `importSQL` | Parses SQL DDL text → `{ tables, relationships, errors }` |
| `importPrisma` | Parses Prisma schema text → `{ tables, relationships, errors }` |
| `useSchemaStore` | `importTables` — applies parsed schema to canvas |
| `useUIStore` | `showToast` — success notification |

## Type Definitions

```ts
type ImportFormat = 'sql' | 'prisma';
```

## Module-Level Constants

### `PLACEHOLDERS`

```ts
const PLACEHOLDERS: Record<ImportFormat, string> = {
  sql: `-- Paste your SQL DDL here...\nCREATE TABLE users (...)\nCREATE TABLE posts (...)`,
  prisma: `// Paste your Prisma schema here...\nmodel User {...}\nmodel Post {...}`,
};
```

Multi-line placeholder examples shown in the textarea when empty — two full `CREATE TABLE` examples for SQL, two `model` blocks for Prisma. Users immediately see the expected format.

### `FORMAT_LABELS`

```ts
const FORMAT_LABELS: Record<ImportFormat, string> = {
  sql:    'SQL DDL',
  prisma: 'Prisma Schema',
};
```

Used in format tabs and the editor toolbar label.

## Props

```tsx
interface ImportDialogProps {
  onClose:       () => void;
  defaultFormat?: ImportFormat;  // default: 'sql'
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `onClose` | `() => void` | required | Called on cancel, close button, backdrop click, or after successful import |
| `defaultFormat` | `ImportFormat` | `'sql'` | Pre-selects a format tab when the dialog opens |

## State

| State | Type | Initial | Description |
|---|---|---|---|
| `format` | `ImportFormat` | `defaultFormat` | Currently selected import format |
| `text` | `string` | `''` | Current textarea content |
| `errors` | `string[]` | `[]` | Parse errors from the importer — displayed in red below the textarea |
| `imported` | `boolean` | `false` | `true` after a successful import — disables the button and triggers auto-close |

## Core Function — `handleImport()`

```ts
const handleImport = useCallback(() => {
  const result = format === 'sql'
    ? importSQL(text)
    : importPrisma(text);

  if (result.errors.length > 0 && result.tables.length === 0) {
    setErrors(result.errors);
    return;
  }

  importTables(result.tables, result.relationships);
  setImported(true);
  showToast(`Imported ${result.tables.length} table${...}`, 'success');
  setTimeout(() => onClose(), 800);
}, [text, format, importTables, showToast, onClose]);
```

### Error Handling Logic

```ts
if (result.errors.length > 0 && result.tables.length === 0) {
  setErrors(result.errors);
  return;
}
```

The importer may return **both errors and tables** — partial parse. If any tables were successfully parsed (even with some errors), the import proceeds anyway. Errors are only shown if **no tables at all** were extracted.

**Behaviour matrix:**

| `result.tables.length` | `result.errors.length` | Action |
|---|---|---|
| > 0 | 0 | Import proceeds, no errors shown |
| > 0 | > 0 | **Import proceeds despite errors** — partial success |
| 0 | > 0 | Import blocked, errors shown |
| 0 | 0 | Import proceeds (empty schema — `importTables([], [])` clears canvas) |

> ⚠️ The last case (both zero) would call `importTables([], [])` which clears the entire canvas — this can happen if the importer returns an empty result for valid but structureless input.

### Post-Import Flow

```ts
setImported(true);                      // Flips button to "✓ Imported!" + disables it
showToast(`Imported N tables`, 'success');
setTimeout(() => onClose(), 800);       // Auto-closes after 0.8 seconds
```

The 800ms delay gives the user time to see the "✓ Imported!" button state before the dialog disappears.

## `handlePaste()` — Clipboard Read

```ts
const handlePaste = useCallback(async () => {
  try {
    const clipText = await navigator.clipboard.readText();
    setText(clipText);
    setErrors([]);
    setTimeout(() => textareaRef.current?.focus(), 50);
  } catch { /* no clipboard permission */ }
}, []);
```

Reads from the clipboard and fills the textarea. Errors are cleared since new content was pasted. Clipboard permission denial is silently ignored.

## `handleFormatChange(f)` — Format Switching

```ts
const handleFormatChange = (f: ImportFormat) => {
  setFormat(f);
  setText('');    // Clears textarea on format switch
  setErrors([]);
  setTimeout(() => textareaRef.current?.focus(), 50);
};
```

Switching formats clears both the text and any displayed errors — prevents leftover SQL from being accidentally imported as Prisma and vice versa.

## Keyboard Shortcuts

```ts
const handleKeyDown = (e: React.KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleImport(); }
  if (e.key === 'Escape') { e.preventDefault(); onClose(); }
};
```

Attached to `import-dialog` div (not the textarea) via `onKeyDown`:
- `⌘↩` / `Ctrl+Enter` — runs import
- `Escape` — closes dialog (also shown in button label: "Import schema ⌘↩")

## JSX Structure

```
<div class="import-overlay">   (backdrop — click outside to close)
  <div class="import-dialog">  (modal)

    Header
    ├── "Import Schema" title
    ├── Description subtitle
    └── ✕ close button

    Format Tabs
    ├── [SQL DDL]        (import-dialog__format-tab)
    └── [Prisma Schema]

    Editor Area
    ├── Toolbar
    │     ├── Format label (e.g. "SQL DDL")
    │     ├── [⌘V Paste from clipboard] button
    │     └── [Clear] button
    └── <textarea autoFocus rows={16} placeholder={PLACEHOLDERS[format]} />

    Errors (if any)
    └── {errors.map(err => <div>⚠ {err}</div>)}

    Footer
    ├── Supported dialects hint
    │     SQL:    "PostgreSQL · MySQL · SQLite · SQL Server"
    │     Prisma: "Prisma Schema Language (PSL)"
    ├── [Cancel] button
    └── [Import schema ⌘↩ / ✓ Imported!] submit button
```

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Partial import on parse errors** | If some tables parse but others fail, import proceeds with partial results — user sees the success toast, not the errors |
| **Empty result clears canvas** | `importTables([], [])` is called if the parser returns 0 tables with 0 errors — silently wipes the canvas |
| **`showToast` cast to `any`** | `const { showToast } = useUIStore() as any` and `(showToast as any)?.()` — defensive double cast suggests `showToast` was not always in the store's TypeScript interface |
| **Auto-close delay is not canceled** | The 800ms `setTimeout` for `onClose` is not cleared on unmount — if the user closes the dialog manually before 800ms, `onClose` is called twice (once manually, once by the timeout) |
| **`autoFocus` on textarea** | The textarea auto-focuses on dialog open. Switching tabs calls `setTimeout(() => textareaRef.current?.focus(), 50)` — needed because `autoFocus` only works on initial mount |
| **No file drag-and-drop** | Import is paste/type only — no support for dragging a `.sql` or `.prisma` file onto the dialog (contrast: `SchemaCanvas` supports file drop) |

---

---

# `LiveImportDialog.tsx` — Component Documentation

> **Location:** `src/components/importer/LiveImportDialog.tsx`

## File Overview

A **live database introspection dialog**. Users enter a connection string for a running PostgreSQL or MySQL database, and the dialog POSTs it to the backend API (`/api/introspect/:dialect`), which connects to the database, queries its schema, and returns a normalized `{ tables, relationships }` response. The result is applied to the canvas.

Unlike `ImportDialog`, this dialog requires a **server round-trip** and actual network access to the target database.

## Dependencies & Imports

```tsx
import { useSchemaStore } from '../../store/schema';
import { useUIStore }     from '../../store/ui';
```

No frontend importer utilities — all parsing happens on the backend.

## Props

```tsx
interface LiveImportDialogProps {
  onClose: () => void;
}
```

Minimal — only a close callback. No pre-selection options.

## State

| State | Type | Initial | Description |
|---|---|---|---|
| `url` | `string` | `''` | Connection string input value |
| `dialect` | `'postgres' \| 'mysql'` | `'postgres'` | Selected database type |
| `loading` | `boolean` | `false` | `true` while the introspection request is in-flight |
| `error` | `string \| null` | `null` | Error message to display (API or network error) |

## Escape Key Handling

```ts
useEffect(() => {
  inputRef.current?.focus();
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [onClose]);
```

- Focuses the input on mount.
- Adds a global `keydown` listener for Escape — cleans up on unmount.
- Uses `window.addEventListener` rather than `onKeyDown` on the form — catches Escape even when focus is elsewhere in the dialog.

## `handleImport()` — Introspection Request

**Lines:** 28–61

```ts
const handleImport = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!url.trim()) return;

  setLoading(true);
  setError(null);

  try {
    const res = await fetch(`/api/introspect/${dialect}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString: url.trim() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? `Server error ${res.status}`);
    }

    const data = await res.json();

    if (!data.tables || data.tables.length === 0) {
      throw new Error('No tables found in this database schema.');
    }

    importTables(data.tables, data.relationships || []);
    showToast(`Imported ${data.tables.length} tables from ${dialect === 'postgres' ? 'PostgreSQL' : 'MySQL'}`, 'success');
    onClose();
  } catch (err: any) {
    setError(err.message || 'Failed to connect to database');
  } finally {
    setLoading(false);
  }
};
```

### API Endpoint

| Property | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/introspect/postgres` or `/api/introspect/mysql` |
| **Request body** | `{ connectionString: string }` |
| **Response (success)** | `{ tables: Table[], relationships: Relationship[] }` |
| **Response (error)** | `{ error: string }` |

The `/api/introspect/:dialect` route is implemented by `server/routes/postgres.js` (for `postgres`) and `server/routes/mysql.js` (for `mysql`) respectively on the backend.

### Error Handling

Three error sources handled:
1. **HTTP error (`!res.ok`)** — extracts `err.error` from JSON response body, falls back to `"Server error {status}"`
2. **Empty table set** — `data.tables.length === 0` throws a user-friendly message
3. **Network/parse failure** — caught by the outer `catch`, displays `err.message`

All errors set `setError(message)` and are displayed in a red alert block with a warning icon.

## Security — `type="password"` Input

```tsx
<input
  id="live-conn-string"
  type="password"
  className="live-dialog__input"
  placeholder={placeholders[dialect]}
  ...
  autoComplete="off"
/>
```

The connection string is rendered as `type="password"`:
- **Masks the input** — prevents shoulder surfing of credentials
- **`autoComplete="off"`** — prevents browser from storing the connection string in saved passwords
- Combined with the footer note: "Credentials are never logged or persisted"

> **Security note (backend):** The connection string contains plaintext credentials. The backend (`postgres.js` / `mysql.js` routes) should ensure: (1) credentials are not logged, (2) the connection is closed immediately after introspection, (3) only schema metadata queries are executed (no data access). These guarantees exist in the backend routes but are enforced separately from this component.

## Connection String Placeholders

```ts
const placeholders: Record<typeof dialect, string> = {
  postgres: 'postgresql://user:password@localhost:5432/dbname',
  mysql:    'mysql://user:password@localhost:3306/dbname',
};
```

Format hints shown as `<input placeholder>` and also in the `<p class="live-dialog__hint">` below the input — two-level guidance.

## Dialect Tabs

```tsx
<button type="button" className="live-dialog__tab"
        onClick={() => setDialect('postgres')}
        aria-pressed={dialect === 'postgres'}>
  [globe icon] PostgreSQL
</button>
<button type="button" className="live-dialog__tab"
        onClick={() => setDialect('mysql')}
        aria-pressed={dialect === 'mysql'}>
  [globe icon] MySQL
</button>
```

- `type="button"` explicitly set — prevents form submission on tab click.
- `aria-pressed` — advertises toggle state to assistive technology.
- Both tabs use the **same SVG icon** (globe/world icon) — no visual distinction between PostgreSQL and MySQL beyond the label text.

## Form Submit

```tsx
<form className="live-dialog__body" onSubmit={handleImport}>
  {/* ... */}
  <button type="submit" disabled={loading || !url.trim()}>
    Connect & import
  </button>
</form>
```

Uses a `<form>` with `onSubmit` — supports Enter key to submit naturally (no manual `onKeyDown` handler needed for submit). The Escape key is handled separately via the global `window` listener.

## JSX Structure

```
<div class="live-overlay">   (backdrop — click directly on backdrop to close)
  <div class="live-dialog">  (stops click propagation)

    Header
    ├── Database cylinder SVG icon
    ├── "Connect live database" title
    ├── Description: "Introspect an existing database..."
    └── ✕ close button

    Dialect Tabs (outside form)
    ├── [🌐 PostgreSQL]   (aria-pressed)
    └── [🌐 MySQL]

    <form onSubmit={handleImport}>
      Connection String Field
      ├── Label: "Connection string"
      ├── [🔒 icon] <input type="password" id="live-conn-string" />
      └── <p> Format hint string </p>

      Error Block (if error)
      └── [⚠ icon] {error message}

      Footer
      ├── [🛡 "Credentials are never logged or persisted"]
      └── Actions:
            ├── [Cancel] button (type="button")
            └── [Connect & import / ⏳ Introspecting…] (type="submit")
    </form>

  </div>
</div>
```

## Backdrop Close vs Dialog Content

```tsx
<div className="live-overlay" onClick={onClose}>
  <div className="live-dialog" onClick={(e) => e.stopPropagation()}>
```

Clicking the dark backdrop calls `onClose()`. The inner dialog stops propagation, so clicking anywhere inside the dialog does not close it. Pattern identical to other Modellr modals.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Connection string in memory** | The URL is React state — it exists in memory during the session but is never persisted to localStorage/cookie/Supabase. The `type="password"` + `autoComplete="off"` supports this claim |
| **Backend trust boundary** | The component trusts the backend to not log credentials — no client-side guarantee. If the backend is compromised or adds logging, credentials could be exposed |
| **Error from backend vs client** | Three error paths all funnel into `setError(message)` — users see one consistent error block regardless of source |
| **Both tabs use the same SVG** | PostgreSQL and MySQL dialect tabs render the same generic globe SVG — no brand-specific icons (Postgres elephant / MySQL dolphin) |
| **No connection test / ping** | Dialog goes straight to full introspection — no way to test the connection before committing |
| **`relationships || []`** | `data.relationships || []` — the backend may return `null` or omit relationships for empty schemas. Safe guard. |
| **No abort on dialog close** | If the user closes the dialog while `loading` is `true`, the fetch continues in the background and may call `importTables` + `onClose` (which is already gone) after the dialog unmounts |
| **`onClose` in `useEffect` deps** | Correct — if `onClose` reference changes, the old listener is removed and a new one registered |

---

## Import Flow Comparison

```
ImportDialog (Paste-based)                LiveImportDialog (Live DB)
─────────────────────────────────────────────────────────────────────
User pastes SQL / Prisma text             User enters connection string
        │                                          │
        ▼                                          ▼
importSQL() or importPrisma()             POST /api/introspect/:dialect
  (client-side, synchronous)               { connectionString }
        │                                          │
        ▼                                          ▼
{ tables, relationships, errors }         Backend connects to DB
        │                                 Runs INFORMATION_SCHEMA queries
        │ if tables == 0 → show errors    Returns { tables, relationships }
        ▼                                          │
importTables(tables, relationships)  ◄─────────────┘
  (replaces entire canvas)
        │
        ▼
showToast + onClose()
```

---

*Generated documentation for Modellr — `src/components/importer/`*
