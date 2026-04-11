# `StatusBar.tsx` — Component Documentation

> **Location:** `src/components/statusbar/StatusBar.tsx`  
> **Type:** React Component — TypeScript/TSX  
> **Purpose:** A slim footer bar rendered at the bottom of the editor. Displays live schema statistics (table/field/relationship counts), the current auto-save status ("Saving…" / "Saved"), and density toggle buttons for controlling table node spacing on the canvas.

---

## File Overview

`StatusBar` is a **purely display + single-interaction** component. It reads from two stores and provides one meaningful user action: switching canvas node density. Everything else is read-only derived display state. No callbacks are received via props.

---

## Dependencies & Imports

```tsx
import { useSchemaStore } from '../../store/schema';
import { useUIStore }     from '../../store/ui';
import './StatusBar.css';
```

| Import | Role |
|---|---|
| `useSchemaStore` | `tables`, `relationships`, `isSaving`, `lastSaved` |
| `useUIStore` | `density`, `setDensity` |

---

## Props

```tsx
export const StatusBar: React.FC = () => { ... }
```

**No props** — all data sourced directly from stores.

---

## Derived Values

### `totalFields`

```ts
const totalFields = tables.reduce((acc, t) => acc + t.fields.length, 0);
```

Sum of all fields across all tables. Computed on every render — same calculation as `ProjectStats` in `RightPanel` and `DashboardStats`. Not memoized — fast enough for typical schema sizes.

### `savedLabel`

```ts
const savedLabel = isSaving
  ? 'Saving…'
  : lastSaved
  ? 'Saved'
  : '';
```

Three-state ternary:

| `isSaving` | `lastSaved` | `savedLabel` | Meaning |
|---|---|---|---|
| `true` | any | `'Saving…'` | Debounced save in flight |
| `false` | truthy | `'Saved'` | Last auto-save completed |
| `false` | `null` / falsy | `''` | Schema never saved (new / unsaved) |

When `savedLabel` is `''` (empty), the center section renders nothing — `{savedLabel && <span>...}` short-circuits.

---

## Layout — Three-Zone Footer

```
<footer class="statusbar">
  │
  ├── Left   (statusbar__left)
  │     ├── N tables
  │     ├── ·  (dot separator)
  │     ├── N fields
  │     ├── ·
  │     └── N relationships
  │
  ├── Center (statusbar__center)
  │     └── "Saving…" | "Saved" | (empty)
  │
  └── Right  (statusbar__right)
        └── Density toggle group
              ├── [≡] comfortable
              └── [≣] compact
```

---

## Save Status Indicator

```tsx
<div className="statusbar__center">
  {savedLabel && (
    <span className={`statusbar__save-status ${isSaving ? '' : 'statusbar__save-status--saved'}`}>
      {savedLabel}
    </span>
  )}
</div>
```

CSS class behavior:

| State | Classes Applied |
|---|---|
| Saving (`isSaving = true`) | `statusbar__save-status` (base only) |
| Saved (`isSaving = false, lastSaved` set) | `statusbar__save-status statusbar__save-status--saved` |

The `--saved` modifier class is removed while saving — the base class likely applies a neutral/muted style, while `--saved` applies a green or checkmark style.

> The "Saved" label persists indefinitely after the last save — it doesn't revert to empty or show a relative time ("Saved 5 min ago"). Once `lastSaved` is set, "Saved" is always shown. This is intentional but means there's no expiry — even if the schema hasn't been saved in an hour, the UI still shows "Saved".

> Cross-reference: `useCloudPersistence` sets `isSaving` to `true` during the debounced save, and `lastSaved` to the timestamp on completion. The `StatusBar` reflects `isSaving` while the save is in-flight (typically for the 2-second debounce window + network round-trip).

---

## Density Toggle

```tsx
<div className="density-toggle" role="group" aria-label="Node density">
  <button
    className={`density-btn ${density === 'comfortable' ? 'density-btn--active' : ''}`}
    onClick={() => setDensity('comfortable')}
    title="Comfortable density"
  >≡</button>
  <button
    className={`density-btn ${density === 'compact' ? 'density-btn--active' : ''}`}
    onClick={() => setDensity('compact')}
    title="Compact density"
  >≣</button>
</div>
```

Two-button toggle group controlling `density` in `useUIStore`:

| Button | Icon | Value | Effect |
|---|---|---|---|
| Comfortable | `≡` | `'comfortable'` | Wider row padding in `TableNode` |
| Compact | `≣` | `'compact'` | Tighter row padding — more fields visible per table |

`setDensity` writes to the UI store. `TableNode` reads `density` via `useUIStore` and applies `density-comfortable` / `density-compact` class to rows.

**`role="group"`** — correct ARIA grouping for a set of related toggle buttons.

> **Missing `'spacious'` density option:** `constants.ts` exports `DENSITY_OPTIONS` which includes `'comfortable'`, `'compact'`, and `'spacious'`. `StatusBar` only renders two of the three — `'spacious'` has no toggle button. If `density` is somehow set to `'spacious'` (e.g. from a stale store value), neither button shows as active.

> `aria-pressed` attribute is missing from each `density-btn` — buttons toggle between active/inactive states but don't expose this semantically. Adding `aria-pressed={density === 'comfortable'}` etc. would improve screen-reader experience.

---

## ARIA & Accessibility

```tsx
<footer role="status" aria-label="Schema status">
```

- `role="status"` on the footer — marks it as a live status region. This is slightly unusual (footers typically don't get `role="status"`) but not technically incorrect. `role="status"` implies `aria-live="polite"` — any content changes within the footer would be announced by screen readers, including the "Saving…" / "Saved" transition.
- `aria-label="Schema status"` — accessible label for the region

---

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **"Saved" never expires** | `savedLabel` shows `'Saved'` indefinitely once `lastSaved` is set — no relative timestamp, no expiry |
| **Missing `'spacious'` density button** | `constants.ts` has 3 density options; `StatusBar` only renders 2. `'spacious'` is orphaned |
| **`aria-pressed` missing on density buttons** | Toggle buttons should expose `aria-pressed` semantically |
| **No zoom display** | Comment in JSX says `{/* Right: density + zoom */}` but there is no zoom indicator — only density toggle |
| **`totalFields` computed inline** | Same calculation exists in `ProjectStats` and `DashboardStats` — no shared utility |
| **`role="status"` on `<footer>`** | Unusual combination — `<footer>` implies `role="contentinfo"` natively; overriding with `role="status"` adds live-region behavior |

---

## Dead Code Note — Zoom Display

```tsx
{/* Right: density + zoom */}
```

The JSX comment explicitly mentions "zoom" but no zoom indicator is rendered. The right section only contains the density toggle. This suggests zoom display was planned but never implemented.

A zoom indicator reading from React Flow's `useViewport()` or from a `useUIStore.zoom` value was likely the intended addition.

---

## Store Connections Diagram

```
useSchemaStore
  ├── tables          → "{N} tables" + totalFields calculation
  ├── relationships   → "{N} relationships"
  ├── isSaving        → "Saving…" label + CSS class modifier
  └── lastSaved       → "Saved" label (when isSaving === false)

useUIStore
  ├── density         → active density button highlight
  └── setDensity      → density toggle button onClick

TableNode (canvas)
  └── reads: useUIStore.density → applies density CSS class to rows
```

---

*Generated documentation for SchemaForge — `src/components/statusbar/StatusBar.tsx`*
