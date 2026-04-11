# Shared UI Components — Documentation

> **Location:** `src/components/shared/`  
> **Type:** React Components — TypeScript/TSX  
> **Purpose:** Two global, store-driven UI primitives — `DialogModal` (imperative confirmation/alert dialog) and `Toast` (transient notification banner). Both are mounted once in `App.tsx` and driven entirely by `useUIStore` state, requiring no props or local management from callers.

---

## Overview

| File | Export | Role |
|---|---|---|
| `DialogModal.tsx` | `DialogModal` | Centralised modal for confirm/alert dialogs — driven by `useUIStore.dialogConfig` |
| `Toast.tsx` | `Toast` | Fixed-position notification banner — driven by `useUIStore.toastMessage` / `toastType` |

Both components follow the **store-driven singleton** pattern: they are always mounted, read from the UI store, and render `null` when inactive — no portal, no dynamic mounting.

---

---

# `DialogModal.tsx` — Component Documentation

> **Location:** `src/components/shared/DialogModal.tsx`

## File Overview

A **globally mounted, imperative modal dialog** for blocking confirmations and alert messages. The dialog HTML is always present in the DOM but renders `null` unless `dialogConfig.isOpen === true`. Callers trigger it by calling `useUIStore.openDialog(config)` — no component-level rendering required.

## Dependencies & Imports

```tsx
import { useUIStore } from '../../store/ui';
```

> **Note:** `React` is not imported — relies on the automatic JSX runtime. No CSS file imported — all styles are inline.

## Store Interface (from `useUIStore`)

```ts
// Relevant ui store state (inferred from usage):
dialogConfig: {
  isOpen:     boolean;
  title:      string;
  message:    string;
  type:       'confirm' | 'alert';
  onConfirm?: () => void;    // Only for type === 'confirm'
} | null;

closeDialog: () => void;
```

Callers open the dialog via:
```ts
useUIStore.getState().openDialog({
  title:    'Delete table?',
  message:  'This cannot be undone.',
  type:     'confirm',
  onConfirm: () => removeTable(tableId)
});
```

## Dialog Types

### `type === 'confirm'`

Shows two buttons:
- **Cancel** → calls `closeDialog()`. No `onConfirm`.
- **Confirm** → calls `onConfirm()` (if provided) then `closeDialog()`.

```tsx
<button onClick={closeDialog}>Cancel</button>
<button onClick={() => { if (dialogConfig.onConfirm) dialogConfig.onConfirm(); closeDialog(); }}>
  Confirm
</button>
```

`onConfirm` is checked with an `if` guard — safe if it was not provided, though the UI store's `openDialog` should make it required for `type === 'confirm'`.

### `type === 'alert'` (and any other value)

Shows one button:
- **OK** → calls `closeDialog()`.

```tsx
<button onClick={closeDialog}>OK</button>
```

The `else` branch catches any `type` value other than `'confirm'` — includes `'alert'` and any unexpected string.

## Layout & Styling

All styles are 100% inline — no CSS class names.

```
<div style="position:fixed; inset:0; zIndex:99999; flex center">
  │
  ├── Backdrop <div>
  │     style: position:absolute; inset:0; background:rgba(0,0,0,0.6);
  │            backdropFilter:blur(4px)
  │     onClick: closeDialog()    ← click outside to dismiss
  │
  └── Dialog panel <div>
        style: position:relative; maxWidth:440px; borderRadius:16px;
               background:var(--surface-raised); padding:32px;
               border:var(--border-subtle); boxShadow: large drop shadow
        │
        ├── Title (h2 20px/700)     {dialogConfig.title}
        ├── Message (p 15px)        {dialogConfig.message}
        │
        └── Actions row (flex; justify:flex-end)
              ├── type='confirm': [Cancel] [Confirm (red)]
              └── type='alert':  [OK]
```

**`z-index: 99999`** — intentionally very high. Ensures the dialog renders above all other overlays (palettes, modals, editor panels).

**Backdrop click → close** — clicking the semi-transparent backdrop calls `closeDialog()`. Unlike most other Modellr modals which use `e.target === e.currentTarget`, this uses a separate absolute-positioned backdrop `<div>` with its own `onClick`.

**Confirm button style** — uses `var(--alert-error)` as the background (red). This is a **destructive action color** — implying `type='confirm'` dialogs are used exclusively (or primarily) for destructive operations like delete. A non-destructive confirm (e.g. "Replace schema?") would visually suggest danger even when not truly destructive.

## Keyboard Accessibility

> ⚠️ **Missing:** No `onKeyDown` handler — pressing `Escape` does not close the dialog. No `autoFocus` on the primary button. Focus is not trapped within the dialog while it is open. For a blocking dialog (`z-index: 99999`), this is a notable accessibility gap.

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **No `React` import** | Relies on auto JSX transform — inconsistent with other files |
| **100% inline styles** | No CSS file — no theme class conflicts, but untestable via CSS snapshots |
| **Confirm button always red** | `background: var(--alert-error)` — semantically implies destruction for all confirms |
| **No Escape key handler** | Cannot close with keyboard — accessibility issue for a blocking dialog |
| **No focus trap** | Focus can leave the dialog while it is open |
| **No `aria-modal` or `role="dialog"`** | Missing accessibility attributes — screen readers may not announce the modal boundary |
| **`dialogConfig.onConfirm?.()` pattern inconsistency** | Used with `if (onConfirm) onConfirm()` rather than optional chaining `onConfirm?.()` — functionally same |
| **`type` is not exhaustively guarded** | Anything that isn't `'confirm'` falls into the `'alert'` branch — unexpected type values silently render as alert |

---

---

# `Toast.tsx` — Component Documentation

> **Location:** `src/components/shared/Toast.tsx`

## File Overview

A **globally mounted, auto-dismissing notification banner**. Renders at a fixed screen position when `toastMessage` is set in `useUIStore`, and disappears when `toastMessage` is cleared (clearance is timed by `useUIStore.showToast`). Has no local state or timers — fully driven by the store.

## Dependencies & Imports

```tsx
import { useUIStore } from '../../store/ui';
import './Toast.css';
```

Styling is CSS-based (unlike `DialogModal`'s inline styles) — CSS classes control position, color, and transition animations.

## Store Interface (from `useUIStore`)

```ts
// Relevant ui store slice (inferred):
toastMessage: string | null;
toastType:    'success' | 'error' | 'info';

showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
// → sets toastMessage + toastType, then clears after N ms (typically 2–3s)
```

## Render Gate

```tsx
if (!toastMessage) return null;
```

Returns `null` when `toastMessage` is `null` or empty — no DOM node rendered in the idle state.

## JSX

```tsx
<div className={`toast toast--${toastType}`} role="status" aria-live="polite">
  <span className="toast__icon">
    {toastType === 'success' ? '✓' : toastType === 'error' ? '✕' : 'ℹ'}
  </span>
  {toastMessage}
</div>
```

CSS class: `toast toast--{type}` → e.g. `toast toast--success`, `toast toast--error`, `toast toast--info`.

## Type → Icon Mapping

| `toastType` | Icon | CSS Class |
|---|---|---|
| `'success'` | `✓` | `toast--success` |
| `'error'` | `✕` | `toast--error` |
| `'info'` (or undefined) | `ℹ` | `toast--info` |

Any unexpected `toastType` value renders the `ℹ` icon (falls through the ternary chain to its final branch).

## Accessibility

```tsx
role="status" aria-live="polite"
```

- `role="status"` — ARIA landmark for status messages
- `aria-live="polite"` — screen readers announce the message when the user is not busy

`aria-live="polite"` means the announcement waits for the user to finish their current action. For error messages, `aria-live="assertive"` would be more appropriate as it interrupts immediately. Using `"polite"` for `toast--error` means critical errors may not be announced until the aria-live region becomes idle.

## Position & Animation

Position, z-index, entry animation, and per-type colors are defined in `Toast.css` (not documented here). The component itself only applies the `toast--{type}` class — all visual differences between types are CSS-driven.

## Auto-Dismiss Timing

Handled entirely by `useUIStore.showToast()`:
```ts
// Approximate implementation in ui.ts store:
showToast(message, type = 'info') {
  set({ toastMessage: message, toastType: type });
  setTimeout(() => set({ toastMessage: null }), 2500); // N ms
}
```

`Toast.tsx` has no `setTimeout`, no `useEffect` — it is a pure display component. When the store clears `toastMessage`, `Toast` re-renders and returns `null`.

> If `showToast` is called twice in rapid succession, the second call sets a new timeout but the first timeout still runs. When the first timeout fires, it clears `toastMessage` — potentially dismissing the second toast early. No debouncing or ID-based timeout tracking exists in the current implementation (see `ui.ts` store docs).

## Notable Patterns & Caveats

| | Detail |
|---|---|
| **No local state or timers** | Completely driven by `useUIStore` — fully decoupled from callers |
| **`aria-live="polite"` for all types** | Error toasts should use `aria-live="assertive"` — polite means errors may be delayed in announcement |
| **Rapid consecutive toasts may dismiss early** | No timeout ID tracking — previous timeout can clear a newer toast message |
| **Cannot stack multiple toasts** | One toast at a time — calling `showToast` twice replaces the first immediately |
| **No manual dismiss** | Users cannot close the toast — it auto-dismissed only. No ✕ button |
| **`Toast.css` drives all visual design** | Position, colors, animation all in CSS — component is purely structural |

---

## Shared UI Component Integration Pattern

Both components are mounted **once** at the root level in `App.tsx`:

```tsx
// App.tsx (inferred from architecture):
function App() {
  return (
    <Router>
      {/* ... routes ... */}
      <Toast />         {/* Global notification banner */}
      <DialogModal />   {/* Global confirm/alert dialog */}
    </Router>
  );
}
```

Callers trigger them imperatively via the UI store:

```ts
// Trigger Toast:
useUIStore.getState().showToast('Schema saved!', 'success');
// or from inside a component:
const { showToast } = useUIStore();
showToast('Import failed', 'error');

// Trigger DialogModal:
useUIStore.getState().openDialog({
  title:    'Delete table?',
  message:  'All fields and relationships will be removed.',
  type:     'confirm',
  onConfirm: () => { removeTable(id); clearSelection(); }
});
```

This pattern keeps dialog/toast UI out of feature components entirely — no JSX for modals or toasts in the call site, no local state management for open/closed.

---

## Comparison Summary

| Aspect | `DialogModal` | `Toast` |
|---|---|---|
| **Render style** | 100% inline styles | CSS file (`Toast.css`) |
| **Driven by** | `dialogConfig` object | `toastMessage` + `toastType` strings |
| **Dismissal** | Explicit (button click / backdrop click) | Automatic (timer in `showToast`) |
| **Blocking?** | Yes — `z-index: 99999`, blocks interaction | No — does not block interaction |
| **Types** | `'confirm'` / `'alert'` | `'success'` / `'error'` / `'info'` |
| **Keyboard support** | ❌ No Escape handler | N/A |
| **ARIA** | ❌ Missing `role="dialog"` + `aria-modal` | ✅ `role="status"` + `aria-live="polite"` |
| **Multiple instances** | N/A (one dialog at a time) | N/A (one toast at a time) |
| **`React` imported** | ❌ No | ✅ Yes |

---

*Generated documentation for Modellr — `src/components/shared/`*
