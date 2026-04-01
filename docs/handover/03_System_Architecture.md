# 03: System Architecture

This document defines the technical foundation of SchemaForge—how the canvas, state, and real-time engine operate under the hood.

---

## 1. Technical Stack
- **Frontend Framework**: Vite + React (TypeScript).
- **Canvas Engine**: **React Flow** (@xyflow/react).
- **State Management**: **Zustand** (Local) + **Y.js** (Shared/Multiplayer CRDTs).
- **Layout Logic**: **Elkjs** (Better for dense schemas).
- **Code Editor**: **CodeMirror 6** (Split-pane bidirectional sync).
- **Backend/Storage**: **Supabase** (Postgres, Auth, RLS).

## 2. Canvas & Node Architecture
### React Flow Integration
SchemaForge uses a custom `TableNode` component to render each database table.
- **Node IDs**: `table-{tableName}`.
- **Custom Handles**: Unlike standard React Flow nodes with 4 handles, SchemaForge uses **field-level handles**.
    - Each `FieldRow` on a node renders its own **Source** and **Target** handles.
    - **Handle IDs**: `{tableId}-{fieldName}-source` / `{tableId}-{fieldName}-target`.
- **Relationship Lines**: Custom **Bezier edge** components.
    - **Visual Routing**: Uses a "visual-first" strategy that dynamically swaps between Left and Right handles on each field row based on the relative X-position of the connected nodes. This prevents lines from "disappearing" or overlapping nodes during dragging.
    - **Position Calculation**: Edge paths are recalculated in real-time derived from the `getInternalNode` state in React Flow to ensure zero-latency synchronization.
- **Color Coding**: Based on the source table's accent color.

## 3. State & Sync Engine
### Multi-State Strategy
1. **Local State (`useProjectStore`)**: Handles non-synced UI state (panel visibility, drag positions).
2. **Persistent State (`useSchemaStore`)**: Manages the underlying DBML schema data.
3. **Shared State (`useYjsStore`)**: Bridges Zustand with Y.js CRDTs for multiplayer cursors and real-time schema edits.

### Bidirectional Sync (UI ↔ Code)
- **UI → DBML**: 300ms debounce. Changes in the canvas update the `useSchemaStore`, which then re-parses the DBML string.
- **DBML → UI**: 600ms debounce. Manual edits in the CodeMirror editor trigger the **DBML Parser**, which then re-hydrates the React Flow nodes and edges.
- **Error Guard**: If the DBML is invalid, the canvas remains at the **last valid state** and displays a syntax error underline in the code panel.

## 4. AI Prompt Architecture
- **In-Canvas Generation**: Uses **tool-calling** prompts (OpenAI/Anthropic) to request structured JSON schemas.
- **Ghost Rendering**: Before the AI generation is "committed," a temporary `ghost_canvas` state is used to render transparent table outlines.

## 5. Exports & Introspection
- **Exporters (`src/utils/exporters/`)**: Modular classes for SQL, Prisma, Drizzle, and DBML.
- **Live Introspection**: A Node.js proxy (in `server/index.js`) connects to production DBs (Postgres/MySQL), reads the `information_schema`, and converts it into SchemaForge JSON.

## 6. Real-time Infrastructure (Phase 5)
- **Yjs WebSocket**: Managed via a `hocuspocus` instance.
- **Multiplayer Cursors**: Positioned via a `useEffect` hook that broadcasts mouse coordinates to the Y.js map.

## 7. Public Marketing & Docs Routing
SchemaForge separates public marketing content from the authenticated sandbox/app.
- **Public Layouts**: Standardized headers (`PublicNav.tsx`) and footers (`Footer.tsx`) ensure unified branding on the landing page, pricing, and features.
- **Standalone Documentation**: The public `/docs` route is isolated from the main app's internal shell to optimize SEO and accessibility. It uses high-visibility layouts and a dedicated sidebar for tutorial navigation.
- **Auth Sync**: Auth-aware conditional rendering in `PublicNav` allows users to jump back into their stored schemas instantly from any marketing page.
