# Editor Components — Documentation

> **Location:** `src/components/editor/`  
> **Type:** React Components — TypeScript/TSX  
> **Purpose:** Two components that together form the code output panel in the SchemaForge editor — a low-level CodeMirror 6 wrapper (`CodeEditor`) and a higher-level format-switching panel (`CodePanel`) that drives it with live schema exports.

---

## Overview

| File | Export | Role |
|---|---|---|
| `CodeEditor.tsx` | `CodeEditor` | Thin CodeMirror 6 wrapper — imperative editor lifecycle management |
| `CodePanel.tsx` | `CodePanel` | Format-switching export panel — drives `CodeEditor` with live-computed schema output |

**Relationship:** `CodePanel` renders `CodeEditor` in `readOnly={true}` mode. `CodeEditor` is a reusable component capable of both read-only display and editable input (`onChange` prop), though only the read-only path is currently used in production.

---

---

# `CodeEditor.tsx` — Component Documentation

> **Location:** `src/components/editor/CodeEditor.tsx`

## File Overview

A **React wrapper around CodeMirror 6** — the raw code editor engine. Manages the CodeMirror `EditorView` and `EditorState` imperatively via refs, exposing a React-friendly controlled interface (`value` + `onChange`). Uses the lower-level CodeMirror 6 API directly (not `@uiw/react-codemirror`), giving full control over extensions, themes, and lifecycle.

The component follows a **"mount once, sync externally"** pattern:
- Editor DOM is created once on mount (`useEffect([], [])`)
- External `value` changes are applied via `view.dispatch()` (not remount)
- Theme and read-only are wired via `Compartment` for hot-swapping

## Dependencies & Imports

```tsx
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { sql } from '@codemirror/lang-sql';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';
```

| Package | Role |
|---|---|
| `@codemirror/state` | Core editor state (`EditorState`, `Compartment`) |
| `@codemirror/view` | DOM rendering, keymaps, line numbers, selection display |
| `@codemirror/commands` | Default keyboard bindings + undo/redo history |
| `@codemirror/lang-sql` | SQL syntax parsing and highlighting grammar |
| `@codemirror/language` | Syntax highlighting, bracket matching |
| `@codemirror/autocomplete` | Auto-closing brackets |

## Props

```tsx
interface CodeEditorProps {
  value:      string;
  onChange?:  (value: string) => void;
  readOnly?:  boolean;  // default: false
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | required | The SQL text to display/edit |
| `onChange` | `(value: string) => void` | `undefined` | Called on every document change (only relevant when `readOnly={false}`) |
| `readOnly` | `boolean` | `false` | Disables user input via `EditorView.editable.of(false)` |

## Module-Level Constant — `themeCompartment`

```ts
const themeCompartment = new Compartment();
```

**Defined at module scope** — shared across all `CodeEditor` instances. A `Compartment` in CodeMirror 6 is a reconfigurable slot in the extension array, allowing hot-swapping a single extension (the theme) without rebuilding the entire editor.

> ⚠️ **Shared compartment issue:** Because `themeCompartment` is module-level, it is shared across all `CodeEditor` instances. If multiple `CodeEditor` components exist simultaneously, they all reference the same `Compartment` instance. This can cause incorrect behavior when dispatching `themeCompartment.reconfigure()` — it would need to target each view's specific compartment. Currently, theme is built once at mount time and never reconfigured (no `reconfigure` calls exist), so the bug is dormant.

## `buildTheme(isDark: boolean)` — Theme Factory

**Lines:** 18–69

Returns a `EditorView.theme(...)` extension object with CSS class overrides for the editor's DOM structure. Supports both dark and light mode via the `isDark` parameter.

**Styled elements:**

| Selector | Dark | Light | Purpose |
|---|---|---|---|
| `&` (root) | `transparent` bg | `transparent` bg | Inherits container background |
| `.cm-content` | caret `#85B7EB` | caret `#378ADD` | Text area + cursor color |
| `.cm-gutters` | `#353532` border | `#E4E2DA` border | Line number gutter |
| `.cm-activeLine` | `rgba(255,255,255,0.03)` | `rgba(0,0,0,0.03)` | Current line highlight |
| `.cm-selectionBackground` | `rgba(55,138,221,0.25)` | `rgba(55,138,221,0.15)` | Text selection |

**SQL Token Colors:**

| Token | Dark | Light |
|---|---|---|
| `.tok-keyword` | `#85B7EB` (blue) | `#185FA5` (dark blue) |
| `.tok-string` | `#97C459` (green) | `#639922` (dark green) |
| `.tok-number` | `#F5BC5A` (amber) | `#B9A717` (dark amber) |
| `.tok-comment` | `#686965` (gray, italic) | `#9B998F` (gray, italic) |
| `.tok-typeName` | `#A09AEB` (purple) | `#7F77DD` (purple) |
| `.tok-operator` | `#F07070` (red) | `#E24B4A` (red) |

## `isDark` — Theme Detection

```ts
const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
```

Reads `data-theme` from `document.documentElement` **synchronously at render time** — the same attribute that `useUIStore.toggleTheme()` writes to. Not reactive — if the theme changes after mount, the editor theme does not update (see caveats).

## Extensions Array — `useMemo`

```ts
const extensions = useMemo(() => [
  lineNumbers(),
  highlightActiveLine(),
  drawSelection(),
  history(),
  bracketMatching(),
  closeBrackets(),
  syntaxHighlighting(defaultHighlightStyle),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  sql(),
  themeCompartment.of(buildTheme(isDark)),
  EditorView.editable.of(!readOnly),
  EditorView.lineWrapping,
  EditorView.updateListener.of((update) => {
    if (update.docChanged && onChange) onChange(update.state.doc.toString());
  }),
], [readOnly, onChange, isDark]);
```

| Extension | Purpose |
|---|---|
| `lineNumbers()` | Left gutter with line numbers |
| `highlightActiveLine()` | Subtle highlight on current line |
| `drawSelection()` | Custom selection rendering |
| `history()` | Undo/redo support in the editor |
| `bracketMatching()` | Highlights matching `()`, `[]`, `{}` |
| `closeBrackets()` | Auto-inserts closing bracket on open |
| `syntaxHighlighting(defaultHighlightStyle)` | CSS token classes for syntax colors |
| `keymap.of([...defaultKeymap, ...historyKeymap])` | Standard shortcuts + Ctrl+Z/Ctrl+Y |
| `sql()` | SQL language parser and grammar |
| `themeCompartment.of(buildTheme(isDark))` | Theme extension (dark/light) |
| `EditorView.editable.of(!readOnly)` | Enables/disables user editing |
| `EditorView.lineWrapping` | Wraps long lines |
| `EditorView.updateListener.of(...)` | Fires `onChange` on every document mutation |

## Editor Lifecycle — Two `useEffect` calls

### Effect 1 — Initialize Editor Once

```ts
useEffect(() => {
  if (!containerRef.current) return;
  const state = EditorState.create({ doc: value, extensions });
  const view = new EditorView({ state, parent: containerRef.current });
  viewRef.current = view;
  return () => { view.destroy(); viewRef.current = null; };
}, []); // ← empty deps: runs once on mount only
```

- Creates `EditorState` with the initial `value` and compiled `extensions`.
- Mounts the `EditorView` directly into the `containerRef` DOM element.
- Cleanup: destroys the view on unmount (frees CodeMirror DOM + event listeners).
- **Empty dependency array** — intentionally runs only once. ESLint suppress comment acknowledges the missing `value` and `extensions` deps.

> The initial `value` is captured at mount time. Subsequent changes are handled by Effect 2, not by remounting.

### Effect 2 — Sync External Value

```ts
useEffect(() => {
  const view = viewRef.current;
  if (!view) return;
  const currentValue = view.state.doc.toString();
  if (currentValue === value) return;  // No-op if unchanged

  view.dispatch({
    changes: { from: 0, to: currentValue.length, insert: value },
  });
}, [value]);
```

When `value` prop changes (e.g. user switches export format), dispatches a document replacement transaction — replaces the full content efficiently without destroying/recreating the editor.

- **Guard:** `currentValue === value` prevents feedback loops where `onChange` triggers a state update, which re-renders with the same `value`, which would dispatch again.
- **Replace all:** `from: 0, to: currentValue.length` — replaces the entire document in one transaction. Cursor position and selection are lost.

## Rendered JSX

```tsx
<div
  ref={containerRef}
  className="code-editor"
  aria-label="SQL code editor"
  role="textbox"
  aria-multiline="true"
/>
```

An empty `<div>` — CodeMirror 6 appends its own DOM tree inside `containerRef.current` imperatively. React does not manage any children of this element.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **Theme not reactive to live changes** | `isDark` is read once at render. If the user toggles theme after mount, the editor theme does not update. A `themeCompartment.reconfigure(buildTheme(newIsDark))` dispatch would be needed |
| **`extensions` recreated when `onChange` changes** | `useMemo` includes `onChange` as a dep. If the parent passes a new callback reference on every render (not memoized), `extensions` rebuilds on every render — though the effect doesn't re-run (empty deps), the `updateListener` in the mounted editor still holds the old `onChange` closure |
| **`themeCompartment` is module-level** | Shared across all `CodeEditor` instances — potential conflict if multiple editors are mounted simultaneously and their themes diverge |
| **Cursor reset on `value` sync** | Dispatching `{ from: 0, to: length, insert: value }` replaces the entire document, which resets cursor/selection to the end |
| **`closeBrackets` in read-only mode** | When `readOnly={true}`, `EditorView.editable.of(false)` prevents input — but `closeBrackets()` is still registered in the extension array. Functionally harmless but slightly wasteful |
| **`role="textbox"` on container div** | CodeMirror renders its own accessible `role="textbox"` inside — the outer wrapper having this role is redundant and may confuse screen readers with nested `textbox` roles |

---

---

# `CodePanel.tsx` — Component Documentation

> **Location:** `src/components/editor/CodePanel.tsx`

## File Overview

The **code output panel** of the SchemaForge editor — a toolbar + read-only `CodeEditor` combination that live-generates schema code in the selected format. Supports five output formats with format tabs, a line count indicator, a copy-to-clipboard button, and a footer AI shortcut button.

## Dependencies & Imports

```tsx
import { CodeEditor } from './CodeEditor';
import { useSchemaStore } from '../../store/schema';
import { exportSQL }    from '../../utils/exporters/sql';
import { exportDBML }   from '../../utils/exporters/dbml';
import { exportPrisma } from '../../utils/exporters/prisma';
import { exportDrizzle } from '../../utils/exporters/drizzle';
```

| Import | Role |
|---|---|
| `CodeEditor` | Syntax-highlighted read-only code display |
| `useSchemaStore` | Live `tables`, `relationships`, `dialect` |
| `exportSQL` | Generates PostgreSQL/MySQL DDL |
| `exportDBML` | Generates DBML markup |
| `exportPrisma` | Generates `schema.prisma` text |
| `exportDrizzle` | Generates Drizzle ORM TypeScript schema |

## Format Type

```ts
type CodeFormat = 'sql' | 'dbml' | 'prisma' | 'drizzle' | 'json';
```

Five possible formats. Four are driven by dedicated exporter functions; `'json'` uses `JSON.stringify` inline.

## State

| State | Type | Initial | Description |
|---|---|---|---|
| `format` | `CodeFormat` | `'sql'` | Currently selected output format |
| `copied` | `boolean` | `false` | Shows "✓ Copied" feedback for 1.5s after clipboard write |

## Live Code Generation — `useMemo`

```ts
const code = useMemo(() => {
  switch (format) {
    case 'sql':    return exportSQL(tables, relationships, dialect);
    case 'dbml':   return exportDBML(tables, relationships);
    case 'prisma': return exportPrisma(tables, relationships);
    case 'drizzle':return exportDrizzle(tables, relationships);
    case 'json':   return JSON.stringify({ tables, relationships }, null, 2);
    default:       return '';
  }
}, [tables, relationships, dialect, format]);
```

`code` is recomputed whenever `tables`, `relationships`, `dialect`, or `format` changes. Each exporter is a pure function — safe for memoization.

**Format notes:**

| Format | Exporter | Dialect-aware? | Notes |
|---|---|---|---|
| `sql` | `exportSQL` | ✅ Yes — uses `dialect` | Generates `CREATE TABLE` DDL |
| `dbml` | `exportDBML` | ❌ No | Generates DBML for dbdiagram.io etc. |
| `prisma` | `exportPrisma` | ❌ No | Generates `schema.prisma` |
| `drizzle` | `exportDrizzle` | ❌ No | Generates Drizzle ORM TypeScript schema |
| `json` | `JSON.stringify` | ❌ No | Raw internal schema state (debug/portability) |

> The `json` format exposes the **raw internal data model** — full `tables` and `relationships` arrays with all IDs, positions, accent colors, etc. This is useful for developers and for re-importing, but the output includes non-semantic internal fields (position `{x,y}`, `accentColor`, `groupId`).

## `handleCopy` — Clipboard Write

```ts
const handleCopy = useCallback(async () => {
  try {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  } catch {
    // clipboard access denied — silently ignored
  }
}, [code]);
```

- Uses `navigator.clipboard.writeText` — requires secure context (HTTPS or localhost) and user permission.
- On failure (permission denied, non-HTTPS): silently no-ops — `copied` remains `false`, no error is shown to the user.
- Auto-resets `copied` to `false` after 1.5 seconds via `setTimeout`.

## Line Count

```ts
const lineCount = code.split('\n').length;
```

Calculated on every render — `code.split('\n').length` is O(n) but for typical schema exports (hundreds of lines) this is negligible.

## Format Tab Rendering

```tsx
{(['sql', 'dbml', 'prisma', 'drizzle'] as CodeFormat[]).map(f => (
  <button
    className={`format-tab ${format === f ? 'format-tab--active' : ''}`}
    onClick={() => setFormat(f)}
    role="tab"
    aria-selected={format === f}
  >
    {f.toUpperCase()}
  </button>
))}
```

Only four formats shown in tabs — `'json'` is **not included** in the tab array. `json` format is reachable programmatically but has no UI button — it appears to be an intentionally hidden debug format.

## Layout Structure

```
<div class="code-panel">
  │
  ├── Toolbar (code-panel__toolbar)
  │     ├── Format tabs: [SQL] [DBML] [PRISMA] [DRIZZLE]   (tablist)
  │     └── Right side:
  │           ├── "{N} lines"  (line count)
  │           └── [⎘ Copy / ✓ Copied]  (copy button)
  │
  ├── Editor (code-panel__editor)
  │     └── <CodeEditor value={code} readOnly={true} />
  │
  └── Footer (code-panel__footer)
        ├── Dialect badge: "{dialect}"   (e.g. "postgres")
        ├── "Read-only — edit via canvas"  (hint text)
        └── [✦ Ask AI about this schema]  (AI button)
```

## AI Button — `sf:open-ai-generate` Event

```tsx
<button
  onClick={() => window.dispatchEvent(new CustomEvent('sf:open-ai-generate'))}
  title="Open AI Chat"
>
  ✦ Ask AI about this schema
</button>
```

Fires the global `sf:open-ai-generate` custom event. `AIBottomDrawer` listens for this event (via its own `useEffect` in `AIBottomDrawer.tsx`) and can pre-fill a prompt from `e.detail.initialPrompt`.

> Here the event is dispatched **without a `detail` payload** — no `initialPrompt` is set. The drawer opens to a blank input (the event listener in `AIBottomDrawer` checks `e.detail?.initialPrompt` which will be `undefined`). A useful enhancement would be to include the current schema summary or a starter prompt like `"Analyze this schema"`.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **`json` format hidden from UI** | The `'json'` `CodeFormat` is defined and generates output, but has no tab button — users can't access it from the panel |
| **Clipboard failure is silent** | Copy errors (HTTPS requirement, permission denied) show no feedback — user sees nothing wrong |
| **`readOnly={true}` hardcoded** | `CodeEditor` is always read-only in `CodePanel`. The `CodeEditor` `onChange` prop is not used here — the panel does not support SQL import from the code view |
| **`dialect` only affects SQL format** | `dialect` from the store is in the `useMemo` deps but only passed to `exportSQL` — changing dialect while on another format tab still triggers recompute |
| **`sf:open-ai-generate` fires without prompt** | No `detail.initialPrompt` — AI drawer opens empty |
| **`format-tab` buttons missing `type="button"`** | Inside a form context, `<button>` defaults to `type="submit"`. Not an issue here (no wrapping `<form>`) but a best-practice gap |
| **No `aria-controls`/`tabpanel` on tabs** | `role="tab"` buttons without an associated `role="tabpanel"` aria pattern — partially accessible |

---

## Component Interaction Overview

```
useSchemaStore
  ├── tables
  ├── relationships
  └── dialect
        │
        ▼
CodePanel
  ├── useMemo → code string
  │     ├── exportSQL    (format = 'sql')
  │     ├── exportDBML   (format = 'dbml')
  │     ├── exportPrisma (format = 'prisma')
  │     ├── exportDrizzle(format = 'drizzle')
  │     └── JSON.stringify (format = 'json')
  │
  ├── <CodeEditor value={code} readOnly={true} />
  │     ├── CodeMirror 6 EditorView (imperative)
  │     ├── Effect 1: mount once (EditorState.create + EditorView)
  │     └── Effect 2: sync value (view.dispatch replace-all)
  │
  └── window.dispatchEvent('sf:open-ai-generate')
        └── AIBottomDrawer listens → opens chat drawer
```

---

*Generated documentation for SchemaForge — `src/components/editor/`*
