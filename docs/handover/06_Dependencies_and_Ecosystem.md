# 06: Dependencies & Ecosystem

This document defines the "External Ecosystem" of SchemaForge—its core libraries, third-party services, and the management of vendor risk.

---

## 1. Core Framework Dependencies
- **UI Framework**: **React 19** / **Vite 6** (Modern, performant SSR-ready setup).
- **Canvas Control**: **@xyflow/react** (React Flow 12).
    - *Risk*: Dependency on the XYFlow maintenance cycle.
    - *Mitigation*: The custom `FieldRow` handle logic is flexible enough to pivot to a raw SVG canvas if necessary.
- **SQL Parsing**: **node-sql-parser**.
    - Handles dialect detection for Postgres, MySQL, and SQLite.
- **State management**: **Zustand** + **Zundo** (For temporal "Undo/Redo" logic).
- **Icons**: **Lucide React**.

## 2. Text & Editor Ecosystem
- **CodeMirror 6**: The most extensible code editor for the web.
    - Uses `@codemirror/lang-sql`.
    - Custom theme in `src/styles/editor.css` to match the "SchemaForge" aesthetic.

## 3. Collaboration & Context
- **Y.js**: Highly reliable CRDTs for multi-user sync.
- **MCP Server**: Uses `@modelcontextprotocol/sdk`.

## 4. AIConsumption & Token Limits
- **OpenAI / Anthropic SDKs**: Both are utilized via the Node Proxy.
- **Vendor Lock-in**: SchemaForge uses a generic **Schema Provider Interface**.
    - Switching from OpenAI to Google Gemini or a local LLaMA instance requires zero changes to the frontend UI logic.

## 5. Security & Authentication
- **@supabase/supabase-js**: The bridge to Auth and DB.
- **Bcryptjs**: Used for secondary hashing of sensitive user-facing MCP keys (`sfk_live_...`).

## 6. Maintenance & Updates
- **Audit Strategy**: Run `npm audit` monthly to identify vulnerable legacy packages.
- **Major Versions**: Lock critical versions (like React Flow and Y.js) in `package.json` to prevent breaking-change updates without thorough regression testing.
- **Vendor Risks**: The primary risk is the **Supabase dependency**.
    - *Mitigation*: The `supabase/` directory contains standard SQL migrations—SQL data can be exported to any hosted Postgres instance if Supabase is ever deprecated.
