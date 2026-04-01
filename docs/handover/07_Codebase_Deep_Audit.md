# 07: Codebase Deep Audit

This document is the "Implementation Manual" for SchemaForge—exposing its internal wiring, fragile patterns, and technical "secrets" to ensure 100% technical safety during future growth.

---

## 1. Physical File Map
A guide to the core implementation layers of the codebase:

- **State Management**: `src/store/schema.ts` (Zustand + Zundo for temporal history).
- **Multiplayer Sync**: `src/store/yjsStore.ts` (Y.js ↔ Zustand bridge).
- **Database Schema & RLS**: `supabase/schema.sql` (The absolute source of truth for the cloud).
- **Canvas Components**: `src/components/canvas/` (React Flow handles and TableNode logic).
- **Export Engines**: `src/utils/exporters/` (Prisma, Drizzle, and DDL generation).

## 2. The State Sync Engine (Zustand ↔ Y.js)
The real-time collaboration engine relies on a custom bridge between the local Zustand store and a Y.js `WebsocketProvider`.

### The `isApplyingRemote` Guard
> [!CAUTION]
> A manual boolean flag `isApplyingRemote` in `yjsStore.ts` prevents local edits from triggering a feedback loop when remote changes arrive.
> - **Risk**: If a `try/finally` block is missing or an error occurs during a remote transaction, this flag can stay `true` forever—freezing the UI and preventing any local user from editing.
> - **Refactor Path**: Ensure all Y.js observe callbacks are wrapped in a robust transaction-level error handler.

### Awareness (Multiplayer Cursors)
Cursors are tracked via the Y.js `awareness` field. They are broadcasted using `broadcastCursor(x, y)` in `yjsStore.ts` and rendered as temporary SVG overlays in `MultiplayerCursors.tsx`.

## 3. Handle ID Logic (The String Pattern)
SchemaForge uses field-level handles for database relationships.

### Connection Key Pattern
- **Pattern**: `{tableId}-{fieldId}-source-{direction}` (e.g. `user-uuid-source-right`).
- **Dynamic Direction**: In `SchemaCanvas.tsx`, the `direction` (left/right) is calculated on the fly as the user draws a line. The system now uses a **visual-first swapping** logic that alternates between `__left` and `__right` handles based on the shortest path, significantly reducing line overlaps.

> [!WARNING]
> This string-concatenation pattern is prone to failure if table names or IDs contains hyphens outside of UUIDs. 
> - **Refactor Path**: Consider using a structured JSON object for Handle IDs or a more robust delimiter (e.g. `::`).

## 4. Database Persistence & Security
### The Auth → Profile Trigger
In `supabase/schema.sql`, there is a Postgres trigger `on_auth_user_created` that automatically creates a row in `public.users` when a user signs up.
- **Critical Failure Point**: If this trigger fails (due to a race condition or DB load), a user can sign in successfully via Supabase Auth but will be in a "limbo" state in the SchemaForge backend (Missing a profile/tier row).

### Row Level Security (RLS)
The absolute rule for `public.schemas` and `public.snapshots` is:
```sql
FOR SELECT USING (auth.uid() = owner_id);
```
- **Security Check**: This ensures that even in multiplayer rooms, only the original creator can delete or modify the core "Schema Metadata" in Supabase, while Y.js handles the canvas content during live sessions.

## 5. Global Event Bus (Window Events)
The app uses decoupled `window` custom events for global keyboard shortcuts and canvas commands.
- **Events Map**:
    - `sf:auto-layout`: Triggers the `elkjs` engine.
    - `sf:fit-view`: Centers the React Flow canvas.
    - `sf:zoom-preset`: Jumps to 25%, 50%, 100%, etc.
    - `sf:bulk-delete`: Deletes currently selected node IDs stored in a local ref.
- **Risk**: Event listeners in `SchemaCanvas.tsx` are mounted in a `useEffect`. If not cleaned up properly, these will leak and cause duplicate triggers when re-mounting the canvas.

## 6. Critical Refactoring Priorities (Handover Task)
Ranked by severity:

| **CRITICAL** | **Sync Flag Reset** | A hung remote transaction freezes the UI for a local user. |
| **CRITICAL** | **Auth Sync Fallback** | Ensure the app checks/creates the `public.users` profile on first load. |
| **MEDIUM** | **Handle ID Delimiter** | Using hyphens as delimiters in IDs is fragile for nested schemas. |
| **LOW** | **Event Lifecycle** | Clean up `window` listeners in a robust Custom Hook. |
| **LOW** | **Hysteresis Buffer** | **Improved**: Visual-first routing is active; minor X-flickering near center points is the only remaining edge case. |

---
*Created by Anti & Kiro via Orchestrator.*
