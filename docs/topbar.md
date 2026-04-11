# `TopBar.tsx` — Component Documentation

> **Location:** `src/components/topbar/TopBar.tsx`  
> **Type:** React Component — TypeScript/TSX  
> **Purpose:** The primary editor toolbar rendered at the top of the editor page. A three-zone horizontal bar containing navigation controls, project naming, search/AI/mode-switching, dialect selection, import/diff/share/export actions, theme toggle, and settings. The most feature-dense single component in the editor shell.

---

## Table of Contents

1. [File Overview](#1-file-overview)
2. [Dependencies & Imports](#2-dependencies--imports)
3. [Props](#3-props)
4. [State](#4-state)
5. [Zone: Left](#5-zone-left)
6. [Zone: Center](#6-zone-center)
7. [Zone: Right](#7-zone-right)
8. [Export Handler — `handleExport()`](#8-export-handler--handleexport)
9. [Project Name Editing](#9-project-name-editing)
10. [JSX Structure Map](#10-jsx-structure-map)
11. [Notable Patterns & Caveats](#11-notable-patterns--caveats)

---

## 1. File Overview

`TopBar` is the **editor's primary command surface** — the horizontal header that orchestrates access to almost every major editor operation:

- Canvas navigation (Home, sidebar toggle)
- History navigation (undo/redo)
- Project identity (name editing)
- Command surface (command palette ⌘K, AI assistant)
- View mode switching (Canvas / Split / Code)
- Schema dialect selection (PostgreSQL, MySQL, etc.)
- Data operations (Import, Connect DB, Diff, Export)
- Collaboration (Share)
- App settings (theme, Settings page)

It owns `ShareModal` as an inline child and delegates `ImportDialog` and `DiffViewer` visibility to its parent via callback props.

---

## 2. Dependencies & Imports

```tsx
import { useSchemaStore } from '../../store/schema';
import { useUIStore }     from '../../store/ui';
import { useUndoRedo }    from '../../hooks/useUndoRedo';
import { DIALECT_LABELS, DIALECTS } from '../../utils/constants';
import { exportSQL }    from '../../utils/exporters/sql';
import { exportDBML }   from '../../utils/exporters/dbml';
import { exportImage }  from '../../utils/exporters/image';
import { exportPrisma } from '../../utils/exporters/prisma';
import { exportDrizzle } from '../../utils/exporters/drizzle';
import { ShareModal }   from '../share/ShareModal';
import { Search, Sparkles, Undo2, Redo2, Menu, Home, Settings,
         Moon, Sun, Database, GitCompare, Download, Plus, ArrowUpRight }
  from 'lucide-react';
```

| Import | Role |
|---|---|
| `useSchemaStore` | `projectName`, `setProjectName`, `dialect`, `setDialect`, `tables`, `relationships` |
| `useUIStore` | `mode`, `setMode`, `toggleTheme`, `theme`, `toggleSidebar`, `readOnly`, `openPalette` |
| `useUndoRedo` | `undo`, `redo`, `canUndo`, `canRedo` |
| `DIALECT_LABELS`, `DIALECTS` | Dropdown options for dialect selector |
| Exporter functions | `exportSQL`, `exportDBML`, `exportImage`, `exportPrisma`, `exportDrizzle` |
| `ShareModal` | Rendered inline when `shareModalOpen === true` |
| Lucide icons | All toolbar icons — `Search`, `Sparkles`, `Undo2`, etc. |

**Icon library:** `lucide-react` — consistent icon set used exclusively in `TopBar`. Other components use Unicode character glyphs. `TopBar` is the only file in the project using Lucide icons.

---

## 3. Props

```tsx
interface TopBarProps {
  isHost?:         boolean;    // default: false
  onImportClick?:  () => void; // opens ImportDialog
  onDiffClick?:    () => void; // opens DiffViewer
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `isHost` | `boolean` | `false` | Gates host-only controls: dialect selector, Connect DB, Import, Diff, project name editing |
| `onImportClick` | `() => void` | `undefined` | Callback to open `ImportDialog` — handled by parent (`Editor.tsx`) |
| `onDiffClick` | `() => void` | `undefined` | Callback to open `DiffViewer` — handled by parent |

---

## 4. State

| State | Type | Initial | Description |
|---|---|---|---|
| `editingName` | `boolean` | `false` | Whether the project name is in edit mode (inline input) |
| `localName` | `string` | `projectName` | Buffer for name edits — only committed on Enter/blur |
| `exportOpen` | `boolean` | `false` | Whether the export dropdown menu is visible |
| `shareModalOpen` | `boolean` | `false` | Whether `ShareModal` is rendered |

---

## 5. Zone: Left

```
Sidebar Toggle  |  Home  |  [Undo] [Redo]  |  —  |  [Project Name]  [View Only badge]
```

### Sidebar Toggle

```tsx
<button onClick={toggleSidebar} title="Toggle sidebar (⌘B)" aria-label="Toggle sidebar">
  <Menu size={18} />
</button>
```

Same as `⌘B` shortcut. Calls `useUIStore.toggleSidebar()`.

### Home Button

```tsx
<button onClick={() => window.location.href = '/app'} title="Back to Dashboard">
  <Home size={18} />
</button>
```

Navigates to `/app` via `window.location.href` (a **full page navigation**, not `useNavigate()`). This exits the current editor session — the Yjs WebSocket disconnects and any unsaved in-flight state is abandoned. Consider whether a React Router `navigate('/app')` soft navigation would be more appropriate.

### Undo / Redo

```tsx
<button onClick={undo} disabled={!canUndo} title="Undo (⌘Z)"><Undo2 size={16} /></button>
<button onClick={redo} disabled={!canRedo} title="Redo (⌘Y)"><Redo2 size={16} /></button>
```

Driven by `useUndoRedo()`. Buttons are `disabled` when at the beginning/end of the history stack.

### Project Name

Described in detail in [Section 9](#9-project-name-editing).

### "View Only" Badge

```tsx
{readOnly && (
  <div className="topbar__badge topbar__hide-mobile">View Only</div>
)}
```

Shown only in `readOnly` mode. `topbar__hide-mobile` class hides it below a viewport width breakpoint.

---

## 6. Zone: Center

```
[🔍 Search commands… ⌘K]   [✦ AI]   |   [Canvas] [Split] [Code]
```

### Search/Command Palette Trigger

```tsx
<button className="topbar__search-trigger" onClick={openPalette}>
  <Search size={14} />
  <span>Search commands…</span>
  <kbd>⌘K</kbd>
</button>
```

Opens `CommandPalette` via `useUIStore.openPalette()`. Despite the label "Search commands…", this opens the full command palette (not `SearchOverlay`). The `⌘K` shortcut in `useKeyboardShortcuts.ts` also calls `openPalette()`.

### AI Button

```tsx
<button className="topbar__ai-btn"
        onClick={() => window.dispatchEvent(new CustomEvent('sf:open-ai-generate'))}
        title="Generate schema with AI">
  <Sparkles size={14} />
  <span>AI</span>
</button>
```

Dispatches `sf:open-ai-generate` — `AIBottomDrawer` listens for this and opens with a blank prompt. No `isHost` guard — both guests and hosts can trigger AI generation.

> This is the **only** major editor action not gated by `isHost` or `readOnly`. Guests in read-only mode can still open the AI assistant. Whether AI-generated schema suggestions are then blocked by the `readOnly` store guard depends on what `AIBottomDrawer` does with the generated output.

### Mode Switcher

```tsx
<div className="mode-switcher" role="tablist" aria-label="View mode">
  {(['canvas', 'split', 'code'] as const).map(m => (
    <button key={m}
            className={`mode-switcher__btn ${mode === m ? 'mode-switcher__btn--active' : ''}`}
            onClick={() => setMode(m)}
            role="tab"
            aria-selected={mode === m}>
      {m.charAt(0).toUpperCase() + m.slice(1)}
    </button>
  ))}
</div>
```

Three-button tab group: **Canvas**, **Split**, **Code**. Calls `useUIStore.setMode(m)` — the editor page reads `mode` to control layout (canvas-only, split canvas+code, code-only).

`role="tablist"` / `role="tab"` / `aria-selected` — proper ARIA tab pattern applied here (unlike some other toggle groups in the app that use `aria-pressed`).

---

## 7. Zone: Right

```
[Dialect ▾]  |  [Connect DB]  [Import]  [Diff]  [Share]  [Export ▾]  |  [☀/🌙]  [⚙]
```

### Dialect Selector — host-only

```tsx
{isHost && (
  <div className="dialect-selector topbar__hide-mobile">
    <select value={dialect} onChange={(e) => setDialect(e.target.value as any)}
            aria-label="Database dialect">
      {DIALECTS.map(d => <option key={d} value={d}>{DIALECT_LABELS[d]}</option>)}
    </select>
  </div>
)}
```

Hidden on mobile (`topbar__hide-mobile`). Only hosts can change the dialect — guests see the currently selected dialect but cannot switch it. `DIALECTS` from constants lists all supported values (e.g. `'postgres'`, `'mysql'`, `'sqlite'`, `'mssql'`).

### Host-Only Action Buttons

| Button | Icon | Action |
|---|---|---|
| **Connect DB** | `Database` | `sf:open-live-import` event → `LiveImportDialog` |
| **Import** | `Plus` | `onImportClick()` callback → parent opens `ImportDialog` |
| **Diff** | `GitCompare` | `onDiffClick()` callback → parent opens `DiffViewer` |

All three are `{isHost && ...}` gated — guests see none of them.

### Share Button — all users

```tsx
<button onClick={() => setShareModalOpen(true)} title="Share & Embed Schema">
  <ArrowUpRight size={16} />
  <span>Share</span>
</button>
```

Available to all users (no `isHost` guard). Opens `ShareModal` inline. Guests can open the share dialog to copy the collaborative link even if they can't edit.

### Export Dropdown — all users

```tsx
<div className="export-dropdown" style={{ position: 'relative' }}>
  <button onClick={() => setExportOpen(o => !o)} title="Export (⌘⇧E)">
    <Download size={16} />
    <span>Export</span>
  </button>
  {exportOpen && (
    <div className="export-menu">
      {[
        { id: 'sql',     label: 'SQL DDL' },
        { id: 'dbml',    label: 'DBML' },
        { id: 'prisma',  label: 'Prisma schema' },
        { id: 'drizzle', label: 'Drizzle ORM' },
        { id: 'json',    label: 'JSON schema' },
      ].map(item => (
        <button key={item.id} className="export-menu__item"
                onClick={() => handleExport(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )}
</div>
```

Available to all users — guests can export the current schema view. Five export formats listed. `handleExport()` closes the dropdown before running the export.

**Missing:** PNG and SVG are in `handleExport()` but **not in the dropdown item list**. The items array has `['sql', 'dbml', 'prisma', 'drizzle', 'json']` — no `'png'` or `'svg'` entries. The image export functionality exists in `handleExport` but is unreachable from the UI.

**No `onClickOutside`** — `exportOpen` can only be closed by clicking the Export button again or selecting an item. Clicking elsewhere on the page does not close it.

### Theme Toggle

```tsx
<button onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
</button>
```

Shows `Sun` icon when dark mode (switch to light), `Moon` when light mode (switch to dark). Dynamic `title` describes the action, not the current state — good UX practice.

### Settings Button

```tsx
<button onClick={() => window.location.href = '/app/settings'} title="Settings">
  <Settings size={18} />
</button>
```

Like the Home button, uses `window.location.href` — a full page reload to `/app/settings` rather than React Router navigation.

---

## 8. Export Handler — `handleExport()`

```ts
const handleExport = async (format: string) => {
  setExportOpen(false);                               // Close dropdown immediately
  const { showToast } = useUIStore.getState();        // Get toast fn via getState()
  try {
    if (format === 'sql') {
      const sql = exportSQL(tables, relationships, dialect);
      await navigator.clipboard.writeText(sql);
      showToast('SQL copied to clipboard');
    } else if (format === 'dbml') { ... }
    else if (format === 'png') {
      await exportImage('png');
      showToast('Canvas exported as PNG');
    } else if (format === 'svg') { ... }
    else if (format === 'json') { ... }
    else if (format === 'prisma') { ... }
    else if (format === 'drizzle') { ... }
  } catch {
    showToast('Export failed', 'error');
  }
};
```

### Format → Action Mapping

| Format | Mechanism | Toast Message |
|---|---|---|
| `sql` | `exportSQL()` → clipboard | 'SQL copied to clipboard' |
| `dbml` | `exportDBML()` → clipboard | 'DBML copied to clipboard' |
| `png` | `exportImage('png')` → download | 'Canvas exported as PNG' |
| `svg` | `exportImage('svg')` → download | 'Canvas exported as SVG' |
| `json` | `JSON.stringify()` → clipboard | 'JSON copied to clipboard' |
| `prisma` | `exportPrisma()` → clipboard | 'Prisma schema copied to clipboard' |
| `drizzle` | `exportDrizzle()` → clipboard | 'Drizzle schema copied to clipboard' |

All text formats copy to clipboard. Image formats trigger a file download via `exportImage()`.

**`useUIStore.getState()` inside an async function:**
```ts
const { showToast } = useUIStore.getState();
```
Called via `getState()` rather than via the hook — safe in an event handler / async function (avoids stale closures). However, `showToast` is already available in scope from the parent via the hook (`const { ..., showToast } = useUIStore()`). The `getState()` call is redundant since `showToast` doesn't change.

**Clipboard failure:**
All `clipboard.writeText` calls fail on non-HTTPS or permission denied — caught by the outer `try/catch`. The generic `'Export failed'` toast is shown for any error (clipboard permission, export function crash, etc.) — no per-format detail.

**`png` and `svg` unreachable from UI:**
These branches exist in `handleExport` but the export menu items array has no `png` or `svg` entry. They can only be triggered programmatically (e.g. via `CommandPalette` if a command for them existed — which it doesn't currently).

---

## 9. Project Name Editing

A commit-on-blur inline editor — only available to `isHost`.

### Display Mode

```tsx
<button
  className="topbar__project-name"
  onClick={() => { if (isHost) { setLocalName(projectName); setEditingName(true); } }}
  title={isHost ? "Click to rename" : "Project Name"}
  style={{ cursor: isHost ? 'text' : 'default' }}
>
  {projectName}
</button>
```

A `<button>` styled to look like text. For hosts, clicking enters edit mode. For guests, it's visually static (`cursor: default`, no enter-edit click). `title` attribute communicates intent to hosts.

### Edit Mode

```tsx
<input
  ref={nameRef}
  className="topbar__project-name-input"
  value={localName}
  onChange={e => setLocalName(e.target.value)}
  onBlur={commitName}
  onKeyDown={e => {
    if (e.key === 'Enter') commitName();
    if (e.key === 'Escape') { setLocalName(projectName); setEditingName(false); }
  }}
  autoFocus
/>
```

### `commitName()`

```ts
const commitName = () => {
  const trimmed = localName.trim();
  if (trimmed) setProjectName(trimmed);    // Commit non-empty name
  else setLocalName(projectName);           // Revert if blank
  setEditingName(false);
};
```

- `Enter` or `onBlur` → commits trimmed name via `setProjectName(trimmed)`
- `Escape` → discards changes (resets `localName` to `projectName`, exits edit mode)
- Blank input → reverts to existing name (does not allow empty project name)

**`localName` stale sync:** `localName` is initialized to `projectName` at component mount (`useState(projectName)`). If `projectName` changes externally (e.g. via Yjs sync from another collaborator) while the user is not editing, `localName` stays at the old value until the user next clicks to edit (which resets it: `setLocalName(projectName)`). No `useEffect` syncs `localName` from `projectName`.

---

## 10. JSX Structure Map

```
<header class="topbar" role="banner">
  │
  ├── topbar__left
  │     ├── [☰] toggleSidebar
  │     ├── [🏠] window.location.href = '/app'
  │     ├── [↩] undo (disabled if !canUndo)
  │     ├── [↪] redo (disabled if !canRedo)
  │     ├── ─── divider (hide-mobile)
  │     └── project-info
  │           ├── editing && isHost → <input autoFocus commitName>
  │           ├── !editing → <button> {projectName}  (click → edit if isHost)
  │           └── readOnly → [View Only] badge (hide-mobile)
  │
  ├── topbar__center
  │     ├── [🔍 Search commands… ⌘K]  → openPalette()
  │     ├── [✦ AI]                     → sf:open-ai-generate
  │     ├── ─── divider (hide-compact)
  │     └── mode-switcher (role="tablist")
  │           ├── [Canvas] aria-selected
  │           ├── [Split]
  │           └── [Code]
  │
  └── topbar__right
        ├── dialect-selector (isHost + hide-mobile)
        │     └── <select> DIALECTS
        │
        ├── topbar__actions
        │     ├── [Connect DB]  isHost → sf:open-live-import
        │     ├── [Import]      isHost → onImportClick()
        │     ├── [Diff]        isHost → onDiffClick()
        │     ├── [Share]       all   → setShareModalOpen(true)
        │     └── export-dropdown
        │           ├── [Export ▾] toggle
        │           └── export-menu (when open)
        │                 ├── SQL DDL
        │                 ├── DBML
        │                 ├── Prisma schema
        │                 ├── Drizzle ORM
        │                 └── JSON schema
        │
        ├── ─── divider
        │
        └── topbar__controls
              ├── [☀/🌙] toggleTheme
              └── [⚙]   window.location.href = '/app/settings'

{shareModalOpen && <ShareModal onClose={...} />}
```

---

## 11. Notable Patterns & Caveats

| | Detail |
|---|---|
| **PNG/SVG export unreachable from UI** | `handleExport('png')` and `handleExport('svg')` branches exist but no menu items trigger them — image export is dead code from the toolbar perspective |
| **`window.location.href` for navigation** | Home and Settings buttons use full page reloads instead of React Router `useNavigate()` — disconnects Yjs WebSocket and loses SPA state |
| **Export dropdown has no click-outside close** | No `useEffect` document listener — only closes when the Export button is clicked again or a format is selected |
| **`useUIStore.getState()` redundant in `handleExport`** | `showToast` is already in scope from the hook; `getState()` provides the same reference — unnecessary |
| **`localName` not reactive to external `projectName` changes** | If Yjs syncs a name change from a collaborator, `localName` stays stale until the user next clicks to edit |
| **AI button not gated by `readOnly`** | Guests in read-only mode can open the AI assistant. Whether generated output is blocked depends on downstream handling in `AIBottomDrawer` |
| **Lucide only in TopBar** | All other components use Unicode glyphs — `TopBar` is the sole consumer of `lucide-react`. Inconsistent icon strategy across the codebase |
| **`⌘⇧E` shortcut mentioned in tooltip** | `title="Export (⌘⇧E)"` on the Export button — but this shortcut is not registered in `useKeyboardShortcuts.ts`. It's documented in the UI but doesn't work |
| **`shareModalOpen` in local state** | `ShareModal` visibility is local component state — unlike `paletteOpen` which is in the UI store. Inconsistent pattern; `sf:open-share` event could be used instead |
| **`onImportClick` / `onDiffClick` are optional** | If not provided (undefined), the Import/Diff buttons click without effect (no error, just no-op) |

---

## `isHost` Access Control Summary

| Control | Host | Guest |
|---|---|---|
| Edit project name | ✅ | ❌ (display only) |
| Dialect selector | ✅ | ❌ (hidden) |
| Connect DB button | ✅ | ❌ (hidden) |
| Import button | ✅ | ❌ (hidden) |
| Diff button | ✅ | ❌ (hidden) |
| Share button | ✅ | ✅ |
| Export dropdown | ✅ | ✅ |
| AI button | ✅ | ✅ |
| Mode switcher | ✅ | ✅ |
| Undo / Redo | ✅ | ✅* |
| Theme toggle | ✅ | ✅ |
| Settings | ✅ | ✅ |

> *Undo/Redo buttons enabled for guests, but store mutations are blocked by `readOnly` guards in the schema store — undo actions would dispatch store actions that may no-op or be blocked downstream.

---

*Generated documentation for SchemaForge — `src/components/topbar/TopBar.tsx`*
